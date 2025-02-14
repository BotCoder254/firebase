// DOM Elements for modals and loading states
const loadingModal = document.getElementById('loadingModal');
const loadingMessage = document.getElementById('loadingMessage');
const confirmationModal = document.getElementById('confirmationModal');
const confirmationTitle = document.getElementById('confirmationTitle');
const confirmationMessage = document.getElementById('confirmationMessage');
const confirmationButton = document.getElementById('confirmationButton');
const commentCount = document.getElementById('commentCount');
const commentLoginPrompt = document.getElementById('commentLoginPrompt');

// Show loading state
function showLoading(message) {
    loadingMessage.textContent = message;
    loadingModal.showModal();
}

// Hide loading state
function hideLoading() {
    loadingModal.close();
}

// Show confirmation dialog
function showConfirmation(title, message, onConfirm) {
    confirmationTitle.textContent = title;
    confirmationMessage.textContent = message;
    confirmationButton.onclick = () => {
        confirmationModal.close();
        onConfirm();
    };
    confirmationModal.showModal();
}

// Update comment count
function updateCommentCount(count) {
    commentCount.textContent = count || '0';
}

// Update login prompt with animated arrow
function updateLoginPrompt() {
    if (commentLoginPrompt) {
        commentLoginPrompt.innerHTML = `
            <div class="flex flex-col items-center py-8 bg-base-200 rounded-lg">
                <p class="text-lg mb-4">Please log in to leave a comment</p>
                <a href="auth.html" class="btn btn-primary mb-6">
                    <i class="fas fa-sign-in-alt mr-2"></i>
                    Login
                </a>
                <div class="flex flex-col items-center">
                    <p class="text-sm text-gray-500 mb-2">Don't have an account?</p>
                    <div class="animate-bounce text-primary mb-2">
                        <i class="fas fa-chevron-down text-xl"></i>
                    </div>
                    <a href="auth.html#signup" class="btn btn-ghost btn-sm">
                        Create Account
                    </a>
                </div>
            </div>
        `;
    }
}

// Update placeholder image for user avatar
function getAvatarPlaceholder(name) {
    const initials = getInitials(name || 'Anonymous');
    return `
        <div class="avatar placeholder">
            <div class="bg-primary text-primary-content rounded-full w-12">
                <span class="text-lg">${initials}</span>
            </div>
        </div>
    `;
}

// Create comment card with improved placeholder
function createCommentCard(comment, isReply = false) {
    const card = document.createElement('div');
    card.className = `${isReply ? 'ml-12' : ''} bg-base-100 rounded-lg p-4 mb-4`;
    card.innerHTML = `
        <div class="flex items-start gap-4">
            ${getAvatarPlaceholder(comment.authorName)}
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <span class="font-semibold">${comment.authorName}</span>
                    <span class="text-sm text-gray-500">${formatDate(comment.createdAt)}</span>
                </div>
                <p class="text-gray-700">${comment.content}</p>
                <div class="flex items-center gap-4 mt-2">
                    <button class="btn btn-ghost btn-xs reply-btn">
                        <i class="fas fa-reply mr-1"></i> Reply
                    </button>
                    ${comment.userId === auth.currentUser?.uid ? `
                        <button class="btn btn-ghost btn-xs edit-btn">
                            <i class="fas fa-edit mr-1"></i> Edit
                        </button>
                        <button class="btn btn-ghost btn-xs text-error delete-btn">
                            <i class="fas fa-trash mr-1"></i> Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    return card;
}

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

        showLoading('Posting your comment...');

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
        hideLoading();
        showAlert('Comment posted successfully!', 'success');
        
        // Reload comments immediately
        await loadComments();

    } catch (error) {
        hideLoading();
        console.error('Error posting comment:', error);
        showAlert(error.message, 'error');
    }
});

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
        <div class="collapse">
            <input type="checkbox" ${level === 0 ? 'checked' : ''} /> 
            <div class="collapse-title p-0">
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
                    </div>
                </div>
            </div>
            <div class="collapse-content">
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

// Delete comment
async function deleteComment(commentId) {
    showConfirmation(
        'Delete Comment',
        'Are you sure you want to delete this comment? This action cannot be undone.',
        async () => {
            try {
                showLoading('Deleting comment...');
                await db.collection('blogs').doc(blogId)
                    .collection('comments').doc(commentId)
                    .delete();

                hideLoading();
                await loadComments();
                showAlert('Comment deleted successfully!', 'success');
            } catch (error) {
                hideLoading();
                console.error('Error deleting comment:', error);
                showAlert(error.message, 'error');
            }
        }
    );
}

// Update comment
async function updateComment(commentId, content) {
    try {
        showLoading('Updating comment...');
        await db.collection('blogs').doc(blogId)
            .collection('comments').doc(commentId)
            .update({
                content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        hideLoading();
        await loadComments();
        showAlert('Comment updated successfully!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error updating comment:', error);
        showAlert(error.message, 'error');
    }
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

        showLoading('Posting your reply...');

        // Add reply to Firestore
        await db.collection('blogs').doc(blogId)
            .collection('comments')
            .add({
                content,
                userId: user.uid,
                parentId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        hideLoading();
        // Reload comments
        await loadComments();
        showAlert('Reply posted successfully!', 'success');

    } catch (error) {
        hideLoading();
        console.error('Error posting reply:', error);
        showAlert(error.message, 'error');
    }
}

// Load comments
async function loadComments(append = false) {
    if (!blogId) return;
    
    try {
        showLoading('Loading comments...');
        const commentsRef = db.collection('blogs').doc(blogId).collection('comments')
            .orderBy('createdAt', 'desc')
            .limit(COMMENTS_PER_PAGE);
            
        const snapshot = await commentsRef.get();
        
        // Update comment count
        updateCommentCount(snapshot.size);

        if (snapshot.empty && !append) {
            commentsList.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            `;
            loadMoreComments.classList.add('hidden');
            hideLoading();
            return;
        }
        
        // Get all comments and process them
        const comments = [];
        snapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        
        // Process comments into tree structure and display them
        // ... (rest of the existing loadComments function)
        
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Error loading comments:', error);
        showAlert('Error loading comments. Please try again.', 'error');
    }
}

// Load blog and comments
loadBlog().then(() => loadComments()); 