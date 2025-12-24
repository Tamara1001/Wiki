// GitHub Configuration for direct uploads
const GITHUB_CONFIG = {
    owner: 'Tamara1001',
    repo: 'Wiki',
    filePath: 'assets/data.js',
    branch: 'main'
};

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
// Always use localStorage if it has data (to preserve local changes)
function loadWikiData() {
    const stored = localStorage.getItem('modifiedWikiData');
    const lastUpload = localStorage.getItem('lastUploadTime');

    // Check if there was a recent upload (within 15 minutes - covers CDN cache delay)
    const recentUpload = lastUpload && (Date.now() - parseInt(lastUpload)) < 15 * 60 * 1000;

    if (stored) {
        // Use localStorage data if it exists (preserves all local changes)
        try {
            localWikiData = JSON.parse(stored);
            console.log('Using localStorage data (local changes preserved)');
        } catch (e) {
            console.error('Failed to parse local wiki data', e);
            localWikiData = JSON.parse(JSON.stringify(wikiData));
        }
    } else {
        // No localStorage - use fresh data from data.js (GitHub)
        localWikiData = JSON.parse(JSON.stringify(wikiData));
        console.log('Using fresh data from data.js');
    }

    // Clear old upload timestamp if CDN has had time to refresh
    if (lastUpload && !recentUpload) {
        localStorage.removeItem('lastUploadTime');
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

// Helper function to create image upload element
function createImageUploader(currentImage, onImageChange) {
    const container = document.createElement('div');
    container.className = 'image-upload-container';
    container.style.cssText = 'width: 64px; height: 64px; flex-shrink: 0; margin-right: 12px; position: relative;';

    const img = document.createElement('img');
    img.className = 'entity-image';
    img.style.cssText = 'width: 64px; height: 64px; object-fit: cover; border-radius: 8px; background: var(--bg-secondary); border: 2px dashed var(--border-color);';
    img.src = currentImage || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect fill="%23333" width="64" height="64"/><text x="32" y="36" text-anchor="middle" fill="%23666" font-size="10">No Image</text></svg>';
    img.alt = 'Image';

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.className = 'image-upload-input';
    input.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 1;';

    // Delete button overlay
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'image-delete-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = 'Delete image';
    deleteBtn.style.cssText = `
        position: absolute;
        top: -6px;
        right: -6px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ff5252;
        color: white;
        border: 2px solid var(--bg-card, #1a1a1a);
        cursor: pointer;
        font-size: 10px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease, transform 0.2s ease;
        z-index: 10;
        padding: 0;
        line-height: 1;
    `;

    // Show/hide delete button based on whether there's an image
    function updateDeleteButton() {
        // Check if there's a real image (not the placeholder)
        const hasImage = img.src && !img.src.includes('data:image/svg+xml');
        deleteBtn.style.display = hasImage ? 'flex' : 'none';
    }

    // Show delete button on hover
    container.addEventListener('mouseenter', () => {
        updateDeleteButton();
        if (deleteBtn.style.display !== 'none') {
            deleteBtn.style.opacity = '1';
        }
    });

    container.addEventListener('mouseleave', () => {
        deleteBtn.style.opacity = '0';
    });

    // Handle delete click
    deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Set to placeholder image
        img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect fill="%23333" width="64" height="64"/><text x="32" y="36" text-anchor="middle" fill="%23666" font-size="10">No Image</text></svg>';

        // Call the callback with null/empty to remove the image
        onImageChange(null);

        // Hide the delete button
        deleteBtn.style.display = 'none';
        deleteBtn.style.opacity = '0';
    });

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            // Resize to 64x64
            const tempImg = new Image();
            tempImg.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(tempImg, 0, 0, 64, 64);
                const base64 = canvas.toDataURL('image/png');
                img.src = base64;
                onImageChange(base64);
                updateDeleteButton();
            };
            tempImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    container.appendChild(img);
    container.appendChild(input);
    container.appendChild(deleteBtn);
    container.title = 'Click to upload image (64x64)';

    // Initial check for delete button visibility
    updateDeleteButton();

    return container;
}

// Display-only image (for non-edit mode)
function createImageDisplay(imageUrl) {
    if (!imageUrl) return null;
    const img = document.createElement('img');
    img.className = 'entity-image';
    img.style.cssText = 'width: 64px; height: 64px; object-fit: cover; border-radius: 8px; flex-shrink: 0; margin-right: 12px;';
    img.src = imageUrl;
    img.alt = 'Image';
    return img;
}

// Escape HTML special characters to prevent injection in attributes
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==================== UNIFIED RICH TEXT TOOLBAR ====================
// Floating toolbar that appears when editing any rich text field

let floatingToolbar = null;
let activeEditableField = null;

function createFloatingToolbar() {
    if (floatingToolbar) return floatingToolbar;

    const toolbar = document.createElement('div');
    toolbar.id = 'floatingRichToolbar';
    toolbar.className = 'floating-rich-toolbar';
    toolbar.style.cssText = `
        position: fixed;
        top: -100px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-card, #1e1e2e);
        border: 1px solid var(--border-color, #333);
        border-radius: 8px;
        padding: 8px 12px;
        display: flex;
        gap: 4px;
        align-items: center;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        transition: top 0.2s ease, opacity 0.2s ease;
        opacity: 0;
    `;

    toolbar.innerHTML = `
        <button type="button" data-cmd="bold" title="Bold (Ctrl+B)" style="font-weight:bold;">B</button>
        <button type="button" data-cmd="italic" title="Italic (Ctrl+I)" style="font-style:italic;">I</button>
        <button type="button" data-cmd="underline" title="Underline (Ctrl+U)" style="text-decoration:underline;">U</button>
        <button type="button" data-cmd="strikeThrough" title="Strikethrough" style="text-decoration:line-through;">S</button>
        <span class="toolbar-divider" style="width:1px;height:20px;background:#444;margin:0 6px;"></span>
        <select id="floatingColorSelect" title="Text Color" style="padding:4px;background:#333;color:white;border:1px solid #555;border-radius:4px;cursor:pointer;">
            <option value="">🎨</option>
            <option value="#ffffff">White</option>
            <option value="#888888">Gray</option>
            <option value="#000000">Black</option>
            <option value="#f44336">Red</option>
            <option value="#ff9800">Orange</option>
            <option value="#ffeb3b">Yellow</option>
            <option value="#4CAF50">Green</option>
            <option value="#2196F3">Blue</option>
            <option value="#9c27b0">Violet</option>
            <option value="custom">Custom...</option>
        </select>
        <input type="color" id="floatingCustomColor" style="width:0;height:0;opacity:0;position:absolute;">
        <span class="toolbar-divider" style="width:1px;height:20px;background:#444;margin:0 6px;"></span>
        <button type="button" id="floatingInsertImageBtn" title="Insert Image">📷</button>
        <input type="file" id="floatingImageInput" accept="image/*" style="display:none;">
        <span class="toolbar-divider" style="width:1px;height:20px;background:#444;margin:0 6px;"></span>
        <button type="button" data-cmd="removeFormat" title="Clear Formatting">⌫</button>
        <button type="button" id="closeToolbarBtn" title="Close Toolbar">✕</button>
    `;

    // Style toolbar buttons
    toolbar.querySelectorAll('button').forEach(btn => {
        btn.style.cssText = 'padding:6px 10px;background:#333;color:white;border:1px solid #555;border-radius:4px;cursor:pointer;font-size:14px;';
        btn.onmouseover = () => btn.style.background = '#444';
        btn.onmouseout = () => btn.style.background = '#333';
    });

    // Command button handlers
    toolbar.querySelectorAll('button[data-cmd]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent losing focus
            const cmd = btn.dataset.cmd;
            document.execCommand(cmd, false, null);
            if (activeEditableField) activeEditableField.focus();
        });
    });

    // Color select handler
    const colorSelect = toolbar.querySelector('#floatingColorSelect');
    const customColor = toolbar.querySelector('#floatingCustomColor');

    colorSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customColor.click();
            e.target.value = '';
        } else if (e.target.value) {
            document.execCommand('foreColor', false, e.target.value);
            if (activeEditableField) activeEditableField.focus();
            e.target.value = '';
        }
    });

    customColor.addEventListener('input', (e) => {
        document.execCommand('foreColor', false, e.target.value);
        if (activeEditableField) activeEditableField.focus();
    });

    // Close button handler
    toolbar.querySelector('#closeToolbarBtn').addEventListener('mousedown', (e) => {
        e.preventDefault();
        hideFloatingToolbar();
    });

    // Use hover to track if mouse is over toolbar
    toolbar.addEventListener('mouseenter', () => {
        toolbarInteracting = true;
    });

    toolbar.addEventListener('mouseleave', () => {
        toolbarInteracting = false;
        // Refocus the editable field after mouse leaves
        if (activeEditableField) {
            activeEditableField.focus();
        }
    });

    // Prevent default on buttons to avoid losing selection
    toolbar.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') {
            e.preventDefault();
        }
    });

    // Keep interacting flag true while color select has focus
    colorSelect.addEventListener('focus', () => {
        toolbarInteracting = true;
    });

    colorSelect.addEventListener('blur', () => {
        // Small delay to allow click to register
        setTimeout(() => {
            if (activeEditableField) activeEditableField.focus();
        }, 50);
    });

    // Image insert button handler
    const insertImageBtn = toolbar.querySelector('#floatingInsertImageBtn');
    const imageInput = toolbar.querySelector('#floatingImageInput');

    insertImageBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !activeEditableField) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            // Resize image to reasonable size (max 400px)
            const tempImg = new Image();
            tempImg.onload = () => {
                const maxWidth = 400;
                const maxHeight = 400;
                let width = tempImg.width;
                let height = tempImg.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(tempImg, 0, 0, width, height);
                const base64 = canvas.toDataURL('image/png');

                // Insert image at cursor position in active field
                activeEditableField.focus();
                const img = document.createElement('img');
                img.src = base64;
                img.className = 'desc-inline-image';
                img.style.cssText = 'max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; display: block; cursor: pointer;';
                img.title = 'Click to delete this image';

                // Insert at selection
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(img);
                    range.setStartAfter(img);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } else {
                    activeEditableField.appendChild(img);
                }

                // Add delete handler to the new image
                setupInlineImageDeleteHandler(img);
            };
            tempImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
        // Reset input so same file can be selected again
        imageInput.value = '';
    });

    document.body.appendChild(toolbar);
    floatingToolbar = toolbar;

    return toolbar;
}

// Global function to setup delete handler for inline images
function setupInlineImageDeleteHandler(img) {
    img.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Show confirmation state
        if (img.dataset.confirmDelete === 'true') {
            // Second click - delete the image
            img.remove();
        } else {
            // First click - show confirmation state
            img.dataset.confirmDelete = 'true';
            img.style.outline = '3px solid #ff5252';
            img.style.opacity = '0.7';
            img.title = 'Click again to DELETE this image';

            // Reset after 3 seconds
            setTimeout(() => {
                if (img.parentNode) {
                    img.dataset.confirmDelete = '';
                    img.style.outline = '';
                    img.style.opacity = '';
                    img.title = 'Click to delete this image';
                }
            }, 3000);
        }
    });
}

