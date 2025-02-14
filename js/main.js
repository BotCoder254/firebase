// DOM Elements
const blogList = document.getElementById('blogList');
const featuredBlogs = document.getElementById('featuredBlogs');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const createBlogLinks = document.querySelectorAll('#mobileCreateBlog, #desktopCreateBlog, #footerCreateBlog');
const authLinks = document.querySelectorAll('#mobileAuth, #desktopAuth');
const heroButtons = document.getElementById('heroButtons');

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (user) {
        // Show create blog links, hide login links
        createBlogLinks.forEach(link => link.classList.remove('hidden'));
        document.querySelectorAll('#mobileProfile, #desktopProfile').forEach(link => link.classList.remove('hidden'));
        authLinks.forEach(link => {
            link.innerHTML = `<a href="#" onclick="signOut()"><i class="fas fa-sign-out-alt mr-2"></i>Sign Out</a>`;
        });
        
        // Update hero buttons for logged in users
        if (heroButtons) {
            heroButtons.innerHTML = `
                <a href="create-blog.html" class="btn btn-primary">
                    <i class="fas fa-pen mr-2"></i>Create Blog
                </a>
                <a href="#blogs" class="btn btn-outline btn-secondary">
                    <i class="fas fa-book-open mr-2"></i>Explore Blogs
                </a>
            `;
        }
    } else {
        // Hide create blog links, show login links
        createBlogLinks.forEach(link => link.classList.add('hidden'));
        document.querySelectorAll('#mobileProfile, #desktopProfile').forEach(link => link.classList.add('hidden'));
        authLinks.forEach(link => {
            link.innerHTML = `<a href="auth.html"><i class="fas fa-user mr-2"></i>Login/Sign Up</a>`;
        });
        
        // Update hero buttons for non-logged in users
        if (heroButtons) {
            heroButtons.innerHTML = `
                <a href="auth.html" class="btn btn-primary">
                    <i class="fas fa-user-plus mr-2"></i>Get Started
                </a>
                <a href="#blogs" class="btn btn-outline btn-secondary">
                    <i class="fas fa-book-open mr-2"></i>Explore Blogs
                </a>
            `;
        }
    }
});

// Sign out functionality
async function signOut() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showAlert('Error signing out. Please try again.', 'error');
    }
}

// Load blogs
let lastDoc = null;
const BLOGS_PER_PAGE = 9;
let isLoading = false;

