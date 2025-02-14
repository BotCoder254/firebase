// Get blog ID from URL
const urlParams = new URLSearchParams(window.location.search);
const blogId = urlParams.get('id');

// DOM Elements
const loadingState = document.getElementById('loadingState');
const editForm = document.getElementById('editForm');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const editBlogForm = document.getElementById('editBlogForm');
const coverImageInput = document.getElementById('coverImage');
const imagePreview = document.getElementById('imagePreview');
const uploadProgress = document.getElementById('uploadProgress');
const removeImageBtn = document.getElementById('removeImage');
const saveDraftBtn = document.getElementById('saveDraft');
const cancelEdit = document.getElementById('cancelEdit');

// Initialize TinyMCE
tinymce.init({
    selector: '#blogContent',
    plugins: 'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount',
    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
    height: 500,
    automatic_uploads: true,
    images_upload_url: '#', // We'll handle upload manually
    images_reuse_filename: true,
    file_picker_types: 'image',
    file_picker_callback: function(cb, value, meta) {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.setAttribute('multiple', 'multiple');

        input.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            const imageUrls = [];
            const previewContainer = document.getElementById('contentImagePreviews');

            for (const file of files) {
                try {
                    // Validate file size (max 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        showAlert(`Image ${file.name} exceeds 5MB limit`, 'error');
                        continue;
                    }

                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                        showAlert(`${file.name} is not an image file`, 'error');
                        continue;
                    }

                    const user = auth.currentUser;
                    if (!user) throw new Error('You must be logged in to upload images');

                    // Create preview
                    const previewDiv = document.createElement('div');
                    previewDiv.className = 'relative group';
                    previewDiv.innerHTML = `
                        <div class="w-full h-32 relative">
                            <img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover rounded-lg" />
                            <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div class="loading loading-spinner loading-sm text-primary"></div>
                            </div>
                        </div>
                    `;
                    previewContainer.appendChild(previewDiv);

                    // Upload to Firebase Storage
                    const storageRef = storage.ref(`blog-content/${user.uid}/${Date.now()}-${file.name}`);
                    const uploadTask = storageRef.put(file);

                    const url = await new Promise((resolve, reject) => {
                        uploadTask.on('state_changed',
                            (snapshot) => {
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                // Update progress if needed
                            },
                            (error) => {
                                previewDiv.remove();
                                reject(error);
                            },
                            async () => {
                                const downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
                                resolve(downloadUrl);
                            }
                        );
                    });

                    // Update preview with success state
                    previewDiv.innerHTML = `
                        <div class="w-full h-32 relative">
                            <img src="${url}" class="w-full h-full object-cover rounded-lg" />
                            <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" class="btn btn-circle btn-sm btn-error" onclick="removeContentImage(this, '${url}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    `;

                    // Add image to editor
                    cb(url, { title: file.name });
                    imageUrls.push(url);

                } catch (error) {
                    console.error('Error uploading image:', error);
                    showAlert(error.message, 'error');
                }
            }
        });

        input.click();
    }
});

// Check authentication and load blog data
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }

    if (!blogId) {
        showError('Blog ID not found');
        return;
    }

    try {
        const doc = await db.collection('blogs').doc(blogId).get();
        
        if (!doc.exists) {
            showError('Blog not found');
            return;
        }

        const blog = doc.data();
        
        // Check if user is the author
        if (blog.authorId !== user.uid) {
            showError('You do not have permission to edit this blog');
            return;
        }

        // Populate form fields
        document.getElementById('blogTitle').value = blog.title;
        document.getElementById('blogCategory').value = blog.category;
        document.getElementById('blogTags').value = blog.tags.join(', ');
        tinymce.get('blogContent').setContent(blog.content);

        // Show cover image if exists
        if (blog.coverImage) {
            imagePreview.classList.remove('hidden');
            imagePreview.querySelector('img').src = blog.coverImage;
        }

        // Update cancel link
        cancelEdit.href = `blog.html?id=${blogId}`;

        // Show form
        loadingState.classList.add('hidden');
        editForm.classList.remove('hidden');

    } catch (error) {
        console.error('Error loading blog:', error);
        showError(error.message);
    }
});