function showFloatingToolbar(element) {
    if (!floatingToolbar) createFloatingToolbar();
    activeEditableField = element;

    floatingToolbar.style.top = '70px';
    floatingToolbar.style.opacity = '1';
}

function hideFloatingToolbar() {
    if (floatingToolbar) {
        floatingToolbar.style.top = '-100px';
        floatingToolbar.style.opacity = '0';
    }
    activeEditableField = null;
}

// Flag to prevent toolbar from hiding during interactions
let toolbarInteracting = false;

// Make an element rich-text editable
function makeRichEditable(element, options = {}) {
    if (!element) return;

    element.contentEditable = 'true';
    element.classList.add('rich-editable');
    element.style.outline = 'none';

    element.addEventListener('focus', () => {
        showFloatingToolbar(element);
        element.style.background = 'rgba(0, 212, 170, 0.1)';
        element.style.borderRadius = '4px';
    });

    element.addEventListener('blur', (e) => {
        // Don't hide if interacting with toolbar
        if (toolbarInteracting) {
            return;
        }

        // Check if focus is going to the toolbar
        if (e.relatedTarget && floatingToolbar && floatingToolbar.contains(e.relatedTarget)) {
            return;
        }

        // Delay to allow for clicks that don't set relatedTarget (like select options)
        setTimeout(() => {
            // Recheck if we're now interacting
            if (toolbarInteracting) return;
            // Check if toolbar has focus
            if (floatingToolbar && floatingToolbar.contains(document.activeElement)) return;
            // Check if we clicked back into the element
            if (document.activeElement === element) return;

            if (activeEditableField === element) {
                hideFloatingToolbar();
            }
        }, 500);

        element.style.background = '';
    });

    // Track changes
    if (options.onInput) {
        element.addEventListener('input', options.onInput);
    }

    // Setup delete handlers for existing inline images
    element.querySelectorAll('img').forEach(img => {
        img.className = 'desc-inline-image';
        img.style.cursor = 'pointer';
        img.title = 'Click to delete this image';
        setupInlineImageDeleteHandler(img);
    });
}
// ==================== END RICH TEXT TOOLBAR ====================

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

        // Ensure default character is set on page load
        const userChars = getUserCharacters(currentUser.username);
        if (userChars && userChars.length > 0 && !sessionStorage.getItem('selectedCharacter')) {
            sessionStorage.setItem('selectedCharacter', userChars[0]);
        }

        // Restore Edit Mode state
        if (currentUser.role === 'admin') {
            isEditMode = sessionStorage.getItem('isEditMode') === 'true';
        }

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

    // Check localUsers from localStorage first, fallback to original users array
    let userList = users;
    const storedUsers = localStorage.getItem('localUsers');
    if (storedUsers) {
        try {
            userList = JSON.parse(storedUsers);
        } catch (e) {
            console.error('Failed to parse localUsers', e);
        }
    }

    const user = userList.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === pHash);

    if (user) {
        // Successful login
        currentUser = {
            username: user.username,
            role: user.role
        };
        sessionStorage.setItem('wikiUser', JSON.stringify(currentUser));
        loginModal.style.display = 'none';

        // Set default character if user has characters
        const userChars = getUserCharacters(currentUser.username);
        if (userChars && userChars.length > 0 && !sessionStorage.getItem('selectedCharacter')) {
            sessionStorage.setItem('selectedCharacter', userChars[0]);
        }

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
    isEditMode = false;
    sessionStorage.removeItem('wikiUser');
    sessionStorage.removeItem('isEditMode');
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
            // Get the admin controls container (left side of top bar)
            const adminControls = document.getElementById('adminControls');

            // Clear existing admin controls
            if (adminControls) adminControls.innerHTML = '';

            // Admin Panel Button (first)
            const adminBtn = document.createElement('button');
            adminBtn.id = 'adminPanelBtn';
            adminBtn.type = 'button';
            adminBtn.className = 'btn-primary';
            adminBtn.style.cssText = 'padding: 5px 10px; font-size: 0.9em; background-color: #9c27b0;';
            adminBtn.textContent = '⚙️ Admin';
            adminBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = 'admin.html';
            });
            if (adminControls) adminControls.appendChild(adminBtn);

            // Edit Mode Toggle (second)
            const toggle = document.createElement('button');
            toggle.id = 'editModeToggle';
            toggle.className = 'btn-primary';
            toggle.style.cssText = 'padding: 5px 10px; font-size: 0.9em;';
            toggle.textContent = isEditMode ? 'Exit Edit Mode' : 'Edit Mode';
            toggle.onclick = () => {
                isEditMode = !isEditMode;
                sessionStorage.setItem('isEditMode', isEditMode);
                updateAuthUI();

                // Refresh content
                if (window.location.pathname.includes('item.html')) {
                    const itemContainer = document.getElementById('itemDetailContainer');
                    if (itemContainer) renderItemDetail(itemContainer);
                } else {
                    const contentGrid = document.getElementById('contentGrid');
                    if (contentGrid) renderHome(contentGrid);
                }
            };
            if (adminControls) adminControls.appendChild(toggle);
        }

        // Character Profile Selector (for all logged-in users)
        const existingCharSelect = document.getElementById('charProfileSelect');
        if (existingCharSelect) existingCharSelect.remove();

        const userChars = getUserCharacters(currentUser.username);
        if (userChars && userChars.length > 0) {
            const charSelect = document.createElement('select');
            charSelect.id = 'charProfileSelect';
            charSelect.style.cssText = 'padding: 5px 10px; margin-right: 10px; font-size: 0.9em; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;';

            // Get current selected character from session
            const currentChar = sessionStorage.getItem('selectedCharacter') || userChars[0];

            userChars.forEach(char => {
                const option = document.createElement('option');
                option.value = char;
                option.textContent = char;
                if (char === currentChar) option.selected = true;
                charSelect.appendChild(option);
            });

            charSelect.addEventListener('change', (e) => {
                sessionStorage.setItem('selectedCharacter', e.target.value);
                // Update display
                userDisplay.textContent = currentUser.username + ' - ' + e.target.value + (currentUser.role === 'admin' ? ' (Admin)' : '');

                // Refresh content to update permissions
                if (window.location.pathname.includes('item.html')) {
                    const itemContainer = document.getElementById('itemDetailContainer');
                    if (itemContainer) renderItemDetail(itemContainer);
                } else {
                    const contentGrid = document.getElementById('contentGrid');
                    if (contentGrid) renderHome(contentGrid);
                }
            });

            controls.insertBefore(charSelect, authBtn);

            // Update username display to include character
            userDisplay.textContent = currentUser.username + ' - ' + currentChar + (currentUser.role === 'admin' ? ' (Admin)' : '');
        }
    } else {
        authBtn.textContent = 'Login';
        userDisplay.textContent = 'Guest';
        isEditMode = false;

        // Remove Admin button on logout
        const existingAdminBtn = document.getElementById('adminPanelBtn');
        if (existingAdminBtn) existingAdminBtn.remove();

        // Remove Character selector on logout
        const existingCharSelect = document.getElementById('charProfileSelect');
        if (existingCharSelect) existingCharSelect.remove();

        // Clear selected character
        sessionStorage.removeItem('selectedCharacter');
    }
}

// Helper to get user's characters from localUsers
function getUserCharacters(username) {
    const stored = localStorage.getItem('localUsers');
    let userList = users;
    if (stored) {
        try {
            userList = JSON.parse(stored);
        } catch (e) { }
    }
    const user = userList.find(u => u.username.toLowerCase() === username.toLowerCase());
    return user ? (user.characters || []) : [];
}

function hasPermission(item) {
    if (!item.restrictedTo) return true;
    if (currentUser && currentUser.role === 'admin') return true;
    if (!currentUser) return false;

    // Check permissions based on selected character (not username)
    const selectedChar = sessionStorage.getItem('selectedCharacter');
    if (!selectedChar) return false;

    return item.restrictedTo.map(c => c.toLowerCase()).includes(selectedChar.toLowerCase());
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

let wikiInitialized = false; // Guard against double initialization

function initWiki() {
    if (wikiInitialized) return; // Prevent double init
    wikiInitialized = true;

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
    // Clear existing nav
    const navList = document.getElementById('nav-categories');
    if (!navList) return;

    navList.innerHTML = '';

    localWikiData.categories.forEach(category => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `index.html?category=${category.id}`;
        a.innerHTML = category.name;

        // Check if name has formatting
        const hasFormatting = /<font|<span|style=|color[=:]/i.test(category.name);
        if (hasFormatting) {
            a.classList.add('has-formatting');
        }

        a.addEventListener('click', () => {
            if (window.innerWidth <= 768) toggleSidebar();
        });
        li.appendChild(a);

        // Render subcategories if they exist
        if (category.subcategories && category.subcategories.length > 0) {
            const subList = document.createElement('ul');
            subList.className = 'nav-subcategories';
            subList.style.cssText = 'margin-left: 15px; margin-top: 4px; border-left: 1px solid var(--border-color); padding-left: 10px;';

            category.subcategories.forEach(subcat => {
                const subLi = document.createElement('li');
                const subA = document.createElement('a');
                subA.href = `index.html?category=${category.id}&subcategory=${subcat.id}`;
                subA.innerHTML = subcat.name;
                subA.style.cssText = 'font-size: 0.9em; opacity: 0.85;';

                const subHasFormatting = /<font|<span|style=|color[=:]/i.test(subcat.name);
                if (subHasFormatting) {
                    subA.classList.add('has-formatting');
                }

                subA.addEventListener('click', () => {
                    if (window.innerWidth <= 768) toggleSidebar();
                });
                subLi.appendChild(subA);
                subList.appendChild(subLi);
            });

            li.appendChild(subList);
        }

        navList.appendChild(li);
    });
}

const urlParams = new URLSearchParams(window.location.search);
const filterCategoryId = urlParams.get('category');
const filterSubcategoryId = urlParams.get('subcategory');

