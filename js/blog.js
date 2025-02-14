// Get blog ID from URL
const urlParams = new URLSearchParams(window.location.search);
const blogId = urlParams.get('id');

// DOM Elements
const loadingState = document.getElementById('loadingState');
const blogPost = document.getElementById('blogPost');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const authorActions = document.getElementById('authorActions');
const shareModal = document.getElementById('shareModal');
const deleteModal = document.getElementById('deleteModal');
const confirmDelete = document.getElementById('confirmDelete');
const createBlogLinks = document.querySelectorAll('#mobileCreateBlog, #desktopCreateBlog');
const authLinks = document.querySelectorAll('#mobileAuth, #desktopAuth');
const likeCount = document.getElementById('likeCount');
const viewCount = document.getElementById('viewCount') || { textContent: '0' }; // Provide default value

// Global variable to store blog data
let currentBlog = null;

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (user) {
        createBlogLinks.forEach(link => link.classList.remove('hidden'));
        authLinks.forEach(link => {
            link.innerHTML = `<a href="#" onclick="signOut()"><i class="fas fa-sign-out-alt mr-2"></i>Sign Out</a>`;
        });
    } else {
        createBlogLinks.forEach(link => link.classList.add('hidden'));
        authLinks.forEach(link => {
            link.innerHTML = `<a href="auth.html"><i class="fas fa-user mr-2"></i>Login/Sign Up</a>`;
        });
    }
});

// Load blog post
async function loadBlog() {
    try {
        if (!blogId) {
            throw new Error('Blog post not found');
        }

        const docRef = db.collection('blogs').doc(blogId);
        
        // Set up real-time listener for blog data
        const unsubscribeBlog = docRef.onSnapshot(async (doc) => {
            if (!doc.exists) {
                throw new Error('Blog post not found');
            }

            const blog = doc.data();
            currentBlog = { id: doc.id, ...blog }; // Store blog data globally
            
            // Update page title
            document.title = `${blog.title} - BlogHub`;

            // Update meta tags for SEO and social sharing
            updateMetaTags(blog);

            // Populate blog content
            document.getElementById('coverImage').src = blog.coverImage || 'https://placehold.co/1200x600';
            document.getElementById('coverImage').alt = blog.title;
            document.getElementById('blogTitle').textContent = blog.title;
            document.getElementById('authorName').textContent = blog.authorName;
            document.getElementById('publishDate').textContent = formatDate(blog.createdAt);
            document.getElementById('category').textContent = blog.category;
            document.getElementById('blogContent').innerHTML = blog.content;
            
            // Populate tags
            const tagsList = document.getElementById('tagsList');
            tagsList.innerHTML = blog.tags.map(tag => 
                `<span class="badge badge-outline">${tag}</span>`
            ).join('');

            // Author info
            const authorInitials = blog.authorName
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase();
            document.getElementById('authorInitials').textContent = authorInitials;
            document.getElementById('authorNameBio').textContent = blog.authorName;

            // Show edit/delete buttons if current user is the author
            const user = auth.currentUser;
            if (user && user.uid === blog.authorId) {
                authorActions.classList.remove('hidden');
                document.getElementById('editBtn').href = `edit-blog.html?id=${blogId}`;
            }

            // Show blog post
            loadingState.classList.add('hidden');
            blogPost.classList.remove('hidden');
            errorState.classList.add('hidden');

            // Update view count
            if (user) {
                const viewsRef = docRef.collection('meta').doc('views');
                const viewsDoc = await viewsRef.get();
                
                if (!viewsDoc.exists) {
                    await viewsRef.set({ count: 1, viewers: [user.uid] });
                } else {
                    const data = viewsDoc.data();
                    if (!data.viewers.includes(user.uid)) {
                        await viewsRef.update({
                            count: firebase.firestore.FieldValue.increment(1),
                            viewers: firebase.firestore.FieldValue.arrayUnion(user.uid)
                        });
                    }
                }
            }
        }, error => {
            console.error('Error in blog snapshot:', error);
            showError(error.message);
        });

        // Set up real-time listener for likes
        const unsubscribeLikes = docRef.collection('meta').doc('likes')
            .onSnapshot((doc) => {
                if (doc.exists) {
                    likeCount.textContent = doc.data().count || 0;
                }
            }, error => {
                console.error('Error in likes snapshot:', error);
            });

        // Set up real-time listener for views
        const unsubscribeViews = docRef.collection('meta').doc('views')
            .onSnapshot((doc) => {
                if (doc.exists) {
                    viewCount.textContent = doc.data().count || 0;
                }
            }, error => {
                console.error('Error in views snapshot:', error);
            });

        // Clean up listeners on page unload
        window.addEventListener('unload', () => {
            unsubscribeBlog();
            unsubscribeLikes();
            unsubscribeViews();
        });

    } catch (error) {
        console.error('Error loading blog:', error);
        showError(error.message);
    }
}

