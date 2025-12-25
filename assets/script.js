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
// Syncing Logic: Use localStorage ONLY if it's newer than server data
function loadWikiData() {
    const stored = localStorage.getItem('modifiedWikiData');

    // Parse stored data
    let localData = null;
    if (stored) {
        try {
            localData = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse local wiki data', e);
        }
    }

    // Get timestamps (handle legacy data without timestamps)
    // wikiData is global from data.js
    const serverTime = (typeof wikiData !== 'undefined' && wikiData.lastUpdated) ? wikiData.lastUpdated : 0;
    const localTime = (localData && localData.lastUpdated) ? localData.lastUpdated : 0;

    console.log(`Sync Check - Server: ${serverTime}, Local: ${localTime}`);

    if (serverTime > localTime) {
        console.log('Server data is newer. Updating local cache.');
        localWikiData = JSON.parse(JSON.stringify(wikiData));
        // Clear stale local storage to ensure we stay in sync
        localStorage.removeItem('modifiedWikiData');
        localStorage.removeItem('lastUploadTime'); // Clean up
    } else if (localData) {
        console.log('Using localStorage data (Local is current or newer)');
        localWikiData = localData;
    } else {
        // No local data, and server is default
        console.log('Using fresh data from data.js');
        // Check if wikiData is defined to prevent crash
        if (typeof wikiData !== 'undefined') {
            localWikiData = JSON.parse(JSON.stringify(wikiData));
        } else {
            console.error('CRITICAL: wikiData is not defined!');
            localWikiData = { categories: [] }; // Fallback
        }
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
    localWikiData.lastUpdated = Date.now();
    localStorage.setItem('modifiedWikiData', JSON.stringify(localWikiData));
}

// Apply background image to all pages
function applyBackgroundImage() {
    // Remove any existing background
    const existingBg = document.getElementById('wiki-background');
    if (existingBg) existingBg.remove();

    if (localWikiData && localWikiData.backgroundImage) {
        const bgDiv = document.createElement('div');
        bgDiv.id = 'wiki-background';
        bgDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('${localWikiData.backgroundImage}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            background-attachment: fixed;
            z-index: -1;
            opacity: 0.15;
            pointer-events: none;
        `;
        document.body.prepend(bgDiv);
    }
}

// Apply accent color via CSS variable
// This only affects elements using var(--accent-primary), NOT inline styles
function applyAccentColor() {
    // Use saved color or default
    const color = (localWikiData && localWikiData.accentColor) ? localWikiData.accentColor : '#00d4aa';

    console.log('Applying accent color:', color);
    document.documentElement.style.setProperty('--accent-primary', color);

    // Extract RGB values
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    console.log('Setting glow colors:', r, g, b);
    document.documentElement.style.setProperty('--accent-primary-rgb', `${r}, ${g}, ${b}`);

    // Set glow colors directly
    document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.3)`);
    document.documentElement.style.setProperty('--accent-glow-strong', `rgba(${r}, ${g}, ${b}, 0.5)`);
}

// Apply default font size setting
function applyDefaultFontSize() {
    // Use saved size or default to 16
    const fontSize = (localWikiData && localWikiData.defaultFontSize) ? localWikiData.defaultFontSize : '16';
    document.documentElement.style.setProperty('--description-font-size', fontSize + 'px');
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

// Strip HTML tags from a string (for plain text display)
function stripHtml(str) {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, '');
}

// ==================== IMAGE RESIZER FOR EDIT MODE ====================
// Allows resizing images in descriptions by dragging corners

let activeResizableImage = null;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;
let currentHandle = null;

function initImageResizer() {
    // Use capture phase to catch clicks before contenteditable processes them
    document.addEventListener('click', (e) => {
        // Only in edit mode
        if (!isEditMode || !currentUser || currentUser.role !== 'admin') return;

        // Check if clicked directly on an image or close to it
        const target = e.target;

        // Handle resize handles and delete button clicks
        if (target.closest('.resize-handle') || target.closest('.image-delete-btn')) {
            return; // Let these be handled by their own handlers
        }

        // Check if target is an image
        if (target.tagName === 'IMG') {
            const contentEditable = target.closest('[contenteditable="true"]');
            if (contentEditable && !target.closest('.image-resize-wrapper')) {
                e.preventDefault();
                e.stopPropagation();
                selectImageForResize(target);
                return;
            }
        }

        // Clicking outside image - deselect if we have an active one
        // But NOT if clicking on a toolbar (we want to keep image selected while using toolbar)
        if (activeResizableImage && !e.target.closest('.image-resize-wrapper')) {
            // Check if clicking on a toolbar or image control bar
            const isToolbarClick = e.target.closest('.rich-text-toolbar') ||
                e.target.closest('#descToolbar') ||
                e.target.closest('#floatingRichToolbar') ||
                e.target.closest('.inline-toolbar') ||
                e.target.closest('.image-control-bar');
            if (!isToolbarClick) {
                deselectResizableImage();
            }
        }
    }, true); // Use capture phase!

    // Handle resize dragging
    document.addEventListener('mousedown', (e) => {
        const handle = e.target.closest('.resize-handle');
        if (handle && activeResizableImage) {
            e.preventDefault();
            e.stopPropagation();
            currentHandle = handle.dataset.position;
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            resizeStartWidth = activeResizableImage.offsetWidth;
            resizeStartHeight = activeResizableImage.offsetHeight;
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
        }
    }, true); // Use capture phase!

    // Keyboard delete for selected images
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && activeResizableImage) {
            const wrapper = activeResizableImage.closest('.image-resize-wrapper');
            if (wrapper) {
                e.preventDefault();
                wrapper.remove();
                activeResizableImage = null;
            }
        }
    });
}

