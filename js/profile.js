// DOM Elements
const loadingState = document.getElementById('loadingState');
const profileSection = document.getElementById('profileSection');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const profileImage = document.getElementById('profileImage');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const blogCount = document.getElementById('blogCount');
const commentCount = document.getElementById('commentCount');
const imageUpload = document.getElementById('imageUpload');
const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileModal = document.getElementById('editProfileModal');
const editProfileForm = document.getElementById('editProfileForm');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const changePasswordModal = document.getElementById('changePasswordModal');
const changePasswordForm = document.getElementById('changePasswordForm');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const deleteAccountModal = document.getElementById('deleteAccountModal');
const deleteAccountForm = document.getElementById('deleteAccountForm');
const loadingModal = document.getElementById('loadingModal');
const loadingMessage = document.getElementById('loadingMessage');
const emailNotifications = document.getElementById('emailNotifications');
const themeSelect = document.getElementById('themeSelect');
const tabs = document.querySelectorAll('.tab');
const tabsContent = document.getElementById('tabsContent');

// Get user ID from URL or current user
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('id');

// Theme Management
function initializeTheme() {
    // Get theme from user settings in Firestore first, fallback to localStorage
    const user = auth.currentUser;
    if (user) {
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists && doc.data().theme) {
                    const userTheme = doc.data().theme;
                    document.documentElement.setAttribute('data-theme', userTheme);
                    themeSelect.value = userTheme;
                } else {
                    const localTheme = localStorage.getItem('theme') || 'light';
                    document.documentElement.setAttribute('data-theme', localTheme);
                    themeSelect.value = localTheme;
                }
            })
            .catch(() => {
                const localTheme = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-theme', localTheme);
                themeSelect.value = localTheme;
            });
    } else {
        const localTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', localTheme);
        themeSelect.value = localTheme;
    }
}

themeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
});

// Show loading state
function showLoading(message) {
    loadingMessage.textContent = message;
    loadingModal.showModal();
}

// Hide loading state
function hideLoading() {
    loadingModal.close();
}

