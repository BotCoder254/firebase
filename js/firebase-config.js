// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBMjKssyRSZJ16EhSdVOFd2XjIkj8_BT-E",
    authDomain: "twitterclone-47ebf.firebaseapp.com",
    databaseURL: "https://twitterclone-47ebf-default-rtdb.firebaseio.com",
    projectId: "twitterclone-47ebf",
    storageBucket: "twitterclone-47ebf.appspot.com",
    messagingSenderId: "700556014223",
    appId: "1:700556014223:web:a0646158ade0b1e55ab6fa"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // if already initialized, use that one
}

// Get Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const rtdb = firebase.database();

// Enable persistence for offline support
db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.log('The current browser does not support persistence.');
        }
    });

// Firebase security rules for reference:
/*
// Firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update, delete: if isOwner(userId);
    }
    
    // Blogs collection
    match /blogs/{blogId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && 
        request.auth.uid == resource.data.authorId;
      
      // Likes subcollection
      match /likes/{likeId} {
        allow read: if true;
        allow write: if isAuthenticated();
      }
      
      // Comments subcollection
      match /comments/{commentId} {
        allow read: if true;
        allow create: if isAuthenticated();
        allow update, delete: if isAuthenticated() && 
          request.auth.uid == resource.data.userId;
      }
    }
  }
}

// Storage rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /blog-covers/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.size < 5 * 1024 * 1024 && // 5MB
        request.resource.contentType.matches('image/.*');
    }
    
    match /user-avatars/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.size < 2 * 1024 * 1024 && // 2MB
        request.resource.contentType.matches('image/.*');
    }
  }
}
*/ 