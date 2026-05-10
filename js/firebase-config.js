// Firebase config - replace these values with your Firebase project credentials
// Get these from Firebase Console: https://console.firebase.google.com/

const firebaseConfig = {
  apiKey: "AIzaSyBmzsntoAnfQnW5RKXLllbsqJ8-tXzpzXU",
  authDomain: "aicat-7f957.firebaseapp.com",
  projectId: "aicat-7f957",
  storageBucket: "aicat-7f957.firebasestorage.app",
  messagingSenderId: "698604371030",
  appId: "1:698604371030:web:8252cbbf61210c862b4ff7",
  measurementId: "G-WE33ZB6MC5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Rating functions
async function getRating(engineName) {
    try {
        const doc = await db.collection("ratings").doc(engineName).get();
        if (doc.exists) {
            return doc.data();
        }
        return { s: 0, cnt: 0, comments: [] };
    } catch (error) {
        console.error("Error getting rating:", error);
        return { s: 0, cnt: 0, comments: [] };
    }
}

async function submitRating(engineName, score, comment) {
    try {
        const currentData = await getRating(engineName);
        const newCnt = currentData.cnt + 1;
        const newS = (currentData.s * currentData.cnt + score) / newCnt;
        
        const comments = currentData.comments || [];
        comments.push({
            text: comment,
            timestamp: new Date().toISOString(),
            score: score
        });

        await db.collection("ratings").doc(engineName).set({
            s: newS,
            cnt: newCnt,
            comments: comments
        }, { merge: true });

        return { s: newS, cnt: newCnt };
    } catch (error) {
        console.error("Error submitting rating:", error);
        throw error;
    }
}

async function getAllComments(engineName) {
    try {
        const doc = await db.collection("ratings").doc(engineName).get();
        if (doc.exists && doc.data().comments) {
            return doc.data().comments;
        }
        return [];
    } catch (error) {
        console.error("Error getting comments:", error);
        return [];
    }
}