function renderHome(container) {
    container.innerHTML = '';

    // Make Hero Text Editable in Edit Mode (only show on homepage, not category pages)
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    const heroSection = document.querySelector('.hero');

    if (heroTitle && heroSubtitle && heroSection) {
        if (filterCategoryId) {
            // Hide hero on category pages
            heroSection.style.display = 'none';
        } else {
            // Show hero on homepage
            heroSection.style.display = '';

            // Load saved hero text from localWikiData (synced with data.js)
            if (localWikiData.heroTitle) heroTitle.innerHTML = localWikiData.heroTitle;
            if (localWikiData.heroSubtitle) heroSubtitle.innerHTML = localWikiData.heroSubtitle;

            // Detect if content has formatting (font tags, spans with style)
            // Add class to preserve colors even when not in edit mode
            const hasFormatting = (html) => /<font|<span|style=|color[=:]/i.test(html);
            if (hasFormatting(heroTitle.innerHTML)) {
                heroTitle.classList.add('has-formatting');
            } else {
                heroTitle.classList.remove('has-formatting');
            }
            if (hasFormatting(heroSubtitle.innerHTML)) {
                heroSubtitle.classList.add('has-formatting');
            } else {
                heroSubtitle.classList.remove('has-formatting');
            }

            if (currentUser && currentUser.role === 'admin' && isEditMode) {
                // Use unified rich text editing
                heroTitle.dataset.field = 'heroTitle';
                heroTitle.dataset.original = heroTitle.innerHTML;
                makeRichEditable(heroTitle);

                heroSubtitle.dataset.field = 'heroSubtitle';
                heroSubtitle.dataset.original = heroSubtitle.innerHTML;
                makeRichEditable(heroSubtitle);
            } else {
                heroTitle.contentEditable = 'false';
                heroSubtitle.contentEditable = 'false';
            }
        }
    }

    // If filtering, add a Back button
    if (filterCategoryId) {
        const backLink = document.createElement('a');
        backLink.href = 'index.html';
        backLink.className = 'btn-back';
        backLink.style.display = 'inline-block';
        backLink.style.marginBottom = '20px';
        backLink.textContent = '← Back to All Categories';
        container.appendChild(backLink);
    } else {
        // Only show Admin Bar in full view (optional, but cleaner)
        // Add Save Button for Admin (Only in Edit Mode)
        if (currentUser && currentUser.role === 'admin' && isEditMode) {
            const adminBar = document.createElement('div');
            adminBar.className = 'admin-action-bar';

            const addBtn = document.createElement('button');
            addBtn.textContent = '+ Add Category';
            addBtn.className = 'btn-primary';
            addBtn.style.cssText = 'width:auto;';
            addBtn.onclick = () => {
                console.log('Add Category Button Clicked');
                addCategory();
            };

            adminBar.appendChild(addBtn);
            container.appendChild(adminBar);
        }
    }

    localWikiData.categories.forEach((category, catIndex) => {
        // FILTER LOGIC
        if (filterCategoryId && category.id !== filterCategoryId) {
            return; // Skip if not matching filter
        }

        // Filter Items based on permissions!
        const visibleItems = category.items.filter(item => hasPermission(item));

        if (visibleItems.length > 0 || (currentUser && currentUser.role === 'admin' && isEditMode)) {
            const catGroup = document.createElement('div');
            catGroup.className = 'category-group';
            catGroup.id = category.id;

            // Category Drag and Drop (Edit Mode Only, Main View Only)
            if (currentUser && currentUser.role === 'admin' && isEditMode && !filterCategoryId) {
                catGroup.draggable = true;
                catGroup.classList.add('draggable-cat');
                catGroup.dataset.catIndex = catIndex;

                catGroup.addEventListener('dragstart', (e) => {
                    // Only trigger if dragging the category itself, not an item inside
                    if (e.target !== catGroup) return;
                    catGroup.classList.add('dragging-cat');
                    e.dataTransfer.setData('application/category', JSON.stringify({ catIndex: catIndex }));
                    e.dataTransfer.effectAllowed = 'move';
                });

                catGroup.addEventListener('dragend', () => {
                    catGroup.classList.remove('dragging-cat');
                    document.querySelectorAll('.drag-over-cat').forEach(el => el.classList.remove('drag-over-cat'));
                });

                catGroup.addEventListener('dragover', (e) => {
                    // Accept category drops
                    if (e.dataTransfer.types.includes('application/category')) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        catGroup.classList.add('drag-over-cat');
                    }
                });

                catGroup.addEventListener('dragleave', () => {
                    catGroup.classList.remove('drag-over-cat');
                });

                catGroup.addEventListener('drop', (e) => {
                    if (!e.dataTransfer.types.includes('application/category')) return;
                    e.preventDefault();
                    catGroup.classList.remove('drag-over-cat');

                    const data = JSON.parse(e.dataTransfer.getData('application/category'));
                    const fromIndex = data.catIndex;
                    const toIndex = catIndex;

                    if (fromIndex !== toIndex) {
                        const [movedCat] = localWikiData.categories.splice(fromIndex, 1);
                        localWikiData.categories.splice(toIndex, 0, movedCat);
                        persistData();
                        renderHome(document.getElementById('contentGrid'));
                        renderNavigation();
                    }
                });
            }

            const headerWrapper = document.createElement('div');
            headerWrapper.className = 'category-header-wrapper';
            headerWrapper.style.cssText = 'display: flex; align-items: center;';

            // Category Image
            if (currentUser && currentUser.role === 'admin' && isEditMode) {
                // Editable image uploader
                const imageUploader = createImageUploader(category.image, (base64) => {
                    localWikiData.categories[catIndex].image = base64;
                    persistData();
                });
                headerWrapper.appendChild(imageUploader);
            } else if (category.image) {
                // Display-only image
                const imgDisplay = createImageDisplay(category.image);
                if (imgDisplay) headerWrapper.appendChild(imgDisplay);
            }

            // MAKE HEADER CLICKABLE (or editable in Edit Mode)
            const h2 = document.createElement('h2');
            h2.style.cssText = 'margin: 0;';

            if (currentUser && currentUser.role === 'admin' && isEditMode) {
                // Inline editable category name with rich text
                const catNameSpan = document.createElement('span');
                catNameSpan.className = 'category-title-rich';
                catNameSpan.innerHTML = category.name;
                catNameSpan.dataset.catIndex = catIndex;
                catNameSpan.dataset.field = 'name';
                catNameSpan.dataset.original = category.name;

                // Use rich text editing
                makeRichEditable(catNameSpan);

                catNameSpan.addEventListener('input', () => {
                    if (catNameSpan.innerHTML !== catNameSpan.dataset.original) {
                        catNameSpan.classList.add('changed');
                    } else {
                        catNameSpan.classList.remove('changed');
                    }
                });

                h2.appendChild(catNameSpan);
            } else {
                // Create link for category page (normal view)
                // Check if name has formatting
                const hasFormatting = (html) => /<font|<span|style=|color[=:]/i.test(html);
                const catLink = document.createElement('a');
                catLink.href = `index.html?category=${category.id}`;
                catLink.innerHTML = category.name;
                if (hasFormatting(category.name)) {
                    catLink.classList.add('has-formatting');
                }
                catLink.style.cssText = 'color: inherit; text-decoration: none; cursor: pointer;';
                catLink.onmouseover = () => catLink.style.color = 'var(--accent-blue)';
                catLink.onmouseout = () => catLink.style.color = 'inherit';
                h2.appendChild(catLink);
            }

            headerWrapper.appendChild(h2);

            if (currentUser && currentUser.role === 'admin' && isEditMode) {
            }

            catGroup.appendChild(headerWrapper);

            // Show Category Description ONLY on Category Page (Filtered View)
            if (filterCategoryId) {
                const descP = document.createElement('p');
                descP.className = 'category-description';
                descP.style.cssText = 'color: var(--text-secondary); margin-bottom: 20px; font-style: italic;';

                if (currentUser && currentUser.role === 'admin' && isEditMode) {
                    // Use unified rich text editing
                    descP.innerHTML = category.description || 'Click to add description...';
                    descP.dataset.catIndex = catIndex;
                    descP.dataset.field = 'description';
                    descP.dataset.original = category.description || '';
                    makeRichEditable(descP);
                } else {
                    descP.innerHTML = category.description || 'No description.';
                }

                catGroup.appendChild(descP);
            }

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

                    // Make draggable in Edit Mode
                    li.draggable = true;
                    li.classList.add('draggable');
                    li.dataset.categoryId = category.id;
                    li.dataset.itemIndex = itemIndex;

                    li.addEventListener('dragstart', (e) => {
                        li.classList.add('dragging');
                        e.dataTransfer.setData('text/plain', JSON.stringify({
                            categoryId: category.id,
                            itemIndex: itemIndex
                        }));
                        e.dataTransfer.effectAllowed = 'move';
                    });

                    li.addEventListener('dragend', () => {
                        li.classList.remove('dragging');
                        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                    });

                    li.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        li.classList.add('drag-over');
                    });

                    li.addEventListener('dragleave', () => {
                        li.classList.remove('drag-over');
                    });

                    li.addEventListener('drop', (e) => {
                        e.preventDefault();
                        li.classList.remove('drag-over');

                        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                        const fromCatId = data.categoryId;
                        const fromIndex = data.itemIndex;
                        const toCatId = category.id;
                        const toIndex = itemIndex;

                        // Only allow reorder within same category
                        if (fromCatId === toCatId && fromIndex !== toIndex) {
                            const cat = localWikiData.categories.find(c => c.id === fromCatId);
                            if (cat) {
                                const [movedItem] = cat.items.splice(fromIndex, 1);
                                cat.items.splice(toIndex, 0, movedItem);
                                persistData();
                                renderHome(document.getElementById('contentGrid'));
                            }
                        }
                    });
                }

                // Show description only on Category Page, not on Main Menu
                const descHtml = filterCategoryId
                    ? `<span class="item-desc-short">${item.description}</span>`
                    : '';

                // Find actual item index in category for image updates
                const actualItemIndex = category.items.findIndex(i => i.id === item.id);

                // Item image
                const imageHtml = item.image
                    ? `<img src="${item.image}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px;margin-right:10px;flex-shrink:0;">`
                    : '';

                if (currentUser && currentUser.role === 'admin' && isEditMode) {
                    // In edit mode, create structured layout with image uploader
                    li.style.cssText = 'display: flex; align-items: center;';

                    const imageUploader = createImageUploader(item.image, (base64) => {
                        const catIdx = localWikiData.categories.findIndex(c => c.id === category.id);
                        if (catIdx !== -1 && actualItemIndex !== -1) {
                            localWikiData.categories[catIdx].items[actualItemIndex].image = base64;
                            persistData();
                        }
                    });
                    imageUploader.style.cssText = 'width: 48px; height: 48px; flex-shrink: 0; margin-right: 10px; position: relative;';
                    imageUploader.querySelector('img').style.cssText = 'width: 48px; height: 48px; object-fit: cover; border-radius: 6px; background: var(--bg-secondary); border: 2px dashed var(--border-color);';
                    li.appendChild(imageUploader);

                    a.style.cssText = 'flex: 1;';
                    a.innerHTML = `
                        <span class="item-name">${item.name}${adminBadge}</span>
                        ${descHtml}
                    `;
                    li.appendChild(a);
                } else {
                    // Normal view
                    a.style.cssText = 'display: flex; align-items: center;';
                    a.innerHTML = `
                        ${imageHtml}
                        <div style="flex:1;">
                            <span class="item-name">${item.name}${adminBadge}</span>
                            ${descHtml}
                        </div>
                    `;
                    li.appendChild(a);
                }
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

            // ==================== RENDER SUBCATEGORIES ====================
            // Only show subcategories on category page (filtered view)
            if (filterCategoryId && category.subcategories && category.subcategories.length > 0) {
                // If filtering by subcategory, only show that one
                const subcatsToRender = filterSubcategoryId
                    ? category.subcategories.filter(s => s.id === filterSubcategoryId)
                    : category.subcategories;

                subcatsToRender.forEach((subcat, subcatIndex) => {
                    const actualSubcatIndex = category.subcategories.findIndex(s => s.id === subcat.id);

                    const subcatGroup = document.createElement('div');
                    subcatGroup.className = 'subcategory-group';
                    subcatGroup.id = subcat.id;
                    subcatGroup.style.cssText = 'margin-top: 30px; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 12px; border-left: 3px solid var(--accent-primary);';

                    // Subcategory Header
                    const subcatHeader = document.createElement('div');
                    subcatHeader.className = 'subcategory-header-wrapper';
                    subcatHeader.style.cssText = 'display: flex; align-items: center; margin-bottom: 15px;';

                    // Subcategory Image
                    if (currentUser && currentUser.role === 'admin' && isEditMode) {
                        const imgUploader = createImageUploader(subcat.image, (base64) => {
                            localWikiData.categories[catIndex].subcategories[actualSubcatIndex].image = base64;
                            persistData();
                        });
                        imgUploader.style.marginRight = '12px';
                        subcatHeader.appendChild(imgUploader);
                    } else if (subcat.image) {
                        const imgDisplay = createImageDisplay(subcat.image);
                        if (imgDisplay) {
                            imgDisplay.style.marginRight = '12px';
                            subcatHeader.appendChild(imgDisplay);
                        }
                    }

                    // Subcategory Title
                    const subcatTitle = document.createElement('h3');
                    subcatTitle.style.cssText = 'margin: 0; font-size: 1.2rem;';

                    if (currentUser && currentUser.role === 'admin' && isEditMode) {
                        const subcatNameSpan = document.createElement('span');
                        subcatNameSpan.className = 'subcategory-title-rich rich-editable';
                        subcatNameSpan.innerHTML = subcat.name;
                        subcatNameSpan.dataset.catIndex = catIndex;
                        subcatNameSpan.dataset.subcatIndex = actualSubcatIndex;
                        subcatNameSpan.dataset.field = 'subcatName';
                        subcatNameSpan.dataset.original = subcat.name;
                        makeRichEditable(subcatNameSpan);
                        subcatTitle.appendChild(subcatNameSpan);

                        // Delete Subcategory button
                        const delSubcatBtn = document.createElement('button');
                        delSubcatBtn.textContent = '🗑️';
                        delSubcatBtn.title = 'Delete Subcategory';
                        delSubcatBtn.style.cssText = 'margin-left: 10px; padding: 4px 8px; background: #ff5252; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;';
                        delSubcatBtn.onclick = () => deleteSubcategory(catIndex, actualSubcatIndex);
                        subcatTitle.appendChild(delSubcatBtn);
                    } else {
                        subcatTitle.innerHTML = subcat.name;
                    }

                    subcatHeader.appendChild(subcatTitle);
                    subcatGroup.appendChild(subcatHeader);

                    // Subcategory Description
                    if (currentUser && currentUser.role === 'admin' && isEditMode) {
                        const subcatDescP = document.createElement('p');
                        subcatDescP.className = 'subcategory-description rich-editable';
                        subcatDescP.style.cssText = 'color: var(--text-secondary); margin-bottom: 15px; font-style: italic;';
                        subcatDescP.innerHTML = subcat.description || 'Click to add description...';
                        subcatDescP.dataset.catIndex = catIndex;
                        subcatDescP.dataset.subcatIndex = actualSubcatIndex;
                        subcatDescP.dataset.field = 'subcatDescription';
                        subcatDescP.dataset.original = subcat.description || '';
                        makeRichEditable(subcatDescP);
                        subcatGroup.appendChild(subcatDescP);
                    } else if (subcat.description) {
                        const subcatDescP = document.createElement('p');
                        subcatDescP.style.cssText = 'color: var(--text-secondary); margin-bottom: 15px; font-style: italic;';
                        subcatDescP.innerHTML = subcat.description;
                        subcatGroup.appendChild(subcatDescP);
                    }

                    // Subcategory Items List
                    const subcatItemsList = document.createElement('ul');
                    subcatItemsList.className = 'item-list';

                    (subcat.items || []).forEach((item, itemIdx) => {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.href = `item.html?id=${item.id}`;
                        a.className = 'item-link';

                        const imageHtml = item.image
                            ? `<img src="${item.image}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px;margin-right:10px;flex-shrink:0;">`
                            : '';

                        a.style.cssText = 'display: flex; align-items: center;';
                        a.innerHTML = `
                            ${imageHtml}
                            <div style="flex:1;">
                                <span class="item-name">${item.name}</span>
                                <span class="item-desc-short">${item.description}</span>
                            </div>
                        `;
                        li.appendChild(a);
                        subcatItemsList.appendChild(li);
                    });

                    // Add Item to Subcategory button
                    if (currentUser && currentUser.role === 'admin' && isEditMode) {
                        const addSubcatItemLi = document.createElement('li');
                        addSubcatItemLi.className = 'add-item-card';
                        const addSubcatItemBtn = document.createElement('button');
                        addSubcatItemBtn.textContent = '+ Add Item to Subcategory';
                        addSubcatItemBtn.onclick = () => addItemToSubcategory(category.id, subcat.id);
                        addSubcatItemLi.appendChild(addSubcatItemBtn);
                        subcatItemsList.appendChild(addSubcatItemLi);
                    }

                    subcatGroup.appendChild(subcatItemsList);
                    catGroup.appendChild(subcatGroup);
                });
            }

            // Add Subcategory button (only on category page in edit mode)
            if (filterCategoryId && currentUser && currentUser.role === 'admin' && isEditMode) {
                const addSubcatBtn = document.createElement('button');
                addSubcatBtn.textContent = '+ Add Subcategory';
                addSubcatBtn.className = 'btn-back';
                addSubcatBtn.style.cssText = 'margin-top: 20px; padding: 10px 20px; background: linear-gradient(135deg, #9c27b0, #7b1fa2); border: none; color: white;';
                addSubcatBtn.onclick = () => addSubcategory(category.id);
                catGroup.appendChild(addSubcatBtn);
            }

            container.appendChild(catGroup);
        }
    });

    // If filtering and no category found (wrong ID)
    if (filterCategoryId && container.children.length <= 1) { // 1 accounts for back button
        const errorMsg = document.createElement('p');
        errorMsg.textContent = 'Category not found.';
        container.appendChild(errorMsg);
    }

    // Add Delete Category button at bottom (category page only, Edit Mode only)
    if (filterCategoryId && currentUser && currentUser.role === 'admin' && isEditMode) {
        const catIndex = localWikiData.categories.findIndex(c => c.id === filterCategoryId);
        if (catIndex !== -1) {
            const deleteSection = document.createElement('div');
            deleteSection.style.cssText = 'margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border-color);';

            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete Category';
            delBtn.className = 'btn-back btn-danger';
            delBtn.style.cssText = 'padding: 10px 20px; font-size: 0.9rem; width: auto; margin-top: 0;';
            delBtn.dataset.confirmState = 'idle';

            delBtn.addEventListener('click', function (e) {
                e.preventDefault();
                if (delBtn.dataset.confirmState === 'idle') {
                    delBtn.dataset.confirmState = 'confirm';
                    delBtn.textContent = 'Confirm Delete?';
                    delBtn.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        if (delBtn.dataset.confirmState === 'confirm') {
                            delBtn.dataset.confirmState = 'idle';
                            delBtn.textContent = 'Delete Category';
                            delBtn.style.transform = 'scale(1)';
                        }
                    }, 3000);
                } else if (delBtn.dataset.confirmState === 'confirm') {
                    deleteCategory(catIndex);
                    window.location.href = 'index.html';
                }
            });

            deleteSection.appendChild(delBtn);
            container.appendChild(deleteSection);
        }
    }

    // Add floating Save All and Upload Online buttons (Edit Mode only)
    const existingSaveAllBtn = document.getElementById('saveAllBtn');
    if (existingSaveAllBtn) existingSaveAllBtn.remove();
    const existingUploadBtn = document.getElementById('floatingUploadBtn');
    if (existingUploadBtn) existingUploadBtn.remove();

    if (currentUser && currentUser.role === 'admin' && isEditMode) {
        const saveAllBtn = document.createElement('button');
        saveAllBtn.id = 'saveAllBtn';
        saveAllBtn.className = 'save-all-btn';
        saveAllBtn.textContent = '💾 Save All Changes';
        saveAllBtn.addEventListener('click', saveAllChanges);
        document.body.appendChild(saveAllBtn);

        // Add Upload Online button next to Save All
        const existingUploadBtn = document.getElementById('floatingUploadBtn');
        if (existingUploadBtn) existingUploadBtn.remove();

        const uploadBtn = document.createElement('button');
        uploadBtn.id = 'floatingUploadBtn';
        uploadBtn.className = 'save-all-btn';
        uploadBtn.style.cssText = 'right: 230px; background: linear-gradient(135deg, #4CAF50, #2E7D32);';
        uploadBtn.textContent = '☁️ Upload Online';
        uploadBtn.addEventListener('click', uploadToGitHub);
        document.body.appendChild(uploadBtn);
    }
}