// Show error state
function showError(message) {
    loadingState.classList.add('hidden');
    profileSection.classList.add('hidden');
    errorMessage.textContent = message;
    errorState.classList.remove('hidden');
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

// Get initials from name
function getInitials(name) {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

// Authentication check before loading profile
auth.onAuthStateChanged(async (user) => {
    // Cleanup existing listeners
    cleanupListeners();

    // Update navigation state
    const mobileCreateBlog = document.getElementById('mobileCreateBlog');
    const desktopCreateBlog = document.getElementById('desktopCreateBlog');
    const mobileProfile = document.getElementById('mobileProfile');
    const desktopProfile = document.getElementById('desktopProfile');
    const mobileAuth = document.getElementById('mobileAuth');
    const desktopAuth = document.getElementById('desktopAuth');

    if (user) {
        // Show create blog and profile links, hide auth
        if (mobileCreateBlog) mobileCreateBlog.classList.remove('hidden');
        if (desktopCreateBlog) desktopCreateBlog.classList.remove('hidden');
        if (mobileProfile) mobileProfile.classList.remove('hidden');
        if (desktopProfile) desktopProfile.classList.remove('hidden');
        if (mobileAuth) mobileAuth.classList.add('hidden');
        if (desktopAuth) desktopAuth.classList.add('hidden');
    } else {
        // Hide create blog and profile links, show auth
        if (mobileCreateBlog) mobileCreateBlog.classList.add('hidden');
        if (desktopCreateBlog) desktopCreateBlog.classList.add('hidden');
        if (mobileProfile) mobileProfile.classList.add('hidden');
        if (desktopProfile) desktopProfile.classList.add('hidden');
        if (mobileAuth) mobileAuth.classList.remove('hidden');
        if (desktopAuth) desktopAuth.classList.remove('hidden');

        // If on profile page and not viewing another user's profile, redirect to auth
        if (!userId && window.location.pathname.includes('profile.html')) {
            window.location.href = 'auth.html';
            return;
        }
    }

    // Initialize theme and load profile
    initializeTheme();
    if (user || userId) {
        await loadProfile();
    }
});

// Load user profile
async function loadProfile() {
    try {
        const currentUser = auth.currentUser;
        const targetUserId = userId || currentUser.uid;

        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) {
            throw new Error('Profile not found');
        }

        const userData = userDoc.data();
        const isOwnProfile = currentUser && targetUserId === currentUser.uid;

        // Update profile UI
        updateProfileUI(userData, isOwnProfile);

        // Set up real-time listeners
        setupRealTimeListeners(targetUserId);

        // Show profile section
        loadingState.classList.add('hidden');
        profileSection.classList.remove('hidden');
        errorState.classList.add('hidden');

        // Load initial tab content
        await loadTabContent('blogs');

    } catch (error) {
        console.error('Error loading profile:', error);
        showError(error.message);
    }
}

// Update profile UI
function updateProfileUI(userData, isOwnProfile) {
    // Update profile image
    if (userData.photoURL) {
        profileImage.innerHTML = `<img src="${userData.photoURL}" alt="Profile" class="w-full h-full object-cover rounded-full" />`;
    } else {
        profileImage.innerHTML = `<span class="text-3xl">${getInitials(userData.name || 'Anonymous')}</span>`;
    }

    // Update profile info
    profileName.textContent = userData.name || 'Anonymous';
    profileEmail.textContent = isOwnProfile ? userData.email : '';

    // Update additional info
    const profileBio = document.getElementById('profileBio');
    const profileLocation = document.getElementById('profileLocation').querySelector('span');
    const profileWebsite = document.getElementById('profileWebsite').querySelector('a');
    const lastActive = document.getElementById('lastActive').querySelector('span');

    // Bio
    if (userData.bio) {
        profileBio.textContent = userData.bio;
        profileBio.parentElement.classList.remove('hidden');
    } else {
        profileBio.parentElement.classList.add('hidden');
    }

    // Location
    if (userData.location) {
        profileLocation.textContent = userData.location;
        profileLocation.parentElement.classList.remove('hidden');
    } else {
        profileLocation.parentElement.classList.add('hidden');
    }

    // Website
    if (userData.website) {
        profileWebsite.href = userData.website.startsWith('http') ? userData.website : `https://${userData.website}`;
        profileWebsite.textContent = userData.website.replace(/^https?:\/\//, '');
        profileWebsite.parentElement.classList.remove('hidden');
    } else {
        profileWebsite.parentElement.classList.add('hidden');
    }

    // Last active
    if (userData.lastActive) {
        const lastActiveDate = userData.lastActive.toDate();
        const now = new Date();
        const diffMinutes = Math.floor((now - lastActiveDate) / (1000 * 60));
        
        let lastActiveText = '';
        if (diffMinutes < 1) {
            lastActiveText = 'Just now';
        } else if (diffMinutes < 60) {
            lastActiveText = `${diffMinutes}m ago`;
        } else if (diffMinutes < 1440) {
            const hours = Math.floor(diffMinutes / 60);
            lastActiveText = `${hours}h ago`;
        } else {
            lastActiveText = formatDate(userData.lastActive);
        }
        
        lastActive.textContent = isOwnProfile ? 'Online' : `Last seen ${lastActiveText}`;
        lastActive.parentElement.classList.remove('hidden');
    } else {
        lastActive.parentElement.classList.add('hidden');
    }

    // Show/hide edit buttons and settings for own profile only
    if (editProfileBtn) editProfileBtn.style.display = isOwnProfile ? 'block' : 'none';
    if (document.querySelector('[data-tab="settings"]')) {
        document.querySelector('[data-tab="settings"]').style.display = isOwnProfile ? 'block' : 'none';
    }
    if (document.getElementById('settingsTab')) {
        document.getElementById('settingsTab').style.display = isOwnProfile ? 'block' : 'none';
    }

    // Update stats trends
    const blogTrend = document.getElementById('blogTrend');
    const commentTrend = document.getElementById('commentTrend');
    
    if (userData.stats) {
        if (userData.stats.blogsLastMonth !== undefined && userData.stats.blogsThisMonth !== undefined) {
            const blogDiff = userData.stats.blogsThisMonth - userData.stats.blogsLastMonth;
            blogTrend.textContent = `${blogDiff >= 0 ? '↗' : '↘'} ${Math.abs(blogDiff)} from last month`;
        }
        
        if (userData.stats.commentsLastMonth !== undefined && userData.stats.commentsThisMonth !== undefined) {
            const commentDiff = userData.stats.commentsThisMonth - userData.stats.commentsLastMonth;
            commentTrend.textContent = `${commentDiff >= 0 ? '↗' : '↘'} ${Math.abs(commentDiff)} from last month`;
        }
    }
}

// Set up real-time listeners
function setupRealTimeListeners(profileUserId) {
    // Blogs count listener
    const blogsUnsubscribe = db.collection('blogs')
        .where('authorId', '==', profileUserId)
        .onSnapshot(snapshot => {
            const publishedCount = snapshot.docs.filter(doc => doc.data().status === 'published').length;
            const draftsCount = snapshot.docs.filter(doc => doc.data().status === 'draft').length;
            
            if (blogCount) blogCount.textContent = publishedCount;
            
            // Update drafts tab badge if it exists
            const draftsTab = document.querySelector('[data-tab="drafts"]');
            if (draftsTab && draftsCount > 0) {
                draftsTab.innerHTML = `Drafts <span class="badge badge-sm">${draftsCount}</span>`;
            }
        }, error => {
            console.error('Error in blogs listener:', error);
            showAlert('Error fetching blog counts', 'error');
        });

    // Enhanced Comments count listener with better error handling
    const commentsUnsubscribe = db.collectionGroup('comments')
        .where('userId', '==', profileUserId)
        .onSnapshot(snapshot => {
            const totalComments = snapshot.size;
            if (commentCount) commentCount.textContent = totalComments;

            // Update comments tab badge if it exists
            const commentsTab = document.querySelector('[data-tab="comments"]');
            if (commentsTab && totalComments > 0) {
                commentsTab.innerHTML = `Comments <span class="badge badge-sm">${totalComments}</span>`;
            }
        }, error => {
            console.error('Error in comments listener:', error);
            showAlert('Error fetching comment counts', 'error');
        });

    // User activity tracking
    const userActivityUnsubscribe = db.collection('users').doc(profileUserId)
        .onSnapshot(doc => {
            if (doc.exists) {
                const userData = doc.data();
                updateProfileUI(userData, auth.currentUser && profileUserId === auth.currentUser.uid);
                
                // Update last active status if it's the current user
                if (auth.currentUser && profileUserId === auth.currentUser.uid) {
                    db.collection('users').doc(profileUserId).update({
                        lastActive: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(error => console.error('Error updating last active:', error));
                }
            }
        }, error => {
            console.error('Error in user activity listener:', error);
            showAlert('Error tracking user activity', 'error');
        });

    // Store unsubscribe functions for cleanup
    window._unsubscribeFunctions = {
        blogs: blogsUnsubscribe,
        comments: commentsUnsubscribe,
        userActivity: userActivityUnsubscribe
    };
}

// Cleanup function for listeners
function cleanupListeners() {
    if (window._unsubscribeFunctions) {
        Object.values(window._unsubscribeFunctions).forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        window._unsubscribeFunctions = null;
    }
}

// Load tab content
async function loadTabContent(tabName) {
    const targetUserId = userId || auth.currentUser.uid;
    const tabContent = document.getElementById(`${tabName}Tab`);
    if (!tabContent) return;

    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('tab-active', tab.getAttribute('data-tab') === tabName);
    });

    // Show selected tab content
    Object.keys(tabsContent.children).forEach(key => {
        const tab = tabsContent.children[key];
        tab.classList.toggle('hidden', tab.id !== `${tabName}Tab`);
    });

    try {
        switch (tabName) {
            case 'blogs':
                await loadBlogs(targetUserId, false);
                break;
            case 'drafts':
                if (targetUserId === auth.currentUser?.uid) {
                    await loadBlogs(targetUserId, true);
                }
                break;
            case 'comments':
                await loadComments(targetUserId);
                break;
            case 'settings':
                if (targetUserId === auth.currentUser?.uid) {
                    loadSettings();
                }
                break;
        }
    } catch (error) {
        console.error(`Error loading ${tabName}:`, error);
        showAlert(`Error loading ${tabName}. Please try again.`, 'error');
    }
}

// Load blogs with real-time updates
async function loadBlogs(userId, isDrafts) {
    const container = document.getElementById(isDrafts ? 'draftsTab' : 'blogsTab');
    if (!container) return;
    
    container.innerHTML = '<div class="loading loading-spinner loading-lg"></div>';

    try {
        // Create query without composite index requirement
        const query = db.collection('blogs')
            .where('authorId', '==', userId);

        // Set up real-time listener with error handling
        const unsubscribe = query.onSnapshot(snapshot => {
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <div class="max-w-md mx-auto">
                            <i class="fas fa-file-alt text-6xl text-gray-300 mb-4"></i>
                            <h3 class="text-xl font-semibold mb-2">No ${isDrafts ? 'drafts' : 'blogs'} found</h3>
                            <p class="text-gray-500 mb-4">Start writing your first blog post!</p>
                            <a href="create-blog.html" class="btn btn-primary">
                                <i class="fas fa-pen mr-2"></i>Create Blog
                            </a>
                        </div>
                    </div>
                `;
                return;
            }

            // Process and sort the documents in memory
            const blogs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(blog => blog.status === (isDrafts ? 'draft' : 'published'))
                .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

            if (blogs.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <div class="max-w-md mx-auto">
                            <i class="fas fa-file-alt text-6xl text-gray-300 mb-4"></i>
                            <h3 class="text-xl font-semibold mb-2">No ${isDrafts ? 'drafts' : 'blogs'} found</h3>
                            <p class="text-gray-500 mb-4">Start writing your first blog post!</p>
                            <a href="create-blog.html" class="btn btn-primary">
                                <i class="fas fa-pen mr-2"></i>Create Blog
                            </a>
                        </div>
                    </div>
                `;
                return;
            }

            container.innerHTML = '';
            const fragment = document.createDocumentFragment();
            
            blogs.forEach(blog => {
                const blogCard = createBlogCard(blog.id, blog, isDrafts);
                fragment.appendChild(blogCard);
            });
            
            container.appendChild(fragment);
        }, error => {
            console.error('Error loading blogs:', error);
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="max-w-md mx-auto">
                        <i class="fas fa-exclamation-circle text-4xl text-error mb-4"></i>
                        <h3 class="text-xl font-semibold mb-2">Error loading ${isDrafts ? 'drafts' : 'blogs'}</h3>
                        <p class="text-gray-500 mb-4">${error.message}</p>
                        <button onclick="loadBlogs('${userId}', ${isDrafts})" class="btn btn-primary">
                            <i class="fas fa-sync-alt mr-2"></i>Try Again
                        </button>
                    </div>
                </div>
            `;
        });

        // Cleanup listener when tab changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (container.classList.contains('hidden')) {
                        unsubscribe();
                    }
                }
            });
        });

        observer.observe(container, { attributes: true });
        
        // Store unsubscribe function for cleanup
        container.dataset.unsubscribe = unsubscribe;
        
    } catch (error) {
        console.error('Error setting up blogs listener:', error);
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="max-w-md mx-auto">
                    <i class="fas fa-exclamation-circle text-4xl text-error mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">Error loading ${isDrafts ? 'drafts' : 'blogs'}</h3>
                    <p class="text-gray-500 mb-4">${error.message}</p>
                    <button onclick="loadBlogs('${userId}', ${isDrafts})" class="btn btn-primary">
                        <i class="fas fa-sync-alt mr-2"></i>Try Again
                    </button>
                </div>
            </div>
        `;
    }
}

// Create blog card with fixed layout
function createBlogCard(id, blog, isDraft = false) {
    const div = document.createElement('div');
    div.className = 'card bg-base-100 shadow-xl overflow-hidden';
    
    const date = formatDate(blog.createdAt);
    const truncatedContent = blog.content.replace(/<[^>]*>/g, '').slice(0, 150) + (blog.content.length > 150 ? '...' : '');
    
    div.innerHTML = `
        <div class="card-body p-6">
            <div class="flex items-center justify-between gap-4">
                <h3 class="card-title text-lg flex-1 line-clamp-1">${blog.title}</h3>
                ${isDraft ? '<div class="badge badge-warning shrink-0">Draft</div>' : ''}
            </div>
            <p class="line-clamp-2 text-sm text-gray-600 mt-2">${truncatedContent}</p>
            <div class="flex flex-wrap gap-2 mt-3">
                ${blog.tags?.map(tag => `<span class="badge badge-outline badge-sm">${tag}</span>`).join('') || ''}
            </div>
            <div class="flex justify-between items-center mt-4 pt-3 border-t border-base-200">
                <span class="text-sm text-gray-500">${date}</span>
                <div class="flex gap-2">
                    <a href="edit-blog.html?id=${id}" class="btn btn-outline btn-sm">
                        <i class="fas fa-edit mr-2"></i>Edit
                    </a>
                    <a href="blog.html?id=${id}" class="btn btn-primary btn-sm">
                        <i class="fas fa-eye mr-2"></i>View
                    </a>
                </div>
            </div>
        </div>
    `;
    
    return div;
}

// Load comments with real-time updates
async function loadComments(userId) {
    const container = document.getElementById('commentsTab');
    if (!container) return;

    container.innerHTML = '<div class="loading loading-spinner loading-lg"></div>';

    try {
        // Get all blogs first
        const blogsSnapshot = await db.collection('blogs').get();
        const commentListeners = [];

        // Function to update comments display
        const updateCommentsDisplay = (allComments) => {
            if (allComments.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <div class="max-w-md mx-auto">
                            <i class="fas fa-comments text-6xl text-gray-300 mb-4"></i>
                            <h3 class="text-xl font-semibold mb-2">No comments yet</h3>
                            <p class="text-gray-500">Start engaging with blog posts!</p>
                        </div>
                    </div>
                `;
                return;
            }

            container.innerHTML = '';
            const fragment = document.createDocumentFragment();
            
            allComments
                .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())
                .forEach(comment => {
                    const commentCard = createCommentCard(comment);
                    fragment.appendChild(commentCard);
                });
            
            container.appendChild(fragment);
        };

        // Set up real-time listeners for comments in each blog
        blogsSnapshot.docs.forEach(blogDoc => {
            const unsubscribe = blogDoc.ref.collection('comments')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .onSnapshot(commentsSnapshot => {
                    const comments = commentsSnapshot.docs.map(commentDoc => ({
                        id: commentDoc.id,
                        blogId: blogDoc.id,
                        blogTitle: blogDoc.data().title,
                        ...commentDoc.data()
                    }));

                    // Update the comments for this blog in the listeners array
                    const listenerIndex = commentListeners.findIndex(l => l.blogId === blogDoc.id);
                    if (listenerIndex !== -1) {
                        commentListeners[listenerIndex].comments = comments;
                    } else {
                        commentListeners.push({ blogId: blogDoc.id, comments, unsubscribe });
                    }

                    // Get all comments from all listeners
                    const allComments = commentListeners.flatMap(listener => listener.comments || []);
                    updateCommentsDisplay(allComments);
                }, error => {
                    console.error('Error in comments listener:', error);
                    showAlert(`Error loading comments: ${error.message}`, 'error');
                });
        });

        // Cleanup listeners when tab changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (container.classList.contains('hidden')) {
                        commentListeners.forEach(listener => listener.unsubscribe());
                    }
                }
            });
        });

        observer.observe(container, { attributes: true });
        
        // Store listeners for cleanup
        container.dataset.listeners = JSON.stringify(commentListeners.map(l => l.blogId));
        
    } catch (error) {
        console.error('Error setting up comments listeners:', error);
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="max-w-md mx-auto">
                    <i class="fas fa-exclamation-circle text-4xl text-error mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">Error loading comments</h3>
                    <p class="text-gray-500 mb-4">${error.message}</p>
                    <button onclick="loadComments('${userId}')" class="btn btn-primary">
                        <i class="fas fa-sync-alt mr-2"></i>Try Again
                    </button>
                </div>
            </div>
        `;
    }
}

// Load settings
function loadSettings() {
    const settingsTab = document.getElementById('settingsTab');
    if (!settingsTab) return;

    // Theme settings
    initializeTheme();

    // Email notification settings
    db.collection('users').doc(auth.currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                emailNotifications.checked = doc.data().emailNotifications || false;
            }
        });

    // Event listeners for settings changes
    emailNotifications.addEventListener('change', async (e) => {
        try {
            await db.collection('users').doc(auth.currentUser.uid)
                .update({ emailNotifications: e.target.checked });
            showAlert('Settings updated successfully', 'success');
        } catch (error) {
            console.error('Error updating settings:', error);
            showAlert('Error updating settings', 'error');
            e.target.checked = !e.target.checked;
        }
    });
}

// Create comment card
function createCommentCard(comment) {
    const div = document.createElement('div');
    div.className = 'card bg-base-100 shadow-xl';
    
    const date = formatDate(comment.createdAt);
    
    div.innerHTML = `
        <div class="card-body">
            <div class="flex items-center justify-between mb-2">
                <a href="blog.html?id=${comment.blogId}" class="link link-hover font-medium">
                    ${comment.blogTitle}
                </a>
                <span class="text-sm text-gray-500">${date}</span>
            </div>
            <p class="text-gray-700">${comment.content}</p>
            <div class="card-actions justify-end mt-4">
                <button class="btn btn-ghost btn-sm" onclick="editComment('${comment.id}', '${comment.blogId}')">
                    <i class="fas fa-edit mr-2"></i>Edit
                </button>
                <button class="btn btn-ghost btn-sm text-error" onclick="deleteComment('${comment.id}', '${comment.blogId}')">
                    <i class="fas fa-trash mr-2"></i>Delete
                </button>
            </div>
        </div>
    `;
    
    return div;
}

// Handle profile image upload
imageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
        showAlert('Please select an image file', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showAlert('Image must be less than 5MB', 'error');
        return;
    }

    try {
        showLoading('Uploading image...');

        // Create a reference to the storage location
        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(`profile-images/${auth.currentUser.uid}/${file.name}`);

        // Upload the file
        const snapshot = await fileRef.put(file);
        const photoURL = await snapshot.ref.getDownloadURL();

        // Update user profile
        await Promise.all([
            auth.currentUser.updateProfile({ photoURL }),
            db.collection('users').doc(auth.currentUser.uid).update({
                photoURL,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
        ]);

        showAlert('Profile image updated successfully!', 'success');
    } catch (error) {
        console.error('Error uploading image:', error);
        showAlert('Error uploading image', 'error');
    } finally {
        hideLoading();
        imageUpload.value = ''; // Reset file input
    }
});

// Handle edit profile
editProfileBtn.addEventListener('click', async () => {
    try {
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        const userData = userDoc.data();
        
        document.getElementById('editName').value = userData.name || '';
        document.getElementById('editBio').value = userData.bio || '';
        document.getElementById('editWebsite').value = userData.website || '';
        document.getElementById('editLocation').value = userData.location || '';
        document.getElementById('editShowEmail').checked = userData.showEmail || false;
        
        editProfileModal.showModal();
    } catch (error) {
        console.error('Error loading user data:', error);
        showAlert('Error loading profile data', 'error');
    }
});

editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitButton = editProfileForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loading loading-spinner"></span> Saving...';
    
    try {
        const name = document.getElementById('editName').value.trim();
        const bio = document.getElementById('editBio').value.trim();
        let website = document.getElementById('editWebsite').value.trim();
        const location = document.getElementById('editLocation').value.trim();
        const showEmail = document.getElementById('editShowEmail').checked;

        // Basic validation
        if (!name) {
            throw new Error('Display name is required');
        }

        if (bio.length > 160) {
            throw new Error('Bio must be 160 characters or less');
        }

        // Website validation and formatting
        if (website) {
            try {
                // Add https:// if no protocol specified
                if (!website.match(/^https?:\/\//i)) {
                    website = 'https://' + website;
                }
                new URL(website); // Will throw if invalid URL
            } catch {
                throw new Error('Please enter a valid website URL');
            }
        }

        // Update user profile
        await db.collection('users').doc(auth.currentUser.uid).update({
            name,
            bio,
            website,
            location,
            showEmail,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update display name in Firebase Auth
        await auth.currentUser.updateProfile({
            displayName: name
        });

        showAlert('Profile updated successfully!', 'success');
        editProfileModal.close();
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert(error.message || 'Error updating profile', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Save Changes';
    }
});

// Handle change password
changePasswordBtn.addEventListener('click', () => {
    changePasswordModal.showModal();
});

changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showAlert('New passwords do not match', 'error');
        return;
    }

    try {
        showLoading('Changing password...');

        const user = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );

        // Reauthenticate user
        await user.reauthenticateWithCredential(credential);
        
        // Update password
        await user.updatePassword(newPassword);

        hideLoading();
        changePasswordModal.close();
        showAlert('Password changed successfully!', 'success');
        changePasswordForm.reset();

    } catch (error) {
        hideLoading();
        showAlert(error.message, 'error');
    }
});

// Handle delete account
deleteAccountBtn.addEventListener('click', () => {
    deleteAccountModal.showModal();
});

deleteAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('deleteAccountPassword').value;

    try {
        showLoading('Deleting account...');

        const user = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            password
        );

        // Reauthenticate user
        await user.reauthenticateWithCredential(credential);
        
        // Delete user data from Firestore
        await db.collection('users').doc(user.uid).delete();
        
        // Delete user account
        await user.delete();

        hideLoading();
        window.location.href = 'index.html';

    } catch (error) {
        hideLoading();
        showAlert(error.message, 'error');
    }
});