// Handle image preview
let selectedImage = null;
coverImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showAlert('Image size should not exceed 5MB', 'error');
            coverImageInput.value = '';
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showAlert('Please select an image file', 'error');
            coverImageInput.value = '';
            return;
        }

        selectedImage = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.classList.remove('hidden');
            imagePreview.querySelector('img').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Handle image removal
removeImageBtn.addEventListener('click', () => {
    selectedImage = null;
    coverImageInput.value = '';
    imagePreview.classList.add('hidden');
    imagePreview.querySelector('img').src = '';
});

// Handle form submission
editBlogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateBlog(false);
});

// Handle draft saving
saveDraftBtn.addEventListener('click', async () => {
    await updateBlog(true);
});

// Update blog function
async function updateBlog(isDraft) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('You must be logged in to update a blog');
        }

        // Show loading state
        const submitBtn = isDraft ? saveDraftBtn : editBlogForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${isDraft ? 'Saving...' : 'Updating...'}`;

        // Get form values
        const title = document.getElementById('blogTitle').value;
        const category = document.getElementById('blogCategory').value;
        const content = tinymce.get('blogContent').getContent();
        const tags = document.getElementById('blogTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag);

        // Validate
        if (!title || !category || !content) {
            throw new Error('Please fill in all required fields');
        }

        // Upload new cover image if provided
        let coverImageUrl = imagePreview.classList.contains('hidden') ? '' : imagePreview.querySelector('img').src;
        if (selectedImage) {
            uploadProgress.classList.remove('hidden');
            const storageRef = storage.ref(`blog-covers/${user.uid}/${Date.now()}-${selectedImage.name}`);
            const uploadTask = storageRef.put(selectedImage);

            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        uploadProgress.querySelector('progress').value = progress;
                    },
                    (error) => reject(error),
                    async () => {
                        coverImageUrl = await uploadTask.snapshot.ref.getDownloadURL();
                        resolve();
                    }
                );
            });
        }

        // Create search keywords
        const searchKeywords = [
            ...title.toLowerCase().split(' '),
            ...tags.map(tag => tag.toLowerCase()),
            category.toLowerCase()
        ];

        // Update in Firestore
        const blogData = {
            title,
            content,
            category,
            tags,
            coverImage: coverImageUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: isDraft ? 'draft' : 'published',
            searchKeywords: Array.from(new Set(searchKeywords))
        };

        await db.collection('blogs').doc(blogId).update(blogData);

        // Show success message
        showAlert(`Blog ${isDraft ? 'saved as draft' : 'updated'} successfully!`, 'success');

        // Redirect to blog page
        setTimeout(() => {
            window.location.href = `blog.html?id=${blogId}`;
        }, 1500);

    } catch (error) {
        console.error('Error updating blog:', error);
        showAlert(error.message, 'error');
        
        // Reset button state
        const submitBtn = isDraft ? saveDraftBtn : editBlogForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = isDraft ? 
            '<i class="fas fa-save mr-2"></i>Save as Draft' : 
            '<i class="fas fa-paper-plane mr-2"></i>Update Blog';
    } finally {
        uploadProgress.classList.add('hidden');
    }
}

// Show error state
function showError(message) {
    loadingState.classList.add('hidden');
    editForm.classList.add('hidden');
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

// Function to remove content image
function removeContentImage(element, url) {
    // Remove from preview container if element exists
    if (element) {
        element.closest('.relative.group').remove();
    }

    // Remove from editor content
    const content = tinymce.get('blogContent').getContent();
    tinymce.get('blogContent').setContent(content.replace(`src="${url}"`, ''));

    // Optionally delete from Firebase Storage
    try {
        const storageRef = storage.refFromURL(url);
        storageRef.delete().catch(console.error);
    } catch (error) {
        console.error('Error deleting image:', error);
    }
} 