// --- ADMIN EDIT ACTIONS ---

// Save All Inline Changes
function saveAllChanges() {
    let changesMade = 0;

    // Save Hero Text to localWikiData (will be synced to data.js on upload)
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');

    if (heroTitle && heroTitle.dataset.original !== undefined) {
        const newTitle = heroTitle.innerHTML;
        if (newTitle !== heroTitle.dataset.original) {
            localWikiData.heroTitle = newTitle;
            heroTitle.dataset.original = newTitle;
            changesMade++;
        }
    }

    if (heroSubtitle && heroSubtitle.dataset.original !== undefined) {
        const newSubtitle = heroSubtitle.innerHTML;
        if (newSubtitle !== heroSubtitle.dataset.original) {
            localWikiData.heroSubtitle = newSubtitle;
            heroSubtitle.dataset.original = newSubtitle;
            changesMade++;
        }
    }

    // Collect all editable elements with changes (categories and subcategories)
    document.querySelectorAll('.inline-editable, .rich-editable, .category-title-rich, .category-description, .subcategory-title-rich, .subcategory-description').forEach(el => {
        const catIndex = parseInt(el.dataset.catIndex);
        const subcatIndex = parseInt(el.dataset.subcatIndex);
        const field = el.dataset.field;

        // Skip if no catIndex or field
        if (isNaN(catIndex) || !field) return;

        // Always use innerHTML for rich text content
        const newValue = el.innerHTML.trim();
        const original = el.dataset.original || '';

        if (newValue !== original) {
            const category = localWikiData.categories[catIndex];
            if (category) {
                // Handle subcategory fields
                if (field === 'subcatName' || field === 'subcatDescription') {
                    if (!isNaN(subcatIndex) && category.subcategories && category.subcategories[subcatIndex]) {
                        const subcat = category.subcategories[subcatIndex];
                        if (field === 'subcatName') {
                            subcat.name = newValue;
                            changesMade++;
                        } else if (field === 'subcatDescription') {
                            subcat.description = newValue;
                            changesMade++;
                        }
                    }
                } else if (field === 'name') {
                    category.name = newValue;
                    changesMade++;
                } else if (field === 'description') {
                    category.description = newValue;
                    changesMade++;
                }
                el.dataset.original = newValue;
            }
        }
    });

    // Save Item Page Edits (if on item page)
    const itemContainer = document.getElementById('itemDetailContainer');
    if (itemContainer && itemContainer.dataset.itemId) {
        const itemId = itemContainer.dataset.itemId;
        const nameEl = document.getElementById('item-title-edit');
        const descEl = document.getElementById('item-desc-edit');
        const restrictedEl = document.getElementById('item-restricted-edit');

        if (nameEl || descEl || restrictedEl) {
            for (const cat of localWikiData.categories) {
                const item = cat.items.find(i => i.id === itemId);
                if (item) {
                    if (nameEl && nameEl.innerHTML.trim() !== nameEl.dataset.original) {
                        item.name = nameEl.innerHTML.trim();
                        changesMade++;
                    }
                    if (descEl && descEl.innerHTML.trim() !== descEl.dataset.original) {
                        item.description = descEl.innerHTML.trim();
                        changesMade++;
                    }
                    if (restrictedEl) {
                        const newRestricted = restrictedEl.value.split(',').map(t => t.trim()).filter(t => t);
                        const oldRestricted = restrictedEl.dataset.original;
                        if (restrictedEl.value !== oldRestricted) {
                            if (newRestricted.length > 0) {
                                item.restrictedTo = newRestricted;
                            } else {
                                delete item.restrictedTo;
                            }
                            changesMade++;
                        }
                    }

                    // Save Hidden Infos
                    const hiddenInfoSections = document.querySelectorAll('.hidden-info-edit-section');
                    if (hiddenInfoSections.length > 0 || (item.hiddenInfos && item.hiddenInfos.length > 0)) {
                        const newHiddenInfos = [];
                        hiddenInfoSections.forEach(section => {
                            const content = section.querySelector('.hidden-info-content').value.trim();
                            const restrictedInput = section.querySelector('.hidden-info-restricted').value;
                            const restricted = restrictedInput.split(',').map(t => t.trim()).filter(t => t);

                            if (content) {
                                newHiddenInfos.push({
                                    content: content,
                                    restrictedTo: restricted
                                });
                            }
                        });
                        item.hiddenInfos = newHiddenInfos;
                        changesMade++;
                    }

                    break;
                }
            }
        }
    }

    // Save Sub-item Edits
    document.querySelectorAll('.subitem-name-rich, .subitem-desc-rich').forEach(el => {
        const itemId = el.dataset.itemId;
        const subItemIndex = parseInt(el.dataset.subItemIndex);
        const field = el.dataset.field;

        if (!itemId || isNaN(subItemIndex) || !field) return;

        const newValue = el.innerHTML.trim();
        const original = el.dataset.original || '';

        if (newValue !== original) {
            const found = findItemById(itemId);
            if (found && found.item.subItems && found.item.subItems[subItemIndex]) {
                const subItem = found.item.subItems[subItemIndex];
                if (field === 'subItemName') {
                    subItem.name = newValue;
                    changesMade++;
                } else if (field === 'subItemDescription') {
                    subItem.description = newValue;
                    changesMade++;
                }
                el.dataset.original = newValue;
            }
        }
    });

    if (changesMade > 0) {
        persistData();
        renderNavigation();

        // Visual feedback
        const saveBtn = document.getElementById('saveAllBtn');
        if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = `✅ Saved ${changesMade} change(s)!`;
            saveBtn.style.background = 'linear-gradient(135deg, #2196F3, #1976D2)';

            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';

                // Remove 'changed' class from all elements
                document.querySelectorAll('.inline-editable.changed').forEach(el => {
                    el.classList.remove('changed');
                    el.dataset.original = el.textContent.trim();
                });
            }, 2000);
        }
    } else {
        // No changes to save
        const saveBtn = document.getElementById('saveAllBtn');
        if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'No changes to save';
            setTimeout(() => {
                saveBtn.textContent = originalText;
            }, 1500);
        }
    }
}

