# BlogHub - Modern Blogging Platform

A modern, responsive blogging platform built with Firebase, featuring real-time updates, user authentication, and a beautiful UI powered by DaisyUI and Tailwind CSS.

## Features

- 🔐 User Authentication (Email/Password)
- 📝 Create, Edit, and Delete Blog Posts
- 💬 Comment System
- 👤 User Profiles
- 🌓 Light/Dark Theme
- 📱 Responsive Design
- 🔄 Real-time Updates
- 📊 User Statistics

## Technologies Used

- Firebase (Authentication, Firestore, Storage)
- DaisyUI
- Tailwind CSS
- Font Awesome
- Modern JavaScript (ES6+)

## Setup and Deployment

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bloghub.git
cd bloghub
```

2. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

3. Enable the following Firebase services:
   - Authentication (Email/Password)
   - Cloud Firestore
   - Storage
   - Realtime Database (optional)

4. Set up Firebase Security Rules:
```javascript
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
```

### GitHub Pages Deployment

1. Fork or clone this repository

2. In your GitHub repository settings:
   - Go to "Settings" > "Pages"
   - Under "Build and deployment", select "GitHub Actions" as the source

3. Set up repository secrets:
   - Go to "Settings" > "Secrets and variables" > "Actions"
   - Add the following secrets from your Firebase project:
     ```
     FIREBASE_API_KEY
     FIREBASE_AUTH_DOMAIN
     FIREBASE_DATABASE_URL
     FIREBASE_PROJECT_ID
     FIREBASE_STORAGE_BUCKET
     FIREBASE_MESSAGING_SENDER_ID
     FIREBASE_APP_ID
     ```

4. Add your GitHub Pages domain to Firebase:
   - Go to Firebase Console > Authentication > Sign-in methods
   - Add your GitHub Pages domain (e.g., `yourusername.github.io`) to authorized domains

5. Push to the main branch or manually trigger the workflow:
   - The GitHub Action will automatically build and deploy your site
   - You can monitor the deployment in the "Actions" tab

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 