// Show error state
function showError(message) {
    loadingState.classList.add('hidden');
    blogPost.classList.add('hidden');
    errorMessage.textContent = message;
    errorState.classList.remove('hidden');
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

// Update meta tags
function updateMetaTags(blog) {
    // Create meta tags if they don't exist
    const metaTags = {
        'description': blog.content.substring(0, 160),
        'og:title': blog.title,
        'og:description': blog.content.substring(0, 160),
        'og:image': blog.coverImage || 'https://placehold.co/1200x600',
        'og:url': window.location.href,
        'twitter:card': 'summary_large_image'
    };

    Object.entries(metaTags).forEach(([name, content]) => {
        let meta = document.querySelector(`meta[property="${name}"]`) ||
                   document.querySelector(`meta[name="${name}"]`);
        
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
            document.head.appendChild(meta);
        }
        
        meta.setAttribute('content', content);
    });
}

// Like functionality
document.getElementById('likeBtn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }

    const likeRef = db.collection('blogs').doc(blogId).collection('likes').doc(user.uid);
    const metaRef = db.collection('blogs').doc(blogId).collection('meta').doc('likes');

    try {
        const likeDoc = await likeRef.get();
        const batch = db.batch();

        if (likeDoc.exists) {
            // Unlike
            batch.delete(likeRef);
            batch.set(metaRef, {
                count: firebase.firestore.FieldValue.increment(-1)
            }, { merge: true });

            document.getElementById('likeBtn').classList.remove('text-primary');
            document.getElementById('likeBtn').querySelector('i').classList.remove('fas');
            document.getElementById('likeBtn').querySelector('i').classList.add('far');
            document.getElementById('likeCount').textContent = 
                parseInt(document.getElementById('likeCount').textContent) - 1;
        } else {
            // Like
            batch.set(likeRef, {
                userId: user.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            batch.set(metaRef, {
                count: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });

            document.getElementById('likeBtn').classList.add('text-primary');
            document.getElementById('likeBtn').querySelector('i').classList.remove('far');
            document.getElementById('likeBtn').querySelector('i').classList.add('fas');
            document.getElementById('likeCount').textContent = 
                parseInt(document.getElementById('likeCount').textContent) + 1;
        }

        await batch.commit();
    } catch (error) {
        console.error('Error updating like:', error);
        showAlert('Error updating like. Please try again.', 'error');
    }
});

// Share functionality
document.getElementById('shareBtn').addEventListener('click', () => {
    shareModal.showModal();
});

function shareSocial(platform) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.getElementById('blogTitle').textContent);
    
    let shareUrl;
    switch (platform) {
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`;
            break;
    }
    
    window.open(shareUrl, '_blank');
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href)
        .then(() => {
            showAlert('Link copied to clipboard!', 'success');
            shareModal.close();
        })
        .catch(() => {
            showAlert('Failed to copy link. Please try again.', 'error');
        });
}

// Delete functionality
document.getElementById('deleteBtn').addEventListener('click', () => {
    deleteModal.showModal();
});

confirmDelete.addEventListener('click', async () => {
    try {
        await db.collection('blogs').doc(blogId).delete();
        showAlert('Blog post deleted successfully!', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } catch (error) {
        console.error('Error deleting blog:', error);
        showAlert('Error deleting blog post. Please try again.', 'error');
    }
});

// Sign out functionality
async function signOut() {
    try {
        await auth.signOut();
        window.location.reload();
    } catch (error) {
        console.error('Error signing out:', error);
        showAlert('Error signing out. Please try again.', 'error');
    }
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
    alert.className = `alert alert-${type} fixed top-4 right-4 w-96 shadow-lg`;
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

// Load blog on page load
loadBlog();

// Comments functionality
const commentForm = document.getElementById('commentForm');
const commentLoginPrompt = document.getElementById('commentLoginPrompt');
const commentsList = document.getElementById('commentsList');
const loadMoreComments = document.getElementById('loadMoreComments');
let lastCommentDoc = null;
const COMMENTS_PER_PAGE = 10;

// Show/hide comment form based on auth state
auth.onAuthStateChanged((user) => {
    if (user) {
        commentForm.classList.remove('hidden');
        commentLoginPrompt.classList.add('hidden');
    } else {
        commentForm.classList.add('hidden');
        commentLoginPrompt.classList.remove('hidden');
    }
});

// Add comment form handler
commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('commentContent').value.trim();
    
    if (!content) {
        showAlert('Please write a comment', 'warning');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('You must be logged in to comment');

        const commentData = {
            content,
            userId: user.uid,
            authorName: user.displayName || 'Anonymous',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add comment to Firestore
        await db.collection('blogs').doc(blogId)
            .collection('comments')
            .add(commentData);

        // Clear form
        commentForm.reset();
        
        // Show success message
        showAlert('Comment posted successfully!', 'success');
        
        // Reload comments immediately
        await loadComments();

    } catch (error) {
        console.error('Error posting comment:', error);
        showAlert(error.message, 'error');
    }
});

// Load more comments
loadMoreComments.addEventListener('click', async () => {
    if (lastCommentDoc) {
        try {
            const commentsRef = db.collection('blogs').doc(blogId)
                .collection('comments')
                .orderBy('createdAt', 'desc')
                .startAfter(lastCommentDoc)
                .limit(COMMENTS_PER_PAGE);
                
            const snapshot = await commentsRef.get();
            
            if (!snapshot.empty) {
                await loadComments(true);
            } else {
                loadMoreComments.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error loading more comments:', error);
            showAlert('Error loading more comments. Please try again.', 'error');
        }
    }
});

// Helper function to get initials from name
function getInitials(name = '') {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase() || 'A';
}

// Load comments
async function loadComments(append = false) {
    if (!blogId) return;
    
    try {
        const commentsRef = db.collection('blogs').doc(blogId).collection('comments')
            .orderBy('createdAt', 'desc')
            .limit(COMMENTS_PER_PAGE);
            
        const snapshot = await commentsRef.get();
        
        if (snapshot.empty && !append) {
            commentsList.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            `;
            loadMoreComments.classList.add('hidden');
            return;
        }
        
        // Get all comments
        const comments = [];
        snapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        
        // Organize comments into a tree structure
        const commentTree = [];
        const commentMap = new Map();
        
        // First pass: create map of all comments
        comments.forEach(comment => {
            comment.replies = [];
            commentMap.set(comment.id, comment);
        });
        
        // Second pass: organize into tree
        comments.forEach(comment => {
            if (comment.parentId) {
                const parent = commentMap.get(comment.parentId);
                if (parent) {
                    parent.replies.push(comment);
                } else {
                    commentTree.push(comment); // If parent not found, add as top-level comment
                }
            } else {
                commentTree.push(comment);
            }
        });
        
        // Sort comments by date
        const sortComments = (comments) => {
            comments.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            comments.forEach(comment => {
                if (comment.replies.length > 0) {
                    sortComments(comment.replies);
                }
            });
        };
        sortComments(commentTree);
        
        // Clear existing comments if not appending
        if (!append) {
            commentsList.innerHTML = '';
        }

        // Create and append comment elements
        const fragment = document.createDocumentFragment();
        for (const comment of commentTree) {
            const commentEl = await createCommentElement(comment);
            fragment.appendChild(commentEl);
        }
        commentsList.appendChild(fragment);

        // Update load more button visibility
        loadMoreComments.classList.toggle('hidden', comments.length < COMMENTS_PER_PAGE);
        
        // Store the last document for pagination
        lastCommentDoc = snapshot.docs[snapshot.docs.length - 1];

    } catch (error) {
        console.error('Error loading comments:', error);
        showAlert('Error loading comments. Please try again.', 'error');
    }
}

