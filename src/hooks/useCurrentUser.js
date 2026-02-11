import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export const useCurrentUser = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            const userId = localStorage.getItem("staffUserId");
            if (userId) {
                try {
                    const userRef = doc(db, "users", userId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        setCurrentUser({ id: userSnap.id, ...userSnap.data() });
                    }
                } catch (error) {
                    console.error("Error fetching current user data:", error);
                }
            }
            setLoading(false);
        };

        fetchUserData();
    }, []);

    return { currentUser, loading };
};
