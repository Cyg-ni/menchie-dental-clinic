import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';

/**
 * Logs an activity to the activity_logs collection
 * @param {string} userId
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export const logActivity = async (userId, action, metadata = {}) => {
  try {
    let userName = 'Unknown';
    if (userId) {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        userName = userData.username || userData.firstName + ' ' + userData.lastName || 'Unknown';
      }
    }

    const logsRef = collection(db, 'activity_logs');
    
    await addDoc(logsRef, {
      userId: userId,
      userName: userName,
      action: action,
      timestamp: Timestamp.fromDate(new Date()),
      metadata: metadata || {},
      createdAt: new Date().toISOString()
    });

    if (userId) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        lastActivityAt: Timestamp.fromDate(new Date()),
        lastActivityAction: action,
        updatedAt: new Date().toISOString()
      });
    }

    console.log(`✅ Activity logged: ${action}`);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

/**
 * Get current user ID from local storage
 * @returns {string|null}
 */
export const getCurrentUserId = () => {
  return localStorage.getItem('staffUserId');
};