// Create comment element with updated styling
async function createCommentElement(comment, level = 0) {
    const div = document.createElement('div');
    div.className = 'bg-base-200 rounded-lg p-4 mb-3';
    if (level > 0) {
        div.style.marginLeft = `${level * 1.5}rem`;
    }
    
    // Format date
    const date = comment.createdAt ? new Date(comment.createdAt.toDate()).toLocaleDateString() : 'Unknown date';
    
    // Get user data
    let userData = { name: 'Anonymous' };
    try {
        const userDoc = await db.collection('users').doc(comment.userId).get();
        if (userDoc.exists) {
            userData = userDoc.data();
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }

    div.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="avatar placeholder">
                <div class="bg-neutral-focus text-neutral-content rounded-full w-8">
                    <span class="text-xs">${getInitials(userData.name)}</span>
                </div>
            </div>
            <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                    <div>
                        <span class="font-semibold text-sm">${userData.name}</span>
                        <span class="text-xs text-gray-500 ml-2">${date}</span>
                    </div>
                    ${comment.userId === auth.currentUser?.uid ? `
                        <div class="flex gap-2">
                            <button class="btn btn-ghost btn-xs" onclick="editComment('${comment.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-ghost btn-xs text-error" onclick="deleteComment('${comment.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <p id="commentContent-${comment.id}" class="text-sm mb-2">${comment.content}</p>
                <form id="editForm-${comment.id}" class="hidden mb-2">
                    <textarea class="textarea textarea-bordered textarea-sm w-full mb-2">${comment.content}</textarea>
                    <div class="flex justify-end gap-2">
                        <button type="button" class="btn btn-ghost btn-xs" onclick="cancelEdit('${comment.id}')">Cancel</button>
                        <button type="submit" class="btn btn-primary btn-xs">Update</button>
                    </div>
                </form>
                <div class="flex items-center gap-4 mt-2">
                    <button class="btn btn-ghost btn-xs" onclick="toggleReplyForm('${comment.id}')">
                        <i class="fas fa-reply text-xs"></i>
                        <span class="ml-1">Reply</span>
                    </button>
                    ${comment.replies.length > 0 ? `
                        <span class="text-xs text-gray-500">
                            ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                    ` : ''}
                </div>
                <form id="replyForm-${comment.id}" class="hidden mt-2">
                    <textarea class="textarea textarea-bordered textarea-sm w-full mb-2" placeholder="Write your reply..."></textarea>
                    <div class="flex justify-end gap-2">
                        <button type="button" class="btn btn-ghost btn-xs" onclick="toggleReplyForm('${comment.id}')">Cancel</button>
                        <button type="submit" class="btn btn-primary btn-xs">Reply</button>
                    </div>
                </form>
                <div id="replies-${comment.id}" class="mt-3">
                    <!-- Replies will be added here -->
                </div>
            </div>
        </div>
    `;

    // Add event listeners
    const editForm = div.querySelector(`#editForm-${comment.id}`);
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = editForm.querySelector('textarea').value.trim();
        await updateComment(comment.id, content);
    });

    const replyForm = div.querySelector(`#replyForm-${comment.id}`);
    replyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = replyForm.querySelector('textarea').value.trim();
        await addReply(comment.id, content);
        replyForm.reset();
        toggleReplyForm(comment.id);
    });

    // Recursively add replies
    const repliesContainer = div.querySelector(`#replies-${comment.id}`);
    for (const reply of comment.replies) {
        const replyEl = await createCommentElement(reply, level + 1);
        repliesContainer.appendChild(replyEl);
    }

    return div;
}

