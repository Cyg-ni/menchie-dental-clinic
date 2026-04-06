const admin = require('firebase-admin');
const { setGlobalOptions } = require('firebase-functions');
const logger = require('firebase-functions/logger');
const { onSchedule } = require('firebase-functions/v2/scheduler');

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

const db = admin.firestore();

const TARGET_ROLES = new Set(['staff', 'dentist']);
const INACTIVE_AFTER_DAYS = 3;
const DELETE_AFTER_DAYS = 7;

const getTimestampValue = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  if (typeof value === 'string' || value instanceof Date) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const getLastActivityDate = (userData) => {
  return (
    getTimestampValue(userData.lastActivityAt) ||
    getTimestampValue(userData.lastLoginAt) ||
    getTimestampValue(userData.updatedAt) ||
    getTimestampValue(userData.createdAt)
  );
};

const logSystemActivity = async (userId, userName, action, metadata = {}) => {
  await db.collection('activity_logs').add({
    userId,
    userName: userName || 'System',
    action,
    timestamp: admin.firestore.Timestamp.now(),
    metadata,
    createdAt: new Date().toISOString(),
    source: 'system'
  });
};

exports.enforceUserInactivity = onSchedule(
  {
    schedule: 'every day 02:00',
    timeZone: 'Asia/Manila',
  },
  async () => {
    logger.info('Starting inactivity enforcement job');

    const snapshot = await db.collection('users').get();
    const now = new Date();
    const batch = db.batch();
    let inactivatedCount = 0;
    let deletedCount = 0;

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      const userRole = userData.role;

      if (!TARGET_ROLES.has(userRole)) {
        continue;
      }

      const lastActivityDate = getLastActivityDate(userData);
      if (!lastActivityDate) {
        logger.info(`Skipping user ${userDoc.id} because no activity date was found`);
        continue;
      }

      const inactivityMs = now.getTime() - lastActivityDate.getTime();
      const inactivityDays = inactivityMs / (1000 * 60 * 60 * 24);
      const displayName = userData.username || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userDoc.id;

      if (inactivityDays >= DELETE_AFTER_DAYS) {
        batch.delete(userDoc.ref);
        deletedCount += 1;

        try {
          await logSystemActivity(userDoc.id, displayName, 'Deleted inactive account', {
            role: userRole,
            inactivityDays: Math.floor(inactivityDays),
            previousStatus: userData.status || 'unknown'
          });
        } catch (error) {
          logger.warn(`Failed to log deletion for ${userDoc.id}`, error);
        }

        continue;
      }

      if (inactivityDays >= INACTIVE_AFTER_DAYS && userData.status !== 'inactive') {
        batch.update(userDoc.ref, {
          status: 'inactive',
          inactiveAt: admin.firestore.Timestamp.now(),
          inactiveReason: 'Automatic inactivity policy',
          updatedAt: new Date().toISOString()
        });
        inactivatedCount += 1;

        try {
          await logSystemActivity(userDoc.id, displayName, 'Marked account inactive', {
            role: userRole,
            inactivityDays: Math.floor(inactivityDays),
            previousStatus: userData.status || 'active'
          });
        } catch (error) {
          logger.warn(`Failed to log inactivation for ${userDoc.id}`, error);
        }
      }
    }

    await batch.commit();
    logger.info('Inactivity enforcement job completed', {
      inactivatedCount,
      deletedCount,
    });
  }
);
