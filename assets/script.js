// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const menuBtn = document.getElementById('menuBtn');
const closeSidebarBtn = document.getElementById('closeSidebar');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// Auth DOM Elements
const authBtn = document.getElementById('authBtn');
const userDisplay = document.getElementById('userDisplay');
const loginModal = document.getElementById('loginModal');
const closeModal = document.querySelector('.close-modal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// -- STATE --
let currentUser = null; // null = Guest

// -- AUTHENTICATION --

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function initAuth() {
    // Check session storage
    const storedUser = sessionStorage.getItem('wikiUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateAuthUI();
    }

    // Event Listeners
    if (authBtn) {
        authBtn.addEventListener('click', () => {
            if (currentUser) {
                logout();
            } else {
                openLoginModal();
            }
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            await login(u, p);
        });
    }
}

function openLoginModal() {
    loginModal.style.display = 'block';
    loginError.textContent = '';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('username').focus();
}

async function login(username, password) {
    const pHash = await hashPassword(password);
    // Check against users array in data.js
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === pHash);

    if (user) {
        // Successful login
        currentUser = {
            username: user.username,
            role: user.role
        };
        sessionStorage.setItem('wikiUser', JSON.stringify(currentUser));
        loginModal.style.display = 'none';
        updateAuthUI();

        // Refresh content to show permitted items
        // If on item page, reload to check perm. If on index, re-render.
        if (window.location.pathname.includes('item.html')) {
            const itemContainer = document.getElementById('itemDetailContainer');
            if (itemContainer) renderItemDetail(itemContainer);
        } else {
            const contentGrid = document.getElementById('contentGrid');
            if (contentGrid) renderHome(contentGrid);
        }
    } else {
        loginError.textContent = 'Invalid username or password';
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('wikiUser');
    updateAuthUI();

    // Refresh content
    if (window.location.pathname.includes('item.html')) {
        const itemContainer = document.getElementById('itemDetailContainer');
        if (itemContainer) renderItemDetail(itemContainer);
    } else {
        const contentGrid = document.getElementById('contentGrid');
        if (contentGrid) renderHome(contentGrid);
    }
}

function updateAuthUI() {
    if (currentUser) {
        authBtn.textContent = 'Logout';
        userDisplay.textContent = currentUser.username + (currentUser.role === 'admin' ? ' (Admin)' : '');
    } else {
        authBtn.textContent = 'Login';
        userDisplay.textContent = 'Guest';
    }
}

function hasPermission(item) {
    // If no restrictedTo field, everyone can see
    if (!item.restrictedTo) return true;

    // If restrictedTo is empty array, it implies STRICT restriction (maybe Admin only? Or bug? Let's say Admin only)
    // Actually in my data.js I used empty array for Plate Armor to test.

    // Admin always sees everything
    if (currentUser && currentUser.role === 'admin') return true;

    // Guest cannot see restricted items
    if (!currentUser) return false;

    // Check if user is in restrictedTo list
    return item.restrictedTo.map(u => u.toLowerCase()).includes(currentUser.username.toLowerCase());
}

// -- NAVIGATION --

function toggleSidebar() {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
}

if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (sidebar.classList.contains('active')) toggleSidebar();
        if (loginModal && loginModal.style.display === 'block') loginModal.style.display = 'none';
    }
});

// -- RENDER --

function initWiki() {
    console.log('Script Init Started');

    try {
        initAuth(); // Initialize Auth First
    } catch (e) {
        console.error('Auth Init Failed:', e);
    }

    try {
        renderNavigation();
    } catch (e) {
        console.error('Nav Render Failed:', e);
    }

    // Determine which page we are on by checking for unique page elements
    const contentGrid = document.getElementById('contentGrid');
    const itemContainer = document.getElementById('itemDetailContainer');

    console.log('Page Detection:', {
        hasGrid: !!contentGrid,
        hasItemContainer: !!itemContainer,
        path: window.location.pathname
    });

    if (contentGrid) {
        console.log('Rendering Home');
        renderHome(contentGrid);
    } else if (itemContainer) {
        console.log('Rendering Item Detail');
        renderItemDetail(itemContainer);
    }
}

function renderNavigation() {
    // Clear existing navs
    const core = document.getElementById('nav-core');
    const player = document.getElementById('nav-player');
    const world = document.getElementById('nav-world');

    if (core) core.innerHTML = '';
    if (player) player.innerHTML = '';
    if (world) world.innerHTML = '';

    wikiData.categories.forEach(category => {
        const navList = document.getElementById(`nav-${category.section}`);
        if (navList) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `index.html#${category.id}`;
            a.textContent = category.name;
            a.addEventListener('click', () => {
                if (window.innerWidth <= 768) toggleSidebar();
            });
            li.appendChild(a);
            navList.appendChild(li);
        }
    });
}

