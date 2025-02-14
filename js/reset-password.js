// DOM Elements
const resetPasswordForm = document.getElementById('resetPasswordForm');
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

// Get the action code from the URL
function getActionCode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('oobCode');
}

// Handle password reset
resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const actionCode = getActionCode();

    // Validate passwords
    if (newPassword.length < 8) {
        showAlert('Password must be at least 8 characters long', 'warning');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }

    if (!actionCode) {
        showAlert('Invalid password reset link', 'error');
        return;
    }

    try {
        showLoading('Resetting your password...');

        // Verify the password reset code
        await auth.verifyPasswordResetCode(actionCode);
        
        // Confirm the password reset
        await auth.confirmPasswordReset(actionCode, newPassword);

        hideLoading();
        showAlert('Password reset successful! You can now login with your new password.', 'success');

        // Redirect to login page after 2 seconds
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 2000);

    } catch (error) {
        hideLoading();
        let errorMessage = 'Failed to reset password. ';
        switch (error.code) {
            case 'auth/expired-action-code':
                errorMessage += 'The password reset link has expired. Please request a new one.';
                break;
            case 'auth/invalid-action-code':
                errorMessage += 'The password reset link is invalid. Please request a new one.';
                break;
            case 'auth/weak-password':
                errorMessage += 'Please choose a stronger password.';
                break;
            default:
                errorMessage += error.message;
        }
        showAlert(errorMessage, 'error');
    }
});

// Check if we have a valid reset code
window.addEventListener('load', () => {
    const actionCode = getActionCode();
    if (!actionCode) {
        showAlert('Invalid password reset link. Please request a new one.', 'error');
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 3000);
    }
}); 