function downloadChanges() {
    // Construct the data.js file content
    // Include users array (unchanged) and wikiData (current state from localWikiData)

    const usersStr = JSON.stringify(users, null, 4);
    const wikiDataObj = {
        heroTitle: localWikiData.heroTitle || 'Welcome to the Wiki',
        heroSubtitle: localWikiData.heroSubtitle || 'The ultimate resource for adventurers.',
        categories: localWikiData.categories
    };
    const wikiDataStr = JSON.stringify(wikiDataObj, null, 4);

    const fileContent = `const users = ${usersStr};

const wikiData = ${wikiDataStr};
`;

    // Create Blob and trigger download
    const blob = new Blob([fileContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Downloaded data.js');
}

async function uploadToGitHub() {
    const token = localStorage.getItem('githubToken');
    if (!token) {
        alert('GitHub token not configured.\n\nSet it via browser console:\nlocalStorage.setItem("githubToken", "YOUR_TOKEN")');
        return;
    }

    // Build file content (same as downloadChanges)
    const usersStr = JSON.stringify(users, null, 4);
    const wikiDataObj = {
        heroTitle: localWikiData.heroTitle || 'Welcome to the Wiki',
        heroSubtitle: localWikiData.heroSubtitle || 'The ultimate resource for adventurers.',
        categories: localWikiData.categories
    };
    const wikiDataStr = JSON.stringify(wikiDataObj, null, 4);
    const fileContent = `const users = ${usersStr};\n\nconst wikiData = ${wikiDataStr};\n`;

    // Base64 encode for GitHub API
    const contentBase64 = btoa(unescape(encodeURIComponent(fileContent)));

    // GitHub API URL
    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.filePath}`;

    try {
        // Show loading state
        const uploadBtn = document.getElementById('floatingUploadBtn');
        if (uploadBtn) {
            uploadBtn.textContent = '⏳ Uploading...';
            uploadBtn.disabled = true;
        }

        // Get current file SHA (required for updates)
        const getRes = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!getRes.ok && getRes.status !== 404) {
            throw new Error(`Failed to get file info: ${getRes.status}`);
        }

        const currentSha = getRes.ok ? (await getRes.json()).sha : undefined;

        // Update file via PUT request
        const updateRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update wiki data - ${new Date().toLocaleString()}`,
                content: contentBase64,
                sha: currentSha,
                branch: GITHUB_CONFIG.branch
            })
        });

        if (!updateRes.ok) {
            const err = await updateRes.json();
            throw new Error(err.message || 'Upload failed');
        }

        // Store upload timestamp - keep localStorage until GitHub CDN refreshes
        // CDN can take 1-10 minutes to update, so we keep local data as fallback
        localStorage.setItem('lastUploadTime', Date.now().toString());

        alert('✅ Changes uploaded to GitHub!\n\nNote: GitHub CDN may take 1-10 minutes to refresh.\nYour local data is preserved until then.');
    } catch (error) {
        alert('❌ Upload failed: ' + error.message);
        console.error('GitHub upload error:', error);
    } finally {
        const uploadBtn = document.getElementById('floatingUploadBtn');
        if (uploadBtn) {
            uploadBtn.textContent = '☁️ Upload Online';
            uploadBtn.disabled = false;
        }
    }
}

function addCategory() {
    console.log('addCategory function started (Automated)');

    const timestamp = Date.now();
    const id = `new-category-${timestamp}`;
    const name = 'New Category';
    const section = 'world'; // Default section

    const newCat = {
        id,
        name,
        section,
        description: 'Category without description',
        items: []
    };

    // Auto-create a first item so the category isn't empty/invisible
    newCat.items.push({
        id: `new-item-${timestamp}`,
        name: 'New Item',
        description: 'Item without description',
        tags: [],
        restrictedTo: null
    });

    localWikiData.categories.push(newCat);
    console.log('New category added:', newCat);
    persistData();

    const contentGrid = document.getElementById('contentGrid');
    if (contentGrid) renderHome(contentGrid);
    renderNavigation();
}

function editCategoryDescription(index) {
    const category = localWikiData.categories[index];
    const catGroup = document.getElementById(category.id);
    if (!catGroup) return;

    const descP = catGroup.querySelector('.category-description');
    if (!descP) return;

    const originalText = descP.textContent;

    // Create Textarea
    const textarea = document.createElement('textarea');
    textarea.value = category.description || '';
    textarea.style.cssText = 'width: 100%; min-height: 80px; padding: 10px; color: #fff; background: #333; border: 1px solid #555; font-size: 1rem; margin-bottom: 10px;';

    // Create Save Button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save';
    saveBtn.className = 'btn-back';
    saveBtn.style.cssText = 'padding: 5px 10px; font-size: 0.8rem; background-color: #4CAF50; width: auto; margin-right: 10px;';
    saveBtn.onclick = () => {
        localWikiData.categories[index].description = textarea.value.trim();
        persistData();
        renderHome(document.getElementById('contentGrid'));
    };

    // Create Cancel Button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '❌ Cancel';
    cancelBtn.className = 'btn-back';
    cancelBtn.style.cssText = 'padding: 5px 10px; font-size: 0.8rem; background-color: #666; width: auto;';
    cancelBtn.onclick = () => {
        renderHome(document.getElementById('contentGrid'));
    };

    // Replace description paragraph with textarea
    const container = document.createElement('div');
    container.appendChild(textarea);
    container.appendChild(saveBtn);
    container.appendChild(cancelBtn);

    descP.replaceWith(container);

    // Hide the Edit Description button
    const editBtn = catGroup.querySelector('button');
    if (editBtn && editBtn.textContent.includes('Edit Description')) {
        editBtn.style.display = 'none';
    }

    textarea.focus();
}

// ==================== SUBCATEGORY FUNCTIONS ====================

function addSubcategory(parentCategoryId) {
    console.log('Adding subcategory to category:', parentCategoryId);

    const catIndex = localWikiData.categories.findIndex(c => c.id === parentCategoryId);
    if (catIndex === -1) {
        console.error('Parent category not found:', parentCategoryId);
        return;
    }

    const category = localWikiData.categories[catIndex];

    // Initialize subcategories array if it doesn't exist
    if (!category.subcategories) {
        category.subcategories = [];
    }

    const timestamp = Date.now();
    const newSubcat = {
        id: `subcategory-${timestamp}`,
        name: 'New Subcategory',
        description: 'Subcategory description',
        image: null,
        items: []
    };

    category.subcategories.push(newSubcat);
    console.log('New subcategory added:', newSubcat);
    persistData();

    const contentGrid = document.getElementById('contentGrid');
    if (contentGrid) renderHome(contentGrid);
    renderNavigation();
}

function deleteSubcategory(parentCatIndex, subcatIndex) {
    const category = localWikiData.categories[parentCatIndex];
    if (!category || !category.subcategories) return;

    const subcat = category.subcategories[subcatIndex];
    if (!subcat) return;

    if (confirm(`Delete subcategory "${subcat.name}" and all its items? This cannot be undone.`)) {
        category.subcategories.splice(subcatIndex, 1);
        persistData();

        const contentGrid = document.getElementById('contentGrid');
        if (contentGrid) renderHome(contentGrid);
        renderNavigation();
    }
}

function addItemToSubcategory(parentCatId, subcatId) {
    console.log('Adding item to subcategory:', subcatId, 'in category:', parentCatId);

    const catIndex = localWikiData.categories.findIndex(c => c.id === parentCatId);
    if (catIndex === -1) return;

    const category = localWikiData.categories[catIndex];
    if (!category.subcategories) return;

    const subcatIndex = category.subcategories.findIndex(s => s.id === subcatId);
    if (subcatIndex === -1) return;

    const subcat = category.subcategories[subcatIndex];

    const timestamp = Date.now();
    const newItem = {
        id: `new-item-${timestamp}`,
        name: 'New Item',
        description: 'Item without description',
        tags: ['New'],
        restrictedTo: null
    };

    subcat.items.push(newItem);
    persistData();

    const contentGrid = document.getElementById('contentGrid');
    if (contentGrid) renderHome(contentGrid);
}

