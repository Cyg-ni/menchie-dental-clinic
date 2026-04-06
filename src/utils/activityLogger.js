import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';

const getStoredIdentity = () => {
  const staffUserId = localStorage.getItem('staffUserId');
  const staffFirstName = localStorage.getItem('staffFirstName') || '';
  const staffLastName = localStorage.getItem('staffLastName') || '';
  const staffUsername = localStorage.getItem('staffUsername') || '';

  const fallbackName = [staffFirstName, staffLastName].join(' ').trim() || staffUsername || 'Unknown';

  return {
    userId: staffUserId || null,
    userName: fallbackName,
  };
};

/**
 * Logs an activity to the activity_logs collection
 * @param {string} userId
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export const logActivity = async (userId, action, metadata = {}) => {
  try {
    const identity = getStoredIdentity();
    const resolvedUserId = userId || identity.userId;
    let userName = identity.userName || 'Unknown';

    console.log(`[activityLogger] Logging action: ${action}`, {
      passedUserId: userId,
      storedUserId: identity.userId,
      resolvedUserId,
      userName,
      metadata,
    });

    if (resolvedUserId) {
      const userRef = doc(db, 'users', resolvedUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        userName = userData.username || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userName;
        console.log(`[activityLogger] Resolved user from Firestore:`, userName);
      } else {
        console.log(`[activityLogger] User doc not found in Firestore for ID: ${resolvedUserId}`);
      }
    } else {
      console.warn(`[activityLogger] No userId resolved - activity may not be properly attributed!`);
    }

    const logsRef = collection(db, 'activity_logs');
    const logEntry = {
      userId: resolvedUserId,
      userName,
      action,
      timestamp: Timestamp.fromDate(new Date()),
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    };

    console.log(`[activityLogger] Writing log entry:`, logEntry);

    const docRef = await addDoc(logsRef, logEntry);
    console.log(`[activityLogger] Activity logged successfully with doc ID: ${docRef.id}`);

    // Best-effort profile update: this must never break successful activity log writes.
    if (resolvedUserId) {
      try {
        const userRef = doc(db, 'users', resolvedUserId);
        await updateDoc(userRef, {
          lastActivityAt: Timestamp.fromDate(new Date()),
          lastActivityAction: action,
          updatedAt: new Date().toISOString(),
        });
        console.log(`[activityLogger] Updated user last activity`);
      } catch (profileErr) {
        console.warn('[activityLogger] Activity logged, but failed to update user profile activity fields:', profileErr);
      }
    }
  } catch (error) {
    console.error('[activityLogger] Error logging activity:', error);
    console.error('[activityLogger] Error details:', {
      message: error.message,
      code: error.code,
      userId,
      action,
    });
  }
};

/**
 * Get current user ID from local storage
 * @returns {string|null}
 */
export const getCurrentUserId = () => {
  return getStoredIdentity().userId;
};