function selectImageForResize(img) {
    // Remove any existing wrapper
    deselectResizableImage();

    // Determine current mode from existing styles
    const isInlineMode = img.style.float && img.style.float !== 'none';

    // Create wrapper with resize handles
    const wrapper = document.createElement('div');
    wrapper.className = 'image-resize-wrapper';
    wrapper.contentEditable = 'false'; // Make wrapper atomic - deletes as a unit
    wrapper.dataset.mode = isInlineMode ? 'inline' : 'block';

    // Apply styles based on mode
    if (isInlineMode) {
        wrapper.style.cssText = `
            display: inline;
            position: relative;
            border: 2px solid var(--accent-primary, #00d4aa);
            border-radius: 4px;
            box-sizing: border-box;
            float: ${img.style.float};
            margin: ${img.style.float === 'left' ? '0 15px 10px 0' : '0 0 10px 15px'};
        `;
    } else {
        wrapper.style.cssText = `
            display: block;
            position: relative;
            border: 2px solid var(--accent-primary, #00d4aa);
            border-radius: 4px;
            box-sizing: border-box;
            margin-left: ${img.style.marginLeft || 'auto'};
            margin-right: ${img.style.marginRight || 'auto'};
        `;
    }

    // Insert wrapper in place of image
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    // Create control bar (above image)
    const controlBar = document.createElement('div');
    controlBar.className = 'image-control-bar';
    controlBar.style.cssText = `
        position: absolute;
        top: -36px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 4px;
        background: var(--bg-card, #1a1a1a);
        border: 1px solid var(--border-color, #333);
        border-radius: 6px;
        padding: 4px;
        z-index: 20;
        white-space: nowrap;
    `;

    // Mode toggle button
    const modeBtn = document.createElement('button');
    modeBtn.className = 'image-mode-btn';
    modeBtn.innerHTML = isInlineMode ? '▣' : '▤';
    modeBtn.title = isInlineMode ? 'Inline Mode (click for Block)' : 'Block Mode (click for Inline)';
    modeBtn.style.cssText = `
        padding: 4px 8px;
        background: ${isInlineMode ? '#4CAF50' : '#2196F3'};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    `;
    modeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleImageMode(img, wrapper);
    });
    controlBar.appendChild(modeBtn);

    // Separator
    const sep1 = document.createElement('span');
    sep1.style.cssText = 'width: 1px; background: #444; margin: 0 2px;';
    controlBar.appendChild(sep1);

    // Alignment buttons
    const alignments = [
        { align: 'left', icon: '⬅', title: 'Align Left' },
        { align: 'center', icon: '⬛', title: 'Align Center' },
        { align: 'right', icon: '➡', title: 'Align Right' }
    ];

    alignments.forEach(({ align, icon, title }) => {
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.title = title;
        btn.style.cssText = `
            padding: 4px 8px;
            background: #333;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            applyImageAlignment(img, wrapper, align);
        });
        controlBar.appendChild(btn);
    });

    // Separator
    const sep2 = document.createElement('span');
    sep2.style.cssText = 'width: 1px; background: #444; margin: 0 2px;';
    controlBar.appendChild(sep2);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete Image';
    deleteBtn.style.cssText = `
        padding: 4px 8px;
        background: #ff5252;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
    `;
    deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        wrapper.remove();
        activeResizableImage = null;
    });
    controlBar.appendChild(deleteBtn);

    wrapper.appendChild(controlBar);

    // Add resize handles - only corners
    const positions = ['nw', 'ne', 'sw', 'se'];
    positions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.dataset.position = pos;

        let posStyle = '';
        switch (pos) {
            case 'nw': posStyle = 'top: -5px; left: -5px; cursor: nw-resize;'; break;
            case 'ne': posStyle = 'top: -5px; right: -5px; cursor: ne-resize;'; break;
            case 'sw': posStyle = 'bottom: -5px; left: -5px; cursor: sw-resize;'; break;
            case 'se': posStyle = 'bottom: -5px; right: -5px; cursor: se-resize;'; break;
        }

        handle.style.cssText = `
            position: absolute;
            width: 12px;
            height: 12px;
            background: var(--accent-primary, #00d4aa);
            border: 2px solid white;
            border-radius: 50%;
            z-index: 10;
            ${posStyle}
        `;
        wrapper.appendChild(handle);
    });

    // Enable drag repositioning in inline mode
    if (isInlineMode) {
        enableImageDrag(wrapper);
    }

    activeResizableImage = img;
}

// Toggle between Block and Inline modes
function toggleImageMode(img, wrapper) {
    const currentMode = wrapper.dataset.mode;
    const newMode = currentMode === 'block' ? 'inline' : 'block';
    wrapper.dataset.mode = newMode;

    if (newMode === 'inline') {
        // Switch to inline (float left by default)
        img.style.float = 'left';
        img.style.display = 'inline';
        img.style.margin = '0 15px 10px 0';
        wrapper.style.float = 'left';
        wrapper.style.display = 'inline';
        wrapper.style.margin = '0 15px 10px 0';
        wrapper.style.marginLeft = '';
        wrapper.style.marginRight = '';
        enableImageDrag(wrapper);
    } else {
        // Switch to block (centered by default)
        img.style.float = 'none';
        img.style.display = 'block';
        img.style.margin = '10px auto';
        img.style.marginLeft = 'auto';
        img.style.marginRight = 'auto';
        wrapper.style.float = 'none';
        wrapper.style.display = 'block';
        wrapper.style.margin = '10px auto';
        wrapper.style.marginLeft = 'auto';
        wrapper.style.marginRight = 'auto';
        wrapper.draggable = false;
    }

    // Update mode button
    const modeBtn = wrapper.querySelector('.image-mode-btn');
    if (modeBtn) {
        modeBtn.innerHTML = newMode === 'inline' ? '▣' : '▤';
        modeBtn.title = newMode === 'inline' ? 'Inline Mode (click for Block)' : 'Block Mode (click for Inline)';
        modeBtn.style.background = newMode === 'inline' ? '#4CAF50' : '#2196F3';
    }
}

// Apply alignment based on current mode
function applyImageAlignment(img, wrapper, align) {
    const mode = wrapper.dataset.mode;

    if (mode === 'inline') {
        // Inline mode: left/right changes float, center switches to block
        if (align === 'center') {
            toggleImageMode(img, wrapper); // Switch to block mode centered
        } else {
            img.style.float = align;
            wrapper.style.float = align;
            if (align === 'left') {
                img.style.margin = '0 15px 10px 0';
                wrapper.style.margin = '0 15px 10px 0';
            } else {
                img.style.margin = '0 0 10px 15px';
                wrapper.style.margin = '0 0 10px 15px';
            }
        }
    } else {
        // Block mode: use margins for alignment
        img.style.display = 'block';
        wrapper.style.display = 'block';

        switch (align) {
            case 'left':
                img.style.marginLeft = '0';
                img.style.marginRight = 'auto';
                wrapper.style.marginLeft = '0';
                wrapper.style.marginRight = 'auto';
                break;
            case 'center':
                img.style.marginLeft = 'auto';
                img.style.marginRight = 'auto';
                wrapper.style.marginLeft = 'auto';
                wrapper.style.marginRight = 'auto';
                break;
            case 'right':
                img.style.marginLeft = 'auto';
                img.style.marginRight = '0';
                wrapper.style.marginLeft = 'auto';
                wrapper.style.marginRight = '0';
                break;
        }
    }
}

// Enable drag-to-reposition for inline mode
function enableImageDrag(wrapper) {
    wrapper.draggable = true;

    wrapper.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', 'image-reposition');
        e.dataTransfer.effectAllowed = 'move';
        wrapper.style.opacity = '0.5';
    });

    wrapper.addEventListener('dragend', (e) => {
        wrapper.style.opacity = '1';
    });
}

function deselectResizableImage() {
    if (activeResizableImage) {
        const wrapper = activeResizableImage.closest('.image-resize-wrapper');
        if (wrapper) {
            // Move image out of wrapper
            wrapper.parentNode.insertBefore(activeResizableImage, wrapper);
            wrapper.remove();
        }
        activeResizableImage = null;
    }
}

function handleResize(e) {
    if (!activeResizableImage || !currentHandle) return;

    const deltaX = e.clientX - resizeStartX;
    const deltaY = e.clientY - resizeStartY;

    // Calculate new size based on handle position
    let newWidth = resizeStartWidth;
    let newHeight = resizeStartHeight;

    // Maintain aspect ratio
    const aspectRatio = resizeStartWidth / resizeStartHeight;

    switch (currentHandle) {
        case 'se':
            newWidth = Math.max(50, resizeStartWidth + deltaX);
            newHeight = newWidth / aspectRatio;
            break;
        case 'sw':
            newWidth = Math.max(50, resizeStartWidth - deltaX);
            newHeight = newWidth / aspectRatio;
            break;
        case 'ne':
            newWidth = Math.max(50, resizeStartWidth + deltaX);
            newHeight = newWidth / aspectRatio;
            break;
        case 'nw':
            newWidth = Math.max(50, resizeStartWidth - deltaX);
            newHeight = newWidth / aspectRatio;
            break;
    }

    activeResizableImage.style.width = newWidth + 'px';
    activeResizableImage.style.height = newHeight + 'px';
}

function stopResize() {
    currentHandle = null;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
}

// Align the currently selected image
function alignImage(alignment) {
    if (!activeResizableImage) return false;

    const wrapper = activeResizableImage.closest('.image-resize-wrapper');
    const targetElement = wrapper || activeResizableImage;

    // Remove previous alignment styles
    targetElement.style.marginLeft = '';
    targetElement.style.marginRight = '';
    targetElement.style.display = '';
    targetElement.style.float = '';

    switch (alignment) {
        case 'justifyLeft':
            targetElement.style.display = 'block';
            targetElement.style.marginLeft = '0';
            targetElement.style.marginRight = 'auto';
            break;
        case 'justifyCenter':
            targetElement.style.display = 'block';
            targetElement.style.marginLeft = 'auto';
            targetElement.style.marginRight = 'auto';
            break;
        case 'justifyRight':
            targetElement.style.display = 'block';
            targetElement.style.marginLeft = 'auto';
            targetElement.style.marginRight = '0';
            break;
    }

    // Also apply to the image itself for when wrapper is removed
    if (wrapper) {
        activeResizableImage.style.display = targetElement.style.display;
        activeResizableImage.style.marginLeft = targetElement.style.marginLeft;
        activeResizableImage.style.marginRight = targetElement.style.marginRight;
    }

    return true;
}

// ==================== HYPERLINK SYSTEM ====================
// Link modal and insertion functions

let savedSelection = null;

// Save current selection before opening modal
function saveSelection() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        savedSelection = sel.getRangeAt(0).cloneRange();
    }
}

// Restore saved selection
function restoreSelection() {
    if (savedSelection) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelection);
    }
}

// Search wiki pages (categories, subcategories, items, subitems)
function searchWikiPages(query) {
    if (!query || query.length < 2) return [];

    const results = [];
    const q = query.toLowerCase();

    localWikiData.categories.forEach(cat => {
        const catName = stripHtml(cat.name);

        // Search category name
        if (catName.toLowerCase().includes(q)) {
            results.push({
                type: 'Category',
                name: catName,
                linkText: catName,
                url: `#${cat.id}`,
                icon: '📁'
            });
        }

        // Search subcategories
        if (cat.subcategories) {
            cat.subcategories.forEach(subcat => {
                const subcatName = stripHtml(subcat.name);
                if (subcatName.toLowerCase().includes(q)) {
                    results.push({
                        type: 'Subcategory',
                        name: `${catName} › ${subcatName}`,
                        linkText: subcatName,
                        url: `#${subcat.id}`,
                        icon: '📂'
                    });
                }

                // Search items in subcategory
                if (subcat.items) {
                    subcat.items.forEach(item => {
                        const itemName = stripHtml(item.name);
                        if (itemName.toLowerCase().includes(q)) {
                            results.push({
                                type: 'Item',
                                name: `${subcatName} › ${itemName}`,
                                linkText: itemName,
                                url: `item.html?id=${item.id}`,
                                icon: '📄'
                            });
                        }
                    });
                }
            });
        }

        // Search items in category
        if (cat.items) {
            cat.items.forEach(item => {
                const itemName = stripHtml(item.name);
                if (itemName.toLowerCase().includes(q)) {
                    results.push({
                        type: 'Item',
                        name: `${catName} › ${itemName}`,
                        linkText: itemName,
                        url: `item.html?id=${item.id}`,
                        icon: '📄'
                    });
                }

                // Search subitems
                if (item.subItems) {
                    item.subItems.forEach((subItem, subIdx) => {
                        const subItemName = stripHtml(subItem.name);
                        if (subItemName.toLowerCase().includes(q)) {
                            results.push({
                                type: 'SubItem',
                                name: `${itemName} › ${subItemName}`,
                                linkText: subItemName,
                                url: `item.html?id=${item.id}#subitem-${subIdx}`,
                                icon: '📎'
                            });
                        }
                    });
                }
            });
        }
    });

    return results.slice(0, 10); // Limit to 10 results
}