// Handle theme change with persistence
themeSelect.addEventListener('change', async (e) => {
    const theme = e.target.value;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    try {
        const user = auth.currentUser;
        if (user) {
            await db.collection('users').doc(user.uid).update({
                theme,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update all open tabs
            const bc = new BroadcastChannel('theme_change');
            bc.postMessage({ theme });
        }
    } catch (error) {
        console.error('Error saving theme preference:', error);
        showAlert('Error saving theme preference. Changes may not persist across sessions.', 'warning');
    }
});

// Listen for theme changes from other tabs
const themeBC = new BroadcastChannel('theme_change');
themeBC.onmessage = (event) => {
    const { theme } = event.data;
    document.documentElement.setAttribute('data-theme', theme);
    themeSelect.value = theme;
};

// Cleanup function for listeners
window.addEventListener('beforeunload', () => {
    // Cleanup theme broadcast channel
    themeBC.close();
    
    // Cleanup blog listeners
    const blogTabs = ['blogsTab', 'draftsTab'];
    blogTabs.forEach(tabId => {
        const container = document.getElementById(tabId);
        if (container && container.dataset.unsubscribe) {
            const unsubscribe = new Function(container.dataset.unsubscribe);
            unsubscribe();
        }
    });
    
    // Cleanup comment listeners
    const commentsTab = document.getElementById('commentsTab');
    if (commentsTab && commentsTab.dataset.listeners) {
        const listeners = JSON.parse(commentsTab.dataset.listeners);
        listeners.forEach(blogId => {
            const unsubscribe = new Function(commentsTab.dataset[`unsubscribe_${blogId}`]);
            unsubscribe();
        });
    }
});

// Handle email notifications toggle
emailNotifications.addEventListener('change', async (e) => {
    try {
        const user = auth.currentUser;
        await db.collection('users').doc(user.uid).update({
            emailNotifications: e.target.checked
        });
    } catch (error) {
        console.error('Error saving notification preference:', error);
        emailNotifications.checked = !emailNotifications.checked;
    }
});

// Handle tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Update active state
        tabs.forEach(t => t.classList.remove('tab-active'));
        tab.classList.add('tab-active');

        // Show corresponding content
        const tabName = tab.getAttribute('data-tab');
        const tabContents = tabsContent.children;
        for (const content of tabContents) {
            content.classList.add('hidden');
        }
        document.getElementById(`${tabName}Tab`).classList.remove('hidden');

        // Load tab content
        loadTabContent(tabName);
    });
});

// Share profile functionality
const shareProfileBtn = document.getElementById('shareProfileBtn');
if (shareProfileBtn) {
    shareProfileBtn.addEventListener('click', async () => {
        const profileUrl = `${window.location.origin}${window.location.pathname}${userId ? `?id=${userId}` : ''}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${profileName.textContent}'s Profile - BlogHub`,
                    text: `Check out ${profileName.textContent}'s profile on BlogHub!`,
                    url: profileUrl
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                    fallbackShare(profileUrl);
                }
            }
        } else {
            fallbackShare(profileUrl);
        }
    });
}

// Fallback share functionality
function fallbackShare(url) {
    // Create a temporary input element
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    
    // Copy the URL
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    
    // Show success message
    showAlert('Profile URL copied to clipboard!', 'success');
} 