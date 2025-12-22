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

let currentUser = null; // null = Guest
let localWikiData = null; // Stores modified data
let isEditMode = false; // Toggle for admin edit controls

// Initialize wiki data from storage if available
function loadWikiData() {
    const stored = localStorage.getItem('modifiedWikiData');
    if (stored) {
        try {
            localWikiData = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse local wiki data', e);
            localWikiData = JSON.parse(JSON.stringify(wikiData)); // Fallback to copy of original
        }
    } else {
        localWikiData = JSON.parse(JSON.stringify(wikiData)); // Deep copy original data
    }
}

// Global Save function
function saveGlobalChanges() {
    localStorage.setItem('modifiedWikiData', JSON.stringify(localWikiData));
    alert('Changes saved successfully! (Local Storage)');
    // We don't necessarily need to reload, but let's refresh UI
    initWiki();
}

function resetWikiData() {
    if (confirm('Are you sure you want to reset all changes to default?')) {
        localStorage.removeItem('modifiedWikiData');
        location.reload();
    }
}

function persistData() {
    localStorage.setItem('modifiedWikiData', JSON.stringify(localWikiData));
}

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
    const controls = document.querySelector('.user-controls');
    const existingToggle = document.getElementById('editModeToggle');
    if (existingToggle) existingToggle.remove();

    if (currentUser) {
        authBtn.textContent = 'Logout';
        userDisplay.textContent = currentUser.username + (currentUser.role === 'admin' ? ' (Admin)' : '');

        if (currentUser.role === 'admin') {
            const toggle = document.createElement('button');
            toggle.id = 'editModeToggle';
            toggle.className = 'btn-primary';
            toggle.style.cssText = 'padding: 5px 10px; margin-right: 10px; font-size: 0.9em;';
            toggle.textContent = isEditMode ? 'Exit Edit Mode' : 'Edit Mode';
            toggle.onclick = () => {
                isEditMode = !isEditMode;
                updateAuthUI(); // Update button text

                // Refresh content
                if (window.location.pathname.includes('item.html')) {
                    const itemContainer = document.getElementById('itemDetailContainer');
                    if (itemContainer) renderItemDetail(itemContainer);
                } else {
                    const contentGrid = document.getElementById('contentGrid');
                    if (contentGrid) renderHome(contentGrid);
                }
            };
            controls.insertBefore(toggle, userDisplay);
        }
    } else {
        authBtn.textContent = 'Login';
        userDisplay.textContent = 'Guest';
        isEditMode = false;
    }
}
function hasPermission(item) {
    if (!item.restrictedTo) return true;
    if (currentUser && currentUser.role === 'admin') return true;
    if (!currentUser) return false;
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
    loadWikiData(); // Ensure data is loaded

    try {
        initAuth(); // Initialize Auth
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

    localWikiData.categories.forEach(category => {
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

    // Add Save Button for Admin (Only in Edit Mode)
    if (currentUser && currentUser.role === 'admin' && isEditMode) {
        const adminBar = document.createElement('div');
        adminBar.className = 'admin-action-bar';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'SAVE CHANGES';
        saveBtn.className = 'btn-primary';
        saveBtn.style.cssText = 'width:auto; background-color: #4CAF50;';
        saveBtn.onclick = saveGlobalChanges;

        /*
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset to Default';
        resetBtn.className = 'btn-back';
        resetBtn.style.cssText = 'margin-top:0; background-color: #666;';
        resetBtn.onclick = resetWikiData;
        */

        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Add Category';
        addBtn.className = 'btn-primary';
        addBtn.style.cssText = 'width:auto; margin-left:10px;';
        addBtn.onclick = () => {
            console.log('Add Category Button Clicked');
            addCategory();
        };

        adminBar.appendChild(saveBtn);
        // adminBar.appendChild(resetBtn); // Removed as per request
        adminBar.appendChild(addBtn);
        container.appendChild(adminBar);
    }

    localWikiData.categories.forEach((category, catIndex) => {
        // Filter Items based on permissions!
        const visibleItems = category.items.filter(item => hasPermission(item));

        if (visibleItems.length > 0 || (currentUser && currentUser.role === 'admin' && isEditMode)) {
            const catGroup = document.createElement('div');
            catGroup.className = 'category-group';
            catGroup.id = category.id;

            const headerWrapper = document.createElement('div');
            headerWrapper.className = 'category-header-wrapper';

            const h2 = document.createElement('h2');
            h2.textContent = category.name;
            headerWrapper.appendChild(h2);

            if (currentUser && currentUser.role === 'admin' && isEditMode) {
                // REMOVED EDIT BUTTONS PER USER REQUEST
                /*
                const catActions = document.createElement('div');
                catActions.className = 'item-actions-mini';

                const renameBtn = document.createElement('button');
                renameBtn.title = 'Rename';
                renameBtn.textContent = '✏️';
                renameBtn.onclick = () => renameCategory(catIndex);

                const delBtn = document.createElement('button');
                delBtn.title = 'Delete';
                delBtn.textContent = '🗑️';
                delBtn.className = 'btn-delete';
                delBtn.onclick = () => deleteCategory(catIndex);

                catActions.appendChild(renameBtn);
                catActions.appendChild(delBtn);
                headerWrapper.appendChild(catActions);
                */
            }

            catGroup.appendChild(headerWrapper);

            const list = document.createElement('ul');
            list.className = 'item-list';

            visibleItems.forEach((item, itemIndex) => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `item.html?id=${item.id}`;
                a.className = 'item-link';

                // Add visual cue for Admin
                let adminBadge = '';
                if (currentUser && currentUser.role === 'admin' && isEditMode) {
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

                /*
                if (currentUser && currentUser.role === 'admin' && isEditMode) {
                    const itemAdminActions = document.createElement('div');
                    itemAdminActions.className = 'item-admin-actions';
                    const delItemBtn = document.createElement('button');
                    delItemBtn.title = 'Delete Item';
                    delItemBtn.textContent = '🗑️';
                    delItemBtn.onclick = () => deleteItem(category.id, item.id);
                    itemAdminActions.appendChild(delItemBtn);
                    li.appendChild(itemAdminActions);
                }
                */

                list.appendChild(li);
            });

            // Add Item button
            if (currentUser && currentUser.role === 'admin' && isEditMode) {
                const addItemLi = document.createElement('li');
                addItemLi.className = 'add-item-card';
                const addItemBtn = document.createElement('button');
                addItemBtn.textContent = '+ Add New Item';
                addItemBtn.onclick = () => {
                    console.log('Add Item Button Clicked for:', category.id);
                    addItem(category.id);
                };
                addItemLi.appendChild(addItemBtn);
                list.appendChild(addItemLi);
            }

            catGroup.appendChild(list);
            container.appendChild(catGroup);
        }
    });
}

// --- ADMIN EDIT ACTIONS ---

function addCategory() {
    console.log('addCategory function started');
    const name = prompt('Enter new Category name:');
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const sections = ['core', 'player', 'world'];
    const section = prompt('Enter section (core, player, or world):', 'world');
    if (!sections.includes(section)) {
        alert('Invalid section. Must be core, player, or world.');
        return;
    }

    const newCat = {
        id,
        name,
        section,
        items: []
    };
    localWikiData.categories.push(newCat);
    console.log('New category added:', newCat);
    persistData();

    const contentGrid = document.getElementById('contentGrid');
    if (contentGrid) renderHome(contentGrid);
    renderNavigation();
}

function renameCategory(index) {
    const newName = prompt('Enter new Category name:', localWikiData.categories[index].name);
    if (!newName) return;
    localWikiData.categories[index].name = newName;
    persistData();
    renderHome(document.getElementById('contentGrid'));
    renderNavigation();
}

function deleteCategory(index) {
    if (confirm(`Are you sure you want to delete the category "${localWikiData.categories[index].name}" and all its items?`)) {
        localWikiData.categories.splice(index, 1);
        persistData();
        renderHome(document.getElementById('contentGrid'));
        renderNavigation();
    }
}

function addItem(catId) {
    console.log('addItem function started for:', catId);
    const name = 'New Item';
    const desc = 'Item without description';
    // Generate unique ID to allow multiple new items without collision
    const id = `new-item-${Date.now()}`;

    const category = localWikiData.categories.find(c => c.id === catId);
    if (category) {
        category.items.push({
            id,
            name,
            description: desc,
            tags: ['New']
        });
        persistData();
        renderHome(document.getElementById('contentGrid'));
    }
}

function deleteItem(catId, itemId) {
    if (confirm('Delete this item?')) {
        const category = localWikiData.categories.find(c => c.id === catId);
        if (category) {
            category.items = category.items.filter(i => i.id !== itemId);
            persistData();
            renderHome(document.getElementById('contentGrid'));
        }
    }
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

    // Find the item in LOCAL data
    let foundItem = null;
    let foundCategory = null;

    for (const cat of localWikiData.categories) {
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

    // Admin Edit Button UI logic
    let contentHtml = '';
    if (currentUser && currentUser.role === 'admin' && isEditMode && container.dataset.editing === 'true') {
        // RENDER IN EDIT MODE
        const tagsVal = foundItem.tags.join(', ');
        const restrictedVal = foundItem.restrictedTo ? foundItem.restrictedTo.join(', ') : '';

        contentHtml = `
            <div class="breadcrumb">
                <a href="index.html">Home</a> &gt; ${foundItem.name} (Editing)
            </div>
            <article class="item-detail editing">
                <div class="form-group">
                    <label>Item Name</label>
                    <input type="text" id="edit-name" value="${foundItem.name}">
                </div>
                <div class="form-group">
                    <label>Tags (comma separated)</label>
                    <input type="text" id="edit-tags" value="${tagsVal}">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="edit-desc" rows="10" style="width:100%; padding:10px; background:var(--bg-dark); color:white; border:1px solid var(--border-color);">${foundItem.description}</textarea>
                </div>
                <div class="form-group">
                    <label>Restrict to Employees (Usernames, comma separated)</label>
                    <input type="text" id="edit-restricted" value="${restrictedVal}" placeholder="e.g. Tamara, Ale">
                </div>
                
                <div class="actions" id="edit-actions-container" style="display: flex; gap: 10px; align-items: center;">
                    <!-- Buttons added via JS -->
                </div>
            </article>
        `;
        container.innerHTML = contentHtml;

        const actionsContainer = document.getElementById('edit-actions-container');
        actionsContainer.innerHTML = ''; // CLEAR ANY OLD BUTTONS

        const applyBtn = document.createElement('button');
        applyBtn.className = 'btn-primary';
        applyBtn.style.backgroundColor = '#4CAF50';
        applyBtn.textContent = 'Apply Changes';
        applyBtn.onclick = () => saveItemEdit(foundItem.id);

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-back';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => toggleItemEdit(false);

        // Delete Button
        // Delete Button (Two-Step Verification)
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-back';
        deleteBtn.style.cssText = 'background-color: #ff5252; color: white; margin-left: auto; transition: all 0.2s;';
        deleteBtn.textContent = 'Delete Item';
        deleteBtn.dataset.confirmState = 'idle'; // idle | confirm

        console.log('Creating 2-Step Delete Button for Item ID:', itemId);

        deleteBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('Delete Click. State:', deleteBtn.dataset.confirmState);

            if (deleteBtn.dataset.confirmState === 'idle') {
                // First Click: Switch to Confirm Mode
                deleteBtn.dataset.confirmState = 'confirm';
                deleteBtn.textContent = 'Confirm Delete?';
                deleteBtn.style.backgroundColor = '#d32f2f'; // Darker red
                deleteBtn.style.transform = 'scale(1.05)';

                // Auto-reset after 3 seconds if not confirmed
                setTimeout(() => {
                    if (deleteBtn.dataset.confirmState === 'confirm') {
                        deleteBtn.dataset.confirmState = 'idle';
                        deleteBtn.textContent = 'Delete Item';
                        deleteBtn.style.backgroundColor = '#ff5252';
                        deleteBtn.style.transform = 'scale(1)';
                    }
                }, 3000);
                return;
            }

            if (deleteBtn.dataset.confirmState === 'confirm') {
                // Second Click: EXECUTE DELETE
                console.log('Drafting Delete Execution...');

                let deleted = false;
                for (const cat of localWikiData.categories) {
                    const idx = cat.items.findIndex(i => i.id === itemId);
                    if (idx !== -1) {
                        cat.items.splice(idx, 1);
                        deleted = true;
                        console.log('Item found and spliced from category:', cat.id);
                        break;
                    }
                }

                if (deleted) {
                    persistData();
                    console.log('Persisted. Redirecting...');
                    window.location.href = 'index.html';
                } else {
                    console.error('Delete failed: Item ID not found.');
                    alert('Error: Could not find item to delete. ID: ' + itemId);
                    // Reset button
                    deleteBtn.dataset.confirmState = 'idle';
                    deleteBtn.textContent = 'Delete Item';
                }
            }
        });

        actionsContainer.appendChild(applyBtn);
        actionsContainer.appendChild(cancelBtn);
        actionsContainer.appendChild(deleteBtn);
    } else {
        // RENDER IN VIEW MODE
        const tagsHtml = foundItem.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

        contentHtml = `
            <div class="breadcrumb">
                <a href="index.html">Home</a> &gt; <a href="index.html#${foundCategory.id}">${foundCategory.name}</a> &gt; ${foundItem.name}
            </div>
            <article class="item-detail">
                <div style="display:flex; justify-content:space-between; align-items:flex-start">
                    <h1>${foundItem.name} ${currentUser && currentUser.role === 'admin' && isEditMode ? '<span class="admin-edit-badge">EDITABLE</span>' : ''}</h1>
                </div>
                
                <div class="tags-container">${tagsHtml}</div>
                <div class="item-description">
                    <p>${foundItem.description}</p>
                    <p class="lorem-ipsum">
                        <em>Additional lore or detailed stats would go here.</em>
                    </p>
                    ${currentUser && currentUser.role === 'admin' && isEditMode && foundItem.restrictedTo ? `<p style="color:#ff5252; margin-top:10px"><strong>Visibility:</strong> Restricted to: ${foundItem.restrictedTo.length > 0 ? foundItem.restrictedTo.join(', ') : 'Admin Only'}</p>` : ''}
                </div>
                
                <div class="actions" id="item-actions-container">
                    <button id="detail-back-btn" class="btn-back">Go Back</button>
                    <!-- Admin buttons added via JS -->
                </div>
            </article>
        `;
        container.innerHTML = contentHtml;

        const backBtn = document.getElementById('detail-back-btn');
        backBtn.onclick = () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'index.html';
            }
        };

        if (currentUser && currentUser.role === 'admin' && isEditMode) {
            const actionsContainer = document.getElementById('item-actions-container');

            const editBtn = document.createElement('button');
            editBtn.className = 'btn-primary';
            editBtn.style.cssText = 'width:auto; margin-left: 20px; background-color: #ff5252;';
            editBtn.textContent = 'Edit Content';
            editBtn.onclick = () => toggleItemEdit(true);

            const saveBtn = document.createElement('button');
            saveBtn.className = 'btn-primary';
            saveBtn.style.cssText = 'width:auto; margin-left:10px; background-color: #4CAF50;';
            saveBtn.textContent = 'SAVE TO STORAGE';
            saveBtn.onclick = saveGlobalChanges;

            actionsContainer.appendChild(editBtn);
            actionsContainer.appendChild(saveBtn);
        }
    }

    document.title = `${foundItem.name} - RPG Game Wiki`;
}

function toggleItemEdit(isEditing) {
    const container = document.getElementById('itemDetailContainer');
    if (isEditing) {
        container.dataset.editing = 'true';
    } else {
        delete container.dataset.editing;
    }
    renderItemDetail(container);
}

function saveItemEdit(itemId) {
    const name = document.getElementById('edit-name').value;
    const tags = document.getElementById('edit-tags').value.split(',').map(t => t.trim()).filter(t => t);
    const desc = document.getElementById('edit-desc').value;
    const restricted = document.getElementById('edit-restricted').value.split(',').map(t => t.trim()).filter(t => t);

    // Update LOCAL data
    for (const cat of localWikiData.categories) {
        const item = cat.items.find(i => i.id === itemId);
        if (item) {
            item.name = name;
            item.tags = tags;
            item.description = desc;
            if (restricted.length > 0) {
                item.restrictedTo = restricted;
            } else {
                delete item.restrictedTo;
            }
            // Auto-persist content edits too for smoother experience
            persistData();
            break;
        }
    }

    toggleItemEdit(false);
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
        localWikiData.categories.forEach(cat => {
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