// Show link modal dialog
function showLinkModal(targetElement) {
    saveSelection();

    // Remove existing modal if any
    const existingModal = document.getElementById('linkModal');
    if (existingModal) existingModal.remove();

    // Get selected text for link text
    const sel = window.getSelection();
    const selectedText = sel.toString() || '';

    const modal = document.createElement('div');
    modal.id = 'linkModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    modal.innerHTML = `
        <div class="link-modal-content" style="
            background: var(--bg-card, #1e1e2e);
            border: 1px solid var(--border-color, #333);
            border-radius: 12px;
            padding: 20px;
            width: 400px;
            max-width: 90vw;
            color: var(--text-primary, #fff);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 1.2rem;">Insert Link</h3>
                <button id="closeLinkModal" style="background: none; border: none; color: #888; font-size: 20px; cursor: pointer;">×</button>
            </div>
            
            <div class="link-tabs" style="display: flex; gap: 10px; margin-bottom: 15px;">
                <button id="urlTab" class="link-tab active" style="
                    flex: 1;
                    padding: 8px;
                    background: var(--accent-primary, #00d4aa);
                    color: var(--bg-dark, #000);
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">URL Link</button>
                <button id="wikiTab" class="link-tab" style="
                    flex: 1;
                    padding: 8px;
                    background: #333;
                    color: #fff;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">Wiki Page</button>
            </div>
            
            <div id="urlPanel" class="link-panel">
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-size: 0.9rem; color: #888;">Link Text</label>
                    <input type="text" id="linkText" value="${selectedText}" placeholder="Enter link text" style="
                        width: 100%;
                        padding: 10px;
                        background: var(--bg-secondary, #252535);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 6px;
                        color: #fff;
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-size: 0.9rem; color: #888;">URL</label>
                    <input type="text" id="linkUrl" placeholder="https://example.com" style="
                        width: 100%;
                        padding: 10px;
                        background: var(--bg-secondary, #252535);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 6px;
                        color: #fff;
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>
            </div>
            
            <div id="wikiPanel" class="link-panel" style="display: none;">
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-size: 0.9rem; color: #888;">Search Wiki Pages</label>
                    <input type="text" id="wikiSearch" placeholder="Search categories, items..." style="
                        width: 100%;
                        padding: 10px;
                        background: var(--bg-secondary, #252535);
                        border: 1px solid var(--border-color, #333);
                        border-radius: 6px;
                        color: #fff;
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>
                <div id="wikiResults" style="
                    max-height: 200px;
                    overflow-y: auto;
                    border: 1px solid var(--border-color, #333);
                    border-radius: 6px;
                    background: var(--bg-secondary, #252535);
                "></div>
                <input type="hidden" id="selectedWikiUrl">
                <input type="hidden" id="selectedWikiName">
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button id="cancelLink" style="
                    flex: 1;
                    padding: 10px;
                    background: #333;
                    color: #fff;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">Cancel</button>
                <button id="insertLink" style="
                    flex: 1;
                    padding: 10px;
                    background: var(--accent-primary, #00d4aa);
                    color: var(--bg-dark, #000);
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">Insert Link</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Tab switching
    const urlTab = document.getElementById('urlTab');
    const wikiTab = document.getElementById('wikiTab');
    const urlPanel = document.getElementById('urlPanel');
    const wikiPanel = document.getElementById('wikiPanel');

    urlTab.addEventListener('click', () => {
        urlTab.style.background = 'var(--accent-primary, #00d4aa)';
        urlTab.style.color = 'var(--bg-dark, #000)';
        wikiTab.style.background = '#333';
        wikiTab.style.color = '#fff';
        urlPanel.style.display = 'block';
        wikiPanel.style.display = 'none';
    });

    wikiTab.addEventListener('click', () => {
        wikiTab.style.background = 'var(--accent-primary, #00d4aa)';
        wikiTab.style.color = 'var(--bg-dark, #000)';
        urlTab.style.background = '#333';
        urlTab.style.color = '#fff';
        wikiPanel.style.display = 'block';
        urlPanel.style.display = 'none';
        document.getElementById('wikiSearch').focus();
    });

    // Wiki search
    const wikiSearch = document.getElementById('wikiSearch');
    const wikiResults = document.getElementById('wikiResults');

    wikiSearch.addEventListener('input', () => {
        const results = searchWikiPages(wikiSearch.value);
        wikiResults.innerHTML = results.length ? results.map(r => `
            <div class="wiki-result" data-url="${encodeURIComponent(r.url)}" data-linktext="${encodeURIComponent(r.linkText)}" style="
                padding: 10px;
                cursor: pointer;
                border-bottom: 1px solid #333;
                display: flex;
                align-items: center;
                gap: 8px;
            " onmouseover="this.style.background='#333'" onmouseout="this.style.background=''">
                <span style="font-size: 16px;">${r.icon}</span>
                <div>
                    <div style="font-size: 0.9rem;">${escapeHtml(r.name)}</div>
                    <div style="font-size: 0.75rem; color: #666;">${r.type}</div>
                </div>
            </div>
        `).join('') : '<div style="padding: 15px; text-align: center; color: #666;">No results found</div>';

        // Add click handlers to results
        wikiResults.querySelectorAll('.wiki-result').forEach(el => {
            el.addEventListener('click', () => {
                document.getElementById('selectedWikiUrl').value = decodeURIComponent(el.dataset.url);
                document.getElementById('selectedWikiName').value = decodeURIComponent(el.dataset.linktext);
                wikiResults.querySelectorAll('.wiki-result').forEach(r => r.style.background = '');
                el.style.background = 'var(--accent-primary, #00d4aa)';
                el.style.color = '#000';
            });
        });
    });

    // Close handlers
    const closeModal = () => modal.remove();
    document.getElementById('closeLinkModal').addEventListener('click', closeModal);
    document.getElementById('cancelLink').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Insert link handler
    document.getElementById('insertLink').addEventListener('click', () => {
        let url, text;

        if (urlPanel.style.display !== 'none') {
            // URL tab
            url = document.getElementById('linkUrl').value;
            text = document.getElementById('linkText').value || url;
        } else {
            // Wiki tab
            url = document.getElementById('selectedWikiUrl').value;
            text = document.getElementById('selectedWikiName').value || url;
        }

        if (!url) {
            alert('Please enter a URL or select a wiki page');
            return;
        }

        closeModal();
        restoreSelection();
        insertHyperlinkAtSelection(url, text, targetElement);
    });

    // Focus first input
    document.getElementById('linkText').focus();
}

// Insert hyperlink at current selection
function insertHyperlinkAtSelection(url, text, targetElement) {
    if (targetElement) targetElement.focus();
    restoreSelection();

    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();

        const link = document.createElement('a');
        link.href = url;
        link.textContent = text;
        link.style.color = 'var(--accent-primary, #00d4aa)';
        link.style.textDecoration = 'underline';

        // Open external links in new tab
        if (url.startsWith('http')) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }

        range.insertNode(link);

        // Move cursor after link
        range.setStartAfter(link);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

// ==================== INLINE RICH TEXT TOOLBAR ====================
// On-page toolbar that can be inserted before any contenteditable field

function createInlineToolbar(targetElement, toolbarId) {
    const toolbarContainer = document.createElement('div');
    toolbarContainer.className = 'rich-text-toolbar inline-toolbar';
    toolbarContainer.id = toolbarId || 'inlineToolbar_' + Math.random().toString(36).substr(2, 9);
    toolbarContainer.innerHTML = `
        <button type="button" data-cmd="bold" title="Bold"><b>B</b></button>
        <button type="button" data-cmd="italic" title="Italic"><i>I</i></button>
        <button type="button" data-cmd="underline" title="Underline"><u>U</u></button>
        <button type="button" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
        <span class="toolbar-divider"></span>
        <button type="button" data-cmd="justifyLeft" title="Align Left">⬅</button>
        <button type="button" data-cmd="justifyCenter" title="Align Center">⬛</button>
        <button type="button" data-cmd="justifyRight" title="Align Right">➡</button>
        <span class="toolbar-divider"></span>
        <select class="heading-select" title="Heading">
            <option value="">Heading</option>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
            <option value="p">Normal</option>
        </select>
        <select class="font-size-select" title="Font Size">
            <option value="">Size</option>
            <option value="10">10</option>
            <option value="12">12</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="24">24</option>
        </select>
        <span class="toolbar-divider"></span>
        <select class="color-select" title="Text Color">
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
        <input type="color" class="custom-color-picker" style="width:0;height:0;opacity:0;position:absolute;">
        <span class="toolbar-divider"></span>
        <button type="button" class="insert-image-btn" title="Insert Image">IMG</button>
        <input type="file" class="image-input" accept="image/*" style="display:none;">
        <button type="button" class="insert-link-btn" title="Insert Link">LINK</button>
        <span class="toolbar-divider"></span>
        <button type="button" data-cmd="removeFormat" title="Clear Formatting">✕</button>
    `;

    // Wire up command buttons
    toolbarContainer.querySelectorAll('button[data-cmd]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const cmd = btn.dataset.cmd;

            // Check if this is an alignment command and we have a selected image
            if ((cmd === 'justifyLeft' || cmd === 'justifyCenter' || cmd === 'justifyRight') && activeResizableImage) {
                alignImage(cmd);
            } else {
                document.execCommand(cmd, false, null);
            }
            targetElement.focus();
        });
    });

    // Heading handler
    const headingSelect = toolbarContainer.querySelector('.heading-select');
    headingSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            document.execCommand('formatBlock', false, e.target.value);
            targetElement.focus();
            e.target.value = '';
        }
    });

    // Font size handler - use inline style for exact pixel sizes
    const fontSizeSelect = toolbarContainer.querySelector('.font-size-select');
    fontSizeSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            const fontSize = e.target.value + 'px';
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.fontSize = fontSize;
                range.surroundContents(span);
            }
            targetElement.focus();
            e.target.value = '';
        }
    });

    // Color handler with custom option
    const colorSelect = toolbarContainer.querySelector('.color-select');
    const customColorPicker = toolbarContainer.querySelector('.custom-color-picker');

    colorSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customColorPicker.click();
            e.target.value = '';
        } else if (e.target.value) {
            document.execCommand('foreColor', false, e.target.value);
            targetElement.focus();
            e.target.value = '';
        }
    });

    customColorPicker.addEventListener('input', (e) => {
        document.execCommand('foreColor', false, e.target.value);
        targetElement.focus();
    });

    // Image insertion handler
    const insertImageBtn = toolbarContainer.querySelector('.insert-image-btn');
    const imageInput = toolbarContainer.querySelector('.image-input');

    insertImageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
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
                targetElement.focus();
                const img = document.createElement('img');
                img.src = base64;
                img.className = 'desc-inline-image';
                img.style.cssText = 'max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; display: block; cursor: pointer;';
                img.title = 'Click to delete this image';

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
                    targetElement.appendChild(img);
                }

                // Add delete handler
                img.addEventListener('click', () => {
                    if (confirm('Delete this image?')) {
                        img.remove();
                    }
                });
            };
            tempImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
        imageInput.value = '';
    });

    // Link insertion handler
    const insertLinkBtn = toolbarContainer.querySelector('.insert-link-btn');
    if (insertLinkBtn) {
        insertLinkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLinkModal(targetElement);
        });
    }

    return toolbarContainer;
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
        <button type="button" data-cmd="justifyLeft" title="Align Left">⬅</button>
        <button type="button" data-cmd="justifyCenter" title="Align Center">⬛</button>
        <button type="button" data-cmd="justifyRight" title="Align Right">➡</button>
        <span class="toolbar-divider" style="width:1px;height:20px;background:#444;margin:0 6px;"></span>
        <select id="floatingHeadingSelect" title="Heading" style="padding:4px;background:#333;color:white;border:1px solid #555;border-radius:4px;cursor:pointer;">
            <option value="">Heading</option>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
            <option value="p">Normal</option>
        </select>
        <select id="floatingFontSizeSelect" title="Font Size" style="padding:4px;background:#333;color:white;border:1px solid #555;border-radius:4px;cursor:pointer;">
            <option value="">Size</option>
            <option value="10">10</option>
            <option value="12">12</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="24">24</option>
        </select>
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
        <button type="button" id="floatingInsertImageBtn" title="Insert Image">IMG</button>
        <input type="file" id="floatingImageInput" accept="image/*" style="display:none;">
        <button type="button" id="floatingInsertLinkBtn" title="Insert Link">LINK</button>
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

            // Check if this is an alignment command and we have a selected image
            if ((cmd === 'justifyLeft' || cmd === 'justifyCenter' || cmd === 'justifyRight') && activeResizableImage) {
                alignImage(cmd);
            } else {
                document.execCommand(cmd, false, null);
            }
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

    // Heading select handler
    const headingSelect = toolbar.querySelector('#floatingHeadingSelect');
    headingSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            document.execCommand('formatBlock', false, e.target.value);
            if (activeEditableField) activeEditableField.focus();
            e.target.value = '';
        }
    });

    // Font size select handler - use inline style for exact pixel sizes
    const fontSizeSelect = toolbar.querySelector('#floatingFontSizeSelect');
    fontSizeSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            const fontSize = e.target.value + 'px';
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.fontSize = fontSize;
                range.surroundContents(span);
            }
            if (activeEditableField) activeEditableField.focus();
            e.target.value = '';
        }
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

    // Link insert button handler
    const insertLinkBtn = toolbar.querySelector('#floatingInsertLinkBtn');
    if (insertLinkBtn) {
        insertLinkBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            showLinkModal(activeEditableField);
        });
    }

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
            adminBtn.className = 'btn-admin';
            adminBtn.style.cssText = 'padding: 8px 16px; font-size: 0.9em;';
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
            toggle.className = 'btn-edit-mode';
            toggle.style.cssText = 'padding: 8px 16px; font-size: 0.9em;';
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

    // Apply background image if set
    applyBackgroundImage();

    // Apply accent color if set
    applyAccentColor();

    // Apply default font size if set
    applyDefaultFontSize();

    // Initialize image resizer for edit mode
    initImageResizer();

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

        // Helper to check if a node has children (subcategories or items)
        const hasDirectItems = category.items && category.items.length > 0;
        const hasSubcats = category.subcategories && category.subcategories.length > 0;
        const hasChildren = hasDirectItems || hasSubcats;

        // Container for Toggle + Link
        const linkWrapper = document.createElement('div');
        linkWrapper.style.cssText = 'display: flex; align-items: center; justify-content: flex-start;';

        const a = document.createElement('a');
        a.href = `index.html?category=${category.id}`;
        a.innerHTML = category.name;
        if (/<font|<span|style=|color[=:]/i.test(category.name)) a.classList.add('has-formatting');
        a.addEventListener('click', () => { if (window.innerWidth <= 768) toggleSidebar(); });

        // Expand/Collapse Logic
        if (hasChildren) {
            const toggleBtn = document.createElement('button');
            const expandedState = JSON.parse(localStorage.getItem('sidebarExpandedState') || '{}');
            const isExpanded = expandedState[category.id];

            toggleBtn.className = 'sidebar-toggle-btn';
            toggleBtn.innerHTML = isExpanded ? '▼' : '▶';
            toggleBtn.title = isExpanded ? 'Collapse' : 'Expand';
            toggleBtn.style.cssText = 'background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.8rem; padding: 2px 8px; margin-right: -5px; margin-left: -5px;';

            // Container for Children
            const childrenContainer = document.createElement('ul');
            childrenContainer.className = 'nav-children';
            childrenContainer.style.cssText = `margin-left: 15px; margin-top: 4px; border-left: 1px solid var(--border-color); padding-left: 10px; display: ${isExpanded ? 'block' : 'none'}; list-style: none;`;

            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isNowExpanded = childrenContainer.style.display === 'none';
                if (isNowExpanded) {
                    childrenContainer.style.display = 'block';
                    toggleBtn.innerHTML = '▼';
                    expandedState[category.id] = true;
                } else {
                    childrenContainer.style.display = 'none';
                    toggleBtn.innerHTML = '▶';
                    delete expandedState[category.id];
                }
                localStorage.setItem('sidebarExpandedState', JSON.stringify(expandedState));
            });

            linkWrapper.appendChild(toggleBtn);
            linkWrapper.appendChild(a);
            li.appendChild(linkWrapper);

            // 1. Render Subcategories
            if (hasSubcats) {
                category.subcategories.forEach(subcat => {
                    const subLi = document.createElement('li');

                    const subHasItems = subcat.items && subcat.items.length > 0;

                    const subLinkWrapper = document.createElement('div');
                    subLinkWrapper.style.cssText = 'display: flex; align-items: center; justify-content: flex-start; padding: 2px 0;';

                    const subA = document.createElement('a');
                    subA.href = `index.html?category=${category.id}&subcategory=${subcat.id}`;
                    subA.innerHTML = subcat.name;
                    subA.style.cssText = 'font-size: 0.95em; opacity: 0.9;';
                    if (/<font|<span|style=|color[=:]/i.test(subcat.name)) subA.classList.add('has-formatting');
                    subA.addEventListener('click', () => { if (window.innerWidth <= 768) toggleSidebar(); });

                    if (subHasItems) {
                        const subToggle = document.createElement('button');
                        const isSubExpanded = expandedState[subcat.id];
                        subToggle.innerHTML = isSubExpanded ? '▼' : '▶';
                        subToggle.style.cssText = 'background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.75rem; padding: 2px 6px; margin-right: 0;';

                        const subItemsContainer = document.createElement('ul');
                        subItemsContainer.style.cssText = `margin-left: 12px; border-left: 1px solid var(--border-color); padding-left: 8px; display: ${isSubExpanded ? 'block' : 'none'}; list-style: none;`;

                        subToggle.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (subItemsContainer.style.display === 'none') {
                                subItemsContainer.style.display = 'block';
                                subToggle.innerHTML = '▼';
                                expandedState[subcat.id] = true;
                            } else {
                                subItemsContainer.style.display = 'none';
                                subToggle.innerHTML = '▶';
                                delete expandedState[subcat.id];
                            }
                            localStorage.setItem('sidebarExpandedState', JSON.stringify(expandedState));
                        });

                        subLinkWrapper.appendChild(subToggle);
                        subLinkWrapper.appendChild(subA);
                        subLi.appendChild(subLinkWrapper);

                        // Render Items in Subcategory
                        subcat.items.forEach(item => {
                            renderSidebarItem(item, subItemsContainer, expandedState);
                        });

                        subLi.appendChild(subItemsContainer);
                    } else {
                        // No items, just link
                        // Indent to align with toggled ones
                        subLinkWrapper.style.paddingLeft = '18px';
                        subLinkWrapper.appendChild(subA);
                        subLi.appendChild(subLinkWrapper);
                    }
                    childrenContainer.appendChild(subLi);
                });
            }

            // 2. Render Direct Category Items
            if (hasDirectItems) {
                category.items.forEach(item => {
                    renderSidebarItem(item, childrenContainer, expandedState);
                });
            }

            li.appendChild(childrenContainer);
        } else {
            // No children at all
            linkWrapper.style.paddingLeft = '18px'; // Indent to match toggle width
            linkWrapper.appendChild(a);
            li.appendChild(linkWrapper);
        }

        navList.appendChild(li);
    });
}