// ==================== SUB-ITEM FUNCTIONS ====================

// Helper function to find an item by ID across all categories and subcategories
function findItemById(itemId) {
    for (const cat of localWikiData.categories) {
        // Check direct items
        for (const item of cat.items || []) {
            if (item.id === itemId) {
                return { item, category: cat, subcategory: null };
            }
        }
        // Check subcategory items
        for (const subcat of cat.subcategories || []) {
            for (const item of subcat.items || []) {
                if (item.id === itemId) {
                    return { item, category: cat, subcategory: subcat };
                }
            }
        }
    }
    return null;
}

function addSubItem(parentItemId) {
    console.log('Adding sub-item to item:', parentItemId);

    const found = findItemById(parentItemId);
    if (!found) {
        console.error('Parent item not found:', parentItemId);
        return;
    }

    const { item } = found;

    // Initialize subItems array if it doesn't exist
    if (!item.subItems) {
        item.subItems = [];
    }

    const timestamp = Date.now();
    const newSubItem = {
        id: `subitem-${timestamp}`,
        name: 'New Sub-item',
        description: 'Sub-item description',
        image: null
    };

    item.subItems.push(newSubItem);
    console.log('New sub-item added:', newSubItem);
    persistData();

    // Re-render the item detail page
    const itemContainer = document.getElementById('itemDetailContainer');
    if (itemContainer) renderItemDetail(itemContainer);
}

function deleteSubItem(parentItemId, subItemIndex) {
    const found = findItemById(parentItemId);
    if (!found) return;

    const { item } = found;
    if (!item.subItems || !item.subItems[subItemIndex]) return;

    const subItem = item.subItems[subItemIndex];

    if (confirm(`Delete sub-item "${subItem.name}"? This cannot be undone.`)) {
        item.subItems.splice(subItemIndex, 1);
        persistData();

        const itemContainer = document.getElementById('itemDetailContainer');
        if (itemContainer) renderItemDetail(itemContainer);
    }
}

function renameCategory(index) {
    const category = localWikiData.categories[index];
    const catGroup = document.getElementById(category.id);
    if (!catGroup) return;

    const headerWrapper = catGroup.querySelector('.category-header-wrapper');
    const h2 = headerWrapper.querySelector('h2');

    // Save original content to restore on cancel
    const originalContent = h2.innerHTML;

    // Create Input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = category.name;
    input.style.cssText = 'font-size: 1.5em; padding: 5px; color: #fff; background: #333; border: 1px solid #555; width: 300px;';

    // Create Save Button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾';
    saveBtn.title = 'Save Name';
    saveBtn.style.cssText = 'margin-left: 10px; cursor: pointer; padding: 5px; background: none; border: none; font-size: 1.5em;';
    saveBtn.onclick = () => {
        if (input.value.trim()) {
            localWikiData.categories[index].name = input.value.trim();
            persistData();
            renderHome(document.getElementById('contentGrid'));
            renderNavigation();
        }
    };

    // Create Cancel Button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '❌';
    cancelBtn.title = 'Cancel';
    cancelBtn.style.cssText = 'margin-left: 5px; cursor: pointer; padding: 5px; background: none; border: none; font-size: 1.5em;';
    cancelBtn.onclick = () => {
        h2.innerHTML = originalContent;
        // Re-attach listeners is tricky with innerHTML, better to just re-render or be careful.
        // For safety/simplicity in this app: RENDER_HOME
        renderHome(document.getElementById('contentGrid'));
    };

    // Clear and append
    h2.innerHTML = '';
    h2.appendChild(input);
    h2.appendChild(saveBtn);
    h2.appendChild(cancelBtn);
    input.focus();
}