// Toggle reply form
function toggleReplyForm(commentId) {
    const replyForm = document.getElementById(`replyForm-${commentId}`);
    replyForm.classList.toggle('hidden');
}

// Add reply
async function addReply(parentId, content) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('You must be logged in to reply');

        if (!content) {
            showAlert('Please write a reply', 'warning');
            return;
        }

        // Add reply to Firestore
        await db.collection('blogs').doc(blogId)
            .collection('comments')
            .add({
                content,
                userId: user.uid,
                parentId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        // Reload comments
        await loadComments();
        showAlert('Reply posted successfully!', 'success');

    } catch (error) {
        console.error('Error posting reply:', error);
        showAlert(error.message, 'error');
    }
}

// Edit comment
async function editComment(commentId) {
    const contentEl = document.getElementById(`commentContent-${commentId}`);
    const editForm = document.getElementById(`editForm-${commentId}`);
    
    contentEl.classList.add('hidden');
    editForm.classList.remove('hidden');
}

// Cancel edit
function cancelEdit(commentId) {
    const contentEl = document.getElementById(`commentContent-${commentId}`);
    const editForm = document.getElementById(`editForm-${commentId}`);
    
    contentEl.classList.remove('hidden');
    editForm.classList.add('hidden');
}

// Update comment
async function updateComment(commentId, content) {
    try {
        await db.collection('blogs').doc(blogId)
            .collection('comments').doc(commentId)
            .update({
                content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        await loadComments();
        showAlert('Comment updated successfully!', 'success');
        console.log('Comment updated successfully!');
        window.alert('Comment updated successfully!'); //remove this later 
    } catch (error) {
        console.error('Error updating comment:', error);
        showAlert(error.message, 'error');
        console.log('Error updating comment:', error);
    }
}

// Delete comment
async function deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
        await db.collection('blogs').doc(blogId)
            .collection('comments').doc(commentId)
            .delete();

        await loadComments();
        showAlert('Comment deleted successfully!', 'success');
        console.log('Comment deleted successfully!');
        window.alert('Comment deleted successfully!'); //remove this later
    } catch (error) {
        console.error('Error deleting comment:', error);
        showAlert(error.message, 'error');
        console.log('Error deleting comment:', error);
    }
}

// Load comments when blog loads
loadBlog().then(() => loadComments()); 