// Helper to render an Item and its Sub-items in sidebar
function renderSidebarItem(item, container, expandedState) {
    const li = document.createElement('li');
    const hasSubItems = item.subItems && item.subItems.length > 0;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; justify-content: flex-start; padding: 2px 0;';

    const a = document.createElement('a');
    a.href = `item.html?id=${item.id}`;
    a.innerHTML = item.name;
    a.style.cssText = 'font-size: 0.9em; opacity: 0.8;';

    // Check item restricted/admin
    // (Optional: add indicator)

    if (hasSubItems) {
        const toggle = document.createElement('button');
        const isExpanded = expandedState[item.id];
        toggle.innerHTML = isExpanded ? '▼' : '▶';
        toggle.style.cssText = 'background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.7rem; padding: 2px 6px;';

        const subItemsList = document.createElement('ul');
        subItemsList.style.cssText = `margin-left: 12px; border-left: 1px solid var(--border-color); padding-left: 8px; display: ${isExpanded ? 'block' : 'none'}; list-style: none;`;

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (subItemsList.style.display === 'none') {
                subItemsList.style.display = 'block';
                toggle.innerHTML = '▼';
                expandedState[item.id] = true;
            } else {
                subItemsList.style.display = 'none';
                toggle.innerHTML = '▶';
                delete expandedState[item.id];
            }
            localStorage.setItem('sidebarExpandedState', JSON.stringify(expandedState));
        });

        wrapper.appendChild(toggle);
        wrapper.appendChild(a);
        li.appendChild(wrapper);

        // Render Sub-items
        item.subItems.forEach((subItem, idx) => {
            const subLi = document.createElement('li');
            const subA = document.createElement('a');
            subA.href = `item.html?id=${item.id}&subitem=${idx}`;
            subA.innerHTML = subItem.name;
            subA.style.cssText = 'font-size: 0.85em; opacity: 0.7; display: block; padding: 2px 0 2px 16px;'; // Indent for leaf
            subLi.appendChild(subA);
            subItemsList.appendChild(subLi);
        });

        li.appendChild(subItemsList);
    } else {
        wrapper.style.paddingLeft = '18px'; // Indent items without sub-items
        wrapper.appendChild(a);
        li.appendChild(wrapper);
    }

    container.appendChild(li);
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

    // Handle Welcome and News Boxes
    const homepageBoxes = document.getElementById('homepageBoxes');
    const welcomeBoxContent = document.getElementById('welcomeBoxContent');
    const newsBoxContent = document.getElementById('newsBoxContent');
    const welcomeBoxTitle = document.getElementById('welcomeBoxTitle');
    const newsBoxTitle = document.getElementById('newsBoxTitle');

    if (homepageBoxes && welcomeBoxContent && newsBoxContent) {
        if (filterCategoryId) {
            // Hide boxes on category pages
            homepageBoxes.style.display = 'none';
        } else {
            // Show boxes on homepage
            homepageBoxes.style.display = '';

            // Load saved content
            if (localWikiData.welcomeBox) welcomeBoxContent.innerHTML = localWikiData.welcomeBox;
            if (localWikiData.newsBox) newsBoxContent.innerHTML = localWikiData.newsBox;
            if (localWikiData.welcomeTitle && welcomeBoxTitle) welcomeBoxTitle.innerHTML = localWikiData.welcomeTitle;
            if (localWikiData.newsTitle && newsBoxTitle) newsBoxTitle.innerHTML = localWikiData.newsTitle;

            if (currentUser && currentUser.role === 'admin' && isEditMode) {
                // Make boxes editable
                welcomeBoxContent.dataset.field = 'welcomeBox';
                welcomeBoxContent.dataset.original = welcomeBoxContent.innerHTML;
                makeRichEditable(welcomeBoxContent);

                newsBoxContent.dataset.field = 'newsBox';
                newsBoxContent.dataset.original = newsBoxContent.innerHTML;
                makeRichEditable(newsBoxContent);

                // Make titles editable (consistent with Hero Title)
                if (welcomeBoxTitle) {
                    welcomeBoxTitle.dataset.field = 'welcomeTitle'; // Use distinct field name for clarity in save logic if needed, but we used IDs primarily
                    welcomeBoxTitle.dataset.original = welcomeBoxTitle.innerHTML;
                    makeRichEditable(welcomeBoxTitle);
                }
                if (newsBoxTitle) {
                    newsBoxTitle.dataset.field = 'newsTitle';
                    newsBoxTitle.dataset.original = newsBoxTitle.innerHTML;
                    makeRichEditable(newsBoxTitle);
                }

            } else {
                welcomeBoxContent.contentEditable = 'false';
                newsBoxContent.contentEditable = 'false';
                if (welcomeBoxTitle) welcomeBoxTitle.contentEditable = 'false';
                if (newsBoxTitle) newsBoxTitle.contentEditable = 'false';
            }
        }
    }

    // If filtering, add a Back button
    if (filterCategoryId) {
        const backLink = document.createElement('a');
        backLink.className = 'btn-back';
        backLink.style.display = 'inline-block';
        backLink.style.marginBottom = '20px';

        if (filterSubcategoryId) {
            // Viewing Subcategory -> Back to Category
            backLink.href = `index.html?category=${filterCategoryId}`;
            // Try to find category name for better label
            const cat = localWikiData.categories.find(c => c.id === filterCategoryId);
            const catName = cat ? stripHtml(cat.name) : 'Category';
            backLink.textContent = `← Back to ${catName}`;
        } else {
            // Viewing Category -> Back to Home
            backLink.href = 'index.html';
            backLink.textContent = '← Back to All Categories';
        }

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

        // Always show all categories on main page (even empty ones)
        // On category page (filtered view), always show the filtered category
        const showCategory = true;

        if (showCategory) {
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
            h2.style.cssText = 'margin: 0; font-size: 1.15rem;';

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

            // Show Category Description ONLY on Category Page (not subcategory page)
            if (filterCategoryId && !filterSubcategoryId) {
                const descContainer = document.createElement('div');
                descContainer.className = 'category-description-container';
                descContainer.style.cssText = 'margin-bottom: 20px;';

                const descP = document.createElement('div');
                descP.className = 'category-description';
                descP.style.cssText = 'color: var(--text-secondary); font-style: italic;';

                if (currentUser && currentUser.role === 'admin' && isEditMode) {
                    // Create inline toolbar for category description
                    const catDescToolbar = createInlineToolbar(descP, 'catDescToolbar');
                    descContainer.appendChild(catDescToolbar);

                    descP.contentEditable = 'true';
                    descP.innerHTML = category.description || 'Click to add description...';
                    descP.dataset.catIndex = catIndex;
                    descP.dataset.field = 'description';
                    descP.dataset.original = category.description || '';
                    descP.style.minHeight = '60px';
                    descP.style.padding = '10px';
                    descP.style.border = '1px solid var(--border-color)';
                    descP.style.borderRadius = '8px';
                    descP.style.marginTop = '8px';
                } else {
                    descP.innerHTML = category.description || 'No description.';
                }

                descContainer.appendChild(descP);
                catGroup.appendChild(descContainer);
            }

            // ==================== COLLAPSIBLE CONTENT WRAPPER ====================
            // Only add collapse on main page (not filtered category page)
            const collapsibleContent = document.createElement('div');
            collapsibleContent.className = 'category-content';

            // Check if category is collapsed (stored in localStorage)
            const collapsedCategories = JSON.parse(localStorage.getItem('collapsedCategories') || '{}');
            const isCollapsed = !filterCategoryId && collapsedCategories[category.id];

            if (isCollapsed) {
                collapsibleContent.style.display = 'none';
                catGroup.classList.add('collapsed');
            }

            // Add collapse toggle button (only on main page, not category page)
            if (!filterCategoryId) {
                const collapseBtn = document.createElement('button');
                collapseBtn.className = 'collapse-toggle-btn';
                collapseBtn.innerHTML = isCollapsed ? '▶' : '▼';
                collapseBtn.title = isCollapsed ? 'Expand' : 'Collapse';
                collapseBtn.style.cssText = 'background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1rem; padding: 5px 10px; margin-right: 8px; transition: transform 0.2s;';

                collapseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isNowCollapsed = collapsibleContent.style.display === 'none';

                    if (isNowCollapsed) {
                        collapsibleContent.style.display = 'block';
                        collapseBtn.innerHTML = '▼';
                        collapseBtn.title = 'Collapse';
                        catGroup.classList.remove('collapsed');
                        delete collapsedCategories[category.id];
                    } else {
                        collapsibleContent.style.display = 'none';
                        collapseBtn.innerHTML = '▶';
                        collapseBtn.title = 'Expand';
                        catGroup.classList.add('collapsed');
                        collapsedCategories[category.id] = true;
                    }

                    localStorage.setItem('collapsedCategories', JSON.stringify(collapsedCategories));
                });

                // Insert collapse button at the beginning of header
                headerWrapper.insertBefore(collapseBtn, headerWrapper.firstChild);
            }

            // ==================== CATEGORY ITEMS LIST ====================
            // Only show category's direct items when NOT viewing a subcategory page
            if (!filterSubcategoryId) {
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

                    // Only show description on Item Page (so hidden in lists)
                    const descHtml = '';

                    // Find actual item index in category for image updates
                    const actualItemIndex = category.items.findIndex(i => i.id === item.id);

                    const imageHtml = item.image
                        ? `<img src="${item.image}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px;margin-right:10px;flex-shrink:0;">`
                        : '';

                    // Edit Mode: Show editable image
                    if (currentUser && currentUser.role === 'admin' && isEditMode) {
                        li.style.display = 'flex';
                        li.style.alignItems = 'center';
                        const imageUploader = createImageUploader(item.image, (base64) => {
                            const catIdx = localWikiData.categories.findIndex(c => c.id === category.id);
                            if (catIdx !== -1 && actualItemIndex !== -1) {
                                localWikiData.categories[catIdx].items[actualItemIndex].image = base64;
                                persistData();
                            }
                        });
                        imageUploader.style.cssText = 'width: 32px; height: 32px; flex-shrink: 0; margin-right: 8px; position: relative;';
                        imageUploader.querySelector('img').style.cssText = 'width: 32px; height: 32px; object-fit: cover; border-radius: 6px; background: var(--bg-secondary); border: 2px dashed var(--border-color);';
                        li.appendChild(imageUploader);

                        a.style.cssText = 'flex: 1;';
                        a.innerHTML = `
                            <span class="item-name" style="font-size: 0.85em;">${item.name}${adminBadge}</span>
                        `;
                        li.appendChild(a);
                    } else {
                        const imageHtml = item.image
                            ? `<img src="${item.image}" alt="" style="width:32px;height:32px;object-fit:cover;border-radius:6px;margin-right:8px;flex-shrink:0;">`
                            : '';

                        a.style.cssText = 'display: flex; align-items: center;';
                        a.innerHTML = `
                            ${imageHtml}
                            <div style="flex:1;">
                                <span class="item-name" style="font-size: 0.85em;">${item.name}${adminBadge}</span>
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

                collapsibleContent.appendChild(list);
            }

            // ==================== RENDER SUBCATEGORIES ====================
            // Show subcategories on both main page and category page
            if (category.subcategories && category.subcategories.length > 0) {
                // If filtering by subcategory, only show that one
                const subcatsToRender = filterSubcategoryId
                    ? category.subcategories.filter(s => s.id === filterSubcategoryId)
                    : category.subcategories;

                subcatsToRender.forEach((subcat, subcatIndex) => {
                    const actualSubcatIndex = category.subcategories.findIndex(s => s.id === subcat.id);

                    const subcatGroup = document.createElement('div');
                    subcatGroup.className = 'subcategory-group';
                    subcatGroup.id = subcat.id;
                    subcatGroup.style.cssText = 'margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 8px; border-left: 2px solid var(--accent-primary);';

                    // Subcategory Drag and Drop (Edit Mode Only)
                    if (currentUser && currentUser.role === 'admin' && isEditMode) {
                        subcatGroup.draggable = true;
                        subcatGroup.classList.add('draggable-subcat');
                        subcatGroup.dataset.catIndex = catIndex;
                        subcatGroup.dataset.subcatIndex = actualSubcatIndex;

                        subcatGroup.addEventListener('dragstart', (e) => {
                            if (e.target !== subcatGroup) return;
                            e.stopPropagation();
                            subcatGroup.classList.add('dragging-subcat');
                            e.dataTransfer.setData('application/subcategory', JSON.stringify({
                                catIndex: catIndex,
                                subcatIndex: actualSubcatIndex
                            }));
                            e.dataTransfer.effectAllowed = 'move';
                        });

                        subcatGroup.addEventListener('dragend', () => {
                            subcatGroup.classList.remove('dragging-subcat');
                            document.querySelectorAll('.drag-over-subcat').forEach(el => el.classList.remove('drag-over-subcat'));
                        });

                        subcatGroup.addEventListener('dragover', (e) => {
                            if (e.dataTransfer.types.includes('application/subcategory')) {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                                subcatGroup.classList.add('drag-over-subcat');
                            }
                        });

                        subcatGroup.addEventListener('dragleave', () => {
                            subcatGroup.classList.remove('drag-over-subcat');
                        });

                        subcatGroup.addEventListener('drop', (e) => {
                            if (!e.dataTransfer.types.includes('application/subcategory')) return;
                            e.preventDefault();
                            e.stopPropagation();
                            subcatGroup.classList.remove('drag-over-subcat');

                            const data = JSON.parse(e.dataTransfer.getData('application/subcategory'));
                            const fromCatIndex = data.catIndex;
                            const fromSubcatIndex = data.subcatIndex;
                            const toCatIndex = catIndex;
                            const toSubcatIndex = actualSubcatIndex;

                            // Only allow reorder within same category
                            if (fromCatIndex === toCatIndex && fromSubcatIndex !== toSubcatIndex) {
                                const cat = localWikiData.categories[fromCatIndex];
                                if (cat && cat.subcategories) {
                                    const [movedSubcat] = cat.subcategories.splice(fromSubcatIndex, 1);
                                    cat.subcategories.splice(toSubcatIndex, 0, movedSubcat);
                                    persistData();
                                    renderHome(document.getElementById('contentGrid'));
                                }
                            }
                        });
                    }

                    // Subcategory Header
                    const subcatHeader = document.createElement('div');
                    subcatHeader.className = 'subcategory-header-wrapper';
                    subcatHeader.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px;';

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
                    subcatTitle.style.cssText = 'margin: 0; font-size: 0.95rem;';

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
                        // Make subcategory title a clickable link
                        const subcatLink = document.createElement('a');
                        subcatLink.href = `index.html?category=${category.id}&subcategory=${subcat.id}`;
                        subcatLink.innerHTML = subcat.name;
                        subcatLink.style.cssText = 'color: inherit; text-decoration: none; cursor: pointer;';
                        subcatLink.onmouseover = () => subcatLink.style.color = 'var(--accent-primary)';
                        subcatLink.onmouseout = () => subcatLink.style.color = 'inherit';
                        subcatTitle.appendChild(subcatLink);
                    }

                    subcatHeader.appendChild(subcatTitle);
                    subcatGroup.appendChild(subcatHeader);

                    // Subcategory Description - only show on subcategory page
                    if (filterSubcategoryId) {
                        const subcatDescContainer = document.createElement('div');
                        subcatDescContainer.style.cssText = 'margin-bottom: 15px;';

                        if (currentUser && currentUser.role === 'admin' && isEditMode) {
                            const subcatDescP = document.createElement('div');
                            subcatDescP.className = 'subcategory-description rich-editable';
                            subcatDescP.style.cssText = 'color: var(--text-secondary); font-style: italic;';

                            // Create inline toolbar for subcategory description
                            const subcatDescToolbar = createInlineToolbar(subcatDescP, 'subcatDescToolbar');
                            subcatDescContainer.appendChild(subcatDescToolbar);

                            subcatDescP.contentEditable = 'true';
                            subcatDescP.innerHTML = subcat.description || 'Click to add description...';
                            subcatDescP.dataset.catIndex = catIndex;
                            subcatDescP.dataset.subcatIndex = actualSubcatIndex;
                            subcatDescP.dataset.field = 'subcatDescription';
                            subcatDescP.dataset.original = subcat.description || '';
                            subcatDescP.style.minHeight = '60px';
                            subcatDescP.style.padding = '10px';
                            subcatDescP.style.border = '1px solid var(--border-color)';
                            subcatDescP.style.borderRadius = '8px';
                            subcatDescP.style.marginTop = '8px';

                            subcatDescContainer.appendChild(subcatDescP);
                        } else if (subcat.description) {
                            const subcatDescP = document.createElement('p');
                            subcatDescP.style.cssText = 'color: var(--text-secondary); font-style: italic;';
                            subcatDescP.innerHTML = subcat.description;
                            subcatDescContainer.appendChild(subcatDescP);
                        }
                        subcatGroup.appendChild(subcatDescContainer);
                    }

                    // ==================== SUBCATEGORY COLLAPSIBLE CONTENT ====================
                    const subcatCollapsible = document.createElement('div');
                    subcatCollapsible.className = 'subcategory-content';

                    // Check if subcategory is collapsed
                    const collapsedSubcats = JSON.parse(localStorage.getItem('collapsedSubcategories') || '{}');
                    const isSubcatCollapsed = !filterCategoryId && collapsedSubcats[subcat.id];

                    if (isSubcatCollapsed) {
                        subcatCollapsible.style.display = 'none';
                        subcatGroup.classList.add('collapsed');
                    }

                    // Add collapse toggle for subcategory (only on main page)
                    if (!filterCategoryId) {
                        const subcatCollapseBtn = document.createElement('button');
                        subcatCollapseBtn.className = 'collapse-toggle-btn';
                        subcatCollapseBtn.innerHTML = isSubcatCollapsed ? '▶' : '▼';
                        subcatCollapseBtn.title = isSubcatCollapsed ? 'Expand' : 'Collapse';
                        subcatCollapseBtn.style.cssText = 'background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.9rem; padding: 3px 8px; margin-right: 6px; transition: transform 0.2s;';

                        subcatCollapseBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const isNowCollapsed = subcatCollapsible.style.display === 'none';

                            if (isNowCollapsed) {
                                subcatCollapsible.style.display = 'block';
                                subcatCollapseBtn.innerHTML = '▼';
                                subcatCollapseBtn.title = 'Collapse';
                                subcatGroup.classList.remove('collapsed');
                                delete collapsedSubcats[subcat.id];
                            } else {
                                subcatCollapsible.style.display = 'none';
                                subcatCollapseBtn.innerHTML = '▶';
                                subcatCollapseBtn.title = 'Expand';
                                subcatGroup.classList.add('collapsed');
                                collapsedSubcats[subcat.id] = true;
                            }

                            localStorage.setItem('collapsedSubcategories', JSON.stringify(collapsedSubcats));
                        });

                        // Insert at beginning of header
                        subcatHeader.insertBefore(subcatCollapseBtn, subcatHeader.firstChild);
                    }

                    // Subcategory Items List
                    const subcatItemsList = document.createElement('ul');
                    subcatItemsList.className = 'item-list';

                    (subcat.items || []).forEach((item, itemIdx) => {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.href = `item.html?id=${item.id}`;
                        a.className = 'item-link';

                        // Drag and drop in Edit Mode
                        if (currentUser && currentUser.role === 'admin' && isEditMode) {
                            li.draggable = true;
                            li.classList.add('draggable');
                            li.dataset.catIndex = catIndex;
                            li.dataset.subcatIndex = actualSubcatIndex;
                            li.dataset.itemIndex = itemIdx;

                            li.addEventListener('dragstart', (e) => {
                                li.classList.add('dragging');
                                e.dataTransfer.setData('text/plain', JSON.stringify({
                                    type: 'subcatItem',
                                    catIndex: catIndex,
                                    subcatIndex: actualSubcatIndex,
                                    itemIndex: itemIdx
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

                                // Only allow reorder within same subcategory
                                if (data.type === 'subcatItem' &&
                                    data.catIndex === catIndex &&
                                    data.subcatIndex === actualSubcatIndex &&
                                    data.itemIndex !== itemIdx) {

                                    const subcatItems = localWikiData.categories[catIndex].subcategories[actualSubcatIndex].items;
                                    const [movedItem] = subcatItems.splice(data.itemIndex, 1);
                                    subcatItems.splice(itemIdx, 0, movedItem);
                                    persistData();
                                    renderHome(document.getElementById('contentGrid'));
                                }
                            });
                        }

                        const imageHtml = item.image
                            ? `<img src="${item.image}" alt="" style="width:32px;height:32px;object-fit:cover;border-radius:6px;margin-right:8px;flex-shrink:0;">`
                            : '';

                        // Only show description on Item Page (so hidden in lists)
                        const descHtml = '';

                        a.style.cssText = 'display: flex; align-items: center;';
                        a.innerHTML = `
                            ${imageHtml}
                            <div style="flex:1;">
                                <span class="item-name" style="font-size: 0.85em;">${item.name}</span>
                                ${descHtml}
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

                    // Append items list to subcategory collapsible container
                    subcatCollapsible.appendChild(subcatItemsList);
                    subcatGroup.appendChild(subcatCollapsible);
                    collapsibleContent.appendChild(subcatGroup);
                });
            }

            // Add Subcategory button (only on category page in edit mode)
            if (filterCategoryId && currentUser && currentUser.role === 'admin' && isEditMode) {
                const addSubcatBtn = document.createElement('button');
                addSubcatBtn.textContent = '+ Add Subcategory';
                addSubcatBtn.className = 'btn-primary';
                addSubcatBtn.style.cssText = 'margin-top: 20px;';
                addSubcatBtn.onclick = () => addSubcategory(category.id);
                collapsibleContent.appendChild(addSubcatBtn);
            }

            // Append collapsible content to category group
            catGroup.appendChild(collapsibleContent);

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

    // Save Welcome and News Box content
    const welcomeBoxContent = document.getElementById('welcomeBoxContent');
    const newsBoxContent = document.getElementById('newsBoxContent');
    const welcomeBoxTitle = document.getElementById('welcomeBoxTitle');
    const newsBoxTitle = document.getElementById('newsBoxTitle');

    if (welcomeBoxContent && welcomeBoxContent.dataset.original !== undefined) {
        const newWelcome = welcomeBoxContent.innerHTML;
        if (newWelcome !== welcomeBoxContent.dataset.original) {
            localWikiData.welcomeBox = newWelcome;
            welcomeBoxContent.dataset.original = newWelcome;
            changesMade++;
        }
    }

    if (newsBoxContent && newsBoxContent.dataset.original !== undefined) {
        const newNews = newsBoxContent.innerHTML;
        if (newNews !== newsBoxContent.dataset.original) {
            localWikiData.newsBox = newNews;
            newsBoxContent.dataset.original = newNews;
            changesMade++;
        }
    }

    if (welcomeBoxTitle && welcomeBoxTitle.dataset.original !== undefined) {
        const newWelcomeTitle = welcomeBoxTitle.innerHTML;
        if (newWelcomeTitle !== welcomeBoxTitle.dataset.original) {
            localWikiData.welcomeTitle = newWelcomeTitle;
            welcomeBoxTitle.dataset.original = newWelcomeTitle;
            changesMade++;
        }
    }

    if (newsBoxTitle && newsBoxTitle.dataset.original !== undefined) {
        const newNewsTitle = newsBoxTitle.innerHTML;
        if (newNewsTitle !== newsBoxTitle.dataset.original) {
            localWikiData.newsTitle = newNewsTitle;
            newsBoxTitle.dataset.original = newNewsTitle;
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
            // Use findItemById to search in both direct items and subcategory items
            const found = findItemById(itemId);
            if (found) {
                const item = found.item;
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
            }
        }
    }

    // Save Sub-item Edits (from item page and sub-item detail page)
    document.querySelectorAll('.subitem-name-rich, .subitem-desc-rich, .subitem-detail-title, .subitem-detail-desc').forEach(el => {
        const itemId = el.dataset.itemId;
        const subItemIndex = parseInt(el.dataset.subitemIndex || el.dataset.subItemIndex);
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

    let currentUsers = users;
    const storedUsers = localStorage.getItem('localUsers');
    if (storedUsers) {
        try {
            currentUsers = JSON.parse(storedUsers);
        } catch (e) {
            console.error('Failed to parse localUsers', e);
        }
    }
    const usersStr = JSON.stringify(currentUsers, null, 4);
    // Ensure accurate timestamp on export
    localWikiData.lastUpdated = Date.now();
    const wikiDataObj = localWikiData;
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
    let currentUsers = users;
    const storedUsers = localStorage.getItem('localUsers');
    if (storedUsers) {
        try {
            currentUsers = JSON.parse(storedUsers);
        } catch (e) {
            console.error('Failed to parse localUsers', e);
        }
    }
    const usersStr = JSON.stringify(currentUsers, null, 4);
    // Ensure accurate timestamp on export
    localWikiData.lastUpdated = Date.now();
    const wikiDataObj = localWikiData;
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

    // Find the item in LOCAL data (including subcategory items)
    let foundItem = null;
    let foundCategory = null;
    let foundSubcategory = null;

    for (const cat of localWikiData.categories) {
        // Check direct items
        const item = cat.items.find(i => i.id === itemId);
        if (item) {
            foundItem = item;
            foundCategory = cat;
            break;
        }
        // Check subcategory items
        if (cat.subcategories) {
            for (const subcat of cat.subcategories) {
                const subcatItem = (subcat.items || []).find(i => i.id === itemId);
                if (subcatItem) {
                    foundItem = subcatItem;
                    foundCategory = cat;
                    foundSubcategory = subcat;
                    break;
                }
            }
            if (foundItem) break;
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

    // Check if we're viewing a specific sub-item
    const subItemParam = params.get('subitem');
    if (subItemParam !== null && foundItem.subItems && foundItem.subItems[parseInt(subItemParam)]) {
        const subItemIndex = parseInt(subItemParam);
        const subItem = foundItem.subItems[subItemIndex];

        // Render sub-item detail page
        renderSubItemDetail(container, foundItem, foundCategory, foundSubcategory, subItem, subItemIndex, itemId);
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
                            <button type="button" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
                            <span class="toolbar-divider"></span>
                            <button type="button" data-cmd="justifyLeft" title="Align Left">⬅</button>
                            <button type="button" data-cmd="justifyCenter" title="Align Center">⬛</button>
                            <button type="button" data-cmd="justifyRight" title="Align Right">➡</button>
                            <span class="toolbar-divider"></span>
                            <select id="headingSelect" title="Heading">
                                <option value="">Heading</option>
                                <option value="h1">H1</option>
                                <option value="h2">H2</option>
                                <option value="h3">H3</option>
                                <option value="p">Normal</option>
                            </select>
                            <select id="fontSizeSelect" title="Font Size">
                                <option value="">Size</option>
                                <option value="10">10</option>
                                <option value="12">12</option>
                                <option value="14">14</option>
                                <option value="16">16</option>
                                <option value="18">18</option>
                                <option value="20">20</option>
                                <option value="24">24</option>
                            </select>
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
                            <button type="button" id="insertImageBtn" title="Insert Image">IMG</button>
                            <input type="file" id="descImageInput" accept="image/*" style="display: none;">
                            <button type="button" id="insertLinkBtn" title="Insert Link">LINK</button>
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

                    // Check if this is an alignment command and we have a selected image
                    if ((cmd === 'justifyLeft' || cmd === 'justifyCenter' || cmd === 'justifyRight') && activeResizableImage) {
                        alignImage(cmd);
                    } else {
                        document.execCommand(cmd, false, null);
                    }
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

            // Heading select handler
            const headingSelect = document.getElementById('headingSelect');
            if (headingSelect) {
                headingSelect.addEventListener('change', (e) => {
                    if (e.target.value) {
                        document.execCommand('formatBlock', false, e.target.value);
                        document.getElementById('item-desc-edit').focus();
                        e.target.value = '';
                    }
                });
            }

            // Font size select handler - use inline style for exact pixel sizes
            const fontSizeSelect = document.getElementById('fontSizeSelect');
            if (fontSizeSelect) {
                fontSizeSelect.addEventListener('change', (e) => {
                    if (e.target.value) {
                        const fontSize = e.target.value + 'px';
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0 && !selection.isCollapsed) {
                            const range = selection.getRangeAt(0);
                            const span = document.createElement('span');
                            span.style.fontSize = fontSize;
                            range.surroundContents(span);
                        }
                        document.getElementById('item-desc-edit').focus();
                        e.target.value = '';
                    }
                });
            }

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

            // Insert Link handler
            const insertLinkBtn = document.getElementById('insertLinkBtn');
            if (insertLinkBtn) {
                insertLinkBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showLinkModal(descEdit);
                });
            }

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
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="color: #9c27b0; font-weight: 600;">Hidden Info #${currentCount + 1}</span>
                        <button class="delete-hidden-info-btn btn-danger" data-index="${currentCount}" style="border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
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
                    // Execute delete - check both direct items and subcategory items
                    let deleted = false;
                    for (const cat of localWikiData.categories) {
                        // Check direct items
                        const idx = cat.items.findIndex(i => i.id === itemId);
                        if (idx !== -1) {
                            cat.items.splice(idx, 1);
                            deleted = true;
                            break;
                        }
                        // Check subcategory items
                        if (cat.subcategories) {
                            for (const subcat of cat.subcategories) {
                                const subIdx = (subcat.items || []).findIndex(i => i.id === itemId);
                                if (subIdx !== -1) {
                                    subcat.items.splice(subIdx, 1);
                                    deleted = true;
                                    break;
                                }
                            }
                            if (deleted) break;
                        }
                    }
                    if (deleted) {
                        persistData();
                        window.location.href = 'index.html';
                        return;
                    }
                }
            });

        } else {
            // Normal View Mode (non-admin or not in edit mode)
            // Check if title has formatting
            const hasFormatting = (html) => /<font|<span|style=|color[=:]/i.test(html);
            const titleClass = hasFormatting(foundItem.name) ? 'has-formatting' : '';

            // Build breadcrumb path
            let breadcrumbPath = `<a href="index.html">Home</a> &gt; <a href="index.html?category=${foundCategory.id}">${foundCategory.name}</a>`;
            if (foundSubcategory) {
                breadcrumbPath += ` &gt; <a href="index.html?category=${foundCategory.id}&subcategory=${foundSubcategory.id}">${foundSubcategory.name}</a>`;
            }
            breadcrumbPath += ` &gt; <span class="${titleClass}">${foundItem.name}</span>`;

            contentHtml = `
                <div class="breadcrumb">
                    ${breadcrumbPath}
                </div>
                <article class="item-detail">
                    <h1 class="${titleClass}">${foundItem.name}</h1>
                    
                    <div class="item-description">
                        <p>${foundItem.description || ''}</p>
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
            if (foundSubcategory) {
                // Determine if this is a subitem view (hash) or just item
                // Wait, subitems are displayed ON the item page. 
                // Checks for item's parent.
                window.location.href = `index.html?category=${foundCategory.id}&subcategory=${foundSubcategory.id}`;
            } else if (foundCategory) {
                window.location.href = `index.html?category=${foundCategory.id}`;
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

        // Sub-item Drag and Drop (Edit Mode Only)
        if (currentUser && currentUser.role === 'admin' && isEditMode) {
            subItemDiv.draggable = true;
            subItemDiv.classList.add('draggable-subitem');
            subItemDiv.dataset.itemId = itemId;
            subItemDiv.dataset.subItemIndex = subItemIndex;

            subItemDiv.addEventListener('dragstart', (e) => {
                if (e.target !== subItemDiv) return;
                e.stopPropagation();
                subItemDiv.classList.add('dragging-subitem');
                e.dataTransfer.setData('application/subitem', JSON.stringify({
                    parentItemId: itemId,
                    subItemIndex: subItemIndex
                }));
                e.dataTransfer.effectAllowed = 'move';
            });

            subItemDiv.addEventListener('dragend', () => {
                subItemDiv.classList.remove('dragging-subitem');
                document.querySelectorAll('.drag-over-subitem').forEach(el => el.classList.remove('drag-over-subitem'));
            });

            subItemDiv.addEventListener('dragover', (e) => {
                if (e.dataTransfer.types.includes('application/subitem')) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    subItemDiv.classList.add('drag-over-subitem');
                }
            });

            subItemDiv.addEventListener('dragleave', () => {
                subItemDiv.classList.remove('drag-over-subitem');
            });

            subItemDiv.addEventListener('drop', (e) => {
                if (!e.dataTransfer.types.includes('application/subitem')) return;
                e.preventDefault();
                e.stopPropagation();
                subItemDiv.classList.remove('drag-over-subitem');

                const data = JSON.parse(e.dataTransfer.getData('application/subitem'));
                const fromParentId = data.parentItemId;
                const fromIndex = data.subItemIndex;
                const toParentId = itemId;
                const toIndex = subItemIndex;

                // Only allow reorder within same parent item
                if (fromParentId === toParentId && fromIndex !== toIndex) {
                    const found = findItemById(fromParentId);
                    if (found && found.item.subItems) {
                        const [movedSubItem] = found.item.subItems.splice(fromIndex, 1);
                        found.item.subItems.splice(toIndex, 0, movedSubItem);
                        persistData();
                        renderSubItems(container, found.item, itemId);
                    }
                }
            });
        }

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
            // Make sub-item name a clickable link
            const subItemLink = document.createElement('a');
            subItemLink.href = `item.html?id=${itemId}&subitem=${subItemIndex}`;
            subItemLink.innerHTML = subItem.name;
            subItemLink.style.cssText = 'color: inherit; text-decoration: none; cursor: pointer;';
            subItemLink.onmouseover = () => subItemLink.style.color = 'var(--accent-blue)';
            subItemLink.onmouseout = () => subItemLink.style.color = 'inherit';
            subItemName.appendChild(subItemLink);
        }

        subItemHeader.appendChild(subItemName);
        subItemDiv.appendChild(subItemHeader);

        // Sub-item Description
        const subItemDesc = document.createElement('div');
        subItemDesc.style.cssText = 'color: var(--text-secondary); font-size: 0.95em;';

        if (currentUser && currentUser.role === 'admin' && isEditMode) {
            subItemDesc.className = 'subitem-desc-rich rich-editable';
            subItemDesc.contentEditable = 'true';
            subItemDesc.innerHTML = subItem.description || 'Click to add description...';
            subItemDesc.dataset.itemId = itemId;
            subItemDesc.dataset.subItemIndex = subItemIndex;
            subItemDesc.dataset.field = 'subItemDescription';
            subItemDesc.dataset.original = subItem.description || '';
            subItemDesc.style.minHeight = '80px';
            subItemDesc.style.padding = '10px';
            subItemDesc.style.border = '1px solid var(--border-color)';
            subItemDesc.style.borderRadius = '8px';
            subItemDesc.style.marginTop = '5px';

            // Create and insert inline toolbar
            const subItemToolbar = createInlineToolbar(subItemDesc, 'subItemToolbar_' + subItemIndex);
            subItemDiv.appendChild(subItemToolbar);
        } else {
            // Hide description in list view (view mode) - only visible on sub-item page
            subItemDesc.innerHTML = '';
            subItemDesc.style.display = 'none';
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

// Render dedicated sub-item detail page
function renderSubItemDetail(container, parentItem, category, subcategory, subItem, subItemIndex, parentItemId) {
    const isInlineEdit = currentUser && currentUser.role === 'admin' && isEditMode;

    // Build breadcrumb path
    let breadcrumbPath = `<a href="index.html">Home</a> &gt; <a href="index.html?category=${category.id}">${category.name}</a>`;
    if (subcategory) {
        breadcrumbPath += ` &gt; <a href="index.html?category=${category.id}&subcategory=${subcategory.id}">${subcategory.name}</a>`;
    }
    breadcrumbPath += ` &gt; <a href="item.html?id=${parentItemId}">${parentItem.name}</a>`;
    breadcrumbPath += ` &gt; <span>${subItem.name}</span>`;

    let contentHtml = `
        <div class="breadcrumb">
            ${breadcrumbPath}
        </div>
        <article class="item-detail">
            ${isInlineEdit ? `
                <h1 class="rich-editable subitem-detail-title" id="subitem-title-edit" data-item-id="${parentItemId}" data-subitem-index="${subItemIndex}" data-field="subItemName" data-original="${subItem.name}">${subItem.name}</h1>
            ` : `
                <h1 class="${/\<font|\<span|style=|color[=:]/i.test(subItem.name) ? 'has-formatting' : ''}">${subItem.name}</h1>
            `}
            
            <div id="subitem-image-container" style="margin: 20px 0;"></div>
            
            <div class="item-description" style="margin-top: 20px;">
                ${isInlineEdit ? `
                    <div class="rich-editable subitem-detail-desc" id="subitem-desc-edit" data-item-id="${parentItemId}" data-subitem-index="${subItemIndex}" data-field="subItemDescription" data-original="${subItem.description || ''}">${subItem.description || 'Click to add description...'}</div>
                ` : `
                    <p>${subItem.description || 'No description.'}</p>
                `}
            </div>
            
            <div class="actions" style="margin-top: 30px;">
                <button id="detail-back-btn" class="btn-back">Go Back</button>
                ${isInlineEdit ? `<button id="delete-subitem-btn" class="btn-back btn-danger" style="margin-left: 20px;">Delete Sub-item</button>` : ''}
            </div>
        </article>
    `;

    container.innerHTML = contentHtml;

    // Back button handler
    document.getElementById('detail-back-btn').onclick = () => {
        window.location.href = `item.html?id=${parentItemId}`;
    };

    // Setup sub-item image
    const imgContainer = document.getElementById('subitem-image-container');
    if (imgContainer) {
        if (isInlineEdit) {
            const imgUploader = createImageUploader(subItem.image, (base64) => {
                const found = findItemById(parentItemId);
                if (found && found.item.subItems && found.item.subItems[subItemIndex]) {
                    found.item.subItems[subItemIndex].image = base64;
                    persistData();
                }
            });
            imgUploader.style.cssText = 'width: 200px; height: 200px;';
            imgContainer.appendChild(imgUploader);
        } else if (subItem.image) {
            const img = document.createElement('img');
            img.src = subItem.image;
            img.alt = subItem.name;
            img.style.cssText = 'max-width: 300px; max-height: 300px; border-radius: 10px; object-fit: cover;';
            imgContainer.appendChild(img);
        }
    }

    // Setup rich text editing
    if (isInlineEdit) {
        const titleEdit = document.getElementById('subitem-title-edit');
        const descEdit = document.getElementById('subitem-desc-edit');
        if (titleEdit) makeRichEditable(titleEdit);
        if (descEdit) makeRichEditable(descEdit);

        // Delete button
        const deleteBtn = document.getElementById('delete-subitem-btn');
        if (deleteBtn) {
            deleteBtn.dataset.confirmState = 'idle';
            deleteBtn.addEventListener('click', function () {
                if (this.dataset.confirmState === 'idle') {
                    this.dataset.confirmState = 'confirm';
                    this.textContent = 'Confirm Delete?';
                    this.style.backgroundColor = '#d32f2f';
                    setTimeout(() => {
                        if (this.dataset.confirmState === 'confirm') {
                            this.dataset.confirmState = 'idle';
                            this.textContent = 'Delete Sub-item';
                            this.style.backgroundColor = '';
                        }
                    }, 3000);
                } else if (this.dataset.confirmState === 'confirm') {
                    deleteSubItem(parentItemId, subItemIndex);
                    window.location.href = `item.html?id=${parentItemId}`;
                }
            });
        }
    }

    // Add floating Save button
    if (isInlineEdit) {
        const existingSaveBtn = document.getElementById('saveAllBtn');
        if (existingSaveBtn) existingSaveBtn.remove();

        const saveAllBtn = document.createElement('button');
        saveAllBtn.id = 'saveAllBtn';
        saveAllBtn.className = 'save-all-btn';
        saveAllBtn.textContent = '💾 Save All Changes';
        saveAllBtn.addEventListener('click', saveAllChanges);
        document.body.appendChild(saveAllBtn);
    }

    document.title = `${subItem.name} - RPG Game Wiki`;
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