function deleteCategory(index) {
    // REMOVED CONFIRM DIALOG - Handled by UI Button
    const catName = localWikiData.categories[index].name;
    console.log(`Deleting category: ${catName}`);

    localWikiData.categories.splice(index, 1);
    persistData();
    renderHome(document.getElementById('contentGrid'));
    renderNavigation();
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
        container.innerHTML = `
            <div class="item-detail" style="text-align:center; padding: 40px;">
                <h2 style="color:var(--accent-blue)">⚠️ Item Not Found</h2>
                <p style="color:var(--text-secondary); margin: 20px 0;">
                    This item may have been deleted or moved.<br>
                    <small>ID: ${itemId}</small>
                </p>
                <div style="margin-top: 20px;">
                    <a href="index.html" class="btn-primary" style="display:inline-block; padding: 10px 20px; text-decoration:none;">Return to Home</a>
                </div>
            </div>
        `;
        // Clear any stale localStorage to prevent future issues
        localStorage.removeItem('modifiedWikiData');
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
                    <label>Description (Visible to All)</label>
                    <textarea id="edit-desc" rows="10" style="width:100%; padding:10px; background:var(--bg-dark); color:white; border:1px solid var(--border-color);">${foundItem.description}</textarea>
                </div>
                <div class="form-group">
                    <label>Restrict Entire Item to Characters (comma separated)</label>
                    <input type="text" id="edit-restricted" value="${restrictedVal}" placeholder="Leave empty for no restriction">
                </div>
                
                <hr style="border-color: var(--border-color); margin: 20px 0;">
                
                <div class="form-group">
                    <label style="font-size: 1.1em; color: var(--accent-blue);">🔒 Hidden Information Sections</label>
                    <p style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 15px;">Add secret information visible only to specific characters.</p>
                    <div id="hidden-infos-container"></div>
                    <button type="button" id="add-hidden-info-btn" class="btn-primary" style="width: auto; padding: 8px 15px; margin-top: 10px; background-color: #9c27b0;">+ Add Hidden Info</button>
                </div>
                
                <div class="actions" id="edit-actions-container" style="display: flex; gap: 10px; align-items: center;">
                    <!-- Buttons added via JS -->
                </div>
            </article>
        `;
        container.innerHTML = contentHtml;

        // Render existing hidden infos
        const hiddenInfosContainer = document.getElementById('hidden-infos-container');
        const hiddenInfos = foundItem.hiddenInfos || [];

        function renderHiddenInfosEditor() {
            hiddenInfosContainer.innerHTML = '';
            hiddenInfos.forEach((hi, index) => {
                const div = document.createElement('div');
                div.style.cssText = 'background: var(--bg-dark); padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid var(--border-color);';
                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-weight: bold; color: var(--accent-blue);">Hidden Info #${index + 1}</span>
                        <button type="button" class="delete-hidden-info-btn" data-index="${index}" style="background: #ff5252; border: none; color: white; padding: 4px 10px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.85em;">Content:</label>
                        <textarea class="hidden-info-content" data-index="${index}" rows="3" style="width:100%; padding:8px; background:var(--bg-card); color:white; border:1px solid var(--border-color); margin-top:5px;">${hi.content}</textarea>
                    </div>
                    <div>
                        <label style="font-size: 0.85em;">Visible to Characters (comma separated):</label>
                        <input type="text" class="hidden-info-restricted" data-index="${index}" value="${hi.restrictedTo ? hi.restrictedTo.join(', ') : ''}" style="width:100%; padding:8px; background:var(--bg-card); color:white; border:1px solid var(--border-color); margin-top:5px;" placeholder="e.g. Aria, Zephyr">
                    </div>
                `;
                hiddenInfosContainer.appendChild(div);
            });

            // Attach delete handlers
            document.querySelectorAll('.delete-hidden-info-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    hiddenInfos.splice(parseInt(btn.dataset.index), 1);
                    renderHiddenInfosEditor();
                });
            });
        }
        renderHiddenInfosEditor();

        // Add Hidden Info button
        document.getElementById('add-hidden-info-btn').addEventListener('click', () => {
            hiddenInfos.push({ content: '', restrictedTo: [] });
            renderHiddenInfosEditor();
        });


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
        // RENDER IN VIEW MODE (with inline editing if admin in Edit Mode)
        const isInlineEdit = currentUser && currentUser.role === 'admin' && isEditMode;

        // Build hidden info HTML for authorized characters
        let hiddenInfoHtml = '';
        const selectedChar = sessionStorage.getItem('selectedCharacter');
        if (foundItem.hiddenInfos && foundItem.hiddenInfos.length > 0) {
            foundItem.hiddenInfos.forEach((hi, index) => {
                // Check if current character can see this hidden info
                const canSee = (currentUser && currentUser.role === 'admin') ||
                    (selectedChar && hi.restrictedTo && hi.restrictedTo.map(c => c.toLowerCase()).includes(selectedChar.toLowerCase()));

                if (canSee) {
                    hiddenInfoHtml += `
                        <div style="background: linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(76, 175, 80, 0.1)); padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 3px solid #9c27b0;">
                            <p>${hi.content}</p>
                            ${currentUser && currentUser.role === 'admin' ? `<div style="font-size: 0.75em; color: var(--text-secondary); margin-top: 8px;">Visible to: ${hi.restrictedTo.join(', ') || 'All'}</div>` : ''}
                        </div>
                    `;
                }
            });
        }

        if (isInlineEdit) {
            // Inline Editing View for Admins
            const restrictedVal = foundItem.restrictedTo ? foundItem.restrictedTo.join(', ') : '';

            // Build editable hidden info sections
            let hiddenInfoEditHtml = '';
            const hiddenInfos = foundItem.hiddenInfos || [];
            hiddenInfos.forEach((hi, index) => {
                hiddenInfoEditHtml += `
                    <div class="hidden-info-edit-section" data-index="${index}" style="background: linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(156, 39, 176, 0.05)); padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 3px solid #9c27b0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="color: #9c27b0; font-weight: 600;">Hidden Info #${index + 1}</span>
                            <button class="delete-hidden-info-btn btn-danger" data-index="${index}" style="border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Delete</button>
                        </div>
                        <textarea class="hidden-info-content" data-index="${index}" style="width: 100%; min-height: 60px; padding: 10px; background: var(--bg-card); color: white; border: 1px solid var(--border-color); border-radius: 4px; resize: vertical;">${hi.content}</textarea>
                        <div style="margin-top: 10px;">
                            <label style="color: var(--text-secondary); font-size: 0.85em;">Visible to Characters (comma separated):</label>
                            <input type="text" class="hidden-info-restricted" data-index="${index}" value="${hi.restrictedTo ? hi.restrictedTo.join(', ') : ''}" style="width: 100%; padding: 8px; background: var(--bg-card); color: white; border: 1px solid var(--border-color); border-radius: 4px; margin-top: 5px;" placeholder="Leave empty for all">
                        </div>
                    </div>
                `;
            });

            contentHtml = `
                <div class="breadcrumb">
                    <a href="index.html">Home</a> &gt; <a href="index.html?category=${foundCategory.id}">${foundCategory.name}</a> &gt; <span id="item-name-breadcrumb">${foundItem.name}</span>
                </div>
                <article class="item-detail">
                    <h1 class="rich-editable item-title-rich" id="item-title-edit" data-field="name" data-original="${escapeHtml(foundItem.name)}">${foundItem.name}</h1>
                    
                    <div class="item-description">
                        <div class="rich-text-toolbar" id="descToolbar">
                            <button type="button" data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button>
                            <button type="button" data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
                            <button type="button" data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
                            <span class="toolbar-divider"></span>
                            <button type="button" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
                            <span class="toolbar-divider"></span>
                            <select id="textColorSelect" title="Text Color">
                                <option value="">Color</option>
                                <option value="#ffffff">White</option>
                                <option value="#888888">Gray</option>
                                <option value="#000000">Black</option>
                                <option value="#f44336">Red</option>
                                <option value="#ff9800">Orange</option>
                                <option value="#ffeb3b">Yellow</option>
                                <option value="#4CAF50">Green</option>
                                <option value="#2196F3">Blue</option>
                                <option value="#9c27b0">Violet</option>
                                <option value="custom">Custom...</option>
                            </select>
                            <input type="color" id="customColorPicker" style="width: 0; height: 0; opacity: 0; position: absolute;" title="Pick custom color">
                            <span class="toolbar-divider"></span>
                            <button type="button" id="insertImageBtn" title="Insert Image">📷</button>
                            <input type="file" id="descImageInput" accept="image/*" style="display: none;">
                            <span class="toolbar-divider"></span>
                            <button type="button" data-cmd="removeFormat" title="Clear Formatting">✕</button>
                        </div>
                        <div class="inline-editable rich-text-content" id="item-desc-edit" contenteditable="true" data-field="description" data-original="${escapeHtml(foundItem.description)}" style="min-height: 150px;">${foundItem.description}</div>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: var(--bg-dark); border-radius: 8px;">
                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary);">Restrict to Characters (comma separated):</label>
                        <input type="text" id="item-restricted-edit" class="inline-editable" value="${restrictedVal}" data-field="restricted" data-original="${restrictedVal}" style="width: 100%; padding: 10px; background: var(--bg-card); color: white; border: 1px solid var(--border-color);" placeholder="Leave empty for no restriction">
                    </div>
                    
                    <div style="margin-top: 30px;">
                        <div id="hidden-info-container">
                            ${hiddenInfoEditHtml || '<p style="color: var(--text-secondary); font-style: italic;">No hidden information yet.</p>'}
                        </div>
                        <button id="add-hidden-info-btn" class="btn-primary" style="margin-top: 15px; background-color: #9c27b0; width: auto;">+ Add Hidden Info</button>
                    </div>
                    
                    <div class="actions" id="item-actions-container" style="margin-top: 30px;">
                        <button id="detail-back-btn" class="btn-back">Go Back</button>
                        <button id="delete-item-btn" class="btn-back btn-danger" style="margin-left: 20px; margin-top: 0;">Delete Item</button>
                    </div>
                </article>
            `;
            container.innerHTML = contentHtml;
            container.dataset.itemId = itemId;

            // Setup inline edit change tracking
            document.querySelectorAll('#item-title-edit, #item-desc-edit, #item-restricted-edit').forEach(el => {
                el.addEventListener('input', () => {
                    const original = el.dataset.original || '';
                    const current = el.tagName === 'INPUT' ? el.value : el.textContent;
                    if (current !== original) {
                        el.classList.add('changed');
                    } else {
                        el.classList.remove('changed');
                    }
                });
            });

            // Make item title rich editable with floating toolbar
            const titleEdit = document.getElementById('item-title-edit');
            makeRichEditable(titleEdit);

            // Sync title and breadcrumb name (use textContent for breadcrumb)
            titleEdit.addEventListener('input', (e) => {
                // Extract plain text for breadcrumb display
                document.getElementById('item-name-breadcrumb').textContent = e.target.textContent;
            });

            // Rich Text Toolbar Handlers
            document.querySelectorAll('#descToolbar button[data-cmd]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const cmd = btn.dataset.cmd;
                    document.execCommand(cmd, false, null);
                    document.getElementById('item-desc-edit').focus();
                });
            });

            // Color picker handler
            const colorSelect = document.getElementById('textColorSelect');
            const customColorPicker = document.getElementById('customColorPicker');

            colorSelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    // Open the color wheel picker
                    customColorPicker.click();
                    e.target.value = ''; // Reset select
                } else if (e.target.value) {
                    document.execCommand('foreColor', false, e.target.value);
                    document.getElementById('item-desc-edit').focus();
                    e.target.value = ''; // Reset to default
                }
            });

            // Custom color wheel handler
            customColorPicker.addEventListener('input', (e) => {
                document.execCommand('foreColor', false, e.target.value);
                document.getElementById('item-desc-edit').focus();
            });

            // Insert Image handler
            const insertImageBtn = document.getElementById('insertImageBtn');
            const descImageInput = document.getElementById('descImageInput');
            const descEdit = document.getElementById('item-desc-edit');

            insertImageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                descImageInput.click();
            });

            descImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    // Resize image to reasonable size (max 400px wide)
                    const tempImg = new Image();
                    tempImg.onload = () => {
                        const maxWidth = 400;
                        const maxHeight = 400;
                        let width = tempImg.width;
                        let height = tempImg.height;

                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(tempImg, 0, 0, width, height);
                        const base64 = canvas.toDataURL('image/png');

                        // Insert image at cursor position
                        descEdit.focus();
                        const img = document.createElement('img');
                        img.src = base64;
                        img.className = 'desc-inline-image';
                        img.style.cssText = 'max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; display: block; cursor: pointer;';
                        img.title = 'Click to delete this image';

                        // Insert at selection
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            range.deleteContents();
                            range.insertNode(img);
                            range.setStartAfter(img);
                            range.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        } else {
                            descEdit.appendChild(img);
                        }

                        // Add delete handler to the new image
                        setupImageDeleteHandler(img);
                    };
                    tempImg.src = event.target.result;
                };
                reader.readAsDataURL(file);
                // Reset input so same file can be selected again
                descImageInput.value = '';
            });

            // Function to setup delete handler for inline images
            function setupImageDeleteHandler(img) {
                img.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Show confirmation tooltip/overlay
                    if (img.dataset.confirmDelete === 'true') {
                        // Second click - delete the image
                        img.remove();
                    } else {
                        // First click - show confirmation state
                        img.dataset.confirmDelete = 'true';
                        img.style.outline = '3px solid #ff5252';
                        img.style.opacity = '0.7';
                        img.title = 'Click again to DELETE this image';

                        // Reset after 3 seconds
                        setTimeout(() => {
                            if (img.parentNode) {
                                img.dataset.confirmDelete = '';
                                img.style.outline = '';
                                img.style.opacity = '';
                                img.title = 'Click to delete this image';
                            }
                        }, 3000);
                    }
                });
            }

            // Setup delete handlers for existing inline images
            descEdit.querySelectorAll('img').forEach(img => {
                img.className = 'desc-inline-image';
                img.style.cursor = 'pointer';
                img.title = 'Click to delete this image';
                setupImageDeleteHandler(img);
            });

            // Add Hidden Info button
            document.getElementById('add-hidden-info-btn').addEventListener('click', () => {
                const container = document.getElementById('hidden-info-container');
                const currentCount = container.querySelectorAll('.hidden-info-edit-section').length;

                // Remove "no hidden info" message if present
                const emptyMsg = container.querySelector('p');
                if (emptyMsg) emptyMsg.remove();

                const newSection = document.createElement('div');
                newSection.className = 'hidden-info-edit-section';
                newSection.dataset.index = currentCount;
                newSection.style.cssText = 'background: linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(156, 39, 176, 0.05)); padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 3px solid #9c27b0;';
                newSection.innerHTML = `
                < div style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;" >
                        <span style="color: #9c27b0; font-weight: 600;">Hidden Info #${currentCount + 1}</span>
                        <button class="delete-hidden-info-btn btn-danger" data-index="${currentCount}" style="border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div >
                    <textarea class="hidden-info-content" data-index="${currentCount}" style="width: 100%; min-height: 60px; padding: 10px; background: var(--bg-card); color: white; border: 1px solid var(--border-color); border-radius: 4px; resize: vertical;" placeholder="Enter hidden information content..."></textarea>
                    <div style="margin-top: 10px;">
                        <label style="color: var(--text-secondary); font-size: 0.85em;">Visible to Characters (comma separated):</label>
                        <input type="text" class="hidden-info-restricted" data-index="${currentCount}" style="width: 100%; padding: 8px; background: var(--bg-card); color: white; border: 1px solid var(--border-color); border-radius: 4px; margin-top: 5px;" placeholder="Leave empty for all">
                    </div>
            `;
                container.appendChild(newSection);

                // Add delete handler for new section
                newSection.querySelector('.delete-hidden-info-btn').addEventListener('click', function () {
                    newSection.remove();
                });
            });

            // Delete Hidden Info buttons
            document.querySelectorAll('.delete-hidden-info-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    this.closest('.hidden-info-edit-section').remove();
                });
            });

            // Delete button with 2-step
            const deleteBtn = document.getElementById('delete-item-btn');
            deleteBtn.dataset.confirmState = 'idle';
            deleteBtn.addEventListener('click', function (e) {
                e.preventDefault();
                if (deleteBtn.dataset.confirmState === 'idle') {
                    deleteBtn.dataset.confirmState = 'confirm';
                    deleteBtn.textContent = 'Confirm Delete?';
                    deleteBtn.style.backgroundColor = '#d32f2f';
                    setTimeout(() => {
                        if (deleteBtn.dataset.confirmState === 'confirm') {
                            deleteBtn.dataset.confirmState = 'idle';
                            deleteBtn.textContent = 'Delete Item';
                            deleteBtn.style.backgroundColor = '#ff5252';
                        }
                    }, 3000);
                } else if (deleteBtn.dataset.confirmState === 'confirm') {
                    // Execute delete
                    for (const cat of localWikiData.categories) {
                        const idx = cat.items.findIndex(i => i.id === itemId);
                        if (idx !== -1) {
                            cat.items.splice(idx, 1);
                            persistData();
                            window.location.href = 'index.html';
                            return;
                        }
                    }
                }
            });

        } else {
            // Normal View Mode (non-admin or not in edit mode)
            // Check if title has formatting
            const hasFormatting = (html) => /<font|<span|style=|color[=:]/i.test(html);
            const titleClass = hasFormatting(foundItem.name) ? 'has-formatting' : '';

            contentHtml = `
                <div class="breadcrumb">
                    <a href="index.html">Home</a> &gt; <a href="index.html#${foundCategory.id}">${foundCategory.name}</a> &gt; <span class="${titleClass}">${foundItem.name}</span>
                </div>
                <article class="item-detail">
                    <h1 class="${titleClass}">${foundItem.name}</h1>
                    
                    <div class="item-description">
                        <p>${foundItem.description}</p>
                        ${hiddenInfoHtml}
                    </div>
                    
                    <div class="actions" id="item-actions-container">
                        <button id="detail-back-btn" class="btn-back">Go Back</button>
                    </div>
                </article>
            `;
            container.innerHTML = contentHtml;
        }

        const backBtn = document.getElementById('detail-back-btn');
        backBtn.onclick = () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'index.html';
            }
        };
    }

    document.title = `${foundItem.name} - RPG Game Wiki`;

    // Add floating Save All button for item pages (Edit Mode only)
    const existingSaveAllBtn = document.getElementById('saveAllBtn');
    if (existingSaveAllBtn) existingSaveAllBtn.remove();
    const existingUploadBtn = document.getElementById('floatingUploadBtn');
    if (existingUploadBtn) existingUploadBtn.remove();

    if (currentUser && currentUser.role === 'admin' && isEditMode) {
        const saveAllBtn = document.createElement('button');
        saveAllBtn.id = 'saveAllBtn';
        saveAllBtn.className = 'save-all-btn';
        saveAllBtn.textContent = '💾 Save All Changes';
        saveAllBtn.addEventListener('click', saveAllChanges);
        document.body.appendChild(saveAllBtn);

        const uploadBtn = document.createElement('button');
        uploadBtn.id = 'floatingUploadBtn';
        uploadBtn.className = 'save-all-btn';
        uploadBtn.style.cssText = 'right: 230px; background: linear-gradient(135deg, #4CAF50, #2E7D32);';
        uploadBtn.textContent = '☁️ Upload Online';
        uploadBtn.addEventListener('click', uploadToGitHub);
        document.body.appendChild(uploadBtn);
    }

    // ==================== RENDER SUB-ITEMS ====================
    renderSubItems(container, foundItem, itemId);
}