function renderHome(container) {
    container.innerHTML = '';

    wikiData.categories.forEach(category => {
        // Filter Items based on permissions!
        const visibleItems = category.items.filter(item => hasPermission(item));

        if (visibleItems.length > 0) {
            const catGroup = document.createElement('div');
            catGroup.className = 'category-group';
            catGroup.id = category.id;

            const h2 = document.createElement('h2');
            h2.textContent = category.name;
            catGroup.appendChild(h2);

            const list = document.createElement('ul');
            list.className = 'item-list';

            visibleItems.forEach(item => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `item.html?id=${item.id}`;
                a.className = 'item-link';

                // Add visual cue for Admin
                let adminBadge = '';
                if (currentUser && currentUser.role === 'admin') {
                    // Maybe show if it is restricted to others?
                    if (item.restrictedTo) {
                        adminBadge = ` <span style="color:red;font-size:0.7em">(Restricted)</span>`;
                    }
                }

                a.innerHTML = `
                    <span class="item-name">${item.name}${adminBadge}</span>
                    <span class="item-desc-short">${item.description}</span>
                `;
                li.appendChild(a);
                list.appendChild(li);
            });

            catGroup.appendChild(list);
            container.appendChild(catGroup);
        }
    });
}

function renderItemDetail(container) {
    console.log('renderItemDetail called');
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('id');
    console.log('Item ID from URL:', itemId);

    if (!itemId) {
        container.innerHTML = '<h2>Item not specified</h2><a href="index.html">Return to Home</a>';
        return;
    }

    // Find the item
    let foundItem = null;
    let foundCategory = null;

    for (const cat of wikiData.categories) {
        const item = cat.items.find(i => i.id === itemId);
        if (item) {
            foundItem = item;
            foundCategory = cat;
            break;
        }
    }

    if (!foundItem) {
        container.innerHTML = `<h2>Item not found</h2><p>ID: ${itemId}</p><a href="index.html">Return to Home</a>`;
        return;
    }

    // CHECK PERMISSION
    if (!hasPermission(foundItem)) {
        container.innerHTML = `
            <div class="item-detail" style="text-align:center">
                <h2 style="color:var(--accent-blue)">Access Denied</h2>
                <p>You do not have permission to view this item.</p>
                <div style="margin-top:20px">
                    ${!currentUser ? '<button onclick="openLoginModal()" class="btn-primary" style="max-width:200px">Login</button>' : ''}
                </div>
                <br>
                <a href="index.html">Return to Home</a>
            </div>
        `;
        return;
    }

    // Render details
    const tagsHtml = foundItem.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

    // Admin Edit Button
    let editButton = '';
    if (currentUser && currentUser.role === 'admin') {
        editButton = `<button class="btn-primary" style="width:auto; margin-left: 20px; background-color: #ff5252;">Edit Item (Admin)</button>`;
    }

    container.innerHTML = `
        <div class="breadcrumb">
            <a href="index.html">Home</a> &gt; <a href="index.html#${foundCategory.id}">${foundCategory.name}</a> &gt; ${foundItem.name}
        </div>
        <article class="item-detail">
            <div style="display:flex; justify-content:space-between; align-items:flex-start">
                <h1>${foundItem.name} ${currentUser && currentUser.role === 'admin' ? '<span class="admin-edit-badge">EDITABLE</span>' : ''}</h1>
            </div>
            
            <div class="tags-container">${tagsHtml}</div>
            <div class="item-description">
                <p>${foundItem.description}</p>
                <p class="lorem-ipsum">
                    <em>Additional lore or detailed stats would go here.</em>
                </p>
                ${currentUser && currentUser.role === 'admin' && foundItem.restrictedTo ? `<p style="color:#ff5252; margin-top:10px"><strong>Visibility:</strong> Restricted to: ${foundItem.restrictedTo.length > 0 ? foundItem.restrictedTo.join(', ') : 'Admin Only'}</p>` : ''}
            </div>
            
            <div class="actions">
                <button onclick="window.history.back()" class="btn-back">Go Back</button>
                ${editButton}
            </div>
        </article>
    `;

    document.title = `${foundItem.name} - RPG Game Wiki`;
}

// Search Features
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();

        // Hide/Show results based on logic
        if (!term) {
            searchResults.style.display = 'none';
            return;
        }

        const matches = [];
        wikiData.categories.forEach(cat => {
            // Apply permission filter to search results too!
            cat.items.filter(i => hasPermission(i)).forEach(item => {
                if (item.name.toLowerCase().includes(term) || item.tags.some(t => t.toLowerCase().includes(term))) {
                    matches.push({ item, category: cat });
                }
            });
        });

        if (matches.length > 0) {
            searchResults.style.display = 'block';
            searchResults.innerHTML = matches.map(m => `
                <a href="item.html?id=${m.item.id}" class="search-result-item">
                    <span class="name">${m.item.name}</span>
                    <span class="cat">${m.category.name}</span>
                </a>
            `).join('');
        } else {
            searchResults.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.style.display = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', initWiki);
