// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const resetForm = document.getElementById('resetForm');
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const forgotPassword = document.getElementById('forgotPassword');
const backToLogin = document.getElementById('backToLogin');
const googleSignIn = document.getElementById('googleSignIn');
const githubSignIn = document.getElementById('githubSignIn');
const loadingModal = document.getElementById('loadingModal');
const loadingMessage = document.getElementById('loadingMessage');

// Show loading state
function showLoading(message) {
    loadingMessage.textContent = message;
    loadingModal.showModal();
}

// Hide loading state
function hideLoading() {
    loadingModal.close();
}

// Tab switching
loginTab.addEventListener('click', () => {
    loginTab.classList.add('tab-active');
    signupTab.classList.remove('tab-active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    resetForm.classList.add('hidden');
});

signupTab.addEventListener('click', () => {
    signupTab.classList.add('tab-active');
    loginTab.classList.remove('tab-active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    resetForm.classList.add('hidden');
});

// Login functionality
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        showLoading('Logging in...');
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(userCredential.user));
        // Redirect to home page
        window.location.href = 'index.html';
    } catch (error) {
        hideLoading();
        showAlert(error.message, 'error');
    }
});

// Sign up functionality
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        showLoading('Creating your account...');
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Add user to Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name,
            email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update profile
        await userCredential.user.updateProfile({
            displayName: name
        });

        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(userCredential.user));
        // Redirect to home page
        window.location.href = 'index.html';
    } catch (error) {
        hideLoading();
        showAlert(error.message, 'error');
    }
});

// Password reset functionality
forgotPassword.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    resetForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    loginTab.classList.remove('tab-active');
    signupTab.classList.remove('tab-active');
});

backToLogin.addEventListener('click', () => {
    resetForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    loginTab.classList.add('tab-active');
    signupTab.classList.remove('tab-active');
});

resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    
    try {
        showLoading('Sending reset link...');
        await auth.sendPasswordResetEmail(email, {
            url: window.location.origin + '/reset-password.html',
            handleCodeInApp: true
        });
        hideLoading();
        showAlert('Password reset email sent! Please check your inbox and spam folder.', 'success');
        // Return to login form
        resetForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        loginTab.classList.add('tab-active');
        document.getElementById('resetEmail').value = '';
    } catch (error) {
        hideLoading();
        let errorMessage = 'Failed to send reset email. ';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage += 'No account found with this email address.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Please enter a valid email address.';
                break;
            default:
                errorMessage += error.message;
        }
        showAlert(errorMessage, 'error');
    }
});

// Social login handlers
googleSignIn.addEventListener('click', async () => {
    try {
        showLoading('Connecting to Google...');
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Add or update user in Firestore
        await db.collection('users').doc(result.user.uid).set({
            name: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        window.location.href = 'index.html';
    } catch (error) {
        hideLoading();
        showAlert(error.message, 'error');
    }
});

githubSignIn.addEventListener('click', async () => {
    try {
        showLoading('Connecting to GitHub...');
        const provider = new firebase.auth.GithubAuthProvider();
        const result = await auth.signInWithPopup(provider);
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Add or update user in Firestore
        await db.collection('users').doc(result.user.uid).set({
            name: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        window.location.href = 'index.html';
    } catch (error) {
        hideLoading();
        showAlert(error.message, 'error');
    }
});

// Alert function using DaisyUI
function showAlert(message, type) {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} fixed top-4 right-4 w-96 shadow-lg z-50`;
    alert.innerHTML = `
        <div>
            <span>${message}</span>
        </div>
    `;

    // Add alert to page
    document.body.appendChild(alert);

    // Remove alert after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        window.location.href = 'index.html';
    }
}); 