async function loadBlogs(filter = {}) {
    if (isLoading) return;
    
    try {
        isLoading = true;
        loadMoreBtn.classList.add('loading');

        // Get all blogs first
        const snapshot = await db.collection('blogs').get();
        const blogs = [];
        
        // Filter in memory instead of using compound queries
        snapshot.forEach(doc => {
            const blog = doc.data();
            
            // Only include published blogs
            if (blog.status !== 'published') return;
            
            // Apply category filter
            if (filter.category && blog.category !== filter.category) return;
            
            // Apply search filter
            if (filter.search && !blog.title.toLowerCase().includes(filter.search.toLowerCase())) return;
            
            blogs.push({ id: doc.id, ...blog });
        });
        
        // Sort by creation date
        blogs.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        
        // Apply pagination
        const startIndex = filter.append ? blogList.children.length : 0;
        const paginatedBlogs = blogs.slice(startIndex, startIndex + BLOGS_PER_PAGE);
        
        // Hide load more button if no more blogs
        loadMoreBtn.classList.toggle('hidden', startIndex + BLOGS_PER_PAGE >= blogs.length);
        
        // Clear existing blogs if this is a new search/filter
        if (!filter.append) {
            blogList.innerHTML = '';
        }

        if (paginatedBlogs.length === 0 && !filter.append) {
            // Show "No blogs found" message with appropriate context
            let message = 'No blogs found';
            if (filter.search && filter.category) {
                message = `No blogs found for "${filter.search}" in ${filter.category} category`;
            } else if (filter.search) {
                message = `No blogs found for "${filter.search}"`;
            } else if (filter.category) {
                message = `No blogs found in ${filter.category} category`;
            }

            blogList.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="max-w-md mx-auto">
                        <i class="fas fa-book-open text-6xl text-gray-300 mb-4"></i>
                        <h3 class="text-xl font-semibold mb-2">${message}</h3>
                        <p class="text-gray-500 mb-4">Be the first to share your thoughts!</p>
                        ${auth.currentUser ? 
                            `<a href="create-blog.html" class="btn btn-primary">
                                <i class="fas fa-pen mr-2"></i>Create Blog
                            </a>` : 
                            `<a href="auth.html" class="btn btn-primary">
                                <i class="fas fa-user-plus mr-2"></i>Sign Up to Write
                            </a>`
                        }
                    </div>
                </div>
            `;
            loadMoreBtn.classList.add('hidden');
            return;
        }

        // Create and append blog cards
        const fragment = document.createDocumentFragment();
        paginatedBlogs.forEach(blog => {
            const blogCard = createBlogCard(blog.id, blog);
            fragment.appendChild(blogCard);
        });
        blogList.appendChild(fragment);

    } catch (error) {
        console.error('Error loading blogs:', error);
        blogList.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="max-w-md mx-auto">
                    <i class="fas fa-exclamation-circle text-4xl text-error mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">Oops! Something went wrong</h3>
                    <p class="text-gray-500">Please try refreshing the page</p>
                    <button onclick="window.location.reload()" class="btn btn-primary mt-4">
                        <i class="fas fa-sync-alt mr-2"></i>Refresh Page
                    </button>
                </div>
            </div>
        `;
        loadMoreBtn.classList.add('hidden');
    } finally {
        isLoading = false;
        loadMoreBtn.classList.remove('loading');
    }
}

// Load featured blogs
async function loadFeaturedBlogs() {
    try {
        const snapshot = await db.collection('blogs')
            .where('status', '==', 'published')
            .where('featured', '==', true)
            .limit(3)
            .get();

        const fragment = document.createDocumentFragment();
        snapshot.forEach(doc => {
            const blog = doc.data();
            const featuredCard = createFeaturedCard(doc.id, blog);
            fragment.appendChild(featuredCard);
        });
        featuredBlogs.appendChild(fragment);

    } catch (error) {
        console.error('Error loading featured blogs:', error);
    }
}

// Initialize Masonry layout
function initMasonryLayout() {
    const blogList = document.getElementById('blogList');
    if (blogList) {
        blogList.style.columnCount = window.innerWidth >= 1024 ? '3' : window.innerWidth >= 768 ? '2' : '1';
        blogList.style.columnGap = '1.5rem';
    }
}

// Create blog card with clickable username
function createBlogCard(id, blog) {
    const card = document.createElement('div');
    card.className = 'break-inside-avoid mb-6';
    card.setAttribute('data-blog-id', id);
    
    // Format date
    const date = blog.createdAt ? new Date(blog.createdAt.toDate()).toLocaleDateString() : 'Unknown date';
    const readingTime = Math.ceil(blog.content.split(' ').length / 200); // Assuming 200 words per minute
    
    card.innerHTML = `
        <div class="card bg-base-100 shadow-xl h-full">
            <figure class="relative overflow-hidden" style="padding-top: ${Math.random() * 40 + 60}%">
                <img src="${blog.coverImage || `https://source.unsplash.com/random/800x600/?${blog.category}`}" 
                    alt="${blog.title}"
                    class="absolute top-0 left-0 w-full h-full object-cover transition-transform hover:scale-105" 
                    loading="lazy" />
            </figure>
            <div class="card-body">
                <div class="flex items-center gap-2 mb-2">
                    <div class="avatar placeholder">
                        <div class="bg-neutral-focus text-neutral-content rounded-full w-8">
                            <span class="text-xs">${getInitials(blog.authorName)}</span>
                        </div>
                    </div>
                    <div>
                        <h3 class="font-semibold text-sm">
                            <a href="profile.html?id=${blog.authorId}" class="hover:text-primary">
                                ${blog.authorName}
                            </a>
                        </h3>
                        <p class="text-xs text-gray-500">${date}</p>
                    </div>
                </div>
                <h2 class="card-title">
                    <a href="blog.html?id=${id}" class="hover:text-primary">
                        ${blog.title}
                    </a>
                    ${blog.featured ? '<div class="badge badge-secondary">Featured</div>' : ''}
                </h2>
                <p class="line-clamp-3">${blog.content.replace(/<[^>]*>/g, '')}</p>
                <div class="flex flex-wrap gap-2 mt-2">
                    ${blog.tags.map(tag => `<span class="badge badge-outline">${tag}</span>`).join('')}
                </div>
                <div class="card-actions justify-between items-center mt-4">
                    <div class="flex items-center gap-4 text-sm">
                        <span class="flex items-center gap-1" title="Likes">
                            <i class="far fa-heart"></i>
                            <span class="likes-count">0</span>
                        </span>
                        <span class="flex items-center gap-1" title="Comments">
                            <i class="far fa-comment"></i>
                            <span class="comments-count">0</span>
                        </span>
                        <span class="flex items-center gap-1" title="Views">
                            <i class="far fa-eye"></i>
                            <span class="views-count">0</span>
                        </span>
                        <span class="flex items-center gap-1" title="Reading time">
                            <i class="far fa-clock"></i>
                            <span>${readingTime} min read</span>
                        </span>
                    </div>
                    <a href="blog.html?id=${id}" class="btn btn-primary btn-sm">Read More</a>
                </div>
            </div>
        </div>
    `;
    
    // Set up real-time listeners for meta data
    const blogRef = db.collection('blogs').doc(id);
    
    // Listen for likes
    const unsubLikes = blogRef.collection('meta').doc('likes')
        .onSnapshot(doc => {
            const likesCount = doc.exists ? doc.data().count : 0;
            card.querySelector('.likes-count').textContent = likesCount;
        }, error => {
            console.error('Error in likes listener:', error);
        });
    
    // Listen for views
    const unsubViews = blogRef.collection('meta').doc('views')
        .onSnapshot(doc => {
            const viewsCount = doc.exists ? doc.data().count : 0;
            card.querySelector('.views-count').textContent = viewsCount;
        }, error => {
            console.error('Error in views listener:', error);
        });
    
    // Listen for comments
    const unsubComments = blogRef.collection('comments')
        .onSnapshot(snapshot => {
            card.querySelector('.comments-count').textContent = snapshot.size;
        }, error => {
            console.error('Error in comments listener:', error);
        });
    
    // Clean up listeners when card is removed
    const observer = new MutationObserver((mutations, obs) => {
        if (!document.contains(card)) {
            unsubLikes();
            unsubViews();
            unsubComments();
            obs.disconnect();
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    return card;
}

// Create featured card with real-time data
function createFeaturedCard(id, blog) {
    const div = document.createElement('div');
    div.className = 'card card-side bg-base-100 shadow-xl mx-2 my-4';
    
    const date = blog.createdAt ? new Date(blog.createdAt.toDate()).toLocaleDateString() : 'Unknown date';
    
    div.innerHTML = `
        <figure class="w-1/3">
            <img src="${blog.coverImage || `https://source.unsplash.com/random/800x600/?${blog.category}`}" 
                 alt="${blog.title}" 
                 class="h-full w-full object-cover" />
        </figure>
        <div class="card-body w-2/3">
            <div class="flex items-center gap-2 mb-2">
                <div class="badge badge-secondary">${blog.category}</div>
                <div class="badge badge-primary">Featured</div>
            </div>
            <h2 class="card-title">${blog.title}</h2>
            <p class="line-clamp-2">${blog.content.replace(/<[^>]*>/g, '')}</p>
            <div class="flex items-center gap-4 text-sm text-gray-500">
                <div class="avatar placeholder">
                    <div class="bg-neutral-focus text-neutral-content rounded-full w-8">
                        <span class="text-xs">${getInitials(blog.authorName)}</span>
                    </div>
                </div>
                <span>
                    <a href="profile.html?id=${blog.authorId}" class="link link-hover text-sm">
                        ${blog.authorName}
                    </a>
                </span>
                <span class="ml-auto">
                    <i class="fas fa-calendar"></i>
                    ${date}
                </span>
            </div>
            <div class="flex justify-between items-center mt-2">
                <div class="flex items-center gap-4 text-sm">
                    <span class="flex items-center gap-1" title="Likes">
                        <i class="far fa-heart"></i>
                        <span class="likes-count">0</span>
                    </span>
                    <span class="flex items-center gap-1" title="Comments">
                        <i class="far fa-comment"></i>
                        <span class="comments-count">0</span>
                    </span>
                    <span class="flex items-center gap-1" title="Views">
                        <i class="far fa-eye"></i>
                        <span class="views-count">0</span>
                    </span>
                </div>
                <a href="blog.html?id=${id}" class="btn btn-primary btn-sm">
                    Read More
                    <i class="fas fa-arrow-right ml-2"></i>
                </a>
            </div>
        </div>
    `;
    
    // Set up real-time listeners for meta data
    const blogRef = db.collection('blogs').doc(id);
    
    // Listen for likes
    const unsubLikes = blogRef.collection('meta').doc('likes')
        .onSnapshot(doc => {
            const likesCount = doc.exists ? doc.data().count : 0;
            div.querySelector('.likes-count').textContent = likesCount;
        }, error => {
            console.error('Error in likes listener:', error);
        });
    
    // Listen for views
    const unsubViews = blogRef.collection('meta').doc('views')
        .onSnapshot(doc => {
            const viewsCount = doc.exists ? doc.data().count : 0;
            div.querySelector('.views-count').textContent = viewsCount;
        }, error => {
            console.error('Error in views listener:', error);
        });
    
    // Listen for comments
    const unsubComments = blogRef.collection('comments')
        .onSnapshot(snapshot => {
            div.querySelector('.comments-count').textContent = snapshot.size;
        }, error => {
            console.error('Error in comments listener:', error);
        });
    
    // Clean up listeners when card is removed
    const observer = new MutationObserver((mutations, obs) => {
        if (!document.contains(div)) {
            unsubLikes();
            unsubViews();
            unsubComments();
            obs.disconnect();
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    return div;
}

// Get user initials for avatar
function getInitials(name) {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
}

// Search and filter functionality
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        loadBlogs({ search: e.target.value, category: categoryFilter.value });
    }, 500);
});

categoryFilter.addEventListener('change', (e) => {
    loadBlogs({ search: searchInput.value, category: e.target.value });
});

// Load more functionality
loadMoreBtn.addEventListener('click', () => {
    loadBlogs({ 
        search: searchInput.value, 
        category: categoryFilter.value, 
        append: true 
    });
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

// Update layout on window resize
window.addEventListener('resize', initMasonryLayout);

// Initialize layout when DOM is loaded
document.addEventListener('DOMContentLoaded', initMasonryLayout);

// Initial load
loadFeaturedBlogs();
loadBlogs();

// Initialize theme
function initializeTheme() {
    // First try to get theme from localStorage
    let theme = localStorage.getItem('theme');
    
    // If no theme in localStorage, try to get from user preferences in Firestore
    if (!theme && auth.currentUser) {
        db.collection('users').doc(auth.currentUser.uid).get()
            .then(doc => {
                if (doc.exists && doc.data().theme) {
                    theme = doc.data().theme;
                    localStorage.setItem('theme', theme);
                    document.documentElement.setAttribute('data-theme', theme);
                }
            })
            .catch(error => console.error('Error loading theme preference:', error));
    }
    
    // If still no theme, use default
    if (!theme) {
        theme = 'light'; // Default theme
        localStorage.setItem('theme', theme);
    }
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
}

// Listen for theme changes from other tabs
const themeBC = new BroadcastChannel('theme_change');
themeBC.onmessage = (event) => {
    const { theme } = event.data;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
};

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', initializeTheme);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    themeBC.close();
}); 