// Helper function to render sub-items on item detail page
function renderSubItems(container, item, itemId) {
    // Find or create sub-items container
    let subItemsContainer = document.getElementById('subItemsContainer');
    if (subItemsContainer) subItemsContainer.remove();

    const article = container.querySelector('.item-detail');
    if (!article) return;

    subItemsContainer = document.createElement('div');
    subItemsContainer.id = 'subItemsContainer';
    subItemsContainer.style.cssText = 'margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border-color);';

    // Title
    const subItemsTitle = document.createElement('h2');
    subItemsTitle.style.cssText = 'font-size: 1.3rem; margin-bottom: 15px; color: var(--accent-primary);';
    subItemsTitle.textContent = '📋 Sub-items';
    subItemsContainer.appendChild(subItemsTitle);

    const subItems = item.subItems || [];

    if (subItems.length === 0 && !(currentUser && currentUser.role === 'admin' && isEditMode)) {
        // No sub-items and not in edit mode - don't show anything
        return;
    }

    // Render each sub-item
    subItems.forEach((subItem, subItemIndex) => {
        const subItemDiv = document.createElement('div');
        subItemDiv.className = 'sub-item-card';
        subItemDiv.style.cssText = 'background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 3px solid var(--accent-blue);';

        const subItemHeader = document.createElement('div');
        subItemHeader.style.cssText = 'display: flex; align-items: center; margin-bottom: 10px;';

        // Sub-item Image
        if (currentUser && currentUser.role === 'admin' && isEditMode) {
            const imgUploader = createImageUploader(subItem.image, (base64) => {
                const found = findItemById(itemId);
                if (found && found.item.subItems && found.item.subItems[subItemIndex]) {
                    found.item.subItems[subItemIndex].image = base64;
                    persistData();
                }
            });
            imgUploader.style.marginRight = '12px';
            subItemHeader.appendChild(imgUploader);
        } else if (subItem.image) {
            const imgDisplay = createImageDisplay(subItem.image);
            if (imgDisplay) {
                imgDisplay.style.marginRight = '12px';
                subItemHeader.appendChild(imgDisplay);
            }
        }

        // Sub-item Name
        const subItemName = document.createElement('h4');
        subItemName.style.cssText = 'margin: 0; flex: 1;';

        if (currentUser && currentUser.role === 'admin' && isEditMode) {
            const nameSpan = document.createElement('span');
            nameSpan.className = 'subitem-name-rich rich-editable';
            nameSpan.innerHTML = subItem.name;
            nameSpan.dataset.itemId = itemId;
            nameSpan.dataset.subItemIndex = subItemIndex;
            nameSpan.dataset.field = 'subItemName';
            nameSpan.dataset.original = subItem.name;
            makeRichEditable(nameSpan);
            subItemName.appendChild(nameSpan);

            // Delete button
            const delBtn = document.createElement('button');
            delBtn.textContent = '🗑️';
            delBtn.title = 'Delete Sub-item';
            delBtn.style.cssText = 'margin-left: 10px; padding: 4px 8px; background: #ff5252; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;';
            delBtn.onclick = () => deleteSubItem(itemId, subItemIndex);
            subItemName.appendChild(delBtn);
        } else {
            subItemName.innerHTML = subItem.name;
        }

        subItemHeader.appendChild(subItemName);
        subItemDiv.appendChild(subItemHeader);

        // Sub-item Description
        const subItemDesc = document.createElement('div');
        subItemDesc.style.cssText = 'color: var(--text-secondary); font-size: 0.95em;';

        if (currentUser && currentUser.role === 'admin' && isEditMode) {
            subItemDesc.className = 'subitem-desc-rich rich-editable';
            subItemDesc.innerHTML = subItem.description || 'Click to add description...';
            subItemDesc.dataset.itemId = itemId;
            subItemDesc.dataset.subItemIndex = subItemIndex;
            subItemDesc.dataset.field = 'subItemDescription';
            subItemDesc.dataset.original = subItem.description || '';
            makeRichEditable(subItemDesc);
        } else {
            subItemDesc.innerHTML = subItem.description || '';
        }

        subItemDiv.appendChild(subItemDesc);
        subItemsContainer.appendChild(subItemDiv);
    });

    // Add Sub-item button
    if (currentUser && currentUser.role === 'admin' && isEditMode) {
        const addSubItemBtn = document.createElement('button');
        addSubItemBtn.textContent = '+ Add Sub-item';
        addSubItemBtn.className = 'btn-back';
        addSubItemBtn.style.cssText = 'margin-top: 10px; padding: 8px 16px; background: linear-gradient(135deg, #2196F3, #1976D2); border: none; color: white;';
        addSubItemBtn.onclick = () => addSubItem(itemId);
        subItemsContainer.appendChild(addSubItemBtn);
    }

    // Insert before actions container
    const actionsContainer = article.querySelector('.actions');
    if (actionsContainer) {
        article.insertBefore(subItemsContainer, actionsContainer);
    } else {
        article.appendChild(subItemsContainer);
    }
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
    const desc = document.getElementById('edit-desc').value;
    const restricted = document.getElementById('edit-restricted').value.split(',').map(t => t.trim()).filter(t => t);

    // Collect hidden infos from form
    const hiddenInfos = [];
    document.querySelectorAll('.hidden-info-content').forEach(textarea => {
        const index = parseInt(textarea.dataset.index);
        const content = textarea.value.trim();
        const restrictedInput = document.querySelector(`.hidden - info - restricted[data - index="${index}"]`);
        const restrictedTo = restrictedInput ? restrictedInput.value.split(',').map(t => t.trim()).filter(t => t) : [];

        if (content) {
            hiddenInfos.push({ content, restrictedTo });
        }
    });

    // Update LOCAL data
    for (const cat of localWikiData.categories) {
        const item = cat.items.find(i => i.id === itemId);
        if (item) {
            item.name = name;
            item.description = desc;
            if (restricted.length > 0) {
                item.restrictedTo = restricted;
            } else {
                delete item.restrictedTo;
            }

            // Save hidden infos
            if (hiddenInfos.length > 0) {
                item.hiddenInfos = hiddenInfos;
            } else {
                delete item.hiddenInfos;
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
        const term = e.target.value.toLowerCase().trim();

        // Hide/Show results based on logic
        if (!term) {
            searchResults.style.display = 'none';
            return;
        }

        // Priority 1: Categories matching the search term
        const categoryMatches = [];
        localWikiData.categories.forEach(cat => {
            if (cat.name.toLowerCase().includes(term)) {
                categoryMatches.push({ type: 'category', category: cat });
            }
            // Also check subcategories
            if (cat.subcategories) {
                cat.subcategories.forEach(subcat => {
                    if (subcat.name.toLowerCase().includes(term)) {
                        categoryMatches.push({ type: 'subcategory', category: cat, subcategory: subcat });
                    }
                });
            }
        });

        // Priority 2: Items matching by name (including items in subcategories)
        const itemNameMatches = [];
        localWikiData.categories.forEach(cat => {
            cat.items.filter(i => hasPermission(i)).forEach(item => {
                if (item.name.toLowerCase().includes(term)) {
                    itemNameMatches.push({ type: 'item', item, category: cat });
                }
            });
            // Also search in subcategory items
            if (cat.subcategories) {
                cat.subcategories.forEach(subcat => {
                    (subcat.items || []).filter(i => hasPermission(i)).forEach(item => {
                        if (item.name.toLowerCase().includes(term)) {
                            itemNameMatches.push({ type: 'item', item, category: cat, subcategory: subcat });
                        }
                    });
                });
            }
        });

        // Priority 3: Items matching by description (including items in subcategories)
        const itemDescMatches = [];
        localWikiData.categories.forEach(cat => {
            cat.items.filter(i => hasPermission(i)).forEach(item => {
                // Only add if not already matched by name
                if (!item.name.toLowerCase().includes(term) &&
                    item.description.toLowerCase().includes(term)) {
                    itemDescMatches.push({ type: 'item-desc', item, category: cat });
                }
            });
            // Also search in subcategory items
            if (cat.subcategories) {
                cat.subcategories.forEach(subcat => {
                    (subcat.items || []).filter(i => hasPermission(i)).forEach(item => {
                        if (!item.name.toLowerCase().includes(term) &&
                            item.description.toLowerCase().includes(term)) {
                            itemDescMatches.push({ type: 'item-desc', item, category: cat, subcategory: subcat });
                        }
                    });
                });
            }
        });

        // Combine results in priority order
        const allMatches = [...categoryMatches, ...itemNameMatches, ...itemDescMatches];

        if (allMatches.length > 0) {
            searchResults.style.display = 'block';
            searchResults.innerHTML = allMatches.map(m => {
                if (m.type === 'category') {
                    return `
                <a href="index.html?category=${m.category.id}" class="search-result-item">
                            <span class="name">📁 ${m.category.name}</span>
                            <span class="cat">Category</span>
                        </a>
                `;
                } else if (m.type === 'subcategory') {
                    return `
                <a href="index.html?category=${m.category.id}&subcategory=${m.subcategory.id}" class="search-result-item">
                            <span class="name">📂 ${m.subcategory.name}</span>
                            <span class="cat">${m.category.name} > Subcategory</span>
                        </a>
                `;
                } else {
                    const catPath = m.subcategory
                        ? `${m.category.name} > ${m.subcategory.name}`
                        : m.category.name;
                    return `
                <a href="item.html?id=${m.item.id}" class="search-result-item">
                            <span class="name">${m.item.name}</span>
                            <span class="cat">${catPath}</span>
                        </a>
                `;
                }
            }).join('');
        } else {
            searchResults.style.display = 'block';
            searchResults.innerHTML = '<div class="search-result-item" style="color:var(--text-secondary);">No results found</div>';
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.style.display = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', initWiki);
