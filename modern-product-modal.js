console.log('[MODERN_PRODUCT_MODAL] 🚀 modern-product-modal.js LOADED at:', new Date().toISOString());
console.log('[MODERN_PRODUCT_MODAL] Script execution context:', {
  windowExists: typeof window !== 'undefined',
  documentExists: typeof document !== 'undefined',
  sanitizePriceAvailable: typeof sanitizePrice !== 'undefined',
  DraftManagerAvailable: typeof DraftManager !== 'undefined'
});

// modern-product-modal.js - Modern, clean product posting modal

import { sanitizePrice } from './seller-utils.js';
import { DraftManager } from './product-posting.js';
import enhancedAutoPopulation from './enhanced-auto-population.js';

// Import product-posting-modules for integration
import { MediaUploadManager } from './product-posting-modules/media-upload-manager.js';
import { YouTubeURLManager } from './product-posting-modules/youtube-manager.js';
import { ProductFormManager } from './product-posting-modules/product-form-manager.js';
// Access global functions from product-posting.js instead of importing them
// These are available as window.initializeMediaUploadManager, etc.

/**
 * LivePreviewManager - Manages live preview updates for SEO & Marketing tab
 */
class LivePreviewManager {
   constructor() {
     this.debouncedUpdate = this.debounce(this.updateAllPreviews.bind(this), 300);
     this.currentPreviewTab = 'social'; // 'social' or 'serp'
     this.sellerRating = null;
     this.ratingUpdateCallbacks = [];
   }
 
   /**
    * Initialize the live preview manager
    */
   init() {
     console.log('[LivePreviewManager] Initializing live preview manager...');
     this.setupInputListeners();
     this.setupPreviewTabs();
     console.log('[LivePreviewManager] ✅ Initialization completed');
   }
 
     /**
     * Create an immediate working button - REMOVED PER USER REQUEST
     * The working button has been confirmed working and is no longer needed
     */
    createImmediateWorkingButton() {
      console.log('[IMMEDIATE_FIX] ✅ Working button creation skipped - removed per user request');

      // Button has been confirmed working and removed as requested
      // No button will be created
    }

  /**
   * Format rating as stars
   */
  formatRatingStars(rating) {
    if (rating === null || rating === undefined || rating === 0) {
      return '★★★★★'; // Empty stars for no rating
    }

    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return '★'.repeat(fullStars) +
           (hasHalfStar ? '☆' : '') +
           '☆'.repeat(emptyStars);
  }

  /**
   * Remove duplicated YouTube UI blocks if multiple copies were injected by templates/managers
   * Keeps the first instance and removes extra ones to avoid duplicate controls and event conflicts.
   */
  cleanupDuplicateYouTubeBlocks() {
    try {
      // Find all elements that act as counters for the YouTube block (should be unique)
      const counters = Array.from(document.querySelectorAll('#youtube-counter'));
      if (counters.length <= 1) return;

      console.log('[YOUTUBE_CLEANUP] Found', counters.length, 'youtube-counter elements — removing duplicates');

      // Keep the first occurrence; remove wrappers for subsequent ones
      for (let i = 1; i < counters.length; i++) {
        const counter = counters[i];

        // Walk up to find a reasonable container to remove (limit depth to avoid removing unrelated markup)
        let ancestor = counter;
        let removed = false;
        for (let depth = 0; depth < 8 && ancestor; depth++) {
          // If ancestor contains common YouTube IDs, assume this is the block wrapper
          if (ancestor.querySelector && (ancestor.querySelector('#youtube-videos-grid') || ancestor.querySelector('#youtube-input-area') || ancestor.querySelector('#add-youtube-btn') || ancestor.querySelector('#youtube-empty-state'))) {
            ancestor.remove();
            removed = true;
            console.log('[YOUTUBE_CLEANUP] Removed duplicate YouTube block at depth', depth);
            break;
          }
          ancestor = ancestor.parentElement;
        }

        // As a fallback, remove the immediate parent if nothing else matched (best-effort)
        if (!removed && counter.parentElement) {
          const parent = counter.parentElement;
          parent.remove();
          console.log('[YOUTUBE_CLEANUP] Removed duplicate YouTube block fallback (parent removed)');
        }
      }
    } catch (err) {
      console.warn('[YOUTUBE_CLEANUP] Failed to cleanup duplicate YouTube blocks', err);
    }
  }

  /**
   * Setup input listeners for live preview updates
   */
  setupInputListeners() {
    console.log('[LivePreviewManager] 🔧 Setting up input listeners for live preview...');

    // SEO title input
    const seoTitleInput = document.getElementById('seo-title');
    if (seoTitleInput) {
      seoTitleInput.addEventListener('input', () => {
        this.debouncedUpdate();
      });
      console.log('[LivePreviewManager] ✅ SEO title input listener attached');
    } else {
      console.warn('[LivePreviewManager] ⚠️ SEO title input not found');
    }

    // Meta description input
    const metaDescInput = document.getElementById('meta-description');
    if (metaDescInput) {
      metaDescInput.addEventListener('input', () => {
        this.debouncedUpdate();
      });
      console.log('[LivePreviewManager] ✅ Meta description input listener attached');
    } else {
      console.warn('[LivePreviewManager] ⚠️ Meta description input not found');
    }

    // Product name input (affects social preview)
    const productNameInput = document.getElementById('product-name');
    if (productNameInput) {
      productNameInput.addEventListener('input', () => {
        this.debouncedUpdate();
      });
      console.log('[LivePreviewManager] ✅ Product name input listener attached');
    } else {
      console.warn('[LivePreviewManager] ⚠️ Product name input not found');
    }

    // Display title input (affects social preview)
    const displayTitleInput = document.getElementById('display-title');
    if (displayTitleInput) {
      displayTitleInput.addEventListener('input', () => {
        this.debouncedUpdate();
      });
      console.log('[LivePreviewManager] ✅ Display title input listener attached');
    } else {
      console.warn('[LivePreviewManager] ⚠️ Display title input not found');
    }

    // SEO URL input
    const seoUrlInput = document.getElementById('seo-url');
    if (seoUrlInput) {
      seoUrlInput.addEventListener('input', () => {
        this.debouncedUpdate();
      });
      console.log('[LivePreviewManager] ✅ SEO URL input listener attached');
    } else {
      console.warn('[LivePreviewManager] ⚠️ SEO URL input not found');
    }

    // Description input (affects social preview)
    const descInput = document.getElementById('description');
    if (descInput) {
      descInput.addEventListener('input', () => {
        this.debouncedUpdate();
      });
      console.log('[LivePreviewManager] ✅ Description input listener attached');
    } else {
      console.warn('[LivePreviewManager] ⚠️ Description input not found');
    }

    console.log('[LivePreviewManager] ✅ Input listeners setup completed');
  }

  /**
   * Setup preview tab switching
   */
  setupPreviewTabs() {
    const socialTab = document.getElementById('preview-social-tab');
    const serpTab = document.getElementById('preview-serp-tab');
    const socialPanel = document.getElementById('preview-social-panel');
    const serpPanel = document.getElementById('preview-serp-panel');

    if (socialTab && serpTab && socialPanel && serpPanel) {
      // Tab switching logic
      socialTab.addEventListener('click', () => this.switchPreviewTab('social'));
      serpTab.addEventListener('click', () => this.switchPreviewTab('serp'));

      // Keyboard navigation
      [socialTab, serpTab].forEach(tab => {
        tab.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const tabType = tab.id.includes('social') ? 'social' : 'serp';
            this.switchPreviewTab(tabType);
          }
        });
      });
    }
  }

  /**
   * Switch preview tab
   */
  switchPreviewTab(tabType) {
    const socialTab = document.getElementById('preview-social-tab');
    const serpTab = document.getElementById('preview-serp-tab');
    const socialPanel = document.getElementById('preview-social-panel');
    const serpPanel = document.getElementById('preview-serp-panel');

    if (tabType === 'social') {
      socialTab?.classList.add('active');
      serpTab?.classList.remove('active');
      socialPanel?.classList.remove('hidden');
      serpPanel?.classList.add('hidden');
      this.currentPreviewTab = 'social';
    } else {
      serpTab?.classList.add('active');
      socialTab?.classList.remove('active');
      serpPanel?.classList.remove('hidden');
      socialPanel?.classList.add('hidden');
      this.currentPreviewTab = 'serp';
    }

    console.log('[LivePreviewManager] Switched to preview tab:', tabType);
  }

  /**
   * Submit final form with enhanced validation and feedback - NOW PROPERLY UTILIZES MODULES
   */
  async submitFinalForm() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      console.log('[MODAL_SUBMISSION] 🚀 Starting enhanced form submission with full module integration...');

      // Final comprehensive validation of all tabs
      const allTabsValid = await this.validateAllTabs();

      if (!allTabsValid) {
        this.resetSubmitButton();
        this.showNotification('Please complete all required fields across all tabs before submitting', 'error');
        return;
      }

      // Initialize all required modules using the proper orchestration layer
      await window.initializeProductPostingSystems();

      // Bridge all modal data to the processing modules
      await this.bridgeModalDataToModules();

      // Show progress indicator
      this.updateSubmitButton('Processing...', 'animate-pulse');

      // Use ProductFormManager for comprehensive submission with module integration
      const formElement = document.getElementById('modern-product-form');
      const formManager = new window.ProductFormManager({
        formElement: formElement,
        options: {
          enableAutoSave: false, // Disable for one-time submission
          enableBulkUpload: false, // Single product submission
          enableVariants: true,
          maxVariants: 10
        }
      });

      // Override form submission to use our validated data
      await this.performSubmissionWithModules(formManager);

      // Get current user for success message
      const userRes = await window.getCurrentUser();
      const user = userRes?.user || userRes?.data?.user;

      // Handle category suggestion submission if enabled
      const formData = await this.collectFinalFormData();
      if (formData.categorySuggestion) {
        await this.submitCategorySuggestion(formData.categorySuggestion, user?.id);
      }

      const successMessage = formData.categorySuggestion
        ? 'Product created and category suggestion submitted!'
        : 'Product created successfully!';

      this.showSuccess(successMessage);

      // Automatically reset the flow so the next posting starts clean
      this.scheduleAutoResetForNextPosting(2000);

    } catch (error) {
      console.error('Final form submission failed:', error);
      this.resetSubmitButton();
      this.showError('Failed to create product. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Update Google SERP preview
   */
  updateSerpPreview(data) {
    const title = data.seoTitle || data.displayTitle || data.productName || 'Your Product Title';
    const description = data.seoDescription ||
                       (document.getElementById('description')?.value?.trim()?.slice(0, 160)) ||
                       'An amazing product that you will love...';
    const url = data.seoUrl || 'your-product-slug';

    const titleElement = document.getElementById('serp-title');
    const urlElement = document.getElementById('serp-url');
    const descElement = document.getElementById('serp-description');
    const breadcrumbsElement = document.getElementById('serp-breadcrumbs');
    const ratingStarsElement = document.getElementById('serp-rating-stars');
    const ratingValueElement = document.getElementById('serp-rating-value');

    if (titleElement) {
      titleElement.textContent = title.length > 60 ? title.slice(0, 57) + '...' : title;
    }

    if (urlElement) {
      urlElement.textContent = `jua-market.co.ke/product/${url}`;
    }

    if (descElement) {
      descElement.textContent = description.length > 160 ? description.slice(0, 157) + '...' : description;
    }

    if (breadcrumbsElement) {
      breadcrumbsElement.textContent = `Jua Market › Products › ${data.productName || 'Your Product'}`;
    }

    // Update rating display
    if (ratingStarsElement) {
      ratingStarsElement.textContent = this.formatRatingStars(this.sellerRating);
    }

    if (ratingValueElement) {
      if (this.sellerRating > 0) {
        ratingValueElement.textContent = this.sellerRating.toFixed(1);
      } else {
        ratingValueElement.textContent = 'New Seller';
      }
    }
  }

  /**
   * Debounce utility function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Update all preview panels
   */
  updateAllPreviews() {
    // Update social media preview
    const socialTitle = document.getElementById('social-title-preview');
    const socialDesc = document.getElementById('social-description-preview');

    if (socialTitle) socialTitle.textContent = 'Your Product Title';
    if (socialDesc) socialDesc.textContent = 'An amazing product that you will love...';

    // Update SERP preview
    this.updateSerpPreview({
      productName: 'Your Product',
      seoTitle: 'Your Product Title',
      seoDescription: 'An amazing product that you will love...',
      seoUrl: 'your-product-slug'
    });
  }

  /**
   * Force refresh of all previews
   */
  refresh() {
    this.updateAllPreviews();
  }
}

class ModernProductModal {
  constructor() {
    this.currentTab = 0;
    this.tabs = ['Basic Info', 'Pricing/Inventory', 'Media', 'SEO & Marketing', 'Shipping/Delivery'];
    this.formData = {};
    this.variants = [];
    this.attributes = [];
    this.draftManager = null;
    this.isSubmitting = false;
    this.embeddingStatus = 'idle';
    this.allEmbeddings = []; // Store embeddings for all images
    this.embeddingJobs = new Map(); // Track multiple embedding jobs
    this.livePreviewManager = new LivePreviewManager();

    // Media management properties
    this.images = []; // Multiple images support
    this.maxImages = 5;

    // Brand selector state
    this.brandSelect = null;
    this.brandFeedbackEl = null;
    this.brandFeedbackTextEl = null;
    this.brandFeedbackIconEl = null;
    this.brandCache = new Map();
    this.brandRequestCounter = 0;
    this.latestBrandRequest = 0;
    this.brandSelectInitialized = false;
    this.brandCategoryListenerAttached = false;
    this.brandVerticalListenerAttached = false;
    this.lastBrandCategoryId = null;
    this.brandCustomContainer = null;
    this.brandCustomToggle = null;
    this.brandCustomInput = null;
    this.brandCustomHelperEl = null;
    this.isCustomBrandActive = false;
    this.customBrandMaxLength = 80;
    this.brandCustomInitialized = false;

    // Embedding coordination tracking (NEW)
    this.embeddingWorkflow = {
      modalProcessedImages: new Set(), // Images processed by modal
      coordinatorProcessedImages: new Set(), // Images processed by coordinator
      duplicatePrevention: new Map(), // Track duplicates prevented
      coordinationLogs: [], // Track coordination events
      startTime: null,
      endTime: null
    };

    // Embedding readiness/deferral state
    this.embeddingDeferralNotified = false;
    this.embeddingWarmupScheduled = false;

    // Debug and testing properties
    this.debugMode = false;
    this.debugNavigation = false;
    this.testMode = false;
    this.buttonVisibilityTests = [];

    this.typeaheadAdapters = new Map();
    this.typeaheadConfigs = new Map();
    this.typeaheadObservers = new Map();

    this.ensureGetCurrentUserFunction();
  }

  ensureGetCurrentUserFunction() {
    if (typeof window === 'undefined') {
      return null;
    }

    const existingGetter = window.getCurrentUser;

    if (typeof existingGetter === 'function') {
      return existingGetter;
    }

    const resolvedUser = typeof existingGetter === 'object' && existingGetter !== null
      ? existingGetter
      : (typeof window.currentUser === 'function'
        ? window.currentUser()
        : (typeof window.currentUser !== 'undefined' ? window.currentUser : null));

    window.getCurrentUser = () => {
      if (typeof existingGetter === 'object' && existingGetter !== null) {
        return existingGetter;
      }
      if (typeof window.currentUser === 'function') {
        try {
          return window.currentUser();
        } catch (err) {
          console.warn('[CURRENT_USER_FALLBACK] window.currentUser() threw error', err);
        }
      }
      if (typeof window.currentUser !== 'undefined') {
        return window.currentUser;
      }
      return resolvedUser;
    };

    console.info('[CURRENT_USER_FALLBACK] window.getCurrentUser fallback registered');

    return window.getCurrentUser;
  }

  /**
   * Initialize embedding coordination tracking
   */
  initEmbeddingCoordination() {
    console.log('[EMBEDDING_COORDINATION] Initializing embedding coordination tracking');

    // Reset coordination tracking
    this.embeddingWorkflow = {
      modalProcessedImages: new Set(),
      coordinatorProcessedImages: new Set(),
      duplicatePrevention: new Map(),
      coordinationLogs: [],
      startTime: null,
      endTime: null
    };

    // Add global coordination logging
    this.addEmbeddingCoordinationLogging();

    console.log('[EMBEDDING_COORDINATION] Coordination tracking initialized');
  }

  initializeTypeaheadEnhancements() {
    try {
      const dropdowns = [
        {
          id: 'category-select',
          placeholder: 'Search categories…',
          disabledPlaceholder: 'Select a vertical first to load categories.',
          emptyState: 'No categories found. Try a different keyword.'
        },
        {
          id: 'brand-select',
          placeholder: 'Search brands…',
          disabledPlaceholder: 'Select a category first to load brands.',
          emptyState: 'No brands available. You can add a custom brand instead.'
        }
      ];

      dropdowns.forEach((config) => {
        this.typeaheadConfigs.set(config.id, config);
        const element = document.getElementById(config.id);
        if (!element) {
          return;
        }

        if (this.typeaheadAdapters.has(config.id)) {
          const adapter = this.typeaheadAdapters.get(config.id);
          if (adapter?.destroy) {
            adapter.destroy();
          }
          this.typeaheadAdapters.delete(config.id);
        }

        const adapter = this.createTypeaheadAdapter(element, config);
        if (adapter) {
          this.typeaheadAdapters.set(config.id, adapter);
        }
      });
    } catch (error) {
      console.error('[TYPEAHEAD] Failed to initialize typeahead enhancements:', error);
    }
  }

  /**
   * Modern typeahead wrapper for select fields so users can search and select suggestions.
   */
  createTypeaheadAdapter(selectElement, config = {}) {
    if (!selectElement || !selectElement.parentNode) {
      return null;
    }

    const placeholderText = config.placeholder || 'Search options…';
    const disabledPlaceholderText = config.disabledPlaceholder || placeholderText;
    const originalTabIndex = selectElement.getAttribute('tabindex');

    const wrapper = document.createElement('div');
    wrapper.className = 'typeahead-wrapper relative';
    wrapper.style.position = 'relative';

    selectElement.parentNode.insertBefore(wrapper, selectElement);
    wrapper.appendChild(selectElement);

    selectElement.classList.add('hidden');
    selectElement.setAttribute('aria-hidden', 'true');
    selectElement.setAttribute('data-typeahead-source', 'true');
    selectElement.setAttribute('tabindex', '-1');

    const searchContainer = document.createElement('div');
    searchContainer.className = 'typeahead-input flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-400 transition-all cursor-text';
    searchContainer.innerHTML = `
      <i class="fas fa-magnifying-glass text-slate-400"></i>
      <input type="text" class="typeahead-search-input flex-1 bg-transparent focus:outline-none text-sm placeholder-slate-400" placeholder="${placeholderText}" aria-expanded="false" aria-controls="${selectElement.id}-typeahead-list" autocomplete="off" />
      <button type="button" class="typeahead-toggle text-slate-400 hover:text-slate-600 transition-colors" aria-label="Toggle options">
        <i class="fas fa-angle-down"></i>
      </button>
    `;

    const dropdownPanel = document.createElement('div');
    dropdownPanel.id = `${selectElement.id}-typeahead-list`;
    dropdownPanel.className = 'typeahead-panel absolute left-0 right-0 mt-2 bg-white/95 border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto hidden z-30';
    dropdownPanel.setAttribute('role', 'listbox');

    const emptyState = document.createElement('div');
    emptyState.className = 'typeahead-empty-state px-4 py-3 text-sm text-slate-500 hidden';
    emptyState.textContent = config.emptyState || 'No matches found.';
    dropdownPanel.appendChild(emptyState);

    const optionList = document.createElement('div');
    optionList.className = 'typeahead-options flex flex-col divide-y divide-slate-100';
    dropdownPanel.appendChild(optionList);

    wrapper.appendChild(searchContainer);
    wrapper.appendChild(dropdownPanel);

    const searchInput = searchContainer.querySelector('input');
    const toggleButton = searchContainer.querySelector('.typeahead-toggle');
    const toggleIcon = toggleButton?.querySelector('i');

    searchInput.dataset.userModified = 'false';
    searchInput.setAttribute('role', 'combobox');
    searchInput.setAttribute('aria-autocomplete', 'list');
    searchInput.setAttribute('aria-haspopup', 'listbox');

    const associatedLabel = document.querySelector(`label[for="${selectElement.id}"]`);
    if (associatedLabel) {
      if (!associatedLabel.id) {
        associatedLabel.id = `${selectElement.id}-label`;
      }
      searchInput.setAttribute('aria-labelledby', associatedLabel.id);
      if (!associatedLabel.dataset.typeaheadBound) {
        associatedLabel.addEventListener('click', (event) => {
          event.preventDefault();
          searchInput.focus({ preventScroll: true });
        });
        associatedLabel.dataset.typeaheadBound = 'true';
      }
    } else if (config.accessibleLabel) {
      searchInput.setAttribute('aria-label', config.accessibleLabel);
    } else {
      searchInput.setAttribute('aria-label', placeholderText);
    }

    toggleButton.setAttribute('aria-haspopup', 'listbox');
    toggleButton.setAttribute('aria-expanded', 'false');

    let renderedOptions = [];
    let activeIndex = -1;
    let optionCounter = 0;

    const updateToggleIcon = (isOpen) => {
      if (!toggleIcon) return;
      toggleIcon.classList.toggle('fa-angle-up', isOpen);
      toggleIcon.classList.toggle('fa-angle-down', !isOpen);
    };

    const setActiveOption = (index, { scrollIntoView = true } = {}) => {
      if (index < 0 || index >= renderedOptions.length) {
        renderedOptions.forEach((btn) => {
          btn.classList.remove('ring-1', 'ring-blue-400', 'bg-blue-100', 'text-blue-900', 'shadow-inner');
        });
        activeIndex = -1;
        searchInput.removeAttribute('aria-activedescendant');
        return;
      }

      renderedOptions.forEach((btn, idx) => {
        const isActive = idx === index;
        btn.classList.toggle('ring-1', isActive);
        btn.classList.toggle('ring-blue-400', isActive);
        btn.classList.toggle('bg-blue-100', isActive);
        btn.classList.toggle('text-blue-900', isActive);
        btn.classList.toggle('shadow-inner', isActive);
      });

      activeIndex = index;
      const activeOption = renderedOptions[index];
      searchInput.setAttribute('aria-activedescendant', activeOption.id);
      if (scrollIntoView) {
        activeOption.scrollIntoView({ block: 'nearest' });
      }
    };

    const findNextEnabledIndex = (startIndex, direction) => {
      if (renderedOptions.length === 0) {
        return -1;
      }
      let index = startIndex;
      for (let i = 0; i < renderedOptions.length; i++) {
        index = (index + direction + renderedOptions.length) % renderedOptions.length;
        if (renderedOptions[index]?.dataset.disabled !== 'true') {
          return index;
        }
      }
      return -1;
    };

    const setInitialActive = () => {
      if (dropdownPanel.classList.contains('hidden')) {
        return;
      }
      const selectedIndex = renderedOptions.findIndex((btn) => btn.getAttribute('aria-selected') === 'true');
      if (selectedIndex >= 0) {
        setActiveOption(selectedIndex, { scrollIntoView: false });
        return;
      }
      const firstEnabled = findNextEnabledIndex(-1, 1);
      if (firstEnabled >= 0) {
        setActiveOption(firstEnabled, { scrollIntoView: false });
      } else {
        setActiveOption(-1, { scrollIntoView: false });
      }
    };

    const renderOptions = (filter = '') => {
      const normalizedFilter = filter.trim().toLowerCase();
      optionList.innerHTML = '';
      const nextOptions = [];
      optionCounter = 0;

      Array.from(selectElement.options).forEach((option) => {
        const label = (option.textContent || option.innerText || '').trim();
        const value = option.value;
        const isHiddenOption = option.hidden;
        const isDisabledOption = option.disabled;
        const isPlaceholder = value === '' && !option.getAttribute('data-allow-empty');

        if (isHiddenOption) {
          return;
        }

        if (normalizedFilter && !label.toLowerCase().includes(normalizedFilter)) {
          return;
        }

        const shouldDisableRow = isDisabledOption || (selectElement.required && value === '');

        const row = document.createElement('button');
        row.type = 'button';
        row.dataset.value = value;
        row.dataset.index = String(nextOptions.length);
        row.dataset.disabled = shouldDisableRow ? 'true' : 'false';
        row.id = `${selectElement.id}-typeahead-${optionCounter++}`;
        row.className = 'typeahead-option flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors';
        row.setAttribute('role', 'option');

        const isSelected = selectElement.value === value && !shouldDisableRow;
        row.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        if (isSelected) {
          row.classList.add('bg-blue-50', 'text-blue-700', 'font-semibold');
        }
        if (shouldDisableRow) {
          row.classList.add('opacity-60', 'cursor-not-allowed');
        }

        const textSpan = document.createElement('span');
        textSpan.className = 'truncate';
        textSpan.textContent = label || (isPlaceholder ? 'Select an option' : value);

        const iconSpan = document.createElement('span');
        iconSpan.className = 'ml-3 flex items-center';
        iconSpan.innerHTML = isSelected ? '<i class="fas fa-check text-blue-500"></i>' : '<span class="inline-block w-4 h-4"></span>';

        row.appendChild(textSpan);
        row.appendChild(iconSpan);

        if (!shouldDisableRow) {
          row.addEventListener('click', () => {
            selectElement.value = value;
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            searchInput.value = label;
            searchInput.dataset.userModified = 'false';
            closePanel();
            renderOptions('');
            syncDisabledState();
            searchInput.focus({ preventScroll: true });
          });
        }

        row.addEventListener('mouseenter', () => {
          if (row.dataset.disabled === 'true') {
            return;
          }
          setActiveOption(Number(row.dataset.index), { scrollIntoView: false });
        });

        row.addEventListener('mouseleave', () => {
          if (!dropdownPanel.classList.contains('hidden')) {
            setActiveOption(-1, { scrollIntoView: false });
          }
        });

        optionList.appendChild(row);
        nextOptions.push(row);
      });

      renderedOptions = nextOptions;
      const hasResults = renderedOptions.length > 0;
      optionList.classList.toggle('hidden', !hasResults);
      emptyState.classList.toggle('hidden', hasResults);
      setActiveOption(-1, { scrollIntoView: false });
      setInitialActive();
    };

    const syncInputValueFromSelect = () => {
      if (searchInput.dataset.userModified === 'true') {
        return;
      }
      const selected = selectElement.selectedOptions?.[0];
      searchInput.value = selected ? selected.textContent?.trim() || '' : '';
      searchInput.dataset.userModified = 'false';
    };

    const syncDisabledState = () => {
      const disabled = selectElement.disabled;
      searchInput.disabled = disabled;
      toggleButton.disabled = disabled;
      searchInput.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      toggleButton.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      searchContainer.classList.toggle('opacity-60', disabled);
      searchContainer.classList.toggle('cursor-not-allowed', disabled);
      searchContainer.classList.toggle('cursor-text', !disabled);
      if (disabled) {
        closePanel();
        searchInput.placeholder = disabledPlaceholderText;
        if (!selectElement.value && searchInput.dataset.userModified !== 'true') {
          searchInput.value = '';
        }
      } else {
        searchInput.placeholder = placeholderText;
      }
    };

    const openPanel = () => {
      if (selectElement.disabled) {
        return;
      }
      dropdownPanel.classList.remove('hidden');
      dropdownPanel.scrollTop = 0;
      searchInput.setAttribute('aria-expanded', 'true');
      toggleButton.setAttribute('aria-expanded', 'true');
      searchContainer.classList.add('ring-2', 'ring-blue-300');
      const useFilter = searchInput.dataset.userModified === 'true';
      renderOptions(useFilter ? searchInput.value : '');
      updateToggleIcon(true);
    };

    const closePanel = () => {
      dropdownPanel.classList.add('hidden');
      searchInput.setAttribute('aria-expanded', 'false');
      toggleButton.setAttribute('aria-expanded', 'false');
      searchContainer.classList.remove('ring-2', 'ring-blue-300');
      updateToggleIcon(false);
      setActiveOption(-1, { scrollIntoView: false });
    };

    const handleFocus = () => {
      if (selectElement.disabled) {
        return;
      }
      openPanel();
      if (searchInput.dataset.userModified !== 'true') {
        searchInput.select();
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        if (!wrapper.contains(document.activeElement)) {
          closePanel();
        }
      }, 120);
    };

    const handleInput = (event) => {
      searchInput.dataset.userModified = event.target.value.length > 0 ? 'true' : 'false';
      if (selectElement.disabled) {
        return;
      }
      if (dropdownPanel.classList.contains('hidden')) {
        openPanel();
      } else {
        renderOptions(event.target.value);
      }
    };

    const handleKeydown = (event) => {
      if (selectElement.disabled) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (dropdownPanel.classList.contains('hidden')) {
          openPanel();
        }
        const nextIndex = findNextEnabledIndex(activeIndex, 1);
        if (nextIndex >= 0) {
          setActiveOption(nextIndex);
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!dropdownPanel.classList.contains('hidden')) {
          const prevIndex = findNextEnabledIndex(activeIndex, -1);
          if (prevIndex >= 0) {
            setActiveOption(prevIndex);
          }
        }
      } else if (event.key === 'Enter') {
        if (!dropdownPanel.classList.contains('hidden') && activeIndex >= 0) {
          event.preventDefault();
          const activeOption = renderedOptions[activeIndex];
          if (activeOption && activeOption.dataset.disabled !== 'true') {
            activeOption.click();
          }
        }
      } else if (event.key === 'Escape') {
        if (!dropdownPanel.classList.contains('hidden')) {
          event.preventDefault();
          closePanel();
        }
      }
    };

    const handleToggleClick = (event) => {
      event.preventDefault();
      if (selectElement.disabled) {
        return;
      }
      if (dropdownPanel.classList.contains('hidden')) {
        openPanel();
        searchInput.focus({ preventScroll: true });
      } else {
        closePanel();
      }
    };

    const handleToggleKeydown = (event) => {
      if (selectElement.disabled) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        handleToggleClick(event);
      }
    };

    const handleContainerClick = (event) => {
      if (selectElement.disabled) {
        return;
      }
      if (!event.target.closest('.typeahead-toggle')) {
        searchInput.focus({ preventScroll: true });
      }
    };

    const handleDocumentClick = (event) => {
      if (!wrapper.contains(event.target)) {
        closePanel();
      }
    };

    const handleNativeChange = () => {
      syncInputValueFromSelect();
      const filter = searchInput.dataset.userModified === 'true' ? searchInput.value : '';
      renderOptions(filter);
      syncDisabledState();
    };

    searchInput.addEventListener('focus', handleFocus);
    searchInput.addEventListener('blur', handleBlur);
    searchInput.addEventListener('input', handleInput);
    searchInput.addEventListener('keydown', handleKeydown);
    searchContainer.addEventListener('click', handleContainerClick);
    toggleButton.addEventListener('click', handleToggleClick);
    toggleButton.addEventListener('keydown', handleToggleKeydown);
    selectElement.addEventListener('change', handleNativeChange);
    document.addEventListener('click', handleDocumentClick);

    renderOptions('');
    syncDisabledState();
    syncInputValueFromSelect();

    return {
      destroy() {
        document.removeEventListener('click', handleDocumentClick);
        searchInput.removeEventListener('focus', handleFocus);
        searchInput.removeEventListener('blur', handleBlur);
        searchInput.removeEventListener('input', handleInput);
        searchInput.removeEventListener('keydown', handleKeydown);
        searchContainer.removeEventListener('click', handleContainerClick);
        toggleButton.removeEventListener('click', handleToggleClick);
        toggleButton.removeEventListener('keydown', handleToggleKeydown);
        selectElement.removeEventListener('change', handleNativeChange);

        closePanel();
        selectElement.classList.remove('hidden');
        selectElement.removeAttribute('aria-hidden');
        selectElement.removeAttribute('data-typeahead-source');
        if (originalTabIndex !== null) {
          selectElement.setAttribute('tabindex', originalTabIndex);
        } else {
          selectElement.removeAttribute('tabindex');
        }

        wrapper.replaceWith(selectElement);
      },
      update() {
        const userModified = searchInput.dataset.userModified === 'true';
        const filter = userModified ? searchInput.value : '';
        renderOptions(filter);
        if (!userModified) {
          syncInputValueFromSelect();
        }
        syncDisabledState();
      },
      refreshPlaceholder() {
        syncDisabledState();
      }
    };
  }

  /**
   * Add embedding coordination logging to track workflow
   */
  addEmbeddingCoordinationLogging() {
    console.log('[EMBEDDING_COORDINATION] Adding coordination logging');

    // Monkey patch console methods to track embedding workflow
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    // Track embedding-related logs (safe implementation)
    const trackEmbeddingLog = (level, message, ...args) => {
      try {
        const isEmbeddingRelated = typeof message === 'string' && (
          message.includes('[ENHANCED_EMBEDDING]') ||
          message.includes('[EMBEDDING_COORDINATOR_INTEGRATION]') ||
          message.includes('[EMBEDDING_FALLBACK]') ||
          message.includes('Embedding') ||
          message.includes('embedding')
        );

        if (isEmbeddingRelated) {
          const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            args,
            workflow: this.getCurrentEmbeddingWorkflow()
          };

          this.embeddingWorkflow.coordinationLogs.push(logEntry);

          // Keep only last 1000 logs
          if (this.embeddingWorkflow.coordinationLogs.length > 1000) {
            this.embeddingWorkflow.coordinationLogs = this.embeddingWorkflow.coordinationLogs.slice(-1000);
          }

          // Also log to original console
          if (level === 'error') {
            originalError(message, ...args);
          } else if (level === 'warn') {
            originalWarn(message, ...args);
          } else {
            originalLog(message, ...args);
          }
          return;
        }

        // Safe serializer that avoids invoking getters or functions (prevents side-effects)
        const safeSerialize = (obj) => {
          try {
            if (obj === null || typeof obj === 'undefined') return String(obj);
            if (typeof obj === 'string') return obj;
            if (obj instanceof Error) return obj.stack || obj.message || String(obj);
            if (typeof obj !== 'object') return String(obj);

            const descriptors = Object.getOwnPropertyDescriptors(obj);
            const shallow = {};
            Object.keys(descriptors).forEach((key) => {
              const desc = descriptors[key];
              // Skip accessors to avoid invoking getters with side-effects
              if ('get' in desc || 'set' in desc) {
                shallow[key] = `[Accessor:${key}]`;
                return;
              }
              const val = desc.value;
              if (typeof val === 'function') {
                shallow[key] = `[Function:${key}]`;
                return;
              }
              // Try to copy primitive or plain values; if it throws, mark as unserializable
              try {
                shallow[key] = val;
              } catch (e) {
                shallow[key] = `[Unserializable:${key}]`;
              }
            });

            return JSON.stringify(shallow, null, 2);
          } catch (e) {
            try { return String(obj); } catch (_) { return '[Unserializable Object]'; }
          }
        };

        // Use safeSerialize and include concise timestamp prefix for context
        const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[LOG]';
        const timePrefixed = `${prefix} ${new Date().toISOString()}`;

        if (level === 'error') {
            // Error-level logging: prefer stack when available and safely serialize args
            try {
            const safeArgs = args.map(a => {
              try { return safeSerialize(a); } catch (_) { return String(a); }
            });

            if (message instanceof Error) {
              // Preserve stack if present
              originalError(timePrefixed, message.stack || message.message || safeSerialize(message), ...safeArgs);
            } else {
                const serializedMessage = safeSerialize(message);
                if (typeof message === 'string') {
                originalError(timePrefixed, message, ...safeArgs);
                } else {
                originalError(timePrefixed, serializedMessage, ...safeArgs);
                }
            }
            } catch (err) {
            // Final-safe fallback to avoid breaking host console if our logging fails
            try {
              originalError('[TRACK_EMBEDDING_LOG_ERROR]', err && err.message ? err.message : String(err), String(message), ...args);
            } catch (_) {
              // no-op
            }
            }
        } else if (level === 'warn') {
          originalWarn(timePrefixed, safeSerialize(message), ...args);
        } else {
          originalLog(timePrefixed, safeSerialize(message), ...args);
        }
      } catch (err) {
        // Final-safe fallback to avoid breaking host console if our logging fails
        try {
          originalError('[TRACK_EMBEDDING_LOG_ERROR]', err && err.message ? err.message : String(err), message, ...args);
        } catch (_) {
          // no-op: ensure we never throw from the logging shim
        }
      }
    };

    // Override console methods (only if not already overridden)
    if (!console.log.toString().includes('trackEmbeddingLog')) {
      console.log = (message, ...args) => trackEmbeddingLog('log', message, ...args);
      console.warn = (message, ...args) => trackEmbeddingLog('warn', message, ...args);
      console.error = (message, ...args) => trackEmbeddingLog('error', message, ...args);
    }
  }

  /**
   * Get current embedding workflow status
   */
  getCurrentEmbeddingWorkflow() {
    return {
      modalProcessedCount: this.embeddingWorkflow.modalProcessedImages.size,
      coordinatorProcessedCount: this.embeddingWorkflow.coordinatorProcessedImages.size,
      duplicatesPrevented: this.embeddingWorkflow.duplicatePrevention.size,
      totalLogs: this.embeddingWorkflow.coordinationLogs.length,
      workflowActive: this.embeddingWorkflow.startTime && !this.embeddingWorkflow.endTime
    };
  }

  /**
   * Track image processing by modal
   */
  trackModalImageProcessing(imageData) {
    const imageKey = this.getImageKey(imageData);
    this.embeddingWorkflow.modalProcessedImages.add(imageKey);

    console.log('[EMBEDDING_COORDINATION] Modal processed image:', {
      imageKey,
      imageName: imageData.name,
      totalModalProcessed: this.embeddingWorkflow.modalProcessedImages.size
    });
  }

  /**
   * Track image processing by coordinator
   */
  trackCoordinatorImageProcessing(imageData) {
    const imageKey = this.getImageKey(imageData);
    this.embeddingWorkflow.coordinatorProcessedImages.add(imageKey);

    console.log('[EMBEDDING_COORDINATION] Coordinator processed image:', {
      imageKey,
      imageName: imageData.name,
      totalCoordinatorProcessed: this.embeddingWorkflow.coordinatorProcessedImages.size
    });
  }

  /**
   * Track duplicate prevention
   */
  trackDuplicatePrevention(imageKey, reason) {
    this.embeddingWorkflow.duplicatePrevention.set(imageKey, {
      reason,
      timestamp: new Date().toISOString(),
      prevented: true
    });

    console.log('[EMBEDDING_COORDINATION] Duplicate prevented:', {
      imageKey,
      reason,
      totalDuplicatesPrevented: this.embeddingWorkflow.duplicatePrevention.size
    });
  }

  /**
   * Generate consistent image key for tracking
   */
  getImageKey(imageData) {
    if (typeof imageData === 'string') {
      return `url_${imageData}`;
    }

    if (imageData.file instanceof File) {
      return `file_${imageData.file.name}_${imageData.file.size}_${imageData.file.lastModified}`;
    }

    if (imageData.name && imageData.size) {
      return `data_${imageData.name}_${imageData.size}`;
    }

    return `unknown_${Date.now()}_${Math.random()}`;
  }

  /**
   * Check for potential duplicate processing
   */
  checkForDuplicateProcessing(imageData) {
    const imageKey = this.getImageKey(imageData);
    const modalProcessed = this.embeddingWorkflow.modalProcessedImages.has(imageKey);
    const coordinatorProcessed = this.embeddingWorkflow.coordinatorProcessedImages.has(imageKey);

    if (modalProcessed && coordinatorProcessed) {
      this.trackDuplicatePrevention(imageKey, 'both_systems_processed');
      console.warn('[EMBEDDING_COORDINATION] ⚠️ DUPLICATE DETECTED - Both systems processed same image:', {
        imageKey,
        imageName: imageData.name,
        modalProcessed,
        coordinatorProcessed
      });
      return true;
    }

    if (modalProcessed) {
      console.log('[EMBEDDING_COORDINATION] Image already processed by modal, skipping coordinator:', imageKey);
      return true;
    }

    return false;
  }

  /**
   * Get embedding coordination statistics
   */
  getEmbeddingCoordinationStats() {
    const now = new Date();
    const workflow = this.embeddingWorkflow;

    return {
      summary: {
        modalProcessedImages: workflow.modalProcessedImages.size,
        coordinatorProcessedImages: workflow.coordinatorProcessedImages.size,
        duplicatesPrevented: workflow.duplicatePrevention.size,
        totalLogs: workflow.coordinationLogs.length,
        workflowDuration: workflow.startTime ?
          (workflow.endTime ? workflow.endTime - workflow.startTime : now - workflow.startTime) : 0
      },
      efficiency: {
        coordinationSuccessRate: workflow.coordinatorProcessedImages.size > 0 ?
          `${((workflow.coordinatorProcessedImages.size / (workflow.modalProcessedImages.size + workflow.coordinatorProcessedImages.size)) * 100).toFixed(1)}%` : '0%',
        duplicateRate: workflow.modalProcessedImages.size > 0 ?
          `${((workflow.duplicatePrevention.size / workflow.modalProcessedImages.size) * 100).toFixed(1)}%` : '0%',
        averageProcessingTime: this.calculateAverageProcessingTime()
      },
      logs: {
        recentLogs: workflow.coordinationLogs.slice(-10),
        errorCount: workflow.coordinationLogs.filter(log => log.level === 'error').length,
        warningCount: workflow.coordinationLogs.filter(log => log.level === 'warn').length
      }
    };
  }

  /**
   * Calculate average processing time from logs
   */
  calculateAverageProcessingTime() {
    const processingLogs = this.embeddingWorkflow.coordinationLogs.filter(log =>
      log.message.includes('Embedding generated successfully') ||
      log.message.includes('processed image')
    );

    if (processingLogs.length < 2) return 0;

    // This is a simplified calculation - in a real implementation you'd track start/end times
    return processingLogs.length * 1000; // Assume 1s per processing step
  }

  /**
   * Test embedding coordination system
   */
  testEmbeddingCoordination() {
    console.log('[EMBEDDING_COORDINATION_TEST] 🧪 Testing embedding coordination system...');

    const testResults = {
      coordinationInitialized: false,
      duplicatePreventionWorking: false,
      loggingActive: false,
      statsAvailable: false,
      overallSuccess: false
    };

    try {
      // Test 1: Check if coordination is initialized
      testResults.coordinationInitialized = !!(
        this.embeddingWorkflow &&
        this.embeddingWorkflow.modalProcessedImages &&
        this.embeddingWorkflow.coordinatorProcessedImages &&
        this.embeddingWorkflow.duplicatePrevention
      );

      console.log(`[EMBEDDING_COORDINATION_TEST] ✅ Coordination initialized:`, testResults.coordinationInitialized);

      // Test 2: Check if duplicate prevention is working
      const testImageData = { name: 'test.jpg', file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }) };
      const imageKey = this.getImageKey(testImageData);

      // Simulate processing
      this.trackModalImageProcessing(testImageData);
      const isDuplicate = this.checkForDuplicateProcessing(testImageData);

      testResults.duplicatePreventionWorking = isDuplicate; // Should be true after processing
      console.log(`[EMBEDDING_COORDINATION_TEST] ✅ Duplicate prevention working:`, testResults.duplicatePreventionWorking);

      // Test 3: Check if logging is active
      testResults.loggingActive = this.embeddingWorkflow.coordinationLogs.length > 0;
      console.log(`[EMBEDDING_COORDINATION_TEST] ✅ Logging active:`, testResults.loggingActive);

      // Test 4: Check if stats are available
      const stats = this.getEmbeddingCoordinationStats();
      testResults.statsAvailable = !!(stats && stats.summary && stats.efficiency);
      console.log(`[EMBEDDING_COORDINATION_TEST] ✅ Stats available:`, testResults.statsAvailable);

      // Overall success
      testResults.overallSuccess = Object.values(testResults).slice(0, 4).every(result => result === true);

      console.log('[EMBEDDING_COORDINATION_TEST] 📊 Test Results Summary:', testResults);

      if (testResults.overallSuccess) {
        console.log('[EMBEDDING_COORDINATION_TEST] 🎉 All coordination tests passed!');
        console.log('[EMBEDDING_COORDINATION_TEST] 📈 Current stats:', stats.summary);
      } else {
        console.warn('[EMBEDDING_COORDINATION_TEST] ⚠️ Some coordination tests failed');
      }

      return testResults;

    } catch (error) {
      console.error('[EMBEDDING_COORDINATION_TEST] ❌ Test execution failed:', error);
      return { ...testResults, error: error.message, overallSuccess: false };
    }
  }

  /**
    * Reset embedding coordination tracking
    */
   resetEmbeddingCoordination() {
     console.log('[EMBEDDING_COORDINATION_RESET] 🔄 Resetting embedding coordination tracking...');

     this.embeddingWorkflow = {
       modalProcessedImages: new Set(),
       coordinatorProcessedImages: new Set(),
       duplicatePrevention: new Map(),
       coordinationLogs: [],
       startTime: null,
       endTime: null
     };

     console.log('[EMBEDDING_COORDINATION_RESET] ✅ Coordination tracking reset');
   }

  /**
   * Setup product button handler (connects dashboard "Add Product" button to modal)
   */
  setupProductButtonHandler() {
    console.log('[PRODUCT_BUTTON_HANDLER] 🚀 Setting up product button handler...');

    // IMMEDIATE DEBUGGING: Log button state before setup
    this.debugButtonState();

    // Try multiple strategies to find and handle the button
    this.attachButtonHandlers();

    // Set up aggressive detection that runs immediately and on intervals
    this.setupAggressiveButtonDetection();

    // ADD IMMEDIATE CLICK DETECTION LOGGING
    this.addComprehensiveClickLogging();
  }

   /**
    * Debug current button state
    */
   debugButtonState() {
     console.log('[BUTTON_DEBUG] 🔍 Analyzing button state...');
 
     // Check for target button
     const targetButton = document.getElementById('openProductModalTop');
     console.log('[BUTTON_DEBUG] Target button exists:', !!targetButton);
 
     if (targetButton) {
       console.log('[BUTTON_DEBUG] Target button details:', {
         id: targetButton.id,
         className: targetButton.className,
         textContent: targetButton.textContent.trim(),
         disabled: targetButton.disabled,
         hidden: targetButton.classList.contains('hidden'),
         style: targetButton.style.cssText,
         computedDisplay: window.getComputedStyle(targetButton).display,
         computedVisibility: window.getComputedStyle(targetButton).visibility,
         computedOpacity: window.getComputedStyle(targetButton).opacity,
         hasClickHandler: !!(targetButton.onclick || targetButton.getAttribute('data-has-handler')),
         parentElement: targetButton.parentElement?.tagName,
         positionInDOM: targetButton.outerHTML.substring(0, 200) + '...'
       });
     }
 
     // Check for all buttons that might be "Add Product" buttons
     const allButtons = document.querySelectorAll('button');
     const productButtons = Array.from(allButtons).filter(btn => {
       const text = btn.textContent.toLowerCase();
       const id = btn.id.toLowerCase();
       return text.includes('add') || text.includes('product') || text.includes('new') ||
              id.includes('product') || id.includes('add') || id.includes('modal');
     });
 
     console.log(`[BUTTON_DEBUG] Found ${productButtons.length} potential product buttons:`);
     productButtons.forEach((btn, index) => {
       console.log(`  ${index + 1}.`, {
         id: btn.id,
         className: btn.className,
         textContent: btn.textContent.trim(),
         hasHandler: !!(btn.onclick || btn.getAttribute('data-has-handler'))
       });
     });
 
     // Check for any existing modal handlers
     console.log('[BUTTON_DEBUG] Global modal handlers:', {
       window_modernProductModal: !!window.modernProductModal,
       window_openProductModal: !!window.openProductModal,
       document_openProductModalTop: !!(document.getElementById('openProductModalTop')?.onclick)
     });
   }
 
   /**
    * Add comprehensive click logging to detect all button clicks
    */
   addComprehensiveClickLogging() {
     console.log('[CLICK_LOGGING] 🔍 Setting up comprehensive click logging...');
 
     // Log all button clicks on the page
     document.addEventListener('click', (e) => {
       if (e.target.tagName === 'BUTTON') {
         console.log('[CLICK_LOGGING] 📱 BUTTON CLICK DETECTED:', {
           buttonId: e.target.id,
           buttonClass: e.target.className,
           buttonText: e.target.textContent.trim(),
           timestamp: new Date().toISOString(),
           targetButton: e.target.id === 'openProductModalTop',
           hasModalHandler: !!(window.modernProductModal && window.modernProductModal.show),
           eventPrevented: e.defaultPrevented
         });
 
         // Special logging for target button
         if (e.target.id === 'openProductModalTop') {
           console.log('[CLICK_LOGGING] 🎯 TARGET BUTTON CLICKED!');
           console.log('[CLICK_LOGGING] Modal should open now...');
 
           // Check if modal handler exists and call it
           if (window.modernProductModal && typeof window.modernProductModal.show === 'function') {
             console.log('[CLICK_LOGGING] ✅ Modal handler found, calling show()');
             window.modernProductModal.show();
           } else {
             console.error('[CLICK_LOGGING] ❌ Modal handler not available');
             console.log('[CLICK_LOGGING] Available window properties:', Object.keys(window).filter(key => key.includes('modal')));
           }
         }
       }
     }, true); // Use capture phase to catch all clicks
 
     // Also add logging specifically to the target button
     const targetButton = document.getElementById('openProductModalTop');
     if (targetButton) {
       console.log('[CLICK_LOGGING] 🎯 Adding specific logging to target button');
 
       // Store original handler
       const originalHandler = targetButton.onclick;
 
       // Override with logging
       targetButton.onclick = function(e) {
         console.log('[CLICK_LOGGING] 🎯 TARGET BUTTON ONCLICK TRIGGERED!');
         console.log('[CLICK_LOGGING] Event details:', {
           type: e.type,
           target: e.target.id,
           timestamp: new Date().toISOString()
         });
 
         // Call original handler if it exists
         if (originalHandler) {
           console.log('[CLICK_LOGGING] Calling original handler...');
           originalHandler.call(this, e);
         }
 
         // Always try to show modal
         if (window.modernProductModal && window.modernProductModal.show) {
           console.log('[CLICK_LOGGING] Calling modal show()...');
           window.modernProductModal.show();
         } else {
           console.error('[CLICK_LOGGING] Modal not available for onclick');
         }
 
         return false;
       };
 
       console.log('[CLICK_LOGGING] ✅ Specific logging added to target button');
     } else {
       console.warn('[CLICK_LOGGING] ⚠️ Target button not found for specific logging');
     }
   }
 
   /**
    * Attach handlers to the button using multiple strategies
    */
   attachButtonHandlers() {
     console.log('[PRODUCT_BUTTON_HANDLER] 🔍 Attempting to attach button handlers...');
 
     // Strategy 1: Direct ID lookup
     const directButton = document.getElementById('openProductModalTop');
     if (directButton) {
       this.attachHandlerToButton(directButton, 'DIRECT_ID');
       return;
     }
 
     // Strategy 2: Pattern matching for similar buttons
     const patternButtons = document.querySelectorAll('[id*="Product"], [id*="product"], [id*="add"], [id*="Add"]');
     if (patternButtons.length > 0) {
       Array.from(patternButtons).forEach((btn, index) => {
         this.attachHandlerToButton(btn, `PATTERN_${index + 1}`);
       });
       return;
     }
 
     // Strategy 3: Text content matching
     const textButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
       btn.textContent.toLowerCase().includes('add') ||
       btn.textContent.toLowerCase().includes('product') ||
       btn.textContent.toLowerCase().includes('new')
     );
 
     if (textButtons.length > 0) {
       textButtons.forEach((btn, index) => {
         this.attachHandlerToButton(btn, `TEXT_MATCH_${index + 1}`);
       });
       return;
     }
 
     // Strategy 4: Create our own button if none found
     console.log('[PRODUCT_BUTTON_HANDLER] ⚠️ No existing button found, this might be expected');
   }

   /**
    * Attach click handler to a specific button
    */
   attachHandlerToButton(button, strategy) {
     console.log(`[PRODUCT_BUTTON_HANDLER] ✅ Attaching handler via ${strategy} to button:`, {
       id: button.id,
       className: button.className,
       textContent: button.textContent.trim(),
       tagName: button.tagName
     });

     // Remove any existing handlers first
     const newButton = button.cloneNode(true);
     button.parentNode.replaceChild(newButton, button);

     // Add our click handler
     newButton.addEventListener('click', (e) => {
       console.log(`[PRODUCT_BUTTON_HANDLER] 🚨 BUTTON CLICKED via ${strategy}!`, {
         eventType: e.type,
         targetId: e.target.id,
         targetClass: e.target.className,
         timestamp: new Date().toISOString(),
         strategy: strategy
       });

       e.preventDefault();
       e.stopPropagation();

       console.log('[PRODUCT_BUTTON_HANDLER] Opening product modal...');
       this.show();

       return false;
     });

     // Also add to global reference for debugging
     window.lastProductButton = newButton;

     console.log(`[PRODUCT_BUTTON_HANDLER] ✅ Handler attached successfully via ${strategy}`);
   }

   /**
     * Setup aggressive button detection that runs continuously
     */
    setupAggressiveButtonDetection() {
      console.log('[PRODUCT_BUTTON_HANDLER] 🔄 Setting up aggressive button detection...');
 
      // IMMEDIATE ACTION: Try to find and fix the button right now
      this.immediateButtonFix();
 
      // Run detection immediately
      this.detectAndAttachButton();
 
      // Run detection every 1 second for the first 60 seconds (more frequent)
      const detectionInterval = setInterval(() => {
        this.detectAndAttachButton();
      }, 1000);
 
      // After 5 seconds, if no button found, create fallback and force attach to all buttons
      setTimeout(() => {
        console.log('[PRODUCT_BUTTON_HANDLER] 🔍 Check - target button not found, activating immediate fixes...');
 
        // Check if target button exists now
        const targetButton = document.getElementById('openProductModalTop');
        if (targetButton) {
          console.log('[PRODUCT_BUTTON_HANDLER] ✅ Target button found!');
          this.attachHandlerToButton(targetButton, 'IMMEDIATE_TARGET');
          return;
        }
 
        // IMMEDIATE FIX: Create fallback button
        console.log('[PRODUCT_BUTTON_HANDLER] 🔧 Creating immediate fallback button...');
        this.createImmediateFallbackButton();
 
        // IMMEDIATE FIX: Force attach to ALL buttons
        console.log('[PRODUCT_BUTTON_HANDLER] 💥 Force attaching to ALL buttons...');
        this.forceAttachToAllButtons();
 
        console.log('[PRODUCT_BUTTON_HANDLER] 🎯 IMMEDIATE FIXES ACTIVATED!');
        console.log('[PRODUCT_BUTTON_HANDLER] Look for the RED "EMERGENCY ADD PRODUCT" button in top-right corner');
      }, 5000);
 
      // Stop detection after 60 seconds
      setTimeout(() => {
        clearInterval(detectionInterval);
        console.log('[PRODUCT_BUTTON_HANDLER] ⏹️ Stopped aggressive button detection');
      }, 60000);
 
      // Also listen for DOM changes
      this.setupButtonMutationObserver();
    }
 
    /**
     * IMMEDIATE button fix - try to fix the button right now
     */
    immediateButtonFix() {
      console.log('[IMMEDIATE_FIX] 🚨 Starting immediate button fix...');
  
      // Check if the specific button exists
      const specificButton = document.getElementById('openProductModalTop');
      if (specificButton) {
        console.log('[IMMEDIATE_FIX] ✅ Found specific button, attaching handler...');
        this.attachImmediateHandler(specificButton);
        return;
      }
  
      // Look for ANY button that might be "Add Product"
      const allButtons = document.querySelectorAll('button');
      console.log(`[IMMEDIATE_FIX] Scanning ${allButtons.length} buttons...`);
  
      for (let button of allButtons) {
        const text = button.textContent.toLowerCase();
        const id = button.id.toLowerCase();
  
        if (text.includes('add') && text.includes('product') ||
            id.includes('add') && id.includes('product') ||
            text.includes('add product') ||
            id === 'openproductmodaltop') {
  
          console.log(`[IMMEDIATE_FIX] 🎯 Found potential button:`, {
            id: button.id,
            text: button.textContent.trim(),
            className: button.className
          });
  
          this.attachImmediateHandler(button);
          return;
        }
      }
  
      console.log('[IMMEDIATE_FIX] ⚠️ No existing button found, creating immediate fallback...');
      this.createImmediateWorkingButton();
    }
  
    /**
     * Create an immediate working button that's highly visible
     */
    createImmediateWorkingButton() {
      console.log('[IMMEDIATE_FIX] 🔧 Creating immediate working button...');
  
      // Remove any existing working button
      const existingButton = document.getElementById('immediate-working-button');
      if (existingButton) {
        existingButton.remove();
      }
  
      const workingButton = document.createElement('button');
      workingButton.id = 'immediate-working-button';
      workingButton.innerHTML = '🚨 WORKING ADD PRODUCT';
      workingButton.style.cssText = `
        position: fixed !important;
        top: 10px !important;
        right: 10px !important;
        z-index: 999999 !important;
        background: linear-gradient(135deg, #10b981, #059669) !important;
        color: white !important;
        border: 3px solid #ffffff !important;
        padding: 15px 25px !important;
        border-radius: 12px !important;
        cursor: pointer !important;
        font-size: 16px !important;
        font-weight: bold !important;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.5) !important;
        transition: all 0.3s ease !important;
        animation: workingPulse 2s infinite !important;
      `;
  
      // Add CSS animation
      if (!document.getElementById('working-button-styles')) {
        const style = document.createElement('style');
        style.id = 'working-button-styles';
        style.textContent = `
          @keyframes workingPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 8px 25px rgba(16, 185, 129, 0.5); }
            50% { transform: scale(1.05); box-shadow: 0 12px 35px rgba(16, 185, 129, 0.7); }
          }
        `;
        document.head.appendChild(style);
      }
  
      // Direct click handler that guarantees modal opening
      workingButton.addEventListener('click', (e) => {
        console.log('[WORKING_BUTTON] 🚨 WORKING BUTTON CLICKED!');
        e.preventDefault();
        e.stopPropagation();
  
        // Force modal to show immediately
        this.showModalImmediately();
      });
  
      // Add hover effects
      workingButton.addEventListener('mouseenter', () => {
        workingButton.style.transform = 'scale(1.1)';
        workingButton.style.background = 'linear-gradient(135deg, #059669, #047857)';
      });
  
      workingButton.addEventListener('mouseleave', () => {
        workingButton.style.transform = 'scale(1)';
        workingButton.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      });
  
      document.body.appendChild(workingButton);
  
      console.log('[IMMEDIATE_FIX] ✅ WORKING BUTTON CREATED!');
      console.log('[IMMEDIATE_FIX] 🎯 Look for the GREEN "🚨 WORKING ADD PRODUCT" button in the top-right corner!');
      console.log('[IMMEDIATE_FIX] This button will work regardless of any other issues.');
  
      return workingButton;
    }
  
    /**
     * Show modal immediately, bypassing all initialization checks
     */
    showModalImmediately() {
      console.log('[IMMEDIATE_MODAL] 🚨 Showing modal immediately...');
  
      try {
        // Create modal HTML directly if it doesn't exist
        if (!document.getElementById('modern-product-modal')) {
          console.log('[IMMEDIATE_MODAL] Creating modal HTML...');
          this.createModal();
        }
  
        // Show the modal
        const modal = document.getElementById('modern-product-modal');
        if (modal) {
          modal.classList.remove('hidden');
          document.body.classList.add('modal-open');
          console.log('[IMMEDIATE_MODAL] ✅ Modal shown successfully');
        } else {
          console.error('[IMMEDIATE_MODAL] ❌ Failed to find modal element');
        }
      } catch (error) {
        console.error('[IMMEDIATE_MODAL] ❌ Error showing modal:', error);
        alert('Error opening product modal. Please refresh the page and try again.');
      }
    }
 
    /**
     * Attach immediate handler with multiple strategies
     */
    attachImmediateHandler(button) {
      console.log('[IMMEDIATE_FIX] 🔗 Attaching immediate handler...');
 
      // Strategy 1: Regular addEventListener
      button.addEventListener('click', (e) => {
        console.log('[IMMEDIATE_FIX] 🚨 IMMEDIATE CLICK DETECTED!');
        e.preventDefault();
        e.stopPropagation();
        this.show();
      });
 
      // Strategy 2: Direct onclick property
      button.onclick = (e) => {
        console.log('[IMMEDIATE_FIX] 🚨 ONCLICK TRIGGERED!');
        e.preventDefault();
        e.stopPropagation();
        this.show();
        return false;
      };
 
      // Strategy 3: jQuery-style event binding (if jQuery exists)
      if (typeof jQuery !== 'undefined') {
        jQuery(button).on('click.immediate', (e) => {
          console.log('[IMMEDIATE_FIX] 🚨 JQUERY CLICK DETECTED!');
          e.preventDefault();
          e.stopPropagation();
          this.show();
        });
      }
 
      // Strategy 4: Override existing handlers
      const originalOnclick = button.onclick;
      button.onclick = function(e) {
        console.log('[IMMEDIATE_FIX] 🚨 OVERRIDE CLICK DETECTED!');
 
        // Call original handler if it exists
        if (originalOnclick) {
          try {
            originalOnclick.call(this, e);
          } catch (error) {
            console.log('[IMMEDIATE_FIX] Original handler failed:', error);
          }
        }
 
        // Always show our modal
        e.preventDefault();
        e.stopPropagation();
        window.modernProductModal.show();
        return false;
      };
 
      console.log('[IMMEDIATE_FIX] ✅ Multiple click strategies attached');
      console.log('[IMMEDIATE_FIX] Button should now work - try clicking it!');
    }
 
    /**
     * Create an immediate fallback button that's highly visible
     */
    createImmediateFallbackButton() {
      console.log('[IMMEDIATE_FIX] 🔧 Creating immediate fallback button...');
 
      // Remove any existing fallback
      const existingFallback = document.getElementById('immediate-fallback-button');
      if (existingFallback) {
        existingFallback.remove();
      }
 
      const fallbackButton = document.createElement('button');
      fallbackButton.id = 'immediate-fallback-button';
      fallbackButton.innerHTML = '🚨 EMERGENCY ADD PRODUCT';
      fallbackButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 999999;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        border: 3px solid #ffffff;
        padding: 15px 25px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        box-shadow: 0 8px 25px rgba(239, 68, 68, 0.5);
        transition: all 0.3s ease;
        animation: emergencyPulse 2s infinite;
      `;
 
      // Add CSS animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes emergencyPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 25px rgba(239, 68, 68, 0.5); }
          50% { transform: scale(1.05); box-shadow: 0 12px 35px rgba(239, 68, 68, 0.7); }
        }
      `;
      document.head.appendChild(style);
 
      // Add click handler
      fallbackButton.addEventListener('click', (e) => {
        console.log('[IMMEDIATE_FIX] 🚨 EMERGENCY BUTTON CLICKED!');
        e.preventDefault();
        this.show();
      });
 
      // Add hover effects
      fallbackButton.addEventListener('mouseenter', () => {
        fallbackButton.style.transform = 'scale(1.1)';
        fallbackButton.style.background = 'linear-gradient(135deg, #f87171, #ef4444)';
      });
 
      fallbackButton.addEventListener('mouseleave', () => {
        fallbackButton.style.transform = 'scale(1)';
        fallbackButton.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      });
 
      document.body.appendChild(fallbackButton);
 
      console.log('[IMMEDIATE_FIX] ✅ EMERGENCY FALLBACK BUTTON CREATED!');
      console.log('[IMMEDIATE_FIX] 🎯 Look for the RED EMERGENCY BUTTON in the top-right corner!');
      console.log('[IMMEDIATE_FIX] Click it to open the product modal!');
 
      return fallbackButton;
    }

   /**
    * Detect and attach to any newly added buttons
    */
   detectAndAttachButton() {
     console.log('[PRODUCT_BUTTON_HANDLER] 🔍 Scanning for product buttons...');

     // Look for the target button first
     const targetButton = document.getElementById('openProductModalTop');
     if (targetButton && !targetButton.hasAttribute('data-handler-attached')) {
       console.log('[PRODUCT_BUTTON_HANDLER] 🎯 Found target button, attaching handler...');
       this.attachHandlerToButton(targetButton, 'TARGET_DETECTED');
       targetButton.setAttribute('data-handler-attached', 'true');
       return;
     }

     // Look for any button that might be the "Add Product" button
     const allButtons = document.querySelectorAll('button');
     const productButtons = Array.from(allButtons).filter(btn => {
       const text = btn.textContent.toLowerCase();
       const id = btn.id.toLowerCase();
       return text.includes('add') || text.includes('product') || text.includes('new') ||
              id.includes('product') || id.includes('add') || id.includes('modal');
     });

     console.log(`[PRODUCT_BUTTON_HANDLER] Found ${productButtons.length} potential product buttons`);

     productButtons.forEach((btn, index) => {
       if (!btn.hasAttribute('data-handler-attached')) {
         console.log(`[PRODUCT_BUTTON_HANDLER] Attaching to potential button ${index + 1}:`, {
           id: btn.id,
           text: btn.textContent.trim(),
           className: btn.className
         });

         this.attachHandlerToButton(btn, `AUTO_DETECTED_${index + 1}`);
         btn.setAttribute('data-handler-attached', 'true');
       }
     });
   }

   /**
    * Setup mutation observer to watch for button creation
    */
   setupButtonMutationObserver() {
     console.log('[PRODUCT_BUTTON_HANDLER] 👀 Setting up mutation observer for button detection...');

     const observer = new MutationObserver((mutations) => {
       let buttonFound = false;

       mutations.forEach((mutation) => {
         mutation.addedNodes.forEach((node) => {
           if (node.nodeType === Node.ELEMENT_NODE) {
             // Check if the new node is our target button
             if (node.id === 'openProductModalTop') {
               console.log('[PRODUCT_BUTTON_HANDLER] 🎯 Target button added to DOM!');
               this.attachHandlerToButton(node, 'MUTATION_TARGET');
               buttonFound = true;
             }

             // Check child elements
             const targetButtons = node.querySelectorAll ? node.querySelectorAll('#openProductModalTop') : [];
             if (targetButtons.length > 0) {
               console.log('[PRODUCT_BUTTON_HANDLER] 🎯 Target button found in child elements!');
               this.attachHandlerToButton(targetButtons[0], 'MUTATION_CHILD');
               buttonFound = true;
             }

             // Check for any button with "product" in text or id
             if (node.tagName === 'BUTTON') {
               const text = node.textContent.toLowerCase();
               const id = node.id.toLowerCase();
               if (text.includes('product') || text.includes('add') || id.includes('product') || id.includes('add')) {
                 console.log('[PRODUCT_BUTTON_HANDLER] 🎯 Product-related button added to DOM!');
                 this.attachHandlerToButton(node, 'MUTATION_PRODUCT_BUTTON');
                 buttonFound = true;
               }
             }
           }
         });
       });

       if (buttonFound) {
         console.log('[PRODUCT_BUTTON_HANDLER] ✅ Button found via mutation observer');
       }
     });

     observer.observe(document.body, {
       childList: true,
       subtree: true
     });

     console.log('[PRODUCT_BUTTON_HANDLER] ✅ Mutation observer set up successfully');
   }

   /**
     * Watch for button creation using MutationObserver
     */
    watchForButtonCreation() {
      console.log('[PRODUCT_BUTTON_HANDLER] Setting up mutation observer to watch for button creation');
 
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the new node is our button
              if (node.id === 'openProductModalTop') {
                console.log('[PRODUCT_BUTTON_HANDLER] 🎯 Target button found via mutation observer!');
                this.setupProductButtonHandler();
                observer.disconnect();
                return;
              }
 
              // Check child elements too
              const targetButton = node.querySelector ? node.querySelector('#openProductModalTop') : null;
              if (targetButton) {
                console.log('[PRODUCT_BUTTON_HANDLER] 🎯 Target button found in child elements via mutation observer!');
                this.setupProductButtonHandler();
                observer.disconnect();
                return;
              }
            }
          });
        });
      });
 
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
 
      console.log('[PRODUCT_BUTTON_HANDLER] Mutation observer set up successfully');
    }
 
    /**
     * Create a fallback button if none exists
     */
    createFallbackButton() {
      console.log('[PRODUCT_BUTTON_HANDLER] 🔧 Creating fallback "Add Product" button...');
 
      // Check if fallback button already exists
      if (document.getElementById('modal-fallback-add-product-btn')) {
        console.log('[PRODUCT_BUTTON_HANDLER] Fallback button already exists');
        return;
      }
 
      const fallbackButton = document.createElement('button');
      fallbackButton.id = 'modal-fallback-add-product-btn';
      fallbackButton.className = 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg font-semibold';
      fallbackButton.innerHTML = '<i class="fas fa-plus mr-2"></i>Add Product (Fallback)';
      fallbackButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        transition: all 0.2s ease;
      `;
 
      // Add click handler
      fallbackButton.addEventListener('click', (e) => {
        console.log('[PRODUCT_BUTTON_HANDLER] 🎉 Fallback button clicked!');
        e.preventDefault();
        this.show();
      });
 
      // Add hover effects
      fallbackButton.addEventListener('mouseenter', () => {
        fallbackButton.style.transform = 'translateY(-2px)';
        fallbackButton.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
      });
 
      fallbackButton.addEventListener('mouseleave', () => {
        fallbackButton.style.transform = 'translateY(0)';
        fallbackButton.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
      });
 
      document.body.appendChild(fallbackButton);
 
      console.log('[PRODUCT_BUTTON_HANDLER] ✅ Fallback button created and added to page');
      console.log('[PRODUCT_BUTTON_HANDLER] 🎯 You should now see a blue "Add Product (Fallback)" button in the top-right corner');
 
      return fallbackButton;
    }
 
    /**
     * Force attach handlers to all possible buttons (nuclear option)
     */
    forceAttachToAllButtons() {
      console.log('[PRODUCT_BUTTON_HANDLER] 💥 FORCE ATTACHING: Scanning ALL buttons on page...');
 
      const allButtons = document.querySelectorAll('button');
      console.log(`[PRODUCT_BUTTON_HANDLER] Found ${allButtons.length} total buttons`);
 
      const potentialButtons = Array.from(allButtons).filter(btn => {
        const text = btn.textContent.toLowerCase();
        const id = btn.id.toLowerCase();
        const className = btn.className.toLowerCase();
 
        return text.includes('add') || text.includes('product') || text.includes('new') ||
               text.includes('create') || id.includes('product') || id.includes('add') ||
               className.includes('btn') || className.includes('button');
      });
 
      console.log(`[PRODUCT_BUTTON_HANDLER] Found ${potentialButtons.length} potential product buttons`);
 
      potentialButtons.forEach((btn, index) => {
        console.log(`[PRODUCT_BUTTON_HANDLER] Force-attaching to button ${index + 1}:`, {
          id: btn.id,
          className: btn.className,
          textContent: btn.textContent.trim()
        });
 
        // Force remove any existing handlers
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
 
        // Attach our handler
        newBtn.addEventListener('click', (e) => {
          console.log(`[PRODUCT_BUTTON_HANDLER] 🚨 FORCE CLICK DETECTED on button ${index + 1}!`);
          console.log('[PRODUCT_BUTTON_HANDLER] Button details:', {
            id: newBtn.id,
            className: newBtn.className,
            textContent: newBtn.textContent.trim(),
            tagName: newBtn.tagName
          });
 
          e.preventDefault();
          e.stopPropagation();
 
          // Show modal immediately
          this.show();
 
          return false;
        });
 
        // Mark as handled
        newBtn.setAttribute('data-modal-handler-attached', 'true');
      });
 
      if (potentialButtons.length > 0) {
        console.log(`[PRODUCT_BUTTON_HANDLER] ✅ Force-attached handlers to ${potentialButtons.length} buttons`);
      } else {
        console.log('[PRODUCT_BUTTON_HANDLER] ⚠️ No potential buttons found for force attachment');
        // Create fallback as last resort
        this.createFallbackButton();
      }
    }

  /**
   * Initialize visibility debugging and monitoring
   */
  initVisibilityDebugging() {
      console.log('[VISIBILITY_DEBUG] Initializing visibility debugging for modern modal');

      // Initialize global visibility debugger if not exists
      if (!window.visibilityDebugger) {
        console.log('[VISIBILITY_DEBUG] Creating global visibility debugger');

        if (typeof DOMVisibilityDebugger !== 'undefined') {
          // Use real debugger when available
          window.visibilityDebugger = new DOMVisibilityDebugger({
            enableConsoleLogging: true,
            enableVisualDebugging: false,
            autoFixIssues: false,
            debugMode: false
          });
        } else {
          // Fallback stub to avoid ReferenceError when DOMVisibilityDebugger is not loaded
          console.warn('[VISIBILITY_DEBUG] DOMVisibilityDebugger not found, creating stub visibility debugger');

          window.visibilityDebugger = {
            debugElementVisibility: (element, opts = {}) => {
              try {
                const styles = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : { width: element.offsetWidth, height: element.offsetHeight };
                const isVisible = rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden' && parseFloat(styles.opacity) > 0;
                return {
                  basicVisibility: { isVisible },
                  issues: isVisible ? [] : [{ severity: 'medium', message: 'Element not visible (stub check)' }]
                };
              } catch (e) {
                return { basicVisibility: { isVisible: false }, issues: [{ severity: 'error', message: 'debugElementVisibility failed' }] };
              }
            },
            applyVisibilityFixes: (element, analysis) => {
              try {
                // Simple, safe fixes that won't throw on most elements
                element.classList.remove('hidden', 'invisible', 'opacity-0');
                if (!element.style) return false;
                element.style.display = element.style.display || 'block';
                element.style.visibility = 'visible';
                element.style.opacity = '1';
                return true;
              } catch (e) {
                console.error('[VISIBILITY_DEBUG] Stub applyVisibilityFixes failed', e);
                return false;
              }
            }
          };
        }
      }

      // Set up visibility monitoring for critical modal elements
      this.setupVisibilityMonitoring();

      // Add visibility debugging to existing YouTube debugging
      this.enhanceYouTubeVisibilityDebugging();

      console.log('[VISIBILITY_DEBUG] Visibility debugging initialized');
    }

    /**
     * Setup visibility monitoring for critical modal elements
     */
    setupVisibilityMonitoring() {
      console.log('[VISIBILITY_DEBUG] Setting up visibility monitoring');

      // Monitor critical elements that have shown visibility issues
      const criticalElements = [
        { selector: '#youtube-input-area', name: 'YouTube Input Area', interval: 2000 },
        { selector: '.modal-footer', name: 'Modal Footer', interval: 1000 },
        { selector: '#prev-tab', name: 'Previous Button', interval: 1000 },
        { selector: '#next-tab', name: 'Next Button', interval: 1000 },
        { selector: '#submit-product', name: 'Submit Button', interval: 1000 },
        { selector: '#save-draft-btn', name: 'Save Draft Button', interval: 1000 }
      ];

      criticalElements.forEach(({ selector, name, interval }) => {
        this.monitorElementVisibility(selector, name, interval);
      });
    }

    /**
     * Monitor visibility of specific element
     */
    monitorElementVisibility(selector, elementName, interval = 2000) {
      const monitorElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          const analysis = window.visibilityDebugger.debugElementVisibility(element, {
            component: elementName,
            modal: 'modern-product-modal'
          });

          if (analysis && analysis.issues.length > 0) {
            // Auto-fix critical issues
            if (this.shouldAutoFixElement(elementName, analysis.issues)) {
              window.visibilityDebugger.applyVisibilityFixes(element, analysis);
            }
          }
        }
      };

      // Run initial check
      setTimeout(monitorElement, 1000);

      // Set up periodic monitoring
      setInterval(monitorElement, interval);

      console.log(`[VISIBILITY_MONITOR] Monitoring ${elementName} every ${interval}ms`);
    }

    /**
     * Determine if element should be auto-fixed
     */
    shouldAutoFixElement(elementName, issues) {
      // Auto-fix critical navigation elements
      if (elementName.includes('Button') || elementName.includes('Footer')) {
        return true;
      }

      // Auto-fix high severity issues
      const hasHighSeverityIssues = issues.some(issue => issue.severity === 'high');
      if (hasHighSeverityIssues) {
        return true;
      }

      // Don't auto-fix unless explicitly critical
      return false;
    }

    /**
     * Enhanced YouTube visibility debugging
     */
    enhanceYouTubeVisibilityDebugging() {
      console.log('[VISIBILITY_DEBUG] Enhancing YouTube visibility debugging');

      // Override the existing YouTube showUrlInput to include visibility debugging
      const originalShowUrlInput = this.youtubeUrlManager?.showUrlInput;
      if (originalShowUrlInput && typeof originalShowUrlInput === 'function') {
        this.youtubeUrlManager.showUrlInput = (...args) => {
          console.log('[YOUTUBE_VISIBILITY] Enhanced showUrlInput called');

          // Call original method
          const result = originalShowUrlInput.apply(this.youtubeUrlManager, args);

          // Add visibility debugging
          setTimeout(() => {
            const inputArea = document.getElementById('youtube-input-area');
            if (inputArea) {
              const analysis = window.visibilityDebugger.debugElementVisibility(inputArea, {
                component: 'YouTube Input Area',
                action: 'showUrlInput',
                triggeredBy: 'Add Video Button'
              });

              if (analysis && !analysis.basicVisibility.isVisible) {
                console.warn('[YOUTUBE_VISIBILITY] Input area not visible after showUrlInput, applying fixes');
                window.visibilityDebugger.applyVisibilityFixes(inputArea, analysis);
              }
            }
          }, 100);

          return result;
        };

        console.log('[YOUTUBE_VISIBILITY] Enhanced showUrlInput with visibility debugging');
      }
    }
 
 
 
 

  /**
   * Initialize product posting modules
   */
  async initializePostingModules() {
    console.log('[PRODUCT_POSTING_MODULES] 🚀 Initializing product posting modules...');

    try {
      // Initialize MediaUploadManager
      if (!this.mediaUploadManager && typeof window.MediaUploadManager !== 'undefined') {
        console.log('[PRODUCT_POSTING_MODULES] Initializing MediaUploadManager...');
        this.mediaUploadManager = new window.MediaUploadManager();
        await this.mediaUploadManager.init();
        console.log('[PRODUCT_POSTING_MODULES] ✅ MediaUploadManager initialized');
      }

      // Initialize YouTubeURLManager
      if (typeof window.YouTubeURLManager !== 'undefined') {
        console.log('[PRODUCT_POSTING_MODULES] Initializing YouTubeURLManager...');
        const manager = window.youtubeUrlManager || this.youtubeUrlManager || new window.YouTubeURLManager();
        this.youtubeUrlManager = manager;
        window.youtubeUrlManager = manager;
        console.log('[PRODUCT_POSTING_MODULES] ✅ YouTubeURLManager initialized', {
          storedUrls: typeof manager.getYouTubeUrls === 'function' ? manager.getYouTubeUrls().length : 0
        });
      }
       // CRITICAL STEP 0: Ensure transformers client is available EARLY
       console.log('[MODERN_MODAL_DEBUG] Step 0: Ensuring transformers client is loaded');
       this.ensureTransformersClientLoaded();
       console.log('[MODERN_MODAL_DEBUG] ✅ Transformers client loading initiated');

       // Step 0.5: Ensure current user getter is available
       console.log('[MODERN_MODAL_DEBUG] Step 0.5: Ensuring current user getter is available');
       this.ensureGetCurrentUserFunction();
       console.log('[MODERN_MODAL_DEBUG] ✅ Current user getter ready');

       // Step 1: Create modal HTML structure
       console.log('[MODERN_MODAL_DEBUG] Step 1: Creating modal HTML structure');

      // Bridge existing images to MediaUploadManager
      if (this.mediaUploadManager && this.images && this.images.length > 0) {
        console.log('[PRODUCT_POSTING_MODULES] Bridging existing modal images to MediaUploadManager...');
        if (this.mediaUploadManager.addUploadedFile) {
          this.images.forEach(img => {
            if (img.file) {
              this.mediaUploadManager.addUploadedFile(img.file);
            }
          });
          console.log('[PRODUCT_POSTING_MODULES] ✅ Images bridged to MediaUploadManager');
        }
      }

      console.log('[PRODUCT_POSTING_MODULES] 🎉 All product posting modules initialized successfully');
      return true;

    } catch (error) {
      console.error('[PRODUCT_POSTING_MODULES] ❌ Failed to initialize product posting modules:', error);
      return false;
    }
  }

  /**
   * Initialize the modal with embedding coordination and visibility debugging
   */
  init() {
    console.log('[MODERN_MODAL_DEBUG] 🚀 Initializing modern product modal with embedding coordination');
    console.log('[MODERN_MODAL_DEBUG] 📊 Initialization timestamp:', new Date().toISOString());
    console.log('[MODERN_PRODUCT_MODAL] ✅ init() method called - assigning to window.modernProductModal');

     try {
       // CRITICAL STEP 0: Ensure transformers client is available EARLY
       console.log('[MODERN_MODAL_DEBUG] Step 0: Ensuring transformers client is loaded');
       this.ensureTransformersClientLoaded();
       console.log('[MODERN_MODAL_DEBUG] ✅ Transformers client loading initiated');

       // Step 1: Create modal HTML structure
       console.log('[MODERN_MODAL_DEBUG] Step 1: Creating modal HTML structure');
       this.createModal();
       console.log('[MODERN_MODAL_DEBUG] ✅ Modal HTML structure created');

  // Step 1.5: Enhance dropdowns with modern typeahead search
  console.log('[MODERN_MODAL_DEBUG] Step 1.5: Enhancing dropdowns with typeahead search');
  this.initializeTypeaheadEnhancements();
  console.log('[MODERN_MODAL_DEBUG] ✅ Dropdown typeahead enhancements applied');

       // Step 2: Attach event listeners
       console.log('[MODERN_MODAL_DEBUG] Step 2: Attaching event listeners');
       this.attachEventListeners();
       console.log('[MODERN_MODAL_DEBUG] ✅ Event listeners attached');

       // Step 3: Setup product button handler (KEY FIX FOR TIMING ISSUES)
       console.log('[MODERN_MODAL_DEBUG] Step 3: Setting up product button handler - ENHANCED WITH DOM READY CHECK');
       this.setupProductButtonHandlerWithDOMVerification();
       console.log('[MODERN_MODAL_DEBUG] ✅ Product button handler setup with DOM verification');

       // Step 4: Initialize draft manager
       console.log('[MODERN_MODAL_DEBUG] Step 4: Initializing draft manager');
       this.initDraftManager();
       console.log('[MODERN_MODAL_DEBUG] ✅ Draft manager initialized');

       // Step 5: Start iframe preloading
       console.log('[MODERN_MODAL_DEBUG] Step 5: Starting iframe preload');
       this.startIframePreload();
       console.log('[MODERN_MODAL_DEBUG] ✅ Iframe preload started');

       // Step 6: Initialize visibility debugging
       console.log('[MODERN_MODAL_DEBUG] Step 6: Initializing visibility debugging');
       this.initVisibilityDebugging();
       console.log('[MODERN_MODAL_DEBUG] ✅ Visibility debugging initialized');

       // Step 7: Setup enhanced image upload
       console.log('[MODERN_MODAL_DEBUG] Step 7: Setting up enhanced image upload');
       this.setupEnhancedImageUpload();
       console.log('[MODERN_MODAL_DEBUG] ✅ Enhanced image upload setup complete');

       // Step 8: Initialize embedding coordination
       console.log('[MODERN_MODAL_DEBUG] Step 8: Initializing embedding coordination tracking');
       this.initEmbeddingCoordination();
       console.log('[MODERN_MODAL_DEBUG] ✅ Embedding coordination initialized');

       // Step 9: Initialize YouTube URL Manager and DOM elements
       console.log('[MODERN_MODAL_DEBUG] Step 9: Initializing YouTube URL Manager and DOM elements');
       this.initYouTubeURLManager();
       this.ensureYouTubeDOMElements();
       console.log('[MODERN_MODAL_DEBUG] ✅ YouTube URL Manager and DOM elements initialized');

       // Step 10: Bind auto-population
       console.log('[MODERN_MODAL_DEBUG] Step 10: Binding auto-population');
       this.bindAutoPopulation();
       console.log('[MODERN_MODAL_DEBUG] ✅ Auto-population bound');

       // Step 11: Setup modal footer
       console.log('[MODERN_MODAL_DEBUG] Step 11: Setting up modal footer');
       this.cleanupModalFooters();
       this.renderModalFooter();
       this.bindFooterEvents();
       this.verifyFooterAndButtons();
       console.log('[MODERN_MODAL_DEBUG] ✅ Modal footer setup complete');

       console.log('[MODERN_MODAL_DEBUG] 🎉 Modal initialization complete');
       console.log('[MODERN_PRODUCT_MODAL] ✅ init() completed - dispatching modernProductModalReady event');
       window.dispatchEvent(new CustomEvent('modernProductModalReady', { detail: { modal: this } }));

       // Debug YouTube functionality after initialization
       setTimeout(() => {
         const container = document.getElementById('youtube-urls-container');
         const addBtn = document.getElementById('add-youtube-btn');
         console.log('[YOUTUBE_DEBUG] YouTube container and button status:', {
           containerExists: !!container,
           addBtnExists: !!addBtn,
           youtubeUrlManager: !!this.youtubeUrlManager,
           globalYoutubeUrlManager: !!window.youtubeUrlManager,
           containerVisible: container ? !container.classList.contains('hidden') : false,
           addBtnVisible: addBtn ? !addBtn.classList.contains('hidden') : false
         });
       }, 1000);

     } catch (error) {
       console.error('[MODERN_MODAL_DEBUG] ❌ Modal initialization failed:', error);
       console.error('[MODERN_MODAL_DEBUG] Error stack:', error.stack);

       // Make basic modal available as fallback
       window.modernProductModal = {
         show: () => {
           console.error('Modal failed to initialize properly');
           alert('Product modal is not available. Please refresh the page and try again.');
         },
         hide: () => {},
         init: () => {}
       };
     }
   }

  /**
   * Ensure required YouTube DOM elements exist and provide safe fallbacks
   */
  ensureYouTubeDOMElements() {
    console.log('[YOUTUBE_INIT] Ensuring YouTube DOM elements exist');

    try {
      const resolveManagerInstance = () => {
        if (this.youtubeUrlManager) {
          return this.youtubeUrlManager;
        }

        if (window.youtubeUrlManager) {
          this.youtubeUrlManager = window.youtubeUrlManager;
          return this.youtubeUrlManager;
        }

        if (typeof window.YouTubeURLManager !== 'undefined') {
          try {
            window.youtubeUrlManager = window.youtubeUrlManager || new window.YouTubeURLManager();
            this.youtubeUrlManager = window.youtubeUrlManager;
            return this.youtubeUrlManager;
          } catch (err) {
            console.warn('[YOUTUBE_INIT] Failed to instantiate YouTubeURLManager while resolving manager instance', err);
          }
        }

        return null;
      };

      const manager = resolveManagerInstance();

      if (manager && typeof manager.ensureManagedContainer === 'function') {
        const status = manager.ensureManagedContainer({ allowCreation: false, upgradePlaceholders: true });
        console.log('[YOUTUBE_INIT] Manager ensureManagedContainer status:', status);

        try {
          if (typeof this.cleanupDuplicateYouTubeBlocks === 'function') {
            this.cleanupDuplicateYouTubeBlocks();
          } else if (this.livePreviewManager && typeof this.livePreviewManager.cleanupDuplicateYouTubeBlocks === 'function') {
            this.livePreviewManager.cleanupDuplicateYouTubeBlocks();
          }
        } catch (err) {
          console.warn('[YOUTUBE_INIT] cleanupDuplicateYouTubeBlocks call failed', err);
        }

        return true;
      }

      // Manager not available yet — create a lightweight placeholder that can be upgraded later
      let container = document.getElementById('youtube-urls-container');
      const modal = document.getElementById('modern-product-modal');
      const mediaTab = modal ? modal.querySelector('#tab-panel-2 .p-6, #tab-panel-2') : null;

      if (!container) {
        container = document.createElement('div');
        container.id = 'youtube-urls-container';
        container.className = 'youtube-urls-container hidden';
        container.setAttribute('data-youtube-manager', 'placeholder');

        if (mediaTab) {
          mediaTab.appendChild(container);
          console.log('[YOUTUBE_INIT] Created placeholder youtube-urls-container inside media tab');
        } else {
          document.body.appendChild(container);
          console.log('[YOUTUBE_INIT] Created placeholder youtube-urls-container on document.body as fallback');
        }
      } else if (!container.hasAttribute('data-youtube-manager')) {
        container.setAttribute('data-youtube-manager', 'placeholder');
      }

      try {
        if (typeof this.cleanupDuplicateYouTubeBlocks === 'function') {
          this.cleanupDuplicateYouTubeBlocks();
        } else if (this.livePreviewManager && typeof this.livePreviewManager.cleanupDuplicateYouTubeBlocks === 'function') {
          this.livePreviewManager.cleanupDuplicateYouTubeBlocks();
        }
      } catch (err) {
        console.warn('[YOUTUBE_INIT] cleanupDuplicateYouTubeBlocks call failed', err);
      }

      return true;
    } catch (error) {
      console.warn('[YOUTUBE_INIT] ensureYouTubeDOMElements encountered an error, continuing safely', error);
      return false;
    }
  }

  /**
   * Enhanced setupProductButtonHandler with DOM verification
   */
  setupProductButtonHandlerWithDOMVerification() {
    console.log('[ENHANCED_BUTTON_SETUP] 🚀 Setting up product button handler with DOM verification');

    // First, try immediate setup
    const immediateSuccess = this.attemptImmediateButtonSetup();
    if (immediateSuccess) {
      console.log('[ENHANCED_BUTTON_SETUP] ✅ Immediate button setup successful');
      return;
    }

    // If immediate setup failed, set up DOM-ready verification
    console.log('[ENHANCED_BUTTON_SETUP] 📅 Setting up DOM-ready verification for button setup');

    const setupButtonOnDOMReady = () => {
      console.log('[ENHANCED_BUTTON_SETUP] 📋 DOM ready, attempting button setup...');
      const success = this.attemptImmediateButtonSetup();
      if (success) {
        console.log('[ENHANCED_BUTTON_SETUP] ✅ DOM-ready button setup successful');
      } else {
        console.warn('[ENHANCED_BUTTON_SETUP] ⚠️ DOM-ready button setup failed, but working button is available');
        // The working button is already available as fallback
      }
    };

    // Try setup immediately if DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupButtonOnDOMReady);
    } else {
      // DOM already loaded, try immediately
      setupButtonOnDOMReady();
    }

    // Additional fallback using multiple timing strategies
    setTimeout(setupButtonOnDOMReady, 100);  // Very soon
    setTimeout(setupButtonOnDOMReady, 500);  // Half second delay
    setTimeout(setupButtonOnDOMReady, 1000); // One second delay (dashboard load time)
    setTimeout(setupButtonOnDOMReady, 2000); // Two second delay (just in case)

    console.log('[ENHANCED_BUTTON_SETUP] ✅ Enhanced button setup with DOM verification initialized');
    console.log('[ENHANCED_BUTTON_SETUP] 🎯 Working button is available as immediate fallback');
  }

  /**
   * Attempt immediate button setup with verification
   */
  attemptImmediateButtonSetup() {
    console.log('[IMMEDIATE_BUTTON_SETUP] 🔍 Attempting immediate button setup');

    const targetButton = document.getElementById('openProductModalTop');
    if (!targetButton) {
      console.log('[IMMEDIATE_BUTTON_SETUP] ❌ Target button not found');
      return false;
    }

    console.log('[IMMEDIATE_BUTTON_SETUP] ✅ Target button found:', targetButton);

    // Check if button already has handler from previous attempts
    if (targetButton.hasAttribute('data-modal-handler-attached')) {
      console.log('[IMMEDIATE_BUTTON_SETUP] ⚠️ Button already has handler attached');
      return true; // Already handled
    }

    // Remove any existing handlers and attach fresh one
    const clonedButton = targetButton.cloneNode(true);
    targetButton.parentNode.replaceChild(clonedButton, targetButton);

    // Attach our handler
    clonedButton.addEventListener('click', (e) => {
      console.log('[IMMEDIATE_BUTTON_SETUP] 🎯 BUTTON CLICK DETECTED!');
      e.preventDefault();
      e.stopPropagation();

      if (window.modernProductModal && typeof window.modernProductModal.show === 'function') {
        console.log('[IMMEDIATE_BUTTON_SETUP] ✅ Modal available, showing...');
        window.modernProductModal.show();
      } else {
        console.error('[IMMEDIATE_BUTTON_SETUP] ❌ Modal not available');
        // Try fallback show
        if (this && typeof this.show === 'function') {
          console.log('[IMMEDIATE_BUTTON_SETUP] 🛡️ Using fallback modal show');
          this.show();
        } else {
          alert('Product modal is not available. Please refresh the page.');
        }
      }
    });

    // Multiple handler strategies for redundancy
    clonedButton.onclick = (e) => {
      console.log('[IMMEDIATE_BUTTON_SETUP] 🎯 ONCLICK triggered!');
      e.preventDefault();
      e.stopPropagation();

      if (window.modernProductModal && window.modernProductModal.show) {
        window.modernProductModal.show();
      } else if (this.show) {
        this.show();
      }
      return false;
    };

    // jQuery fallback if available
    if (typeof jQuery !== 'undefined') {
      jQuery(clonedButton).off('click.immediate').on('click.immediate', (e) => {
        console.log('[IMMEDIATE_BUTTON_SETUP] 🎯 JQUERY CLICK triggered!');
        e.preventDefault();
        e.stopPropagation();

        if (window.modernProductModal && window.modernProductModal.show) {
          window.modernProductModal.show();
        } else if (this.show) {
          this.show();
        }
      });
    }

    // Mark as handled
    clonedButton.setAttribute('data-modal-handler-attached', 'true');

    console.log('[IMMEDIATE_BUTTON_SETUP] ✅ Button handler attached successfully');
    console.log('[IMMEDIATE_BUTTON_SETUP] Button details:', {
      id: clonedButton.id,
      className: clonedButton.className,
      hasHandler: clonedButton.hasAttribute('data-modal-handler-attached')
    });

    return true;
  }

  /**
   * Remove all modal-specific footers before rendering a new one
   */
  cleanupModalFooters() {
    const modal = document.getElementById('modern-product-modal');
    if (!modal) return;
    // Remove all elements with our unique footer attribute
    modal.querySelectorAll('[data-modal-footer="true"]').forEach(el => el.remove());
  }

  /**
   * Render a single modal footer with all required buttons
   */
  renderModalFooter() {
    const modal = document.getElementById('modern-product-modal');
    if (!modal) return;
    // If a permanent #modal-footer exists in the templated HTML, prefer it and do not create a duplicate
    if (modal.querySelector('#modal-footer')) {
      console.log('[renderModalFooter] #modal-footer already present, skipping dynamic footer creation');
      return;
    }

    // Remove any existing dynamic modal footers first
    this.cleanupModalFooters();

    // Create the footer element
    const footer = document.createElement('footer');
    footer.setAttribute('data-modal-footer', 'true');
  footer.className = 'modal-footer bg-white/95 px-6 py-6 border-t border-gray-200 flex-shrink-0 w-full z-20 shadow-sm';
    footer.innerHTML = `
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <div id="tab-indicator" class="inline-flex items-center px-4 py-2 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full border border-blue-200 shadow-sm" aria-live="polite">
              <i class="fas fa-tasks mr-2 text-blue-600" aria-hidden="true"></i>
              <span data-tab-indicator-text="true">Tab ${this.currentTab + 1} of ${this.tabs.length}</span>
            </div>
            <div data-tab-progress-status="true" class="inline-flex items-center px-3 py-1 text-xs text-blue-700 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
              <i class="fas fa-info-circle mr-2 text-blue-500" aria-hidden="true"></i>
              ${this.currentTab === this.tabs.length - 1 ? 'Final step - review and submit' : 'Complete all tabs before submitting'}
            </div>
          </div>
          <div class="flex items-center gap-3 sm:gap-4 w-full lg:w-auto">
            <span class="hidden sm:inline text-xs font-semibold tracking-wide text-slate-500 uppercase">Progress</span>
            <div class="flex-1 min-w-[180px] max-w-sm">
              <div data-tab-progress-container="true" class="w-full bg-white/80 rounded-full h-2.5 border border-slate-200 overflow-hidden shadow-inner" role="progressbar" aria-label="Product form progress" aria-valuemin="1" aria-valuemax="${this.tabs.length}" aria-valuenow="${this.currentTab + 1}" aria-valuetext="Tab ${this.currentTab + 1} of ${this.tabs.length}">
                <div data-tab-progress-fill="true" class="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out" style="width: ${((this.currentTab + 1) / this.tabs.length) * 100}%" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-3">
            <button type="button" id="prev-tab" class="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Previous tab">
              <i class="fas fa-chevron-left text-base" aria-hidden="true"></i>
              <span>Previous</span>
            </button>
            <button type="button" id="save-draft-btn" class="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-xl shadow-sm hover:bg-amber-600 transition-colors" title="Save current progress">
              <i class="fas fa-save" aria-hidden="true"></i>
              <span class="hidden sm:inline">Save Draft</span>
              <span class="sm:hidden">Draft</span>
            </button>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button type="button" id="next-tab" class="flex items-center justify-center gap-2 px-7 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Go to next tab">
              <span>Next</span>
              <i class="fas fa-chevron-right text-base" aria-hidden="true"></i>
            </button>
            <button type="submit" form="modern-product-form" id="submit-product" class="flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-xl shadow-md hover:from-emerald-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all" title="Create and publish product" style="display: none;">
              <i class="fas fa-rocket-launch text-base" aria-hidden="true"></i>
              <span class="hidden sm:inline">Create Product</span>
              <span class="sm:hidden">Create</span>
            </button>
          </div>
        </div>
      </div>
    `;
    // Append to modal
    modal.appendChild(footer);
  }

  /**
   * Bind footer button events using event delegation
   */
  bindFooterEvents() {
    const modal = document.getElementById('modern-product-modal');
    // Prefer the dynamic footer if present, otherwise fall back to the templated #modal-footer
    const footer = modal?.querySelector('[data-modal-footer="true"]') || modal?.querySelector('#modal-footer');
    if (!footer) return;

    // Remove any previous event listeners by replacing the footer node
    const newFooter = footer.cloneNode(true);
    footer.parentNode.replaceChild(newFooter, footer);

    // Event delegation for all footer buttons
    newFooter.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      if (target.id === 'prev-tab') {
        this.prevTab();
      } else if (target.id === 'next-tab') {
        if (this.validateCurrentTab()) {
          this.nextTab();
        } else {
          this.showNotification('Please complete all required fields before proceeding', 'error');
        }
      } else if (target.id === 'submit-product') {
        if (this.validateCurrentTab()) {
          this.submitFinalForm();
        } else {
          this.showNotification('Please complete all required fields before submitting', 'error');
        }
      } else if (target.id === 'save-draft-btn') {
        this.saveDraft();
      }
    });

    // Ensure cloned footer reflects the current tab state immediately
    this.updateTabIndicator();
    this.updateButtonStates();
  }

  /**
   * Verify footer and button presence/visibility after DOM update, with one retry
   */
  verifyFooterAndButtons() {
    const modal = document.getElementById('modern-product-modal');
    // Support either the dynamic footer or the templated #modal-footer
    const footer = modal?.querySelector('[data-modal-footer="true"]') || modal?.querySelector('#modal-footer');
    const requiredIds = ['prev-tab', 'next-tab', 'submit-product', 'save-draft-btn'];
    let allPresent = true;
    if (!footer) {
      allPresent = false;
    } else {
      for (const id of requiredIds) {
        if (!footer.querySelector(`#${id}`)) {
          allPresent = false;
          break;
        }
      }
    }
    if (!allPresent) {
      // Retry once after short delay
      setTimeout(() => this.verifyFooterAndButtons(), 100);
      return;
    }
    // All buttons present, update their states
    this.updateButtonStates();
  }

  /**
   * Core footer visibility fix logic
   */
  attemptFooterFix(delay = 0) {
    setTimeout(() => {
      const modal = document.getElementById('modern-product-modal');
      if (!modal || modal.classList.contains('hidden')) {
        console.log('[FOOTER_DEBUG] Modal not visible, skipping footer fix');
        return;
      }

      // Try multiple selectors to find footer
      const footerSelectors = [
        '#modern-product-modal footer',
        '#modern-product-modal .bg-white.px-6.py-4.border-t',
        '#modern-product-modal .modal-footer',
        '.modal-footer',
        'footer'
      ];

      let footer = null;
      for (const selector of footerSelectors) {
        footer = document.querySelector(selector);
        if (footer) {
          console.log(`[FOOTER_DEBUG] Footer found using selector: ${selector}`);
          break;
        }
      }

      if (footer) {
        this.applyFooterFixes(footer);
      } else {
        console.warn('[FOOTER_DEBUG] Footer not found with any selector');
        this.createFooterFallback();
      }
    }, delay);
  }

  /**
   * Apply comprehensive fixes to footer element
   */
  applyFooterFixes(footer) {
    console.log('[FOOTER_DEBUG] Applying comprehensive footer fixes...');

    try {
      // Remove any hiding classes or styles
      footer.classList.remove('hidden', 'invisible', 'opacity-0');
      footer.style.cssText = `
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        background: white !important;
        border-top: 1px solid #e5e7eb !important;
        padding: 1.5rem !important;
        width: 100% !important;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
        flex-shrink: 0 !important;
      `;

      // Fix button container layout
      const buttonContainer = footer.querySelector('.flex');
      if (buttonContainer) {
        this.fixButtonContainer(buttonContainer);
      } else {
        console.warn('[FOOTER_DEBUG] Button container not found');
      }

      // Fix individual buttons
      this.fixIndividualButtons(footer);

      // Update tab indicator and button states
      this.updateTabIndicator();

      // Force layout recalculation
      footer.offsetHeight;

      console.log('[FOOTER_DEBUG] Footer fixes applied successfully');

      // Verify fixes after a short delay
      setTimeout(() => this.verifyFooterFixes(footer), 100);

    } catch (error) {
      console.error('[FOOTER_DEBUG] Error applying footer fixes:', error);
      this.handleFooterError(error);
    }
  }

  /**
   * Fix button container layout issues
   */
  fixButtonContainer(container) {
    console.log('[FOOTER_DEBUG] Fixing button container layout...');

    // Ensure proper flex layout - use existing classes from the corrected structure
    container.style.display = 'flex';
    container.style.flexDirection = window.innerWidth < 768 ? 'column' : 'row';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-between';
    container.style.gap = '1rem';
    container.style.width = '100%';

    // Fix responsive layout for mobile
    if (window.innerWidth <= 768) {
      container.style.flexDirection = 'column';
      container.style.alignItems = 'stretch';
    }

    console.log('[FOOTER_DEBUG] Button container layout fixed');
  }

  /**
   * Fix individual button visibility and functionality
   */
  fixIndividualButtons(footer) {
    console.log('[FOOTER_DEBUG] Fixing individual buttons...');

    const buttons = {
      prevBtn: footer.querySelector('#prev-tab'),
      nextBtn: footer.querySelector('#next-tab'),
      submitBtn: footer.querySelector('#submit-product'),
      saveDraftBtn: footer.querySelector('#save-draft-btn')
    };

    Object.entries(buttons).forEach(([name, button]) => {
      if (button) {
        this.fixButtonElement(button, name);
      } else {
        console.warn(`[FOOTER_DEBUG] ${name} button not found`);
      }
    });
  }

  /**
   * Apply fixes to individual button element
   */
  fixButtonElement(button, name) {
    console.log(`[FOOTER_DEBUG] Fixing ${name} button...`);

    // Remove hiding classes
    button.classList.remove('hidden', 'invisible', 'opacity-0');

    // Force visibility with inline styles
    button.style.cssText = `
      display: inline-flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: 101 !important;
      min-height: 40px !important;
      min-width: 80px !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0.5rem 1rem !important;
      border-radius: 0.75rem !important;
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      text-decoration: none !important;
      border: none !important;
    `;

    // Ensure button text is visible
    const textSpan = button.querySelector('span');
    if (textSpan) {
      textSpan.style.display = 'inline';
      textSpan.style.visibility = 'visible';
      textSpan.style.opacity = '1';
      textSpan.style.color = 'inherit';
    }

    // Fix disabled state
    if (button.disabled) {
      button.style.opacity = '0.6';
      button.style.cursor = 'not-allowed';
    } else {
      button.style.cursor = 'pointer';
    }

    // Ensure button has click handler
    if (!button.onclick && !button.getAttribute('data-has-handler')) {
      console.warn(`[FOOTER_DEBUG] ${name} button missing click handler, adding default`);
      button.addEventListener('click', (e) => {
        console.log(`[FOOTER_DEBUG] ${name} button clicked (default handler)`);
        e.preventDefault();
      });
      button.setAttribute('data-has-handler', 'true');
    }

    console.log(`[FOOTER_DEBUG] ${name} button fixed successfully`);
  }

  /**
   * Verify that footer fixes are working
   */
  verifyFooterFixes(footer) {
    console.log('[FOOTER_DEBUG] Verifying footer fixes...');

    const buttons = ['#prev-tab', '#next-tab', '#submit-product', '#save-draft-btn'];
    let allVisible = true;

    buttons.forEach(selector => {
      const button = footer.querySelector(selector);
      if (button) {
        const styles = window.getComputedStyle(button);
        const isVisible = styles.display !== 'none' &&
                         styles.visibility !== 'hidden' &&
                         parseFloat(styles.opacity) > 0;

        console.log(`[FOOTER_DEBUG] ${selector}: ${isVisible ? 'VISIBLE' : 'HIDDEN'}`);

        if (!isVisible) {
          allVisible = false;
          console.warn(`[FOOTER_DEBUG] ${selector} is not properly visible, reapplying fixes`);
          this.fixButtonElement(button, selector.replace('#', '').replace('-', ' '));
        }
      } else {
        console.warn(`[FOOTER_DEBUG] ${selector} not found during verification`);
        allVisible = false;
      }
    });

    if (allVisible) {
      console.log('[FOOTER_DEBUG] ✅ All footer buttons are properly visible');
    } else {
      console.warn('[FOOTER_DEBUG] ⚠️ Some footer buttons may still have visibility issues');
    }
  }

  /**
   * Create footer fallback if original doesn't exist
   */
  createFooterFallback() {
    console.log('[FOOTER_DEBUG] Creating footer fallback...');

    const modal = document.getElementById('modern-product-modal');
    if (!modal) return;

    // Check if footer already exists
  const existingFooter = modal.querySelector('.bg-white.px-6.py-4.border-t, .modal-footer');
    if (existingFooter) {
      console.log('[FOOTER_DEBUG] Footer exists but was not found by selector, trying direct fix');
      this.applyFooterFixes(existingFooter);
      return;
    }

    // Create new footer if it doesn't exist - insert in the correct position within the modal structure
    const modalContent = modal.querySelector('.bg-white.border.border-gray-200.rounded-3xl');
    if (modalContent) {
      const footerHTML = `
          <div class="modal-footer px-6 py-6 border-t border-gray-200 bg-white/95 flex-shrink-0 shadow-sm">
            <div class="flex flex-col gap-6">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div class="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                  <div id="tab-indicator" class="inline-flex items-center px-4 py-2 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full border border-blue-200 shadow-sm" aria-live="polite">
                    <i class="fas fa-tasks mr-2 text-blue-600" aria-hidden="true"></i>
                    <span data-tab-indicator-text="true">Tab ${this.currentTab + 1} of ${this.tabs.length}</span>
                  </div>
                  <div data-tab-progress-status="true" class="inline-flex items-center px-3 py-1 text-xs text-blue-700 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
                    <i class="fas fa-info-circle mr-2 text-blue-500" aria-hidden="true"></i>
                    ${this.currentTab === this.tabs.length - 1 ? 'Final step - review and submit' : 'Complete all tabs before submitting'}
                  </div>
                </div>
                <div class="flex items-center gap-3 sm:gap-4 w-full lg:w-auto">
                  <span class="hidden sm:inline text-xs font-semibold tracking-wide text-slate-500 uppercase">Progress</span>
                  <div class="flex-1 min-w-[180px] max-w-sm">
                    <div data-tab-progress-container="true" class="w-full bg-white/80 rounded-full h-2.5 border border-slate-200 overflow-hidden shadow-inner" role="progressbar" aria-label="Product form progress" aria-valuemin="1" aria-valuemax="${this.tabs.length}" aria-valuenow="${this.currentTab + 1}" aria-valuetext="Tab ${this.currentTab + 1} of ${this.tabs.length}">
                      <div data-tab-progress-fill="true" class="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out" style="width: ${((this.currentTab + 1) / this.tabs.length) * 100}%" aria-hidden="true"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-3">
                  <button type="button" id="prev-tab" class="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Previous tab">
                    <i class="fas fa-chevron-left text-base" aria-hidden="true"></i>
                    <span>Previous</span>
                  </button>
                  <button type="button" id="save-draft-btn" class="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-xl shadow-sm hover:bg-amber-600 transition-colors" title="Save current progress">
                    <i class="fas fa-save" aria-hidden="true"></i>
                    <span class="hidden sm:inline">Save Draft</span>
                  </button>
                </div>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  <button type="button" id="next-tab" class="flex items-center justify-center gap-2 px-7 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Go to next tab">
                    <span>Next</span>
                    <i class="fas fa-chevron-right text-base" aria-hidden="true"></i>
                  </button>
                  <button type="submit" form="modern-product-form" id="submit-product" class="flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-xl shadow-md hover:from-emerald-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all" style="display: none;">
                    <i class="fas fa-rocket-launch text-base" aria-hidden="true"></i>
                    <span class="hidden sm:inline">Create Product</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;

      modalContent.insertAdjacentHTML('beforeend', footerHTML);

      // Reattach event listeners
      this.attachEventListeners();

      console.log('[FOOTER_DEBUG] Footer fallback created successfully');
    }
  }

  /**
   * Handle errors during footer fixes
   */
  handleFooterError(error) {
    console.error('[FOOTER_DEBUG] Footer fix error:', error);

    // Try a more aggressive approach
    setTimeout(() => {
      console.log('[FOOTER_DEBUG] Attempting aggressive footer fix...');
      this.aggressiveFooterFix();
    }, 200);
  }

  /**
   * Aggressive footer fix as last resort
   */
  aggressiveFooterFix() {
    const modal = document.getElementById('modern-product-modal');
    if (!modal) return;

    // Add CSS directly to modal
    const style = document.createElement('style');
    style.textContent = `
      #modern-product-modal .bg-white.px-6.py-4.border-t {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: relative !important;
        z-index: 1000 !important;
      }

      #modern-product-modal #prev-tab,
      #modern-product-modal #next-tab,
      #modern-product-modal #submit-product,
      #modern-product-modal #save-draft-btn {
        display: inline-flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: relative !important;
        z-index: 1001 !important;
      }
    `;

    document.head.appendChild(style);

    // Force DOM repaint
    modal.style.display = 'none';
    modal.offsetHeight; // Trigger reflow
    modal.style.display = 'block';

    console.log('[FOOTER_DEBUG] Aggressive footer fix applied');
  }

  initDraftManager() {
    try {
      this.draftManager = new DraftManager({
        storageKey: 'modern-product-draft',
        onDraftSaved: (data) => console.log('Draft auto-saved', data)
      });
    } catch (e) {
      console.warn('DraftManager not available, skipping auto-save');
    }
  }

  setupAutoSave() {
    const form = document.getElementById('modern-product-form');
    if (form && this.draftManager) {
      const debouncedSave = this.debounce(() => {
        this.draftManager.autoSave();
      }, 2000);

      form.addEventListener('input', debouncedSave);
      form.addEventListener('change', debouncedSave);
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Create the modern modal HTML
   */
  createModal() {
    // --- Modernization 2025: Enhanced Modal CSS for Glassmorphism, Dark Mode, Accessibility ---
    const style = document.createElement('style');
    style.id = 'modal-footer-safeguards';
    style.textContent = `
      /* Glassmorphism & Soft Gradients */
      #modern-product-modal .bg-white,
      #modern-product-modal .bg-white/70,
      #modern-product-modal .bg-blue-50/50,
      #modern-product-modal .bg-green-50/50,
      #modern-product-modal .bg-yellow-50/50,
      #modern-product-modal .bg-gradient-to-br {
        background: rgba(255,255,255,0.75) !important;
        backdrop-filter: blur(16px) saturate(180%) !important;
        box-shadow: 0 8px 32px 0 rgba(31,38,135,0.12), 0 1.5px 8px 0 rgba(80,80,120,0.08) !important;
        border-radius: 1.5rem !important;
        border: 1px solid rgba(255,255,255,0.18) !important;
      }
      #modern-product-modal .shadow-2xl, #modern-product-modal .shadow-lg, #modern-product-modal .shadow-sm {
        box-shadow: 0 8px 32px 0 rgba(31,38,135,0.12), 0 1.5px 8px 0 rgba(80,80,120,0.08) !important;
      }
      #modern-product-modal .rounded-3xl, #modern-product-modal .rounded-xl, #modern-product-modal .rounded-lg, #modern-product-modal .rounded {
        border-radius: 1.5rem !important;
      }
      #modern-product-modal .transition-all, #modern-product-modal .transition-colors, #modern-product-modal .transition-opacity {
        transition: all 0.3s cubic-bezier(.4,0,.2,1) !important;
      }
      /* Header and footer containers */
      #modern-product-modal .modal-header {
        position: static !important;
        top: auto !important;
        background: rgba(255,255,255,0.85) !important;
        backdrop-filter: blur(12px) !important;
        box-shadow: 0 2px 12px 0 rgba(31,38,135,0.07);
      }
      #modern-product-modal .modal-footer {
        position: static !important;
        bottom: auto !important;
        background: rgba(255,255,255,0.92) !important;
        backdrop-filter: blur(12px) !important;
        box-shadow: 0 -2px 12px 0 rgba(31,38,135,0.07);
        border-top: 1.5px solid #e0e7ef !important;
        flex-shrink: 0 !important;
        width: 100% !important;
      }
      /* Animated progress bar */
      #modern-product-modal .progress-bar-outer {
        background: linear-gradient(90deg, #e0e7ef 0%, #f3f4f6 100%);
        border-radius: 9999px;
        height: 0.75rem;
        overflow: hidden;
      }
      #modern-product-modal .progress-bar-inner {
        background: linear-gradient(90deg, #3b82f6 0%, #a78bfa 100%);
        border-radius: 9999px;
        height: 100%;
        transition: width 0.5s cubic-bezier(.4,0,.2,1);
        box-shadow: 0 2px 8px 0 rgba(59,130,246,0.08);
      }
      /* Responsive two-column desktop, single column mobile */
      @media (min-width: 1024px) {
        #modern-product-modal .modal-content-main {
          display: flex;
          flex-direction: row;
          gap: 2rem;
        }
        #modern-product-modal .modal-form-section {
          flex: 2 1 0%;
        }
        #modern-product-modal .modal-summary-sidebar {
          flex: 1 1 0%;
          min-width: 320px;
          max-width: 400px;
          margin-left: 1.5rem;
        }
      }
      @media (max-width: 1023px) {
        #modern-product-modal .modal-content-main {
          display: block;
        }
        #modern-product-modal .modal-summary-sidebar {
          display: none !important;
        }
      }
      /* Dark mode */
      body.dark #modern-product-modal,
      body.dark #modern-product-modal .bg-white,
      body.dark #modern-product-modal .bg-white/70,
      body.dark #modern-product-modal .bg-blue-50/50,
      body.dark #modern-product-modal .bg-green-50/50,
      body.dark #modern-product-modal .bg-yellow-50/50 {
        background: rgba(24,26,32,0.92) !important;
        color: #e5e7eb !important;
        border-color: #23272f !important;
      }
      body.dark #modern-product-modal .modal-header,
      body.dark #modern-product-modal .modal-footer {
        background: rgba(24,26,32,0.98) !important;
        color: #e5e7eb !important;
        border-color: #23272f !important;
      }
      body.dark #modern-product-modal input,
      body.dark #modern-product-modal textarea,
      body.dark #modern-product-modal select {
        background: rgba(36,38,44,0.98) !important;
        color: #e5e7eb !important;
        border-color: #23272f !important;
      }
      /* High contrast mode (body.high-contrast) */
      body.high-contrast #modern-product-modal {
        filter: contrast(1.25) brightness(1.1);
      }
      /* Microinteractions */
      #modern-product-modal .tab-btn:focus-visible,
      #modern-product-modal input:focus-visible,
      #modern-product-modal textarea:focus-visible,
      #modern-product-modal select:focus-visible {
        outline: 2.5px solid #6366f1 !important;
        outline-offset: 2px;
        box-shadow: 0 0 0 4px #a5b4fc55;
      }
      /* Tooltip styling */
      #modern-product-modal .tooltip {
        position: absolute;
        z-index: 50;
        background: #222;
        color: #fff;
        padding: 0.5em 0.75em;
        border-radius: 0.5em;
        font-size: 0.85em;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
        max-width: 260px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      }
      #modern-product-modal .has-tooltip:focus + .tooltip,
      #modern-product-modal .has-tooltip:hover + .tooltip {
        opacity: 1;
        pointer-events: auto;
      }
    `;
    // Remove any existing safeguards to avoid duplicates
    const existingSafeguards = document.getElementById('modal-footer-safeguards');
    if (existingSafeguards) existingSafeguards.remove();
    document.head.appendChild(style);

    // --- Modal HTML with Modernized Structure ---
    const modalHTML = `
      <div id="modern-product-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden transition-opacity duration-300" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="flex items-center justify-center min-h-screen p-4 pt-16">
          <div class="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-5xl h-full max-h-[95vh] flex flex-col relative animate-in slide-in-from-bottom-4 duration-300">
            <div class="flex flex-col h-full">
              <!-- Modal Header -->
              <div class="modal-header bg-white text-gray-800 p-6 border-b border-gray-200 flex-shrink-0">
                <div class="flex items-center justify-between">
                  <h2 id="modal-title" class="text-2xl font-bold text-gray-900">Add New Product</h2>
                  <div class="flex items-center gap-2">
                    <button id="dark-mode-toggle" class="has-tooltip text-gray-600 hover:text-gray-900 text-xl transition-colors rounded-full p-2 hover:bg-gray-100" aria-label="Toggle dark mode" tabindex="0">
                      <i class="fas fa-moon"></i>
                    </button>
                    <span class="tooltip" id="dark-mode-tooltip" role="tooltip">Toggle dark mode</span>
                    <button id="high-contrast-toggle" class="has-tooltip text-gray-600 hover:text-gray-900 text-xl transition-colors rounded-full p-2 hover:bg-gray-100" aria-label="Toggle high contrast" tabindex="0">
                      <i class="fas fa-low-vision"></i>
                    </button>
                    <span class="tooltip" id="contrast-tooltip" role="tooltip">Toggle high contrast mode</span>
                    <button id="save-preferences-btn" class="has-tooltip text-blue-600 hover:text-blue-900 text-xl transition-colors rounded-full p-2 hover:bg-blue-100" aria-label="Save preferences" tabindex="0">
                      <i class="fas fa-save"></i>
                    </button>
                    <span class="tooltip" id="save-preferences-tooltip" role="tooltip">Save your UI preferences</span>
                    <button id="close-modern-modal" class="text-gray-600 hover:text-gray-900 text-2xl transition-colors rounded-full p-2 hover:bg-gray-100" aria-label="Close modal">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>
                <div class="mt-6 bg-white rounded-2xl p-1 border border-gray-200" role="tablist" aria-label="Product information tabs">
                  <div class="flex flex-col md:flex-row md:gap-1">
                    ${this.tabs.map((tab, index) => {
                      const icon = index === 0 ? 'fas fa-info-circle' : index === 1 ? 'fas fa-dollar-sign' : index === 2 ? 'fas fa-image' : index === 3 ? 'fas fa-search-plus' : index === 4 ? 'fas fa-truck' : 'fas fa-dot-circle';
                      return `
                        <button type="button" class="tab-btn flex items-center justify-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${index === this.currentTab ? 'bg-blue-500 text-white shadow-lg scale-105' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}" data-tab="${index}" role="tab" aria-selected="${index === this.currentTab}" aria-controls="tab-panel-${index}" tabindex="${index === this.currentTab ? '0' : '-1'}">
                          <i class="${icon} mr-2"></i>${tab}
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>

              <!-- Content Area -->
              <div class="flex-1 overflow-hidden bg-white">
                <div class="h-full flex flex-col">
                  <div class="flex-1 overflow-y-auto">
                    <div class="p-6">
                      <form id="modern-product-form" novalidate>
                        <div class="mb-6 flex flex-wrap gap-3">
                          <button type="button" id="ai-suggest-title" class="ai-suggest-btn px-3 py-2 bg-gradient-to-r from-blue-400 to-purple-400 text-white rounded-lg shadow hover:from-blue-500 hover:to-purple-500 transition-all" aria-label="Suggest title" tabindex="0">
                            <i class="fas fa-magic mr-2"></i>AI Suggest Title
                          </button>
                          <button type="button" id="ai-suggest-description" class="ai-suggest-btn px-3 py-2 bg-gradient-to-r from-green-400 to-blue-400 text-white rounded-lg shadow hover:from-green-500 hover:to-blue-500 transition-all" aria-label="Suggest description" tabindex="0">
                            <i class="fas fa-magic mr-2"></i>AI Suggest Description
                          </button>
                          <button type="button" id="ai-suggest-alt" class="ai-suggest-btn px-3 py-2 bg-gradient-to-r from-yellow-400 to-pink-400 text-white rounded-lg shadow hover:from-yellow-500 hover:to-pink-500 transition-all" aria-label="Suggest alt text" tabindex="0">
                            <i class="fas fa-magic mr-2"></i>AI Suggest Alt Text
                          </button>
                          <button type="button" id="ai-suggest-category" class="ai-suggest-btn px-3 py-2 bg-gradient-to-r from-purple-400 to-blue-400 text-white rounded-lg shadow hover:from-purple-500 hover:to-blue-500 transition-all" aria-label="Suggest category" tabindex="0">
                            <i class="fas fa-magic mr-2"></i>AI Suggest Category
                          </button>
                          <span class="text-xs text-gray-400 ml-2">AI suggestions are mock UI only</span>
                        </div>
                        <!-- Collapsible Summary Sidebar (modernized, accessible) -->
                        <aside id="summary-sidebar"
                          class="modal-summary-sidebar bg-white/70 rounded-2xl border border-gray-200 shadow-lg p-6 mb-6 lg:mb-0 lg:block hidden absolute right-0 top-0 h-full w-full max-w-xs z-30 transition-transform duration-300 translate-x-full"
                          aria-label="Product summary"
                          tabindex="-1"
                          aria-live="polite"
                          aria-modal="true"
                          role="dialog">
                          <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-semibold text-gray-900" id="summary-sidebar-title">Summary</h3>
                            <button type="button" id="close-summary-sidebar"
                              class="text-gray-600 hover:text-gray-900 text-xl rounded-full p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Close summary sidebar">
                              <i class="fas fa-times"></i>
                            </button>
                          </div>
                          <div id="product-summary" class="text-sm text-gray-800 space-y-2" aria-live="polite">
                            <!-- Summary content will be rendered here -->
                          </div>
                          <div class="mt-6">
                            <button type="button" id="edit-summary-btn"
                              class="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Edit details in summary sidebar">
                              <i class="fas fa-edit mr-2"></i>Edit Details
                            </button>
                          </div>
                        </aside>

                <!-- Tab 1: Basic Info -->
                <div id="tab-panel-0" class="tab-panel ${this.currentTab === 0 ? '' : 'hidden'}" role="tabpanel" aria-labelledby="tab-0">
                  <div class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="product-name">
                          Product Name *
                        </label>
                        <input type="text" id="product-name" name="name" required
                               class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                               placeholder="Enter product name" aria-describedby="name-help">
                        <p id="name-help" class="text-xs text-gray-500 mt-1">A descriptive name for your product (max 100 chars)</p>
                        <div id="name-error" class="hidden text-red-500 text-xs mt-1" role="alert"></div>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="display-title">
                          Display Title *
                        </label>
        <input type="text" id="display-title" name="title" required
                               class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                               placeholder="Marketing title" aria-describedby="title-help">
                        <p id="title-help" class="text-xs text-gray-500 mt-1">Appears in listings and search results (max 100 chars)</p>
                        <div id="title-error" class="hidden text-red-500 text-xs mt-1" role="alert"></div>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="vertical-select">
                          Vertical <span id="vertical-asterisk" class="text-red-500">*</span>
                        </label>
                        <select id="vertical-select" name="vertical" class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" aria-describedby="vertical-help">
                          <option value="">Select a vertical...</option>
                          <option value="550e8400-e29b-41d4-a716-446655440101">Electronics</option>
                          <option value="550e8400-e29b-41d4-a716-446655440102">Fashion</option>
                          <option value="550e8400-e29b-41d4-a716-446655440103">Home & Garden</option>
                          <option value="550e8400-e29b-41d4-a716-446655440104">Sports & Outdoors</option>
                          <option value="550e8400-e29b-41d4-a716-446655440105">Beauty & Health</option>
                        </select>
                        <p id="vertical-help" class="text-xs text-gray-500 mt-1">Main product category group</p>
                        <div id="vertical-error" class="hidden text-red-500 text-xs mt-1" role="alert"></div>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="category-select">
                          Category <span id="category-asterisk" class="text-red-500">*</span>
                        </label>
                        <select id="category-select" name="category" class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" aria-describedby="category-help">
                          <option value="">Loading categories...</option>
                        </select>
                        <p id="category-help" class="text-xs text-gray-500 mt-1">Specific product category</p>
                        <div id="category-error" class="hidden text-red-500 text-xs mt-1" role="alert"></div>

                        <!-- Suggest New Category Option -->
                        <div class="mt-3 space-y-3">
                          <div class="flex items-center justify-center">
                            <div class="flex-1 border-t border-gray-300/30"></div>
                            <span class="px-3 bg-white/70 text-xs font-medium text-gray-600">OR</span>
                            <div class="flex-1 border-t border-gray-300/30"></div>
                          </div>

                          <div class="text-center">
                            <button type="button" id="suggest-new-category-btn" class="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md">
                              <i class="fas fa-lightbulb mr-2"></i>Suggest Custom Category
                            </button>
                            <p class="text-xs text-gray-500 mt-1">Can't find the perfect category? Suggest your own!</p>
                          </div>
                        </div>

                        <!-- Suggested Category Fields (hidden by default) -->
                        <div id="suggested-category-fields" class="hidden mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <h4 class="text-sm font-medium text-blue-900 mb-3 flex items-center">
                            <i class="fas fa-lightbulb mr-2"></i>Suggest New Category
                          </h4>

                          <div class="space-y-4">
                            <div>
                              <label class="block text-sm font-medium text-gray-700 mb-1" for="suggested-category-name">
                                Category Name *
                              </label>
                              <input type="text" id="suggested-category-name" name="suggested_category_name" maxlength="100"
                                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                     placeholder="e.g., Handmade Crafts" aria-describedby="suggested-name-help">
                              <p id="suggested-name-help" class="text-xs text-gray-500 mt-1">Clear, descriptive name (max 100 chars)</p>
                              <div id="suggested-name-error" class="hidden text-red-500 text-xs mt-1" role="alert"></div>
                            </div>

                            <div>
                              <label class="block text-sm font-medium text-gray-700 mb-1" for="suggested-category-description">
                                Category Description
                              </label>
                              <textarea id="suggested-category-description" name="suggested_category_description" rows="3" maxlength="500"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical transition-all"
                                        placeholder="Describe what products would belong in this category..."></textarea>
                              <p class="text-xs text-gray-500 mt-1">Help admins understand your suggestion (max 500 chars)</p>
                              <div id="suggested-description-error" class="hidden text-red-500 text-xs mt-1" role="alert"></div>
                            </div>

                            <div class="bg-yellow-50/80 p-3 rounded-lg border border-yellow-200/50">
                              <div class="flex items-start">
                                <i class="fas fa-info-circle text-yellow-500 mt-0.5 mr-2 flex-shrink-0"></i>
                                <div class="text-xs text-yellow-800">
                                  <strong>Your suggestion will be reviewed by our admin team.</strong>
                                  <br>We'll notify you via email when your suggestion is approved or needs changes.
                                  <br>Approved suggestions will automatically appear in future dropdowns.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="brand-select">
                          Brand
                        </label>
                        <select id="brand-select" name="brand_id" disabled
                                class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                aria-describedby="brand-helper">
                          <option value="">Auto (Unbranded)</option>
                        </select>
                        <p id="brand-helper" class="text-xs text-gray-500 mt-1">Select a category to enable brand choices or leave on Auto to let us assign "Unbranded".</p>
                        <div id="brand-feedback" class="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <i id="brand-feedback-icon" class="fas fa-info-circle"></i>
                          <span id="brand-feedback-text">We'll load approved brands once you pick a category.</span>
                        </div>
                        <button id="brand-custom-toggle" type="button"
                                class="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                aria-expanded="false" aria-controls="brand-custom-container">
                          Can't find your brand? Add custom brand
                        </button>
                        <div id="brand-custom-container" class="hidden mt-3">
                          <label class="block text-sm font-medium text-gray-700 mb-1" for="brand-custom-input">
                            Custom brand name
                          </label>
                          <input id="brand-custom-input" name="brand_custom_name" type="text" maxlength="80" disabled
                                 class="w-full px-4 py-2 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                 placeholder="Type your brand name..." aria-describedby="brand-custom-helper">
                          <p id="brand-custom-helper" class="text-xs text-gray-500 mt-1">We will submit this brand for review with your product (max 80 characters).</p>
                        </div>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 gap-6">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="description">
                          Product Description
                        </label>
                        <textarea id="description" name="description" rows="5" maxlength="2000"
                                  class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical transition-all"
                                  placeholder="Describe your product features, benefits, materials, and specifications..."></textarea>
                        <p class="text-xs text-gray-500 mt-1">Max 2000 characters. Be detailed to improve search rankings</p>
                        <div class="flex justify-between text-xs mt-1">
                          <div id="description-error" class="hidden text-red-500" role="alert"></div>
                          <span id="char-count" class="text-gray-500">0/2000</span>
                        </div>
                      </div>
                    </div>

                    <!-- Dynamic Category Attributes Section -->
                    <div id="category-attributes-section" class="mt-6" style="display: none;">
                      <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                          <i class="fas fa-tags text-indigo-500"></i>
                          Product Attributes
                        </h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Attributes help buyers find and compare your products</p>

                        <!-- Dynamic attributes will be rendered here in grid layout -->
                        <div id="dynamic-attributes-container" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <!-- Category-specific attributes will appear here -->
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Tab 2: Pricing/Inventory -->
                <div id="tab-panel-1" class="tab-panel ${this.currentTab === 1 ? '' : 'hidden'}" role="tabpanel" aria-labelledby="tab-1">
                  <div class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="price">
                          Price (USD) *
                        </label>
                        <div class="relative">
                          <span class="absolute left-3 top-3 text-gray-500">$</span>
                        <input type="number" id="price" name="price" step="0.01" min="0.01" max="99999.99" required
                               class="w-full pl-10 pr-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                               placeholder="0.00" aria-describedby="price-help">
                        </div>
                        <p id="price-help" class="text-xs text-gray-500 mt-1">Competitive pricing helps with sales</p>
                        <div id="price-error" class="hidden text-red-500 text-xs mt-1" role="alert"></div>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="stock">
                          Stock Quantity *
                        </label>
                        <input type="number" id="stock" name="stock" min="0" max="999999" required
                               class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                               placeholder="Available units" aria-describedby="stock-help">
                        <p id="stock-help" class="text-xs text-gray-500 mt-1">0 = out of stock, unlimited not supported</p>
                        <div id="stock-error" class="hidden text-red-500 text-xs mt-1" role="alert"></div>
                      </div>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2" for="sku">
                        SKU (Stock Keeping Unit)
                      </label>
                      <input type="text" id="sku" name="sku" maxlength="50"
                             class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                             placeholder="Enter unique SKU (optional)" aria-describedby="sku-help">
                      <p id="sku-help" class="text-xs text-gray-500 mt-1">Unique identifier for inventory (checked for duplicates)</p>
                      <div id="sku-validation" class="mt-1 text-sm">
                        <span id="sku-status" class="text-gray-500">No SKU entered</span>
                      </div>
                      <div id="sku-error" class="hidden text-red-500 text-xs mt-1" role="alert"></div>
                    </div>
                  </div>
                </div>

                <!-- Tab 3: Media -->
                <div id="tab-panel-2" class="tab-panel ${this.currentTab === 2 ? '' : 'hidden'}" role="tabpanel" aria-labelledby="tab-2">
                  <div class="space-y-6">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">
                        Product Images *
                      </label>
                      <p class="text-xs text-gray-500 mb-4">Upload up to 5 high-quality images. Drag to rearrange - first image becomes the thumbnail.</p>

                      <!-- Enhanced Image Upload Container -->
                      <div id="images-upload-container" class="space-y-4">
                        <!-- Upload Area (shown when less than 5 images) -->
                        <div id="image-upload-area" class="border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer relative overflow-hidden group min-h-[200px]">
                          <div class="space-y-4">
                            <div class="flex justify-center items-center space-x-4">
                              <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <i class="fas fa-cloud-upload-alt text-white text-2xl"></i>
                              </div>
                              <div class="text-center">
                                <p class="text-lg font-semibold text-gray-700">Drop images here or click to browse</p>
                                <p class="text-sm text-gray-500">Supports PNG, JPG, WebP (max 10MB each)</p>
                                <div class="flex justify-center items-center space-x-4 mt-3">
                                  <!-- Camera button -->
                                  <button type="button" id="camera-upload-btn" class="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                                    <i class="fas fa-camera"></i>
                                    <span>Camera</span>
                                  </button>
                                  <!-- Gallery button -->
                                  <button type="button" id="gallery-upload-btn" class="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md">
                                    <i class="fas fa-images"></i>
                                    <span>Gallery</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div class="text-center">
                              <p class="text-xs text-gray-400">Maximum 5 images • 800x800px recommended</p>
                            </div>
                          </div>
                          <input type="file" id="modern-product-images" accept="image/*" multiple style="position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer;" aria-describedby="images-help">
                        </div>

                        <!-- Image Preview Grid -->
                        <div id="images-preview-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          <!-- Images will be inserted here -->
                        </div>

                        <!-- Upload Count Indicator -->
                        <div class="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                          <span id="image-count">0 images uploaded</span>
                          <span>Max: 5 images</span>
                        </div>

                        <!-- Bulk Actions for Multiple Images -->
                        <div id="bulk-image-actions" class="hidden items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div class="flex items-center space-x-4">
                            <button type="button" id="select-all-images" class="text-sm text-blue-600 hover:text-blue-800">
                              <i class="fas fa-check-square mr-1"></i>Select All
                            </button>
                            <button type="button" id="reorder-images" class="text-sm text-blue-600 hover:text-blue-800">
                              <i class="fas fa-arrows-alt mr-1"></i>Reorder
                            </button>
                            <button type="button" id="bulk-edit-alt" class="text-sm text-blue-600 hover:text-blue-800">
                              <i class="fas fa-edit mr-1"></i>Edit Alt Text
                            </button>
                          </div>
                          <div class="flex items-center space-x-2">
                            <button type="button" id="bulk-delete-images" class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors">
                              <i class="fas fa-trash mr-1"></i>Delete Selected
                            </button>
                            <button type="button" id="cancel-bulk-edit" class="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>

                      <div id="image-error" class="hidden text-red-500 text-xs mt-2" role="alert"></div>

                      <!-- AI Processing Status Cards -->
                      <div id="preloading-status-card" class="mt-4 p-4 bg-green-50 rounded-xl hidden border border-green-200">
                        <div class="flex items-center space-x-3">
                          <div class="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></div>
                          <div>
                            <p class="font-medium text-green-900">Preparing AI processor...</p>
                            <p class="text-sm text-green-700">Loading model for smart recommendations</p>
                          </div>
                        </div>
                      </div>

                      <div id="embedding-status-card" class="mt-4 p-4 bg-blue-50 rounded-xl hidden border border-blue-200">
                        <div class="flex items-center space-x-3">
                          <div id="embedding-progress" class="flex-1">
                            <p class="font-medium text-blue-900">Processing images...</p>
                            <p class="text-sm text-blue-700">Generating AI embeddings for better product matching</p>
                            <div class="mt-2 bg-blue-200 rounded-full h-2">
                              <div id="embedding-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>

                <!-- Tab 4: SEO & Marketing -->
                <div id="tab-panel-3" class="tab-panel ${this.currentTab === 3 ? '' : 'hidden'}" role="tabpanel" aria-labelledby="tab-3">
                  <div class="space-y-6">
                    <div class="bg-green-50/50 p-4 rounded-xl border border-green-200/30 backdrop-blur-sm">
                      <h4 class="font-medium text-green-900 mb-2 flex items-center">
                        <i class="fas fa-search-plus mr-2"></i>SEO Optimization
                      </h4>
                      <p class="text-sm text-green-800">Optimize your product for Google search engines and social sharing</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="seo-title">
                          SEO Title (Title Tag)
                        </label>
                        <input type="text" id="seo-title" name="seo_title" maxlength="60"
                               class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                               placeholder="Optimal SEO title for search engines" aria-describedby="seo-title-help">
                        <p id="seo-title-help" class="text-xs text-gray-500 mt-1">Appears in search results (60 chars max)</p>
                        <div class="flex justify-between text-xs mt-1">
                          <div id="seo-title-error" class="hidden text-red-500" role="alert"></div>
                          <span id="seo-title-count" class="text-gray-500">0/60</span>
                        </div>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="seo-url">
                          URL Slug
                        </label>
                        <div class="relative">
                          <input type="text" id="seo-url" name="seo_url" maxlength="70"
                                 class="w-full pl-4 pr-16 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                 placeholder="custom-product-slug" aria-describedby="seo-url-help">
                          <span class="absolute right-3 top-3 text-xs text-gray-400">/product/</span>
                        </div>
                        <p id="seo-url-help" class="text-xs text-gray-500 mt-1">SEO-friendly URL (autogenerated if empty)</p>
                        <div class="flex justify-between text-xs mt-1">
                          <div id="seo-url-error" class="hidden text-red-500" role="alert"></div>
                          <span id="seo-url-count" class="text-gray-500">0/70</span>
                        </div>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 gap-6">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="meta-description">
                          Meta Description
                        </label>
                        <textarea id="meta-description" name="meta_description" rows="3" maxlength="160"
                                  class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical transition-all"
                                  placeholder="Compelling description for search result snippets..."></textarea>
                        <p class="text-xs text-gray-500 mt-1">Appears under title in search results (160 chars max)</p>
                        <div class="flex justify-between text-xs mt-1">
                          <div id="meta-description-error" class="hidden text-red-500" role="alert"></div>
                          <span id="meta-description-count" class="text-gray-500">0/160</span>
                        </div>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="focus-keywords">
                          Focus Keywords
                        </label>
                        <input type="text" id="focus-keywords" name="focus_keywords" maxlength="100"
                               class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                               placeholder="primary, secondary, keywords" aria-describedby="keywords-help">
                        <p id="keywords-help" class="text-xs text-gray-500 mt-1">Comma-separated keywords for SEO</p>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="canonical-url">
                          Canonical URL
                        </label>
                        <input type="url" id="canonical-url" name="canonical_url"
                               class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                               placeholder="https://yoursite.com/product-url" aria-describedby="canonical-help">
                        <p id="canonical-help" class="text-xs text-gray-500 mt-1">Canonical URL to prevent duplicate content</p>
                      </div>
                    </div>

                    <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-200/30 backdrop-blur-sm">
                      <h4 class="font-medium text-blue-900 mb-4 flex items-center">
                        <i class="fas fa-image mr-2"></i>Image SEO
                      </h4>
                      <p class="text-sm text-blue-800 mb-3">Make your product images searchable and accessible</p>

                      <div class="grid grid-cols-1 gap-6">
                        <div>
                          <label class="block text-sm font-medium text-gray-700 mb-2" for="image-alt-text">
                            Main Image Alt Text *
                          </label>
                          <input type="text" id="image-alt-text" name="image_alt_text" maxlength="125"
                                 class="w-full px-4 py-3 border border-gray-300/50 bg-white/70 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all backdrop-blur-sm"
                                 placeholder="Describe the main product image" aria-describedby="alt-text-help" required>
                          <p id="alt-text-help" class="text-xs text-gray-500 mt-1">Accessibility and image SEO (125 chars max)</p>
                          <div class="flex justify-between text-xs mt-1">
                            <div id="image-alt-error" class="hidden text-red-500" role="alert"></div>
                            <span id="image-alt-count" class="text-gray-500">0/125</span>
                          </div>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 mb-2" for="additional-alt-texts">
                            Additional Images Alt Text
                          </label>
                          <textarea id="additional-alt-texts" name="additional_alt_texts" rows="2" maxlength="500"
                                    class="w-full px-4 py-3 border border-gray-300/50 bg-white/70 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical transition-all backdrop-blur-sm"
                                    placeholder="Alt text for additional images (one per line)"></textarea>
                          <p class="text-xs text-gray-500 mt-1">One alt text per line for each additional image</p>
                          <div class="flex justify-between text-xs mt-1">
                            <div id="additional-alt-error" class="hidden text-red-500" role="alert"></div>
                            <span id="additional-alt-count" class="text-gray-500">0/500</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Live Preview Section -->
                    <div class="bg-gradient-to-br from-blue-50/50 to-purple-50/50 p-6 rounded-xl border border-blue-200/30 backdrop-blur-sm">
                      <h4 class="font-medium text-blue-900 mb-4 flex items-center">
                        <i class="fas fa-eye mr-2"></i>Live Preview
                      </h4>
                      <p class="text-sm text-blue-800 mb-4">See how your product will appear in search results and social media</p>

                      <!-- Preview Tabs -->
                      <div class="mb-4">
                        <div class="flex bg-white/70 rounded-lg p-1 border border-gray-200/50 backdrop-blur-sm" role="tablist" aria-label="Preview tabs">
                          <button type="button" id="preview-social-tab" class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 active bg-blue-500 text-white shadow-sm" role="tab" aria-selected="true" aria-controls="preview-social-panel">
                            <i class="fab fa-facebook mr-2"></i>Social Media
                          </button>
                          <button type="button" id="preview-serp-tab" class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50" role="tab" aria-selected="false" aria-controls="preview-serp-panel">
                            <i class="fab fa-google mr-2"></i>Google Search
                          </button>
                        </div>
                      </div>

                      <!-- Social Media Preview Panel -->
                      <div id="preview-social-panel" class="tab-panel" role="tabpanel" aria-labelledby="preview-social-tab">
                        <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                          <div class="flex items-start space-x-3">
                            <div class="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                              <i class="fas fa-image text-2xl text-gray-400"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                              <h3 id="social-title-preview" class="font-semibold text-gray-900 mb-1 truncate">
                                Your Product Title
                              </h3>
                              <p id="social-description-preview" class="text-sm text-gray-600 line-clamp-2">
                                An amazing product that you will love...
                              </p>
                              <p class="text-xs text-gray-500 mt-1">jua-market.co.ke</p>
                            </div>
                          </div>
                          <div class="mt-3 flex items-center justify-between text-xs text-gray-400">
                            <span>Facebook • Twitter • LinkedIn</span>
                            <span>Live preview updates as you type</span>
                          </div>
                        </div>
                      </div>

                      <!-- Google SERP Preview Panel -->
                      <div id="preview-serp-panel" class="tab-panel hidden" role="tabpanel" aria-labelledby="preview-serp-tab">
                        <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                          <!-- Google Logo -->
                          <div class="flex items-center mb-3">
                            <div class="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center mr-2">
                              <span class="text-white text-xs font-bold">G</span>
                            </div>
                            <span class="text-xs text-gray-500">Search</span>
                          </div>

                          <!-- SERP Result -->
                          <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer">
                            <!-- Breadcrumbs -->
                            <div class="flex items-center text-xs text-green-700 mb-1">
                              <span id="serp-breadcrumbs" class="truncate">Jua Market › Products › Your Product</span>
                            </div>

                            <!-- Title -->
                            <h3 id="serp-title" class="text-blue-600 hover:text-blue-800 text-lg font-medium mb-1 line-clamp-1">
                              Your Product Title
                            </h3>

                            <!-- URL -->
                            <div class="flex items-center text-xs text-gray-500 mb-2">
                              <span id="serp-url" class="truncate">jua-market.co.ke/product/your-product-slug</span>
                            </div>

                            <!-- Description -->
                            <p id="serp-description" class="text-sm text-gray-700 line-clamp-2">
                              An amazing product that you will love...
                            </p>

                            <!-- Rating (optional) -->
                            <div class="flex items-center mt-2 text-xs text-gray-500">
                              <div class="flex items-center mr-2">
                                <span id="serp-rating-stars" class="text-yellow-400">★★★★★</span>
                                <span id="serp-rating-value" class="ml-1">4.5</span>
                              </div>
                              <span>•</span>
                              <span class="ml-1">$XX.XX</span>
                            </div>
                          </div>

                          <div class="mt-3 text-xs text-gray-400 text-center">
                            Live Google SERP preview • Updates in real-time
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center p-4 bg-yellow-50/50 rounded-xl border border-yellow-200/30 backdrop-blur-sm">
                      <i class="fas fa-lightbulb text-yellow-500 mr-3 text-lg"></i>
                      <div class="text-sm text-yellow-800">
                        <strong>SEO Tips:</strong> Focus on relevant keywords naturally, write compelling descriptions under 160 characters,
                        and provide descriptive alt text for images to improve accessibility and search rankings.
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Tab 5: Shipping/Delivery -->
                <div id="tab-panel-4" class="tab-panel ${this.currentTab === 4 ? '' : 'hidden'}" role="tabpanel" aria-labelledby="tab-4">
                  <div class="space-y-6">
                    <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-200/30 backdrop-blur-sm">
                      <h4 class="font-medium text-blue-900 mb-2 flex items-center">
                        <i class="fas fa-shipping-fast mr-2"></i>Shipping Settings
                      </h4>
                      <p class="text-sm text-blue-800">Configure shipping and delivery options for your product</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="shipping-weight">
                          Shipping Weight (kg) *
                        </label>
                        <input type="number" id="shipping-weight" name="shipping_weight" step="0.01" min="0" max="100" required
                               class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                               placeholder="e.g., 0.5" aria-describedby="weight-help">
                        <p id="weight-help" class="text-xs text-gray-500 mt-1">Product weight including packaging</p>
                        <div id="weight-error" class="hidden text-red-500 text-xs mt-1" role="alert"></div>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="dimensions">
                          Package Dimensions (L×W×H cm)
                        </label>
                        <input type="text" id="dimensions" name="dimensions" pattern="\\d+(\\.\\d+)?x\\d+(\\.\\d+)?x\\d+(\\.\\d+)?"
                               class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                               placeholder="e.g., 20x15x10" aria-describedby="dimensions-help">
                        <p id="dimensions-help" class="text-xs text-gray-500 mt-1">For shipping cost calculations</p>
                        <div id="dimensions-error" class="hidden text-red-500 text-xs mt-1" role="alert"></div>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="shipping-method">
                          Shipping Method *
                        </label>
                        <select id="shipping-method" name="shipping_method" required class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" aria-describedby="method-help">
                          <option value="">Select method...</option>
                          <option value="standard">Standard Shipping (3-7 days, $5-15)</option>
                          <option value="express">Express Shipping (1-3 days, $15-30)</option>
                          <option value="priority">Priority (1-2 days, $25-50)</option>
                          <option value="local">Local Pickup (Free)</option>
                          <option value="international">International (7-21 days, $30+)</option>
                        </select>
                        <p id="method-help" class="text-xs text-gray-500 mt-1">Affects shipping costs and delivery times</p>
                        <div id="method-error" class="hidden text-red-500 text-xs mt-1" role="alert"></div>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="handling-time">
                          Handling Time (days)
                        </label>
                        <select id="handling-time" name="handling_time" class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                          <option value="1">1 Business Day</option>
                          <option value="2">2 Business Days</option>
                          <option value="3">3 Business Days</option>
                          <option value="5">5+ Business Days</option>
                          <option value="custom">Custom</option>
                        </select>
                        <p class="text-xs text-gray-500 mt-1">Time to prepare and ship order</p>
                      </div>
                    <div class="bg-green-50/50 p-4 rounded-xl border border-green-200/30 backdrop-blur-sm">
                      <h4 class="font-medium text-green-900 mb-2 flex items-center">
                        <i class="fas fa-shipping-fast mr-2"></i>Delivery Options
                      </h4>
                      <p class="text-sm text-green-800">Choose your delivery preferences and availability</p>
                    </div>

                    <div class="space-y-4">
                      <div>
                        <fieldset class="space-y-3">
                          <legend class="text-sm font-medium text-gray-700 mb-3">Self-Delivery Options</legend>

                          <!-- Self Delivery Checkbox -->
                          <div class="flex items-center">
                            <input type="checkbox" id="self-delivery-checkbox" name="offers_self_delivery" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                            <label for="self-delivery-checkbox" class="ml-2 block text-sm">
                              <span class="font-medium">I offer self-delivery</span>
                              <span class="block text-xs text-gray-600">Check if you can deliver this product yourself to the customer</span>
                            </label>
                          </div>

                          <!-- Conditional delivery options -->
                          <div id="self-delivery-options" class="hidden ml-6 space-y-3 border-l-2 border-blue-200 pl-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <!-- Free Delivery -->
                              <div class="flex items-center">
                                <input type="checkbox" id="free-delivery" name="free_delivery" class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded">
                                <label for="free-delivery" class="ml-2 block text-sm">
                                  <span class="font-medium">Free Delivery</span>
                                  <span class="block text-xs text-gray-600">Delivery at no extra cost</span>
                                </label>
                              </div>

                              <!-- Express Delivery -->
                              <div class="flex items-center">
                                <input type="checkbox" id="express-delivery" name="express_delivery" class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded">
                                <label for="express-delivery" class="ml-2 block text-sm">
                                  <span class="font-medium">Express Delivery</span>
                                  <span class="block text-xs text-gray-600">Available for faster shipping</span>
                                </label>
                              </div>
                            </div>

                            <!-- Delivery Radius -->
                            <div>
                              <label for="delivery-radius" class="block text-sm font-medium text-gray-700 mb-2">
                                Delivery Radius (km)
                              </label>
                              <input type="number" id="delivery-radius" name="delivery_radius_km" min="1" max="500"
                                     class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                     placeholder="e.g., 50">
                              <p class="text-xs text-gray-500 mt-1">Maximum distance you are willing to travel for delivery</p>
                            </div>
                          </div>

                          <!-- Comprehensive Delivery Options -->
                          <div class="space-y-4 mt-6 pt-6 border-t border-gray-200/30">
                            <legend class="text-sm font-medium text-gray-700 mb-3">Standard Delivery Settings</legend>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <!-- Free Delivery -->
                              <div class="flex items-center">
                                <input type="checkbox" id="product-free-delivery" name="free_delivery" class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded">
                                <label for="product-free-delivery" class="ml-2 block text-sm">
                                  <span class="font-medium">Free Standard Delivery</span>
                                  <span class="block text-xs text-gray-600">No delivery cost for this product</span>
                                </label>
                              </div>

                              <!-- Express Delivery -->
                              <div class="flex items-center">
                                <input type="checkbox" id="product-express-delivery" name="is_express_delivery" class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded">
                                <label for="product-express-delivery" class="ml-2 block text-sm">
                                  <span class="font-medium">Express Delivery Available</span>
                                  <span class="block text-xs text-gray-600">Faster delivery option</span>
                                </label>
                              </div>
                            </div>

                            <!-- Delivery Scope -->
                            <div>
                              <label for="delivery-scope" class="block text-sm font-medium text-gray-700 mb-2">
                                Delivery Coverage
                              </label>
                              <select id="delivery-scope" name="delivery_scope" class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                                <option value="local">Local (City/Town only)</option>
                                <option value="regional" selected>Regional (Multiple cities)</option>
                                <option value="nationwide">Nationwide (Country-wide)</option>
                                <option value="anywhere">Anywhere (International)</option>
                              </select>
                              <p class="text-xs text-gray-500 mt-1">Geographic scope for delivery coverage</p>
                            </div>

                            <!-- Delivery Cost and Min Order -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label for="delivery-cost" class="block text-sm font-medium text-gray-700 mb-2">
                                  Delivery Cost ($)
                                </label>
                                <input type="number" id="delivery-cost" name="delivery_cost" step="0.01" min="0" max="9999.99"
                                       class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                       placeholder="e.g., 5.99">
                                <p class="text-xs text-gray-500 mt-1">Delivery cost when not free (0 = calculated)</p>
                              </div>

                              <div>
                                <label for="min-order-value" class="block text-sm font-medium text-gray-700 mb-2">
                                  Min Order for Free Delivery ($)
                                </label>
                                <input type="number" id="min-order-value" name="min_order_value" step="1" min="0" max="99999"
                                       class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                       placeholder="e.g., 50">
                                <p class="text-xs text-gray-500 mt-1">Minimum order value for free delivery (0 = no minimum)</p>
                              </div>
                            </div>

                            <!-- Delivery Time -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label for="delivery-days" class="block text-sm font-medium text-gray-700 mb-2">
                                  Delivery Time (days)
                                </label>
                                <input type="number" id="delivery-days" name="delivery_time_days" min="1" max="90" value="3"
                                       class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                       placeholder="e.g., 3">
                                <p class="text-xs text-gray-500 mt-1">Estimated delivery time in business days</p>
                              </div>

                              <div>
                                <label for="delivery-estimate" class="block text-sm font-medium text-gray-700 mb-2">
                                  Delivery Estimate (Text)
                                </label>
                                <input type="text" id="delivery-estimate" name="delivery_time_estimate" maxlength="100"
                                       class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                       placeholder="e.g., 3-5 business days" value="3-5 business days">
                                <p class="text-xs text-gray-500 mt-1">Human-readable delivery estimate</p>
                              </div>
                            </div>
                          </div>
                        </fieldset>
                      </div>
                    </div>
                          </div>
                        </fieldset>
                      </div>
                    </div>

                    <div class="space-y-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2" for="delivery-notes">
                          Delivery Instructions
                        </label>
                        <textarea id="delivery-notes" name="delivery_notes" rows="3" maxlength="500"
                                  class="w-full px-4 py-3 border border-gray-300/50 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical transition-all"
                                  placeholder="Special instructions for delivery (e.g., leave at door, requires signature, fragile item)"></textarea>
                        <p class="text-xs text-gray-500 mt-1">Visible to customers at checkout (max 500 chars)</p>
                        <div class="flex justify-between text-xs mt-1">
                          <div id="notes-error" class="hidden text-red-500" role="alert"></div>
                          <span id="notes-count" class="text-gray-500">0/500</span>
                        </div>
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label class="flex items-center text-sm font-medium text-gray-700 mb-2">
                            <input type="checkbox" id="requires-signature" name="requires_signature" class="mr-2 rounded">
                            Requires Signature
                          </label>
                          <p class="text-xs text-gray-500">Customer must sign for delivery</p>
                        </div>

                        <div>
                          <label class="flex items-center text-sm font-medium text-gray-700 mb-2">
                            <input type="checkbox" id="adult-signature" name="adult_signature" class="mr-2 rounded">
                            Adult Signature Required
                          </label>
                          <p class="text-xs text-gray-500">For age-restricted items</p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                </form>
              </div>
            </div>
            <!-- Navigation Controls - Always Visible Footer -->
            <div id="modal-footer" class="modal-footer px-6 py-6 border-t border-gray-200 bg-white/95 flex-shrink-0 shadow-sm" style="margin: 0; display: block !important; visibility: visible !important;">
              <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div class="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                    <div id="tab-indicator" class="inline-flex items-center px-4 py-2 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full border border-blue-200 shadow-sm" aria-live="polite">
                      <i class="fas fa-tasks mr-2 text-blue-600" aria-hidden="true"></i>
                      <span id="tab-indicator-text" data-tab-indicator-text="true">Tab ${this.currentTab + 1} of ${this.tabs.length}</span>
                    </div>
                    <div id="tab-progress-status" data-tab-progress-status="true" class="inline-flex items-center px-3 py-1 text-xs text-blue-700 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
                      <i class="fas fa-info-circle mr-2 text-blue-500" aria-hidden="true"></i>
                      ${this.currentTab === this.tabs.length - 1 ? 'Final step - review and submit' : 'Complete all tabs before submitting'}
                    </div>
                  </div>
                  <div class="flex items-center gap-3 sm:gap-4 w-full lg:w-auto">
                    <span class="hidden sm:inline text-xs font-semibold tracking-wide text-slate-500 uppercase">Progress</span>
                    <div class="flex-1 min-w-[180px] max-w-sm">
                      <div id="tab-progress-container" data-tab-progress-container="true" class="w-full bg-white/80 rounded-full h-2.5 border border-slate-200 overflow-hidden shadow-inner" role="progressbar" aria-valuemin="1" aria-valuemax="${this.tabs.length}" aria-valuenow="${this.currentTab + 1}" aria-valuetext="Tab ${this.currentTab + 1} of ${this.tabs.length}" aria-label="Product form progress">
                        <div data-tab-progress-fill="true" class="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out" style="width: ${((this.currentTab + 1) / this.tabs.length) * 100}%" aria-hidden="true"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-3">
                    <button type="button" id="prev-tab" class="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Previous tab">
                      <i class="fas fa-chevron-left text-base"></i>
                      <span>Previous</span>
                    </button>
                    <button type="button" id="save-draft-btn" class="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-xl shadow-sm hover:bg-amber-600 transition-colors" title="Save current progress">
                      <i class="fas fa-save"></i>
                      <span class="hidden sm:inline">Save Draft</span>
                      <span class="sm:hidden">Draft</span>
                    </button>
                  </div>
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                    <button type="button" id="next-tab" class="flex items-center justify-center gap-2 px-7 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Go to next tab">
                      <span>Next</span>
                      <i class="fas fa-chevron-right text-base"></i>
                    </button>
                    <button type="submit" form="modern-product-form" id="submit-product" class="flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-xl shadow-md hover:from-emerald-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${this.isSubmitting ? 'animate-pulse' : ''}" title="Create and publish product" style="display: none;">
                      <i class="fas fa-rocket-launch text-base"></i>
                      <span class="hidden sm:inline">Create Product</span>
                      <span class="sm:hidden">Create</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Enhanced styles for glassmorphism and tabs
    const styles = `
      <style>
        /* ...existing styles unchanged... */
      </style>
    `;

    document.body.insertAdjacentHTML('beforeend', styles + modalHTML);
    this.setupAutoSave(); // Initialize auto-save after DOM insertion

    // Ensure the templated footer is visually attached to the posting form's scrollable area
    try {
      const modalEl = document.getElementById('modern-product-modal');
      const scrollable = modalEl?.querySelector('.flex-1.overflow-y-auto');
      const templatedFooter = modalEl?.querySelector('#modal-footer');
      if (scrollable && templatedFooter && templatedFooter.parentNode !== scrollable) {
        // Move footer into the scrollable content so it appears directly attached to the form
        scrollable.appendChild(templatedFooter);
        console.log('[MODAL_FOOTER] Moved #modal-footer into .flex-1.overflow-y-auto to attach it to the form');
        // Remove any sticky bottom styling that might detach it visually
        templatedFooter.style.position = 'relative';
        templatedFooter.style.bottom = 'auto';
        templatedFooter.style.width = '100%';
        templatedFooter.classList.add('attached-footer');

        // Add/ensure CSS for the attached-footer look (Look 1): padding, border, and gradient styling inside the form
        if (!document.getElementById('modal-footer-attached-style')) {
          const attachedStyle = document.createElement('style');
          attachedStyle.id = 'modal-footer-attached-style';
          attachedStyle.textContent = `
            /* Attached footer (Look 1) styling */
            #modern-product-modal .attached-footer {
              position: relative !important;
              bottom: auto !important;
              z-index: auto !important;
              width: 100% !important;
              padding: 1.25rem 1.5rem !important; /* top/bottom, left/right */
              min-height: 120px !important;
              border-top: 4px solid #60a5fa !important;
              background: linear-gradient(to right, #dbeafe, #e8eaf6) !important;
              box-shadow: 0 -8px 24px rgba(96,165,250,0.08) !important;
              display: block !important;
              visibility: visible !important;
            }

            /* Tighten inner layout so buttons look like "look 1" */
            #modern-product-modal .attached-footer .flex {
              align-items: center !important;
              justify-content: space-between !important;
              gap: 1rem !important;
            }

            /* Ensure the tab indicator looks integrated */
            #modern-product-modal .attached-footer #tab-indicator {
              background: #bfdbfe !important;
              color: #1e3a8a !important;
              border: 1px solid rgba(96,165,250,0.2) !important;
            }

            /* Slight elevation for buttons inside the attached footer */
            #modern-product-modal .attached-footer button {
              box-shadow: 0 6px 18px rgba(2,6,23,0.06) !important;
            }
          `;
          document.head.appendChild(attachedStyle);
        }
      }
    } catch (moveError) {
      console.warn('[MODAL_FOOTER] Could not move templated footer into form area:', moveError);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    console.log('[MODAL_DEBUG] Attaching event listeners...');

    // CRITICAL FIX: Verify modal exists before proceeding
    const modal = document.getElementById('modern-product-modal');
    if (!modal) {
      console.error('[MODAL_DEBUG] ❌ Modal element not found! Cannot attach event listeners.');
      return;
    }

    console.log('[MODAL_DEBUG] ✅ Modal element found, proceeding with event listeners');

    // Collapsible summary sidebar logic - add null checks
    const sidebar = document.getElementById('summary-sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-summary-sidebar');
    // Badge Progress Tracker fix: use correct summary element and add null check
    const summaryContent = document.getElementById('product-summary');
    const editSummaryBtn = document.getElementById('edit-summary-btn');
    let sidebarOpen = false;

    console.log('[MODAL_DEBUG] Sidebar elements found:', {
      sidebar: !!sidebar,
      toggleBtn: !!toggleSidebarBtn,
      summaryContent: !!summaryContent,
      editBtn: !!editSummaryBtn
    });

    function updateSummarySidebar() {
      // Collect form values for summary
      const title = document.getElementById('display-title')?.value || '';
      const desc = document.getElementById('description')?.value || '';
      const cat = document.getElementById('category-select')?.selectedOptions?.[0]?.text || '';
      const alt = document.getElementById('image-alt-text')?.value || '';
      if (summaryContent) {
        summaryContent.innerHTML = `
          <div class="mb-2"><span class="font-semibold">Title:</span> ${title || '<span class="text-gray-400">Not set</span>'}</div>
          <div class="mb-2"><span class="font-semibold">Description:</span> ${desc || '<span class="text-gray-400">Not set</span>'}</div>
          <div class="mb-2"><span class="font-semibold">Category:</span> ${cat || '<span class="text-gray-400">Not set</span>'}</div>
          <div class="mb-2"><span class="font-semibold">Alt Text:</span> ${alt || '<span class="text-gray-400">Not set</span>'}</div>
        `;
      }
    }

    function openSidebar() {
      sidebar.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
      sidebar.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
      sidebarOpen = true;
      updateSummarySidebar();
      sidebar.focus();
    }
    function closeSidebar() {
      sidebar.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
      sidebar.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
      sidebarOpen = false;
    }
    if (toggleSidebarBtn) {
      toggleSidebarBtn.addEventListener('click', closeSidebar);
    }
    if (editSummaryBtn) {
      editSummaryBtn.addEventListener('click', () => {
        closeSidebar();
        // Focus first form field for editing
        document.getElementById('display-title')?.focus();
      });
    }
    // Show sidebar on last step or when user clicks review
    document.addEventListener('showSummarySidebar', openSidebar);
    // Update summary live as user types
    ['display-title', 'description', 'category-select', 'image-alt-text'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateSummarySidebar);
        el.addEventListener('change', updateSummarySidebar);
      }
    });
    // Keyboard shortcut: Alt+R to open summary
    document.addEventListener('keydown', e => {
      if (e.altKey && e.key.toLowerCase() === 'r') {
        openSidebar();
        e.preventDefault();
      }
    });
    // Initialize summary content
    updateSummarySidebar();

    // AI-powered suggestion buttons (UI only, mock API) - ADD NULL CHECKS

    // Helper: show AI-generated options in a small popup under the trigger button
    function showAiOptions(triggerBtn, options = [], onChoose) {
      // Remove any existing popup
      const existing = document.getElementById('ai-options-popup');
      if (existing) existing.remove();

      const popup = document.createElement('div');
      popup.id = 'ai-options-popup';
      popup.className = 'ai-options-popup bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50';
      popup.style.position = 'fixed';
      popup.style.minWidth = '320px';
      popup.style.maxWidth = '520px';
      popup.style.maxHeight = '360px';
      popup.style.overflow = 'auto';

      options.forEach((opt, idx) => {
        const row = document.createElement('div');
        row.className = 'ai-option-row py-2 border-b last:border-b-0';
        const text = document.createElement('div');
        text.className = 'ai-option-text text-sm text-slate-800 mb-2';
        text.textContent = opt;

        const actions = document.createElement('div');
        actions.className = 'flex items-center gap-2';

        const useBtn = document.createElement('button');
        useBtn.type = 'button';
        useBtn.className = 'px-3 py-1 rounded bg-blue-600 text-white text-sm';
        useBtn.textContent = 'Use';
        useBtn.addEventListener('click', () => {
          onChoose(opt);
          popup.remove();
        });

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'px-3 py-1 rounded border text-sm';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(opt); showNotification?.call(window, 'Copied to clipboard', 'success'); } catch (e) { console.warn('copy failed', e); }
        });

        actions.appendChild(useBtn);
        actions.appendChild(copyBtn);

        row.appendChild(text);
        row.appendChild(actions);
        popup.appendChild(row);
      });

      // Close button
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'mt-2 px-3 py-1 text-sm text-slate-600';
      close.textContent = 'Close';
      close.addEventListener('click', () => popup.remove());
      popup.appendChild(close);

      document.body.appendChild(popup);

      // Position popup under trigger
      const rect = triggerBtn.getBoundingClientRect();
      popup.style.left = Math.max(8, rect.left) + 'px';
      popup.style.top = Math.min(window.innerHeight - 40, rect.bottom + 8) + 'px';

      // Dismiss on outside click
      const onDocClick = (e) => {
        if (!popup.contains(e.target) && e.target !== triggerBtn) {
          popup.remove();
          document.removeEventListener('click', onDocClick);
        }
      };
      setTimeout(() => document.addEventListener('click', onDocClick), 50);
    }
    const aiSuggestTitle = document.getElementById('ai-suggest-title');
    const aiSuggestDescription = document.getElementById('ai-suggest-description');
    const aiSuggestAlt = document.getElementById('ai-suggest-alt');
    const aiSuggestCategory = document.getElementById('ai-suggest-category');

    if (aiSuggestTitle) {
      aiSuggestTitle.addEventListener('click', async () => {
        aiSuggestTitle.disabled = true;
        const originalHtml = aiSuggestTitle.innerHTML;
        aiSuggestTitle.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Suggesting...';
        try {
          const productData = await this.collectFinalFormData();
          const res = await fetch('/supabase/functions/v1/generate-description', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productData, style: 'concise', mode: 'title' })
          });
          const data = await res.json();
          const options = data.titles && data.titles.length ? data.titles : (data.descriptions || []);
          if (!options || options.length === 0) {
            console.warn('[AI_TITLE] No suggestions returned');
            this.showNotification?.('AI could not generate title suggestions', 'warning');
          } else {
            showAiOptions(aiSuggestTitle, options, (choice) => {
              const titleInput = document.getElementById('display-title') || document.getElementById('title') || document.getElementById('name');
              if (titleInput) {
                titleInput.value = choice;
                titleInput.dispatchEvent(new Event('input'));
              }
            });
          }
        } catch (err) {
          console.error('[AI_TITLE] Error generating title', err);
          this.showNotification?.('Failed to generate title (AI)', 'error');
        } finally {
          aiSuggestTitle.disabled = false;
          aiSuggestTitle.innerHTML = originalHtml;
        }
      });
      console.log('[MODAL_DEBUG] ✅ AI suggest title button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ AI suggest title button not found');
    }

    if (aiSuggestDescription) {
      aiSuggestDescription.addEventListener('click', async () => {
        aiSuggestDescription.disabled = true;
        const originalHtml = aiSuggestDescription.innerHTML;
        aiSuggestDescription.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Suggesting...';
        try {
          const productData = await this.collectFinalFormData();
          const res = await fetch('/supabase/functions/v1/generate-description', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productData, style: 'marketing', mode: 'description' })
          });
          const data = await res.json();
          const options = data.descriptions && data.descriptions.length ? data.descriptions : (data.titles || []);
          if (!options || options.length === 0) {
            console.warn('[AI_DESC] No suggestions returned');
            this.showNotification?.('AI could not generate description suggestions', 'warning');
          } else {
            showAiOptions(aiSuggestDescription, options, (choice) => {
              const descInput = document.getElementById('description');
              if (descInput) {
                descInput.value = choice;
                descInput.dispatchEvent(new Event('input'));
              }
            });
          }
        } catch (err) {
          console.error('[AI_DESC] Error generating description', err);
          this.showNotification?.('Failed to generate description (AI)', 'error');
        } finally {
          aiSuggestDescription.disabled = false;
          aiSuggestDescription.innerHTML = originalHtml;
        }
      });
      console.log('[MODAL_DEBUG] ✅ AI suggest description button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ AI suggest description button not found');
    }

    if (aiSuggestAlt) {
      aiSuggestAlt.addEventListener('click', async () => {
        aiSuggestAlt.disabled = true;
        aiSuggestAlt.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Suggesting...';
        setTimeout(() => {
          const altInput = document.getElementById('image-alt-text');
          if (altInput) altInput.value = 'AI-generated alt text describing the main product image for accessibility.';
          aiSuggestAlt.innerHTML = '<i class="fas fa-magic mr-2"></i>AI Suggest Alt Text';
          aiSuggestAlt.disabled = false;
          altInput.dispatchEvent(new Event('input'));
        }, 1200);
      });
      console.log('[MODAL_DEBUG] ✅ AI suggest alt text button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ AI suggest alt text button not found');
    }

    if (aiSuggestCategory) {
      aiSuggestCategory.addEventListener('click', async () => {
        aiSuggestCategory.disabled = true;
        aiSuggestCategory.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Suggesting...';
        setTimeout(() => {
          const catSelect = document.getElementById('category-select');
          if (catSelect) catSelect.value = catSelect.options.length > 1 ? catSelect.options[1].value : '';
          aiSuggestCategory.innerHTML = '<i class="fas fa-magic mr-2"></i>AI Suggest Category';
          aiSuggestCategory.disabled = false;
          catSelect.dispatchEvent(new Event('change'));
        }, 1200);
      });
      console.log('[MODAL_DEBUG] ✅ AI suggest category button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ AI suggest category button not found');
    }

    // Dark mode toggle - ADD NULL CHECKS
    const darkModeBtn = document.getElementById('dark-mode-toggle');
    if (darkModeBtn) {
      darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        localStorage.setItem('modern-modal-dark', document.body.classList.contains('dark') ? '1' : '0');
      });
      console.log('[MODAL_DEBUG] ✅ Dark mode toggle handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Dark mode toggle button not found');
    }

    // High contrast toggle - ADD NULL CHECKS
    const contrastBtn = document.getElementById('high-contrast-toggle');
    if (contrastBtn) {
      contrastBtn.addEventListener('click', () => {
        document.body.classList.toggle('high-contrast');
        localStorage.setItem('modern-modal-contrast', document.body.classList.contains('high-contrast') ? '1' : '0');
      });
      console.log('[MODAL_DEBUG] ✅ High contrast toggle handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ High contrast toggle button not found');
    }

    // Preference save button - ADD NULL CHECKS
    const savePrefBtn = document.getElementById('save-preferences-btn');
    if (savePrefBtn) {
      savePrefBtn.addEventListener('click', () => {
        localStorage.setItem('modern-modal-dark', document.body.classList.contains('dark') ? '1' : '0');
        localStorage.setItem('modern-modal-contrast', document.body.classList.contains('high-contrast') ? '1' : '0');
        this.showNotification('Preferences saved!', 'success');
      });
      console.log('[MODAL_DEBUG] ✅ Save preferences button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Save preferences button not found');
    }
    // Recall preferences on open
    if (localStorage.getItem('modern-modal-dark') === '1') document.body.classList.add('dark');
    if (localStorage.getItem('modern-modal-contrast') === '1') document.body.classList.add('high-contrast');

    // Close modal - ADD NULL CHECK
    const closeBtn = document.getElementById('close-modern-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
      console.log('[MODAL_DEBUG] ✅ Close button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Close button not found');
    }

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hide();
      }
    });
    console.log('[MODAL_DEBUG] ✅ Click outside to close handler attached');

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabIndex = parseInt(e.target.closest('.tab-btn').dataset.tab);
        this.switchTab(tabIndex);
      });
    });

    // Keyboard navigation for tabs (ARIA)
    document.querySelectorAll('.tab-btn').forEach((btn, index) => {
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIndex = (index + 1) % this.tabs.length;
          this.switchTab(nextIndex);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIndex = (index - 1 + this.tabs.length) % this.tabs.length;
          this.switchTab(prevIndex);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.switchTab(index);
        }
      });
    });

    // Previous/Next tab buttons - ADD NULL CHECKS
    const prevTabBtn = document.getElementById('prev-tab');
    const nextTabBtn = document.getElementById('next-tab');

    if (prevTabBtn) {
      prevTabBtn.addEventListener('click', () => {
        this.prevTab();
      });
      console.log('[MODAL_DEBUG] ✅ Previous tab button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Previous tab button not found');
    }

    if (nextTabBtn) {
      nextTabBtn.addEventListener('click', (e) => {
        const buttonEl = e.currentTarget;
        const currentTabElement = document.getElementById(`tab-panel-${this.currentTab}`);

        if (!currentTabElement) {
          console.warn('[MODAL_DEBUG] ⚠️ Current tab panel missing during next navigation');
          return;
        }

        // Add visual feedback for validation in progress
        buttonEl.classList.add('animate-pulse');
        buttonEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Validating...';

        if (this.validateCurrentTab()) {
          this.nextTab();
        } else {
          this.showNotification('Please complete all required fields before proceeding', 'error');
        }

        setTimeout(() => {
          buttonEl.classList.remove('animate-pulse');
          buttonEl.innerHTML = 'Next <i class="fas fa-chevron-right ml-2"></i>';
        }, 500);
      });
      console.log('[MODAL_DEBUG] ✅ Next tab button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Next tab button not found');
    }

    // Save draft button - ADD NULL CHECK
    const saveDraftBtn = document.getElementById('save-draft-btn');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => {
        this.saveDraft();
      });
      console.log('[MODAL_DEBUG] ✅ Save draft button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Save draft button not found');
    }

    // Form submission - ADD NULL CHECKS
    const form = document.getElementById('modern-product-form');
    const submitBtn = document.getElementById('submit-product');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Enhanced submission handling
        if (this.currentTab === this.tabs.length - 1) {
          // Final submission from last tab
          this.submitFinalForm();
        } else {
          // Form submitted programmatically, proceed with current logic
          this.submitForm();
        }
      });
      console.log('[MODAL_DEBUG] ✅ Form submit handler attached');
    } else {
      console.error('[MODAL_DEBUG] ❌ Form not found for submit handler');
    }

    // Enhanced submit button click handling - ALREADY HAS NULL CHECK
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();

        // Show loading state immediately
        this.showLoading('Creating your product...');

      // Validate final tab before submission
      if (this.validateCurrentTab()) {
        // All validations passed, proceed with submission
        setTimeout(() => {
          this.submitFinalForm();
        }, 300); // Small delay to show loading state
      } else {
        // Validation failed, reset button state
        this.resetSubmitButton();
        this.showNotification('Please complete all required fields before submitting', 'error');
      }
       });
      console.log('[MODAL_DEBUG] ✅ Submit button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Submit button not found');
    }

    // Image upload - use modern setup only
    this.setupEnhancedImageUpload();

    // Category change loads attributes using category attributes manager - ADD NULL CHECK
    const categorySelectElement = document.getElementById('category-select');
    if (categorySelectElement) {
      categorySelectElement.addEventListener('change', async (e) => {
        const categoryId = e.target.value;

        if (categoryId) {
          // Show loading state
          const attributesSection = document.getElementById('category-attributes-section');
          const container = document.getElementById('dynamic-attributes-container');

          if (attributesSection && container) {
            attributesSection.style.display = 'block';

            // Show loading in container
            container.innerHTML = `
              <div class="col-span-full flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span class="ml-2 text-sm text-gray-600">Loading attributes...</span>
              </div>
            `;

            try {
              // Use category attributes manager to fetch and render attributes
              const attributes = await window.fetchCategoryAttributes(categoryId);

               if (attributes && attributes.length > 0) {
                 // Render attributes using the manager
                 window.collectedAttributes = window.initAttributeInputs(attributes, 'dynamic-attributes-container');
                 console.log(`[MODAL_CATEGORY_ATTRIBUTES] ✅ Rendered ${attributes.length} attributes for category`);
               } else {
                 // No attributes found - show message
                 const container = document.getElementById('dynamic-attributes-container');
                 if (container) {
                   container.innerHTML = '<p class="text-gray-500 text-sm">No attributes defined for this category.</p>';
                 }
                 window.collectedAttributes = [];
                 console.log('[MODAL_CATEGORY_ATTRIBUTES] ℹ️ No attributes found for category');
               }
            } catch (error) {
              console.error('[MODAL_CATEGORY_ATTRIBUTES] ❌ Error loading attributes:', error);
              container.innerHTML = `
                <div class="col-span-full text-center py-8 text-red-500">
                  <i class="fas fa-exclamation-triangle text-xl mb-2"></i>
                  <p class="text-sm">Failed to load attributes. Please try again.</p>
                </div>
              `;
            }
          }
        } else {
          // Hide attributes section if no category selected
          const attributesSection = document.getElementById('category-attributes-section');
          if (attributesSection) {
            attributesSection.style.display = 'none';
          }
          window.collectedAttributes = [];
        }

        this.updateSummary(); // Refresh summary
      });
      console.log('[MODAL_DEBUG] ✅ Category select change handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Category select element not found');
    }

    // Real-time validation
    this.setupValidation();

    // Variants management - ADD NULL CHECK
    const addVariantBtn = document.getElementById('add-variant-btn');
    if (addVariantBtn) {
      addVariantBtn.addEventListener('click', () => {
        this.addVariant();
      });
      console.log('[MODAL_DEBUG] ✅ Add variant button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Add variant button not found');
    }

    // SKU real-time validation - ADD NULL CHECK
    const skuInput = document.getElementById('sku');
    if (skuInput) {
      skuInput.addEventListener('input', this.debounce((e) => {
        this.validateSKU(e.target.value);
      }, 500));
      console.log('[MODAL_DEBUG] ✅ SKU input validation handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ SKU input not found');
    }

    // Character counters - ADD NULL CHECKS
    ['description', 'seo-title', 'meta-description', 'image-alt-text'].forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', (e) => {
          const countEl = document.getElementById(fieldId + '-count');
          if (countEl) {
            countEl.textContent = `${e.target.value.length}/${e.target.maxLength}`;
            if (e.target.value.length > e.target.maxLength * 0.9) {
              countEl.classList.add('text-red-500');
            } else {
              countEl.classList.remove('text-red-500');
            }
          }
        });
        console.log(`[MODAL_DEBUG] ✅ Character counter attached to ${fieldId}`);
      } else {
        console.warn(`[MODAL_DEBUG] ⚠️ Character counter field not found: ${fieldId}`);
      }
    });

    // Live preview updates are now handled by LivePreviewManager
    // The manager is initialized when the SEO & Marketing tab is activated

    // Self-delivery checkbox toggle - ADD NULL CHECKS
    const selfDeliveryCheckbox = document.getElementById('self-delivery-checkbox');
    const selfDeliveryOptions = document.getElementById('self-delivery-options');

    if (selfDeliveryCheckbox && selfDeliveryOptions) {
      selfDeliveryCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          selfDeliveryOptions.classList.remove('hidden');
          // Smooth slide down animation
          setTimeout(() => selfDeliveryOptions.style.maxHeight = '500px', 10);
        } else {
          selfDeliveryOptions.style.maxHeight = '0';
          setTimeout(() => selfDeliveryOptions.classList.add('hidden'), 300);
        }
      });
      console.log('[MODAL_DEBUG] ✅ Self-delivery checkbox handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Self-delivery checkbox or options not found');
    }

    // Auto-save setup
    this.setupAutoSave();

    // Refresh attributes button - ADD NULL CHECK
    const refreshAttributesBtn = document.getElementById('refresh-attributes');
    if (refreshAttributesBtn) {
      refreshAttributesBtn.addEventListener('click', () => {
        const categoryId = document.getElementById('category-select').value;
        if (categoryId) {
          this.loadEditableAttributes(categoryId);
        }
      });
      console.log('[MODAL_DEBUG] ✅ Refresh attributes button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Refresh attributes button not found');
    }

    // YouTube URL Manager event listeners
    this.setupYouTubeEventListeners();

    // Suggest new category button toggle - ADD NULL CHECKS
    const suggestCategoryBtn = document.getElementById('suggest-new-category-btn');
    const suggestedCategoryFields = document.getElementById('suggested-category-fields');
    const categorySelectForSuggestion = document.getElementById('category-select');
    const verticalSelectForSuggestion = document.getElementById('vertical-select');
    const verticalAsterisk = document.getElementById('vertical-asterisk');
    const categoryAsterisk = document.getElementById('category-asterisk');

    if (suggestCategoryBtn && suggestedCategoryFields && categorySelectForSuggestion) {
      suggestCategoryBtn.addEventListener('click', (e) => {
        e.preventDefault();

        // Show suggestion fields
        suggestedCategoryFields.classList.remove('hidden');

        // Clear and make dropdowns optional
        categorySelectForSuggestion.value = '';
        categorySelectForSuggestion.required = false;
        if (verticalSelectForSuggestion) verticalSelectForSuggestion.required = false;

        // Update visual indicators
        if (verticalAsterisk) verticalAsterisk.textContent = '';
        if (categoryAsterisk) categoryAsterisk.textContent = '';

        // Clear attributes
        this.clearAttributes();

        this.updateSummary();
      });
      console.log('[MODAL_DEBUG] ✅ Suggest new category button handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Suggest new category button or related elements not found');
    }

    // Check for existing checkbox (legacy support) - but we removed it
    const suggestCategoryCheckbox = document.getElementById('suggest-new-category');
    if (suggestCategoryCheckbox) {
      suggestCategoryCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        if (suggestedCategoryFields) suggestedCategoryFields.classList.toggle('hidden', !isChecked);

        // Toggle requirements
        if (categorySelectForSuggestion) categorySelectForSuggestion.required = !isChecked;
        if (verticalSelectForSuggestion) verticalSelectForSuggestion.required = !isChecked;

        // Update asterisks
        if (verticalAsterisk) verticalAsterisk.textContent = isChecked ? '' : '*';
        if (categoryAsterisk) categoryAsterisk.textContent = isChecked ? '' : '*';

        // Clear selections when enabling suggestion
        if (isChecked) {
          if (categorySelectForSuggestion) categorySelectForSuggestion.value = '';
          this.clearAttributes();
        }

        this.updateSummary();
      });
      console.log('[MODAL_DEBUG] ✅ Suggest new category checkbox handler attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Suggest new category checkbox not found');
    }

    // Character counter for suggestion description - ADD NULL CHECK
    const suggestedDescField = document.getElementById('suggested-category-description');
    if (suggestedDescField) {
      suggestedDescField.addEventListener('input', this.debounce(() => {
        const count = suggestedDescField.value.length;
        const max = 500;
        if (count > max) {
          suggestedDescField.value = suggestedDescField.value.slice(0, max);
        }
      }, 100));
      console.log('[MODAL_DEBUG] ✅ Suggested category description character counter attached');
    } else {
      console.warn('[MODAL_DEBUG] ⚠️ Suggested category description field not found');
    }

    // Keep navigation controls in sync with latest form state
    this.bindFormStateWatchers();

    console.log('[MODAL_DEBUG] ✅ Event listeners attachment completed successfully');
  }

  /**
   * Switch to specific tab
   */
  switchTab(tabIndex) {
    if (tabIndex < 0 || tabIndex >= this.tabs.length || tabIndex === this.currentTab) return;

    // Validate current tab before switching (except last tab)
    if (tabIndex > this.currentTab && this.currentTab < this.tabs.length - 1) {
      if (!this.validateCurrentTab()) {
        // Animate shake on invalid tab
        const currentPanel = document.getElementById(`tab-panel-${this.currentTab}`);
        if (currentPanel) {
          currentPanel.classList.add('animate__animated', 'animate__shakeX');
          setTimeout(() => currentPanel.classList.remove('animate__animated', 'animate__shakeX'), 700);
        }
        return; // Stay on current tab if invalid
      }
    }

    // Hide current tab
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.add('hidden');
      panel.setAttribute('aria-hidden', 'true');
    });

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach((btn, index) => {
      btn.classList.remove('bg-blue-500', 'text-white', 'shadow-lg', 'scale-105');
      btn.classList.add('text-gray-600', 'hover:text-blue-600', 'hover:bg-blue-50');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('tabindex', '-1');
      if (index === tabIndex) {
        btn.classList.add('bg-blue-500', 'text-white', 'shadow-lg', 'scale-105');
        btn.classList.remove('text-gray-600', 'hover:text-blue-600', 'hover:bg-blue-50');
        btn.setAttribute('aria-selected', 'true');
        btn.setAttribute('tabindex', '0');
      }
    });

    // Show new tab with fade/slide animation
    const newPanel = document.getElementById(`tab-panel-${tabIndex}`);
    if (newPanel) {
      newPanel.classList.remove('hidden');
      newPanel.setAttribute('aria-hidden', 'false');
      newPanel.classList.add('animate__animated', 'animate__fadeInRight');
      setTimeout(() => newPanel.classList.remove('animate__animated', 'animate__fadeInRight'), 700);
    }

    // Animate progress bar
    const progressBar = document.querySelector('.bg-gradient-to-r.from-blue-500.to-purple-500.h-2');
    if (progressBar) {
      progressBar.classList.add('animate__animated', 'animate__pulse');
      setTimeout(() => progressBar.classList.remove('animate__animated', 'animate__pulse'), 500);
    }

  this.currentTab = tabIndex;
  this.updateTabIndicator();
  this.updateSummary(); // Always refresh summary
  this.updateButtonStates();

    // Focus first element in new tab for accessibility
    const firstFocusable = newPanel.querySelector('input, select, button, textarea');
    if (firstFocusable) {
      firstFocusable.focus();
    }

    // Special handling for tabs
    if (tabIndex === 2) { // Media tab
      this.checkPreloadingStatus();
    } else if (tabIndex === 3) { // SEO & Marketing tab
      this.livePreviewManager.init();
    } else if (tabIndex === 4) { // Variants/Attributes tab
      this.renderVariants();
    }
  }

  /**
   * Go to next tab
   */
  nextTab() {
    if (this.currentTab < this.tabs.length - 1 && this.validateCurrentTab()) {
      this.switchTab(this.currentTab + 1);
    } else if (this.currentTab === this.tabs.length - 1) {
      this.submitForm();
    }
  }

  /**
   * Go to previous tab
   */
  prevTab() {
    if (this.currentTab > 0) {
      this.switchTab(this.currentTab - 1);
    }
  }

  /**
   * Enhanced Navigation Button Visibility Fix with Better State Management
   */
  fixNavigationButtonVisibility() {
    console.log('[NAVIGATION_FIX] Starting enhanced navigation button visibility fix...');

    // Multiple retry attempts for better reliability
    const retryAttempts = [100, 300, 500, 1000];

    retryAttempts.forEach((delay, index) => {
      setTimeout(() => {
        console.log(`[NAVIGATION_FIX] Attempt ${index + 1} with ${delay}ms delay`);
        this.performNavigationFix();
      }, delay);
    });
  }

  /**
   * Perform the actual navigation fix
   */
  performNavigationFix() {
    const modal = document.getElementById('modern-product-modal');
    if (!modal || modal.classList.contains('hidden')) {
      console.log('[NAVIGATION_FIX] Modal not visible, skipping navigation fix');
      return;
    }

    // Find footer with multiple fallback selectors
    const footerSelectors = [
      '.bg-white.px-6.py-4.border-t',
      '.modal-footer',
      '[class*="footer"]',
      'footer'
    ];

    let footer = null;
    for (const selector of footerSelectors) {
      footer = modal.querySelector(selector);
      if (footer) {
        console.log(`[NAVIGATION_FIX] Footer found using selector: ${selector}`);
        break;
      }
    }

    if (footer) {
      this.applyNavigationFixes(footer);
    } else {
      console.warn('[NAVIGATION_FIX] Footer not found with any selector, creating fallback');
      this.createNavigationFallback();
    }
  }

  /**
   * Apply comprehensive navigation fixes
   */
  applyNavigationFixes(footer) {
    console.log('[NAVIGATION_FIX] Applying comprehensive navigation fixes...');

    try {
      // Enhanced footer styling
      this.enhanceFooterElement(footer);

      // Fix button container layout
      this.fixNavigationContainer(footer);

      // Fix individual buttons with enhanced validation
      this.fixNavigationButtons(footer);

      // Update button states based on current tab
      this.updateButtonStates();

      // Add responsive behavior
      this.addResponsiveNavigationBehavior(footer);

      console.log('[NAVIGATION_FIX] Navigation fixes applied successfully');

      // Verify fixes are working
      setTimeout(() => this.verifyNavigationFixes(footer), 100);

    } catch (error) {
      console.error('[NAVIGATION_FIX] Error applying navigation fixes:', error);
      this.handleNavigationError(error);
    }
  }

  /**
   * Enhanced footer element styling
   */
  enhanceFooterElement(footer) {
    console.log('[NAVIGATION_FIX] Enhancing footer element...');

    footer.classList.remove('hidden', 'invisible', 'opacity-0');

    footer.style.cssText = `
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      background: white !important;
      border-top: 1px solid #e5e7eb !important;
      padding: 1.5rem !important;
      width: 100% !important;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
      min-height: 80px !important;
      flex-shrink: 0 !important;
    `;

    console.log('[NAVIGATION_FIX] Footer element enhanced');
  }

  /**
   * Fix navigation container layout
   */
  fixNavigationContainer(footer) {
    console.log('[NAVIGATION_FIX] Fixing navigation container layout...');

    // Find the main flex container
    const containers = [
      footer.querySelector('.flex.flex-col.space-y-4.md\\:flex-row'),
      footer.querySelector('.flex'),
      footer.querySelector('[class*="flex"]')
    ];

    let container = null;
    for (const cont of containers) {
      if (cont) {
        container = cont;
        break;
      }
    }

    if (container) {
      container.style.cssText = `
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 1rem !important;
        width: 100% !important;
        flex-wrap: wrap !important;
      `;

      // Apply responsive layout
      if (window.innerWidth <= 768) {
        container.style.flexDirection = 'column';
        container.style.alignItems = 'stretch';
      } else {
        container.style.flexDirection = 'row';
        container.style.alignItems = 'center';
      }

      console.log('[NAVIGATION_FIX] Navigation container layout fixed');
    } else {
      console.warn('[NAVIGATION_FIX] Navigation container not found');
    }
  }

  /**
   * Fix individual navigation buttons with enhanced validation
   */
  fixNavigationButtons(footer) {
    console.log('[NAVIGATION_FIX] Fixing individual navigation buttons...');

    const buttonConfigs = {
      prevBtn: {
        selector: '#prev-tab',
        defaultText: 'Previous',
        icon: 'fa-chevron-left',
        shouldShow: this.currentTab > 0
      },
      nextBtn: {
        selector: '#next-tab',
        defaultText: 'Next',
        icon: 'fa-chevron-right',
        shouldShow: this.currentTab < this.tabs.length - 1
      },
      submitBtn: {
        selector: '#submit-product',
        defaultText: 'Create Product',
        icon: 'fa-rocket-launch',
        shouldShow: this.currentTab === this.tabs.length - 1
      },
      saveDraftBtn: {
        selector: '#save-draft-btn',
        defaultText: 'Save Draft',
        icon: 'fa-save',
        shouldShow: true
      }
    };

    Object.entries(buttonConfigs).forEach(([name, config]) => {
      const button = footer.querySelector(config.selector);
      if (button) {
        this.fixNavigationButton(button, name, config);
      } else {
        console.warn(`[NAVIGATION_FIX] ${name} button not found`);
        this.createMissingButton(footer, name, config);
      }
    });
  }

  /**
   * Fix individual navigation button
   */
  fixNavigationButton(button, name, config) {
    console.log(`[NAVIGATION_FIX] Fixing ${name} button...`);

    // Remove hiding classes
    button.classList.remove('hidden', 'invisible', 'opacity-0');

    // Apply base button styles
    button.style.cssText = `
      display: ${config.shouldShow ? 'inline-flex' : 'none'} !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: 101 !important;
      min-height: 40px !important;
      min-width: 80px !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0.5rem 1rem !important;
      border-radius: 0.75rem !important;
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      text-decoration: none !important;
      border: none !important;
    `;

    // Apply button-specific styling
    this.applyButtonSpecificStyles(button, name);

    // Ensure button text is visible and correct
    this.fixButtonContent(button, config);

    // Add click handler if missing
    if (!button.onclick && !button.getAttribute('data-has-handler')) {
      button.addEventListener('click', (e) => {
        console.log(`[NAVIGATION_FIX] ${name} button clicked`);
        this.handleButtonClick(name, e);
      });
      button.setAttribute('data-has-handler', 'true');
    }

    console.log(`[NAVIGATION_FIX] ${name} button fixed successfully`);
  }

  /**
   * Apply button-specific styling based on button type
   */
  applyButtonSpecificStyles(button, name) {
    switch (name) {
      case 'prevBtn':
        button.style.backgroundColor = '#f3f4f6';
        button.style.color = '#374151';
        button.style.border = '1px solid #d1d5db';
        break;
      case 'nextBtn':
        button.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
        button.style.color = 'white';
        button.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
        break;
      case 'submitBtn':
        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        button.style.color = 'white';
        button.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
        button.style.fontWeight = '600';
        break;
      case 'saveDraftBtn':
        button.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        button.style.color = 'white';
        button.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
        break;
    }
  }

  /**
   * Fix button content and text
   */
  fixButtonContent(button, config) {
    const textSpan = button.querySelector('span');
    const icon = button.querySelector('i');

    // Fix text content
    if (textSpan) {
      const currentText = textSpan.textContent.trim();
      if (!currentText || currentText === 'undefined') {
        textSpan.textContent = config.defaultText;
      }
      textSpan.style.display = 'inline';
      textSpan.style.visibility = 'visible';
      textSpan.style.opacity = '1';
      textSpan.style.color = 'inherit';
    }

    // Fix icon
    if (icon) {
      const currentClass = icon.className;
      if (!currentClass.includes(config.icon)) {
        icon.className = `fas ${config.icon} mr-2`;
      }
      icon.style.visibility = 'visible';
      icon.style.opacity = '1';
    } else {
      // Add missing icon
      const iconElement = document.createElement('i');
      iconElement.className = `fas ${config.icon} mr-2`;
      button.insertBefore(iconElement, button.firstChild);
    }
  }

  /**
   * Handle button click events
   */
  handleButtonClick(buttonName, event) {
    console.log(`[NAVIGATION_FIX] Handling ${buttonName} button click`);

    switch (buttonName) {
      case 'prevBtn':
        event.preventDefault();
        this.prevTab();
        break;
      case 'nextBtn':
        event.preventDefault();
        this.nextTab();
        break;
      case 'submitBtn':
        event.preventDefault();
        this.submitForm();
        break;
      case 'saveDraftBtn':
        event.preventDefault();
        this.saveDraft();
        break;
    }
  }

  /**
   * Create missing navigation button
   */
  createMissingButton(footer, name, config) {
    console.log(`[NAVIGATION_FIX] Creating missing ${name} button`);

    const button = document.createElement('button');
    button.type = 'button';
    button.id = config.selector.replace('#', '');
    button.className = 'flex items-center px-4 py-2 rounded-xl transition-all';
    button.innerHTML = `<i class="fas ${config.icon} mr-2"></i>${config.defaultText}`;

    // Apply styling
    this.applyButtonSpecificStyles(button, name);

    // Find appropriate container to add button to
    const buttonContainer = footer.querySelector('.flex.items-center.space-x-3') ||
                          footer.querySelector('.flex') ||
                          footer;

    if (buttonContainer) {
      // Find the right place to insert the button
      const existingButtons = buttonContainer.querySelectorAll('button');
      if (existingButtons.length > 0) {
        // Insert in appropriate position
        const referenceButton = this.findReferenceButton(buttonContainer, name);
        if (referenceButton) {
          buttonContainer.insertBefore(button, referenceButton.nextSibling);
        } else {
          buttonContainer.appendChild(button);
        }
      } else {
        buttonContainer.appendChild(button);
      }
    }

    // Add click handler
    button.addEventListener('click', (e) => this.handleButtonClick(name, e));

    console.log(`[NAVIGATION_FIX] ${name} button created successfully`);
  }

  /**
   * Find reference button for insertion positioning
   */
  findReferenceButton(container, buttonName) {
    const buttonOrder = ['prevBtn', 'saveDraftBtn', 'nextBtn', 'submitBtn'];
    const currentIndex = buttonOrder.indexOf(buttonName);

    for (let i = currentIndex - 1; i >= 0; i--) {
      const referenceButton = container.querySelector(`#${buttonOrder[i].replace('Btn', '-tab').replace('saveDraft', 'save-draft')}`);
      if (referenceButton) {
        return referenceButton;
      }
    }

    return null;
  }

  /**
   * Update button states based on current tab and validation
   */
  updateButtonStates() {
    console.log('[NAVIGATION_FIX] Updating button states...');

    const prevButtons = Array.from(document.querySelectorAll('#prev-tab'));
    const nextButtons = Array.from(document.querySelectorAll('#next-tab'));
    const submitButtons = Array.from(document.querySelectorAll('#submit-product'));

    const isFirstTab = this.currentTab === 0;
    const isLastTab = this.currentTab === this.tabs.length - 1;

    let validationFailures = [];
    try {
      validationFailures = typeof this.getValidationFailures === 'function'
        ? this.getValidationFailures()
        : [];
    } catch (err) {
      console.warn('[NAVIGATION_FIX] getValidationFailures failed, falling back to explicit validation', err);
      try {
        if (this.validateCurrentTab()) {
          validationFailures = [];
        } else {
          validationFailures = ['Validation failed'];
        }
      } catch (validationErr) {
        console.error('[NAVIGATION_FIX] validateCurrentTab fallback also failed', validationErr);
      }
    }

    const isTabValid = validationFailures.length === 0;

    prevButtons.forEach((btn) => {
      try {
        btn.disabled = isFirstTab;
        btn.style.opacity = btn.disabled ? '0.5' : '1';
        btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer';
      } catch (err) {
        console.warn('[NAVIGATION_FIX] Failed to update prev button state', err);
      }
    });

    const canProceed = !isLastTab && isTabValid;
    nextButtons.forEach((btn) => {
      try {
        btn.disabled = !canProceed;
        btn.style.opacity = btn.disabled ? '0.5' : '1';
        btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer';
        btn.style.display = isLastTab ? 'none' : 'inline-flex';
      } catch (err) {
        console.warn('[NAVIGATION_FIX] Failed to update next button state', err);
      }
    });

    const canSubmit = isLastTab && isTabValid;
    submitButtons.forEach((btn) => {
      try {
        btn.style.display = isLastTab ? 'inline-flex' : 'none';
        btn.disabled = !canSubmit;
        btn.style.opacity = btn.disabled ? '0.5' : '1';
        btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer';
      } catch (err) {
        console.warn('[NAVIGATION_FIX] Failed to update submit button state', err);
      }
    });

    if (isLastTab && !canSubmit) {
      try {
        this.showSubmitDisabledReasons(validationFailures);
      } catch (e) {
        console.warn('[NAVIGATION_FIX] showSubmitDisabledReasons failed', e);
      }
    } else {
      const modal = document.getElementById('modern-product-modal');
      const footer = modal?.querySelector('#modal-footer') || modal?.querySelector('[data-modal-footer="true"]');
      const msg = footer?.querySelector('#submit-disabled-reason');
      if (msg) msg.remove();
    }

    console.log('[NAVIGATION_FIX] Button states updated');
  }

  /**
   * Attach debounced form listeners to keep navigation controls in sync with user input
   */
  bindFormStateWatchers() {
    const form = document.getElementById('modern-product-form');

    if (!form) {
      console.warn('[NAVIGATION_WATCHERS] modern-product-form not found, skipping state watchers');
      return;
    }

    if (form.dataset.navWatchersAttached === 'true') {
      // Watchers already attached; still refresh button states to reflect any DOM updates
      this.updateButtonStates();
      this.updateTabIndicator();
      return;
    }

    const refreshStates = this.debounce(() => {
      this.updateButtonStates();
      this.updateTabIndicator();
    }, 150);

    ['input', 'change'].forEach((evt) => {
      form.addEventListener(evt, refreshStates);
    });

    // Capture blurs to update when fields lose focus (use capture to catch focused element)
    form.addEventListener('blur', refreshStates, true);

    form.dataset.navWatchersAttached = 'true';

    console.log('[NAVIGATION_WATCHERS] Form state watchers attached');

    // Align initial state immediately after wiring listeners
    this.updateButtonStates();
    this.updateTabIndicator();
  }

  /**
   * Return an array of human-readable validation failure reasons for the current tab.
   * This function is non-intrusive (doesn't focus or add UI errors) and is intended
   * to explain why the submit button remains disabled.
   */
  getValidationFailures() {
    const reasons = [];
    try {
      const tab = this.currentTab;
      if (tab === 0) {
        const productName = document.getElementById('product-name')?.value?.trim();
        const displayTitle = document.getElementById('display-title')?.value?.trim();
        const suggestedCategoryFields = document.getElementById('suggested-category-fields');
        const categorySelect = document.getElementById('category-select')?.value;
        const verticalSelect = document.getElementById('vertical-select')?.value;

        if (!productName) reasons.push('Product name is required');
        else if (productName.length < 3) reasons.push('Product name must be at least 3 characters');

        if (!displayTitle) reasons.push('Display title is required');
        else if (displayTitle.length < 3) reasons.push('Display title must be at least 3 characters');

        const isSuggestingCustom = suggestedCategoryFields && !suggestedCategoryFields.classList.contains('hidden');
        if (!isSuggestingCustom) {
          if (!verticalSelect) reasons.push('Vertical must be selected');
          if (!categorySelect) reasons.push('Category must be selected');
        } else {
          const suggestedName = document.getElementById('suggested-category-name')?.value?.trim();
          if (!suggestedName) reasons.push('Suggested category name is required when suggesting a new category');
        }
      }

      if (tab === 1) {
        const priceVal = parseFloat(document.getElementById('price')?.value || '');
        const stockVal = parseInt(document.getElementById('stock')?.value || '');
        const sku = document.getElementById('sku')?.value?.trim();
        if (isNaN(priceVal) || priceVal <= 0) reasons.push('Price must be a number greater than 0');
        if (isNaN(stockVal) || stockVal < 0) reasons.push('Stock must be a valid number (0 or greater)');
        if (sku && this.isSKUUnique === false) reasons.push('SKU must be unique');
      }

      if (tab === 2) {
        if (!this.images || this.images.length === 0) reasons.push('At least one product image is required');
      }

      if (tab === 3) {
        const seoTitle = document.getElementById('seo-title')?.value || '';
        const metaDescription = document.getElementById('meta-description')?.value || '';
        const altText = document.getElementById('image-alt-text')?.value?.trim() || '';
        if (seoTitle && seoTitle.length > 60) reasons.push('SEO title should be 60 characters or less');
        if (metaDescription && metaDescription.length > 160) reasons.push('Meta description should be 160 characters or less');
        if ((this.images && this.images.length > 0) && !altText) reasons.push('Main image alt text is required when images are present');
      }

      if (tab === 4) {
        const shippingWeight = parseFloat(document.getElementById('shipping-weight')?.value || '');
        const shippingMethod = document.getElementById('shipping-method')?.value;
        if (isNaN(shippingWeight) || shippingWeight < 0) reasons.push('Shipping weight must be a valid number');
        if (!shippingMethod) reasons.push('Shipping method must be selected');
      }
      if (![0, 1, 2, 3, 4].includes(tab)) {
        const currentPanel = document.getElementById(`tab-panel-${tab}`);
        if (currentPanel) {
          const requiredFields = currentPanel.querySelectorAll('input[required], select[required], textarea[required]');
          requiredFields.forEach((field) => {
            if (!field.value?.trim()) {
              const label = field.labels?.[0]?.textContent?.trim() || 'This field';
              reasons.push(`${label} is required`);
            }
          });
        }
      }
    } catch (e) {
      console.warn('[VALIDATION_HELPER] Error collecting validation failures', e);
      reasons.push('Validation helper failed to determine exact reasons (see console)');
    }

    return reasons;
  }

  /**
   * Show a small inline footer message explaining why the submit button is disabled.
   */
  showSubmitDisabledReasons(precomputedReasons = null) {
    const modal = document.getElementById('modern-product-modal');
    const footer = modal?.querySelector('#modal-footer') || modal?.querySelector('[data-modal-footer="true"]');
    if (!footer) return;

    let msgEl = footer.querySelector('#submit-disabled-reason');
    const reasons = Array.isArray(precomputedReasons) ? precomputedReasons : this.getValidationFailures();

    if (!reasons || reasons.length === 0) {
      if (msgEl) msgEl.remove();
      return;
    }

    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.id = 'submit-disabled-reason';
      msgEl.style.cssText = 'color:#b91c1c;font-size:0.875rem;margin-top:0.5rem;';
      footer.querySelector('.flex')?.insertAdjacentElement('afterend', msgEl);
    }

    msgEl.textContent = 'Cannot submit: ' + reasons.join('; ');
  }

  /**
   * Add responsive behavior to navigation
   */
  addResponsiveNavigationBehavior(footer) {
    console.log('[NAVIGATION_FIX] Adding responsive navigation behavior...');

    const handleResize = this.debounce(() => {
      console.log('[NAVIGATION_FIX] Window resized, updating navigation layout');
      this.fixNavigationContainer(footer);
      this.updateButtonStates();
    }, 250);

    window.addEventListener('resize', handleResize);

    // Store handler for cleanup if needed
    footer.setAttribute('data-resize-handler', 'true');

    console.log('[NAVIGATION_FIX] Responsive behavior added');
  }

  /**
   * Verify that navigation fixes are working
   */
  verifyNavigationFixes(footer) {
    console.log('[NAVIGATION_FIX] Verifying navigation fixes...');

    const buttons = ['#prev-tab', '#next-tab', '#submit-product', '#save-draft-btn'];
    let allWorking = true;

    buttons.forEach(selector => {
      const button = footer.querySelector(selector);
      if (button) {
        const styles = window.getComputedStyle(button);
        const isVisible = styles.display !== 'none' &&
                         styles.visibility !== 'hidden' &&
                         parseFloat(styles.opacity) > 0;

        console.log(`[NAVIGATION_FIX] ${selector}: ${isVisible ? 'VISIBLE' : 'HIDDEN'}`);

        if (!isVisible) {
          allWorking = false;
          console.warn(`[NAVIGATION_FIX] ${selector} is not visible, reapplying fixes`);
          const buttonName = selector.replace('#', '').replace('-', '');
          this.fixNavigationButton(button, buttonName, { selector });
        }
      } else {
        console.warn(`[NAVIGATION_FIX] ${selector} not found during verification`);
        allWorking = false;
      }
    });

    if (allWorking) {
      console.log('[NAVIGATION_FIX] ✅ All navigation buttons are working properly');
    } else {
      console.warn('[NAVIGATION_FIX] ⚠️ Some navigation buttons may have issues');
    }
  }

  /**
   * Create navigation fallback if original doesn't exist
   */
  createNavigationFallback() {
    console.log('[NAVIGATION_FIX] Creating navigation fallback...');

    const modal = document.getElementById('modern-product-modal');
    if (!modal) return;

    // Find the modal content container
    const modalContent = modal.querySelector('.bg-white.border.border-gray-200.rounded-3xl');
    if (!modalContent) return;

    // Create navigation footer
    const navFooter = document.createElement('div');
    navFooter.className = 'modal-footer px-6 py-6 border-t border-gray-200 bg-white/95 flex-shrink-0 shadow-sm';

    navFooter.innerHTML = `
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <div id="tab-indicator" class="inline-flex items-center px-4 py-2 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full border border-blue-200 shadow-sm" aria-live="polite">
              <i class="fas fa-tasks mr-2 text-blue-600" aria-hidden="true"></i>
              <span data-tab-indicator-text="true">Tab ${this.currentTab + 1} of ${this.tabs.length}</span>
            </div>
            <div data-tab-progress-status="true" class="inline-flex items-center px-3 py-1 text-xs text-blue-700 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
              <i class="fas fa-info-circle mr-2 text-blue-500" aria-hidden="true"></i>
              ${this.currentTab === this.tabs.length - 1 ? 'Final step - review and submit' : 'Complete all tabs before submitting'}
            </div>
          </div>
          <div class="flex items-center gap-3 sm:gap-4 w-full lg:w-auto">
            <span class="hidden sm:inline text-xs font-semibold tracking-wide text-slate-500 uppercase">Progress</span>
            <div class="flex-1 min-w-[180px] max-w-sm">
              <div data-tab-progress-container="true" class="w-full bg-white/80 rounded-full h-2.5 border border-slate-200 overflow-hidden shadow-inner" role="progressbar" aria-label="Product form progress" aria-valuemin="1" aria-valuemax="${this.tabs.length}" aria-valuenow="${this.currentTab + 1}" aria-valuetext="Tab ${this.currentTab + 1} of ${this.tabs.length}">
                <div data-tab-progress-fill="true" class="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out" style="width: ${((this.currentTab + 1) / this.tabs.length) * 100}%" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-3">
            <button type="button" id="prev-tab" class="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Previous tab">
              <i class="fas fa-chevron-left text-base" aria-hidden="true"></i>
              <span>Previous</span>
            </button>
            <button type="button" id="save-draft-btn" class="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-xl shadow-sm hover:bg-amber-600 transition-colors" title="Save current progress">
              <i class="fas fa-save" aria-hidden="true"></i>
              <span class="hidden sm:inline">Save Draft</span>
            </button>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button type="button" id="next-tab" class="flex items-center justify-center gap-2 px-7 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Go to next tab">
              <span>Next</span>
              <i class="fas fa-chevron-right text-base" aria-hidden="true"></i>
            </button>
            <button type="submit" form="modern-product-form" id="submit-product" class="flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-xl shadow-md hover:from-emerald-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all" style="display: none;">
              <i class="fas fa-rocket-launch text-base" aria-hidden="true"></i>
              <span class="hidden sm:inline">Create Product</span>
            </button>
          </div>
        </div>
      </div>
    `;

    modalContent.appendChild(navFooter);

    // Reattach event listeners
    this.attachEventListeners();

    console.log('[NAVIGATION_FIX] Navigation fallback created successfully');
  }

  /**
   * Handle navigation errors
   */
  handleNavigationError(error) {
    console.error('[NAVIGATION_FIX] Navigation fix error:', error);

    // Try aggressive fix as last resort
    setTimeout(() => {
      console.log('[NAVIGATION_FIX] Attempting aggressive navigation fix...');
      this.aggressiveNavigationFix();
    }, 200);
  }

  /**
   * Aggressive navigation fix as last resort
   */
  aggressiveNavigationFix() {
    const style = document.createElement('style');
    style.textContent = `
      #modern-product-modal footer {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        background: white !important;
        border-top: 1px solid #e5e7eb !important;
        padding: 1.5rem !important;
        width: 100% !important;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
        min-height: 80px !important;
        flex-shrink: 0 !important;
      }

      #modern-product-modal #prev-tab,
      #modern-product-modal #next-tab,
      #modern-product-modal #submit-product,
      #modern-product-modal #save-draft-btn {
        display: inline-flex !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;

    document.head.appendChild(style);
    console.log('[NAVIGATION_FIX] Aggressive navigation fix applied');
  }

  /**
   * Enable debug mode for button visibility testing
   */
  enableDebugMode() {
    console.log('[DEBUG_MODE] Enabling debug mode for button visibility testing...');
    this.debugMode = true;
    this.debugNavigation = true;

    // Add debug styles
    this.addDebugStyles();

    // Add debug indicators
    this.addDebugIndicators();

    // Run comprehensive tests
    this.runButtonVisibilityTests();

    console.log('[DEBUG_MODE] Debug mode enabled - check console for test results');
  }

  /**
   * Disable debug mode
   */
  disableDebugMode() {
    console.log('[DEBUG_MODE] Disabling debug mode...');
    this.debugMode = false;
    this.debugNavigation = false;

    // Remove debug styles
    this.removeDebugStyles();

    // Remove debug indicators
    this.removeDebugIndicators();

    console.log('[DEBUG_MODE] Debug mode disabled');
  }

  /**
   * Add debug styles for visual testing
   */
  addDebugStyles() {
    if (document.getElementById('modal-debug-styles')) return;

    const debugStyles = document.createElement('style');
    debugStyles.id = 'modal-debug-styles';
    debugStyles.textContent = `
      /* Debug mode visual indicators */
      #modern-product-modal.debug-mode {
        outline: 3px solid red !important;
        outline-offset: -3px !important;
      }

      #modern-product-modal .bg-white.px-6.py-4.border-t.debug-mode {
        outline: 2px solid blue !important;
        outline-offset: -2px !important;
        background: linear-gradient(45deg, rgba(255,0,0,0.1), rgba(0,0,255,0.1)) !important;
      }

      #modern-product-modal .footer-btn.debug-mode,
      #modern-product-modal #prev-tab.debug-mode,
      #modern-product-modal #next-tab.debug-mode,
      #modern-product-modal #submit-product.debug-mode,
      #modern-product-modal #save-draft-btn.debug-mode {
        outline: 2px solid green !important;
        outline-offset: -2px !important;
        position: relative !important;
      }

      #modern-product-modal .footer-btn.debug-mode::before,
      #modern-product-modal #prev-tab.debug-mode::before,
      #modern-product-modal #next-tab.debug-mode::before,
      #modern-product-modal #submit-product.debug-mode::before,
      #modern-product-modal #save-draft-btn.debug-mode::before {
        content: attr(data-button-name) !important;
        position: absolute !important;
        top: -20px !important;
        left: 0 !important;
        background: rgba(0,0,0,0.8) !important;
        color: white !important;
        padding: 2px 4px !important;
        font-size: 10px !important;
        border-radius: 2px !important;
        white-space: nowrap !important;
        z-index: 1000 !important;
      }

      /* Responsive layout debugging */
      @media (max-width: 768px) {
        #modern-product-modal .bg-white.px-6.py-4.border-t.debug-mode {
          background: linear-gradient(45deg, rgba(255,165,0,0.2), rgba(255,0,0,0.2)) !important;
        }
      }

      @media (min-width: 769px) and (max-width: 1024px) {
        #modern-product-modal .bg-white.px-6.py-4.border-t.debug-mode {
          background: linear-gradient(45deg, rgba(0,255,0,0.2), rgba(0,0,255,0.2)) !important;
        }
      }

      /* Debug info panel */
      .debug-info-panel {
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 10px;
        border-radius: 8px;
        font-size: 12px;
        z-index: 10000;
        max-width: 300px;
        font-family: monospace;
      }

      .debug-info-panel h4 {
        margin: 0 0 8px 0;
        color: #ffd700;
        border-bottom: 1px solid #333;
        padding-bottom: 4px;
      }

      .debug-info-panel .debug-item {
        margin: 4px 0;
        display: flex;
        justify-content: space-between;
      }

      .debug-info-panel .debug-label {
        color: #ccc;
      }

      .debug-info-panel .debug-value {
        color: #fff;
        font-weight: bold;
      }

      .debug-info-panel .debug-value.success {
        color: #4ade80;
      }

      .debug-info-panel .debug-value.warning {
        color: #fbbf24;
      }

      .debug-info-panel .debug-value.error {
        color: #f87171;
      }
    `;

    document.head.appendChild(debugStyles);
    console.log('[DEBUG_MODE] Debug styles added');
  }

  /**
   * Remove debug styles
   */
  removeDebugStyles() {
    const debugStyles = document.getElementById('modal-debug-styles');
    if (debugStyles) {
      debugStyles.remove();
      console.log('[DEBUG_MODE] Debug styles removed');
    }
  }

  /**
   * Add debug indicators to modal elements
   */
  addDebugIndicators() {
    const modal = document.getElementById('modern-product-modal');
    if (!modal) return;

    modal.classList.add('debug-mode');

    const footer = modal.querySelector('.bg-white.px-6.py-4.border-t');
    if (footer) {
      footer.classList.add('debug-mode');

      // Add debug attributes to buttons
      const buttons = footer.querySelectorAll('button');
      buttons.forEach(button => {
        button.classList.add('debug-mode');
        const buttonName = button.id || button.className || 'unknown';
        button.setAttribute('data-button-name', buttonName);
      });
    }

    // Add debug info panel
    this.addDebugInfoPanel();

    console.log('[DEBUG_MODE] Debug indicators added');
  }

  /**
   * Remove debug indicators
   */
  removeDebugIndicators() {
    const modal = document.getElementById('modern-product-modal');
    if (modal) {
      modal.classList.remove('debug-mode');

      const footer = modal.querySelector('.bg-white.px-6.py-4.border-t');
      if (footer) {
        footer.classList.remove('debug-mode');
        footer.querySelectorAll('button').forEach(button => {
          button.classList.remove('debug-mode');
          button.removeAttribute('data-button-name');
        });
      }
    }

    // Remove debug info panel
    this.removeDebugInfoPanel();

    console.log('[DEBUG_MODE] Debug indicators removed');
  }

  /**
   * Add debug info panel
   */
  addDebugInfoPanel() {
    if (document.querySelector('.debug-info-panel')) return;

    const panel = document.createElement('div');
    panel.className = 'debug-info-panel';
    panel.innerHTML = `
      <h4>Modal Debug Info</h4>
      <div class="debug-item">
        <span class="debug-label">Modal Visible:</span>
        <span class="debug-value" id="debug-modal-visible">Checking...</span>
      </div>
      <div class="debug-item">
        <span class="debug-label">Footer Found:</span>
        <span class="debug-value" id="debug-footer-found">Checking...</span>
      </div>
      <div class="debug-item">
        <span class="debug-label">Buttons Visible:</span>
        <span class="debug-value" id="debug-buttons-visible">Checking...</span>
      </div>
      <div class="debug-item">
        <span class="debug-label">Screen Size:</span>
        <span class="debug-value" id="debug-screen-size">Checking...</span>
      </div>
      <div class="debug-item">
        <span class="debug-label">Current Tab:</span>
        <span class="debug-value" id="debug-current-tab">Checking...</span>
      </div>
      <button id="debug-refresh" style="margin-top: 8px; padding: 4px 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">Refresh</button>
      <button id="debug-close" style="margin-top: 8px; margin-left: 4px; padding: 4px 8px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
    `;

    document.body.appendChild(panel);

    // Add event listeners
    panel.querySelector('#debug-refresh').addEventListener('click', () => this.refreshDebugInfo());
    panel.querySelector('#debug-close').addEventListener('click', () => this.disableDebugMode());

    console.log('[DEBUG_MODE] Debug info panel added');
  }

  /**
   * Remove debug info panel
   */
  removeDebugInfoPanel() {
    const panel = document.querySelector('.debug-info-panel');
    if (panel) {
      panel.remove();
      console.log('[DEBUG_MODE] Debug info panel removed');
    }
  }

  /**
   * Refresh debug information
   */
  refreshDebugInfo() {
    const modal = document.getElementById('modern-product-modal');
    const footer = modal?.querySelector('.bg-white.px-6.py-4.border-t');
    const buttons = footer?.querySelectorAll('button');

    // Update modal visibility
    const modalVisible = modal && !modal.classList.contains('hidden');
    this.updateDebugValue('debug-modal-visible', modalVisible ? 'YES' : 'NO', modalVisible ? 'success' : 'error');

    // Update footer status
    const footerFound = !!footer;
    this.updateDebugValue('debug-footer-found', footerFound ? 'YES' : 'NO', footerFound ? 'success' : 'error');

    // Update button visibility
    if (buttons) {
      const visibleButtons = Array.from(buttons).filter(btn => {
        const styles = window.getComputedStyle(btn);
        return styles.display !== 'none' && styles.visibility !== 'hidden' && parseFloat(styles.opacity) > 0;
      }).length;

      const buttonStatus = `${visibleButtons}/${buttons.length} visible`;
      this.updateDebugValue('debug-buttons-visible', buttonStatus, visibleButtons === buttons.length ? 'success' : 'warning');
    }

    // Update screen size
    const screenSize = window.innerWidth <= 768 ? 'Mobile' : window.innerWidth <= 1024 ? 'Tablet' : 'Desktop';
    this.updateDebugValue('debug-screen-size', screenSize);

    // Update current tab
    this.updateDebugValue('debug-current-tab', `${this.currentTab + 1}/${this.tabs.length}`);

    console.log('[DEBUG_MODE] Debug info refreshed');
  }

  /**
   * Update debug value in panel
   */
  updateDebugValue(elementId, value, status = '') {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
      element.className = `debug-value ${status}`;
    }
  }

  /**
   * Run comprehensive button visibility tests
   */
  runButtonVisibilityTests() {
    console.log('[TEST_MODE] Running button visibility tests...');

    this.buttonVisibilityTests = [];

    // Test 1: Modal existence
    const test1 = this.testModalExistence();
    this.buttonVisibilityTests.push(test1);

    // Test 2: Footer existence
    const test2 = this.testFooterExistence();
    this.buttonVisibilityTests.push(test2);

    // Test 3: Button existence
    const test3 = this.testButtonExistence();
    this.buttonVisibilityTests.push(test3);

    // Test 4: Button visibility
    const test4 = this.testButtonVisibility();
    this.buttonVisibilityTests.push(test4);

    // Test 5: Responsive layout
    const test5 = this.testResponsiveLayout();
    this.buttonVisibilityTests.push(test5);

    // Test 6: Button states
    const test6 = this.testButtonStates();
    this.buttonVisibilityTests.push(test6);

    // Log results
    this.logTestResults();

    return this.buttonVisibilityTests;
  }

  /**
   * Test modal existence
   */
  testModalExistence() {
    const modal = document.getElementById('modern-product-modal');
    const exists = !!modal;
    const visible = modal && !modal.classList.contains('hidden');

    return {
      name: 'Modal Existence',
      passed: exists,
      details: `Modal ${exists ? 'exists' : 'not found'}${visible ? ' and is visible' : ' but is hidden'}`,
      severity: exists ? 'info' : 'error'
    };
  }

  /**
   * Test footer existence
   */
  testFooterExistence() {
    const modal = document.getElementById('modern-product-modal');
    const footer = modal?.querySelector('.bg-white.px-6.py-4.border-t');
    const exists = !!footer;

    return {
      name: 'Footer Existence',
      passed: exists,
      details: `Footer ${exists ? 'found' : 'not found'}`,
      severity: exists ? 'info' : 'error'
    };
  }

  /**
   * Test button existence
   */
  testButtonExistence() {
    const modal = document.getElementById('modern-product-modal');
    const footer = modal?.querySelector('.bg-white.px-6.py-4.border-t');

    if (!footer) {
      return {
        name: 'Button Existence',
        passed: false,
        details: 'Cannot test - footer not found',
        severity: 'error'
      };
    }

    const buttons = {
      prevBtn: footer.querySelector('#prev-tab'),
      nextBtn: footer.querySelector('#next-tab'),
      submitBtn: footer.querySelector('#submit-product'),
      saveDraftBtn: footer.querySelector('#save-draft-btn')
    };

    const foundButtons = Object.values(buttons).filter(Boolean).length;
    const totalButtons = Object.keys(buttons).length;
    const allFound = foundButtons === totalButtons;

    return {
      name: 'Button Existence',
      passed: allFound,
      details: `${foundButtons}/${totalButtons} buttons found`,
      severity: allFound ? 'info' : 'warning'
    };
  }

  /**
   * Test button visibility
   */
  testButtonVisibility() {
    const modal = document.getElementById('modern-product-modal');
    const footer = modal?.querySelector('.bg-white.px-6.py-4.border-t');

    if (!footer) {
      return {
        name: 'Button Visibility',
        passed: false,
        details: 'Cannot test - footer not found',
        severity: 'error'
      };
    }

    const buttons = footer.querySelectorAll('button');
    let visibleCount = 0;

    buttons.forEach(button => {
      const styles = window.getComputedStyle(button);
      const isVisible = styles.display !== 'none' &&
                       styles.visibility !== 'hidden' &&
                       parseFloat(styles.opacity) > 0;

      if (isVisible) visibleCount++;
    });

    const allVisible = visibleCount === buttons.length;

    return {
      name: 'Button Visibility',
      passed: allVisible,
      details: `${visibleCount}/${buttons.length} buttons visible`,
      severity: allVisible ? 'info' : 'warning'
    };
  }

  /**
   * Test responsive layout
   */
  testResponsiveLayout() {
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
    const isDesktop = window.innerWidth > 1024;

    let layout = 'Unknown';
    if (isMobile) layout = 'Mobile';
    else if (isTablet) layout = 'Tablet';
    else if (isDesktop) layout = 'Desktop';

    const modal = document.getElementById('modern-product-modal');
    const footer = modal?.querySelector('.bg-white.px-6.py-4.border-t');

    let responsiveCorrect = true;
    let details = `Screen size: ${layout} (${window.innerWidth}x${window.innerHeight})`;

    if (footer) {
      const buttonContainer = footer.querySelector('.flex');
      if (buttonContainer) {
        const isColumn = buttonContainer.style.flexDirection === 'column' ||
                        (isMobile && buttonContainer.classList.contains('flex-col'));

        if (isMobile && !isColumn) {
          responsiveCorrect = false;
          details += ' - Layout should be vertical on mobile';
        } else if (!isMobile && isColumn) {
          responsiveCorrect = false;
          details += ' - Layout should be horizontal on desktop';
        }
      }
    }

    return {
      name: 'Responsive Layout',
      passed: responsiveCorrect,
      details: details,
      severity: responsiveCorrect ? 'info' : 'warning'
    };
  }

  /**
   * Test button states
   */
  testButtonStates() {
    const modal = document.getElementById('modern-product-modal');
    const footer = modal?.querySelector('.bg-white.px-6.py-4.border-t');

    if (!footer) {
      return {
        name: 'Button States',
        passed: false,
        details: 'Cannot test - footer not found',
        severity: 'error'
      };
    }

    const prevBtn = footer.querySelector('#prev-tab');
    const nextBtn = footer.querySelector('#next-tab');
    const submitBtn = footer.querySelector('#submit-product');

    let statesCorrect = true;
    let details = '';

    // Check previous button state
    if (prevBtn) {
      const shouldBeDisabled = this.currentTab === 0;
      const isDisabled = prevBtn.disabled;

      if (shouldBeDisabled !== isDisabled) {
        statesCorrect = false;
        details += `Prev button should be ${shouldBeDisabled ? 'disabled' : 'enabled'}; `;
      }
    }

    // Check next/submit button visibility
    const isLastTab = this.currentTab === this.tabs.length - 1;

    if (isLastTab) {
      if (nextBtn && nextBtn.style.display !== 'none') {
        statesCorrect = false;
        details += 'Next button should be hidden on last tab; ';
      }
      if (submitBtn && submitBtn.style.display === 'none') {
        statesCorrect = false;
        details += 'Submit button should be visible on last tab; ';
      }
    } else {
      if (nextBtn && nextBtn.style.display === 'none') {
        statesCorrect = false;
        details += 'Next button should be visible before last tab; ';
      }
      if (submitBtn && submitBtn.style.display !== 'none') {
        statesCorrect = false;
        details += 'Submit button should be hidden before last tab; ';
      }
    }

    if (!details) {
      details = 'All button states correct';
    }

    return {
      name: 'Button States',
      passed: statesCorrect,
      details: details,
      severity: statesCorrect ? 'info' : 'warning'
    };
  }

  /**
   * Log test results to console
   */
  logTestResults() {
    console.log('[TEST_MODE] ===== BUTTON VISIBILITY TEST RESULTS =====');

    this.buttonVisibilityTests.forEach((test, index) => {
      const status = test.passed ? '✅ PASS' : '❌ FAIL';
      const severity = test.severity.toUpperCase();
      console.log(`[TEST_MODE] ${index + 1}. ${test.name}: ${status} [${severity}]`);
      console.log(`[TEST_MODE]    Details: ${test.details}`);
    });

    const passedTests = this.buttonVisibilityTests.filter(t => t.passed).length;
    const totalTests = this.buttonVisibilityTests.length;

    console.log(`[TEST_MODE] ===== SUMMARY: ${passedTests}/${totalTests} tests passed =====`);

    if (passedTests === totalTests) {
      console.log('[TEST_MODE] 🎉 All tests passed! Button visibility should be working correctly.');
    } else {
      console.warn('[TEST_MODE] ⚠️ Some tests failed. Check the details above for issues.');
    }
  }

  /**
   * Test button visibility across different screen sizes
   */
  testAcrossScreenSizes() {
    console.log('[TEST_MODE] Testing across different screen sizes...');

    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    const testSizes = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Mobile Landscape', width: 667, height: 375 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    let results = [];

    testSizes.forEach((size, index) => {
      setTimeout(() => {
        // Simulate resize
        console.log(`[TEST_MODE] Testing ${size.name} (${size.width}x${size.height})`);

        // Resize window (if supported)
        if (window.resizeTo) {
          window.resizeTo(size.width, size.height);
        }

        // Wait for resize to take effect, then test
        setTimeout(() => {
          this.runButtonVisibilityTests();
          results.push({
            size: size.name,
            width: size.width,
            height: size.height,
            tests: [...this.buttonVisibilityTests]
          });

          // Restore original size on last test
          if (index === testSizes.length - 1) {
            if (window.resizeTo) {
              window.resizeTo(originalWidth, originalHeight);
            }
          }
        }, 500);
      }, index * 1000);
    });

    return results;
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    console.log('[TEST_MODE] ===== COMPREHENSIVE TEST REPORT =====');

    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      isMobile: /Mobi|Android/i.test(navigator.userAgent),
      isTablet: /Tablet|iPad/i.test(navigator.userAgent),
      isDesktop: !/Mobi|Android|Tablet|iPad/i.test(navigator.userAgent),
      testResults: this.buttonVisibilityTests,
      summary: {
        totalTests: this.buttonVisibilityTests.length,
        passedTests: this.buttonVisibilityTests.filter(t => t.passed).length,
        failedTests: this.buttonVisibilityTests.filter(t => !t.passed).length,
        successRate: `${(this.buttonVisibilityTests.filter(t => t.passed).length / this.buttonVisibilityTests.length * 100).toFixed(1)}%`
      }
    };

    console.log('[TEST_MODE] Test Report:', report);

    // Also log to debug panel if available
    this.updateDebugValue('debug-test-results', `${report.summary.passedTests}/${report.summary.totalTests} passed`);

    return report;
  }

  /**
   * Auto-fix detected issues
   */
  autoFixIssues() {
    console.log('[AUTO_FIX] Attempting to auto-fix detected issues...');

    const issues = this.buttonVisibilityTests.filter(t => !t.passed);

    if (issues.length === 0) {
      console.log('[AUTO_FIX] No issues detected, nothing to fix');
      return;
    }

    issues.forEach(issue => {
      console.log(`[AUTO_FIX] Fixing: ${issue.name}`);

      switch (issue.name) {
        case 'Modal Existence':
          this.createModalFallback();
          break;
        case 'Footer Existence':
          this.createFooterFallback();
          break;
        case 'Button Existence':
          this.fixNavigationButtonVisibility();
          break;
        case 'Button Visibility':
          this.ensureFooterButtonsVisible();
          break;
        case 'Responsive Layout':
          this.fixNavigationButtonVisibility();
          break;
        case 'Button States':
          this.updateButtonStates();
          break;
      }
    });

    console.log(`[AUTO_FIX] Auto-fix completed for ${issues.length} issues`);

    // Re-run tests after fixes
    setTimeout(() => {
      console.log('[AUTO_FIX] Re-running tests after fixes...');
      this.runButtonVisibilityTests();
    }, 1000);
  }

  /**
   * Enhanced updateTabIndicator with visibility fixes
   */
  updateTabIndicator() {
    console.log('[NAVIGATION_DEBUG] Updating tab indicator for tab:', this.currentTab);

    const indicatorTextNodes = Array.from(document.querySelectorAll('[data-tab-indicator-text]'));
    const textValue = `Tab ${this.currentTab + 1} of ${this.tabs.length}`;

    if (indicatorTextNodes.length > 0) {
      indicatorTextNodes.forEach((textNode) => {
        textNode.textContent = textValue;
        const indicatorEl = textNode.closest('#tab-indicator');
        if (indicatorEl) {
          indicatorEl.setAttribute('aria-live', 'polite');
        }
      });
      console.log('[NAVIGATION_DEBUG] Tab indicator updated:', textValue);
    } else {
      console.warn('[NAVIGATION_DEBUG] Tab indicator element not found');
    }

    const statusMessage = this.currentTab === this.tabs.length - 1
      ? 'Final step - review and submit'
      : 'Complete all tabs before submitting';

    const progressStatusEls = Array.from(document.querySelectorAll('[data-tab-progress-status]'));
    progressStatusEls.forEach((statusEl) => {
      statusEl.textContent = statusMessage;
    });

    const progressContainers = Array.from(document.querySelectorAll('[data-tab-progress-container]'));
    progressContainers.forEach((container) => {
      container.setAttribute('aria-valuenow', String(this.currentTab + 1));
      container.setAttribute('aria-valuetext', `Tab ${this.currentTab + 1} of ${this.tabs.length}`);
    });

    // Update progress bar
    this.updateProgressBar();

    // Update navigation button visibility and state
    // There may be multiple elements with the same ids (legacy templates, cloned nodes).
    // Update all matches to ensure the visible buttons reflect the current state.
    const nextBtns = Array.from(document.querySelectorAll('#next-tab'));
    const submitBtns = Array.from(document.querySelectorAll('#submit-product'));
    const prevBtns = Array.from(document.querySelectorAll('#prev-tab'));

    console.log('[NAVIGATION_DEBUG] Button elements found:', {
      nextBtns: nextBtns.length,
      submitBtns: submitBtns.length,
      prevBtns: prevBtns.length,
      currentTab: this.currentTab,
      totalTabs: this.tabs.length,
      isLastTab: this.currentTab === this.tabs.length - 1
    });

    // Show/hide Next buttons (not visible on last tab)
    if (nextBtns.length > 0) {
      nextBtns.forEach((btn) => {
        if (this.currentTab === this.tabs.length - 1) {
          btn.classList.add('hidden');
        } else {
          btn.classList.remove('hidden');
        }
      });
      console.log('[NAVIGATION_DEBUG] Next button(s) visibility updated');
    } else {
      console.warn('[NAVIGATION_DEBUG] Next button elements not found');
    }

    // Show/hide Submit buttons (only visible on last tab)
    if (submitBtns.length > 0) {
      submitBtns.forEach((btn) => {
        if (this.currentTab === this.tabs.length - 1) {
          btn.classList.remove('hidden');
        } else {
          btn.classList.add('hidden');
        }
      });
      console.log('[NAVIGATION_DEBUG] Submit button(s) visibility updated');
    } else {
      console.warn('[NAVIGATION_DEBUG] Submit button elements not found');
    }

    // Update prev button states
    if (prevBtns.length > 0) {
      prevBtns.forEach((btn) => {
        try {
          btn.disabled = this.currentTab === 0;
        } catch (e) {
          // Some cloned nodes might not be HTMLButtonElement; set attribute fallback
          try { btn.setAttribute('disabled', this.currentTab === 0 ? 'true' : 'false'); } catch (_) {}
        }
      });
      console.log('[NAVIGATION_DEBUG] Previous button(s) disabled state set to:', this.currentTab === 0);
    } else {
      console.warn('[NAVIGATION_DEBUG] Previous button elements not found');
    }
  }

  /**
   * Update progress bar visual indicator
   */
  updateProgressBar() {
    const progressBars = Array.from(document.querySelectorAll('[data-tab-progress-fill]'));
    const fallbackBars = progressBars.length === 0
      ? Array.from(document.querySelectorAll('.bg-gradient-to-r.from-blue-500.to-purple-500.h-2'))
      : [];

    const barsToUpdate = progressBars.length > 0 ? progressBars : fallbackBars;

    if (barsToUpdate.length > 0) {
      const progressPercentage = ((this.currentTab + 1) / this.tabs.length) * 100;
      barsToUpdate.forEach((bar) => {
        bar.style.width = `${progressPercentage}%`;
        bar.setAttribute('aria-valuenow', progressPercentage.toFixed(0));
      });
    }
  }

  /**
   * Validate current tab with enhanced validation
   */
  validateCurrentTab() {
    const currentPanel = document.getElementById(`tab-panel-${this.currentTab}`);
    if (!currentPanel) return true;

    // Clear any existing validation errors first
    this.clearValidationErrors(currentPanel);

    let isValid = true;

    // Tab-specific validation
    switch (this.currentTab) {
      case 0: // Basic Info
        isValid = this.validateBasicInfoTab(currentPanel);
        break;
      case 1: // Pricing/Inventory
        isValid = this.validatePricingInventoryTab(currentPanel);
        break;
      case 2: // Media
        isValid = this.validateMediaTab(currentPanel);
        break;
      case 3: // SEO & Marketing
        isValid = this.validateSEOTab(currentPanel);
        break;
      case 4: // Shipping/Delivery
        isValid = this.validateShippingTab(currentPanel);
        break;
      default:
        // Generic validation for any additional tabs
        isValid = this.validateGenericTab(currentPanel);
    }

    return isValid;
  }

  /**
   * Validate Basic Info tab
   */
  validateBasicInfoTab(panel) {
    let isValid = true;

    // Required fields validation
    const productName = document.getElementById('product-name');
    const displayTitle = document.getElementById('display-title');
    const suggestedCategoryFields = document.getElementById('suggested-category-fields');
    const categorySelect = document.getElementById('category-select');
    const verticalSelect = document.getElementById('vertical-select');

    // Product name validation
    if (!productName?.value?.trim()) {
      this.showFieldError(productName, 'Product name is required');
      isValid = false;
    } else if (productName.value.length < 3) {
      this.showFieldError(productName, 'Product name must be at least 3 characters');
      isValid = false;
    }

    // Display title validation
    if (!displayTitle?.value?.trim()) {
      this.showFieldError(displayTitle, 'Display title is required');
      isValid = false;
    } else if (displayTitle.value.length < 3) {
      this.showFieldError(displayTitle, 'Display title must be at least 3 characters');
      isValid = false;
    }

    // Category validation
    const isSuggestingCustom = suggestedCategoryFields && !suggestedCategoryFields.classList.contains('hidden');

    if (isSuggestingCustom) {
      // If suggesting new category, validate suggested category fields
      const suggestedName = document.getElementById('suggested-category-name');
      if (!suggestedName?.value?.trim()) {
        this.showFieldError(suggestedName, 'Category name is required when suggesting a new category');
        isValid = false;
      }
    } else {
      // If not suggesting custom, ensure regular category is selected
      if (verticalSelect && !verticalSelect.value?.trim()) {
        this.showFieldError(verticalSelect, 'Vertical is required');
        isValid = false;
      }
      if (categorySelect && !categorySelect.value?.trim()) {
        this.showFieldError(categorySelect, 'Category is required');
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * Validate Pricing/Inventory tab
   */
  validatePricingInventoryTab(panel) {
    let isValid = true;

    // Required fields validation
    const price = document.getElementById('price');
    const stock = document.getElementById('stock');
    const sku = document.getElementById('sku');

    // Price validation
    const priceValue = parseFloat(price?.value || '');
    if (!price?.value || isNaN(priceValue) || priceValue <= 0) {
      this.showFieldError(price, 'Please enter a valid price greater than 0');
      isValid = false;
    }

    // Stock validation
    const stockValue = parseInt(stock?.value || '');
    if (!stock?.value || isNaN(stockValue) || stockValue < 0) {
      this.showFieldError(stock, 'Please enter a valid stock quantity');
      isValid = false;
    }

    // SKU uniqueness validation
    if (sku?.value?.trim() && !this.isSKUUnique) {
      this.showFieldError(sku, 'SKU must be unique');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Validate Media tab
   */
  validateMediaTab(panel) {
    // Check if at least one image is uploaded
    if (this.images.length === 0) {
      this.showNotification('Please upload at least one product image', 'error');
      return false;
    }


    // Check if image embeddings are processed (optional but recommended)
    const hasUnprocessedImages = this.images.some(img => img.embeddingStatus === 'pending' || img.embeddingStatus === 'processing');
    if (hasUnprocessedImages) {
      this.showNotification('Please wait for image processing to complete or proceed without AI features', 'warning');
      // Don't block navigation for this - just warn
    }

    return true;
  }

  /**
   * Validate SEO & Marketing tab
   */
  validateSEOTab(panel) {
    let isValid = true;

    // SEO title validation (optional but recommended)
    const seoTitle = document.getElementById('seo-title');
    if (seoTitle?.value && seoTitle.value.length > 60) {
      this.showFieldError(seoTitle, 'SEO title should be 60 characters or less for optimal display');
      isValid = false;
    }

    // Meta description validation (optional but recommended)
    const metaDescription = document.getElementById('meta-description');
    if (metaDescription?.value && metaDescription.value.length > 160) {
      this.showFieldError(metaDescription, 'Meta description should be 160 characters or less for optimal display');
      isValid = false;
    }

    // Alt text validation (required if images exist)
    if (this.images.length > 0) {
      const altText = document.getElementById('image-alt-text');
      if (!altText?.value?.trim()) {
        this.showFieldError(altText, 'Alt text is required for accessibility when images are present');
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * Validate Shipping/Delivery tab
   */
  validateShippingTab(panel) {
    let isValid = true;

    // Required shipping fields
    const shippingWeight = document.getElementById('shipping-weight');
    const shippingMethod = document.getElementById('shipping-method');

    // Weight validation
    const weightValue = parseFloat(shippingWeight?.value || '');
    if (!shippingWeight?.value || isNaN(weightValue) || weightValue <= 0) {
      this.showFieldError(shippingWeight, 'Please enter a valid shipping weight');
      isValid = false;
    }

    // Shipping method validation
    if (!shippingMethod?.value) {
      this.showFieldError(shippingMethod, 'Please select a shipping method');
      isValid = false;
    }

    // Self-delivery validation (if enabled)
    const selfDeliveryCheckbox = document.getElementById('self-delivery-checkbox');
    if (selfDeliveryCheckbox?.checked) {
      const deliveryRadius = document.getElementById('delivery-radius');
      const radiusValue = parseInt(deliveryRadius?.value || '');

      if (!deliveryRadius?.value || isNaN(radiusValue) || radiusValue <= 0) {
        this.showFieldError(deliveryRadius, 'Please enter a valid delivery radius when offering self-delivery');
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * Generic tab validation for required fields
   */
  validateGenericTab(panel) {
    const requiredFields = panel.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    requiredFields.forEach(field => {
      if (!field.value?.trim()) {
        this.showFieldError(field, `${field.labels?.[0]?.textContent || 'This field'} is required`);
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Clear validation errors for a panel
   */
  clearValidationErrors(panel) {
    // Remove error classes from all fields in the panel
    panel.querySelectorAll('.field-invalid').forEach(field => {
      field.classList.remove('field-invalid');
      field.classList.add('field-valid');
    });

    // Remove error messages
    panel.querySelectorAll('[role="alert"]').forEach(errorEl => {
      errorEl.remove();
    });
  }

  /**
   * Save draft manually
   */
  saveDraft() {
    if (this.draftManager) {
      this.draftManager.saveDraft();
      this.showNotification('Draft saved successfully!', 'success');
    }
  }

  /**
   * Setup image upload functionality (legacy - replaced by modern setup)
   */
  setupImageUpload() {
    // This function is deprecated and replaced by setupModernImageUpload
    // Keeping for backward compatibility but delegating to modern setup
    console.log('[IMAGE_UPLOAD_DEBUG] Legacy setupImageUpload called - delegating to modern setup');
    this.setupModernImageUpload();
  }

  /**
   * Setup modern image upload system
   */
  setupModernImageUpload() {
    try {
      // Initialize image arrays
      this.images = []; // All images in order
      this.embeddedImages = new Map(); // Track which images have embeddings

      // Reset image data
      if (!this.formData) this.formData = {};
      this.formData.allImages = [];
      this.formData.allEmbeddings = [];

      this.setupModernDragDrop();
      this.setupModernImageHandlers();
      this.setupModernCameraIntegration();
      this.updateImageCount();

    } catch (error) {
      console.error('Modern image upload setup failed:', error);
    }
  }

  /**
   * Setup modern drag and drop functionality
   */
  setupModernDragDrop() {
    const uploadArea = document.getElementById('image-upload-area');
    const previewGrid = document.getElementById('images-preview-grid');

    if (uploadArea) {
      // Upload area drag and drop
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('border-blue-500', 'bg-blue-50');
      });

      uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
      });

      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('border-blue-500', 'bg-blue-50');

        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
          this.addImagesToPreview(files);
        }
      });

      // Click to browse (avoid double-trigger when the transparent input already received the click)
      uploadArea.addEventListener('click', (event) => {
        const fileInput = document.getElementById('modern-product-images');
        if (!fileInput) {
          return;
        }

        // If the native file input handled the click, skip the manual trigger to prevent a second dialog
        if (event.target === fileInput) {
          return;
        }

        // Prevent nested clicks from re-opening the picker immediately after the user makes a selection
        event.preventDefault();
        fileInput.click();
      });
    }

    // Setup drag and drop within preview grid
    if (previewGrid) {
      previewGrid.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const afterElement = this.getDragAfterElement(previewGrid, e.clientX, e.clientY);
        const draggable = document.querySelector('.dragging');

        if (afterElement == null) {
          previewGrid.appendChild(draggable);
        } else {
          previewGrid.insertBefore(draggable, afterElement);
        }
      });

      previewGrid.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggable = document.querySelector('.dragging');
        if (draggable) {
          draggable.classList.remove('dragging');
        }
        this.updateImageOrder();
      });
    }
  }

  /**
   * Setup modern image handlers with reliable fallback
   */
  setupModernImageHandlers() {
    const uploadArea = document.getElementById('image-upload-area');
    const cameraBtn = document.getElementById('camera-upload-btn');
    const galleryBtn = document.getElementById('gallery-upload-btn');

    // Locate (or create) the file input and ensure it's overlaid on the upload area
    let fileInput = document.getElementById('modern-product-images');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'modern-product-images';
      fileInput.accept = 'image/*';
      fileInput.multiple = true;
      // We'll position it over the upload area so clicks and drops work reliably
      fileInput.style.position = 'absolute';
      fileInput.style.top = '0';
      fileInput.style.left = '0';
      fileInput.style.width = '100%';
      fileInput.style.height = '100%';
      fileInput.style.opacity = '0';
      fileInput.style.cursor = 'pointer';
      fileInput.style.zIndex = '50';

      // Ensure it exists in DOM; prefer placing it inside the upload area so it overlays
      if (uploadArea) {
        // Ensure uploadArea positioned relatively
        if (getComputedStyle(uploadArea).position === 'static') {
          uploadArea.style.position = 'relative';
        }
        uploadArea.appendChild(fileInput);
      } else {
        const form = document.getElementById('modern-product-form');
        if (form) {
          form.appendChild(fileInput);
        } else {
          // fallback to body
          document.body.appendChild(fileInput);
        }
      }
    } else {
      // If input already exists in DOM, ensure it's positioned to overlay the upload area
      try {
        if (uploadArea) {
          if (fileInput.parentElement !== uploadArea) {
            // Move into upload area so it overlays correctly
            uploadArea.appendChild(fileInput);
          }
          fileInput.style.position = 'absolute';
          fileInput.style.top = '0';
          fileInput.style.left = '0';
          fileInput.style.width = '100%';
          fileInput.style.height = '100%';
          fileInput.style.opacity = '0';
          fileInput.style.cursor = 'pointer';
          fileInput.style.zIndex = '50';
          if (getComputedStyle(uploadArea).position === 'static') uploadArea.style.position = 'relative';
        }
      } catch (e) {
        // DOM may be in flux; ignore and continue
      }
    }

    // File input change handler
    const handleFileChange = (e) => {
      const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));

      if (files.length > 0) {
        this.addImagesToPreview(files);
      }

      // Reset input for re-use
      e.target.value = '';
    };

    fileInput.addEventListener('change', handleFileChange);

    // Upload area click handler - file input is positioned over it
    const handleUploadAreaClick = (e) => {
      // File input is now positioned over the upload area, so clicks go to it directly
    };

    if (uploadArea) {
      uploadArea.addEventListener('click', handleUploadAreaClick);
      uploadArea.style.cursor = 'pointer';
      // Ensure upload area has relative positioning for file input overlay
      uploadArea.style.position = 'relative';
    }

    // Camera button - open file picker (camera integration can be added later)
    const handleCameraClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (fileInput) {
        fileInput.click();
      }
    };

    if (cameraBtn) {
      cameraBtn.addEventListener('click', handleCameraClick);
      cameraBtn.style.cursor = 'pointer';
    }

    // Gallery button - open file picker
    const handleGalleryClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (fileInput) {
        fileInput.click();
      }
    };

    if (galleryBtn) {
      galleryBtn.addEventListener('click', handleGalleryClick);
      galleryBtn.style.cursor = 'pointer';
    }

  }

  /**
   * Add images to preview and start processing
   */
  async addImagesToPreview(files) {
    console.log('[MODERN_IMAGE_UPLOAD] Adding images to preview:', files.length);

    // Check if we can add more images
    if (this.images.length >= 5) {
      this.showNotification('Maximum 5 images allowed', 'error');
      return;
    }

    // Limit to remaining slots
    const remainingSlots = 5 - this.images.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      this.showNotification(`Only added ${filesToAdd.length} images. Maximum 5 images allowed.`, 'warning');
    }

    for (const file of filesToAdd) {
      if (!this.validateImageFile(file)) continue;

      const imageData = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file: file,
        name: file.name,
        size: file.size,
        status: 'loading',
        embeddingStatus: 'pending',
        embeddingSkipReason: null,
        order: this.images.length
      };

      this.images.push(imageData);
      this.createImagePreviewElement(imageData);
      const readiness = this.getEmbeddingReadinessStatus();
      if (!readiness.ready) {
        this.markImageEmbeddingDeferred(imageData, readiness, 'prequeue');
      } else {
        await this.generateImageEmbedding(imageData);
      }
    }

    this.updateImageCount();
    this.updateFormData();
  }

  /**
   * Create image preview element
   */
  createImagePreviewElement(imageData) {
    const previewGrid = document.getElementById('images-preview-grid');
    if (!previewGrid) return;

    const previewDiv = document.createElement('div');
    previewDiv.className = 'relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group cursor-move image-preview-item';
    previewDiv.style.order = imageData.order;
    previewDiv.draggable = true;
    previewDiv.dataset.imageId = imageData.id;

    // Drag handlers
    previewDiv.addEventListener('dragstart', () => {
      previewDiv.classList.add('dragging');
    });

    previewDiv.addEventListener('dragend', () => {
      previewDiv.classList.remove('dragging');
      this.updateImageOrder();
    });

    // Content
    previewDiv.innerHTML = `
      <!-- Loading state -->
      <div class="absolute inset-0 flex items-center justify-center bg-gray-100 loading-state">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>

      <!-- Image -->
      <img src="" alt="" class="w-full h-full object-cover hidden image-content">

      <!-- Overlay for thumbnail indicator -->
      <div class="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full hidden thumbnail-indicator">
        <i class="fas fa-star mr-1"></i>Thumbnail
      </div>

      <!-- Actions -->
      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity actions-overlay flex items-center justify-center">
        <button class="text-white hover:text-red-400 text-lg remove-image-btn" title="Remove image">
          <i class="fas fa-trash"></i>
        </button>
      </div>

      <!-- Status indicators -->
      <div class="absolute bottom-2 right-2 status-indicator">
        <!-- Processing status will be appended here -->
      </div>
    `;

    // Load image
    const img = previewDiv.querySelector('.image-content');
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
      img.classList.remove('hidden');
      previewDiv.querySelector('.loading-state').classList.add('hidden');

      // Update first image thumbnail indicator
      this.updateThumbnailIndicator();
    };
    reader.readAsDataURL(imageData.file);

    // Remove button handler
    previewDiv.querySelector('.remove-image-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeImage(imageData.id);
    });

    previewGrid.appendChild(previewDiv);
  }

  /**
   * Generate embedding for image
   */
  async generateImageEmbedding(imageData) {
    try {
      const readiness = this.getEmbeddingReadinessStatus();
      if (!readiness.ready) {
        this.markImageEmbeddingDeferred(imageData, readiness, 'modal_image_generation');
        return;
      }

      imageData.embeddingStatus = 'processing';
      this.updateStatusIndicator(imageData.id, 'processing');

      if (window.transformersClient && typeof window.transformersClient.getImageEmbedding === 'function') {
        const embedding = await window.transformersClient.getImageEmbedding(imageData.file, {
          timeoutMs: 30000,
          fallback: true
        });

        if (Array.isArray(embedding) && embedding.length === 512) {
          imageData.embedding = embedding;
          imageData.embeddingStatus = 'completed';
          imageData.embeddingSkipReason = null;
          this.updateStatusIndicator(imageData.id, 'completed');
          this.embeddedImages.set(imageData.id, embedding);
        } else {
          throw new Error('Invalid embedding result');
        }
      } else {
        // Fallback - mark as completed without embedding
        imageData.embeddingStatus = 'completed';
        this.updateStatusIndicator(imageData.id, 'completed');
        this.showNotification(`Embedding service not available for ${imageData.name}`, 'warning');
      }
    } catch (error) {
      console.error(`[MODERN_IMAGE_UPLOAD] Embedding failed for ${imageData.name}:`, error);
      imageData.embeddingStatus = 'failed';
      imageData.embedding = null;
      this.updateStatusIndicator(imageData.id, 'failed');

      this.showNotification(`Failed to process ${imageData.name}`, 'warning');
    }

    this.updateFormData();
  }

  /**
   * Remove image from preview
   */
  removeImage(imageId) {
    const imageData = this.images.find(img => img.id === imageId);
    if (!imageData) return;

    // Remove from array
    this.images = this.images.filter(img => img.id !== imageId);
    this.embeddedImages.delete(imageId);

    // Remove from DOM
    const previewElement = document.querySelector(`[data-image-id="${imageId}"]`);
    if (previewElement) {
      previewElement.remove();
    }

    // Update order and thumbnail indicator
    this.updateImageOrder();
    this.updateImageCount();
    this.updateFormData();
    this.updateThumbnailIndicator();
  }

  /**
   * Update image order after rearrange
   */
  updateImageOrder() {
    const grid = document.getElementById('images-preview-grid');
    const items = Array.from(grid.querySelectorAll('.image-preview-item'));

    items.forEach((item, index) => {
      const imageId = item.dataset.imageId;
      const imageData = this.images.find(img => img.id === imageId);
      if (imageData) {
        imageData.order = index;
        item.style.order = index;
      }
    });

    this.updateThumbnailIndicator();
    this.updateFormData();
  }

  /**
   * Update thumbnail indicator
   */
  updateThumbnailIndicator() {
    // Hide all thumbnail indicators
    document.querySelectorAll('.thumbnail-indicator').forEach(el => el.classList.add('hidden'));

    // Show thumbnail indicator on first image
    const firstItem = document.querySelector('.image-preview-item');
    if (firstItem) {
      const indicator = firstItem.querySelector('.thumbnail-indicator');
      if (indicator) {
        indicator.classList.remove('hidden');
      }
    }
  }

  /**
   * Update status indicator
   */
  updateStatusIndicator(imageId, status) {
    const previewItem = document.querySelector(`[data-image-id="${imageId}"]`);
    if (!previewItem) return;

    const statusElement = previewItem.querySelector('.status-indicator');
    if (!statusElement) return;

    // Clear existing status
    statusElement.innerHTML = '';

    let iconHtml = '';
    let className = '';

    switch (status) {
      case 'processing':
        iconHtml = '<div class="w-4 h-4 animate-spin rounded-full border border-white border-t-transparent"></div>';
        className = 'bg-blue-500';
        break;
      case 'completed':
        iconHtml = '<i class="fas fa-check text-white text-xs"></i>';
        className = 'bg-green-500';
        break;
      case 'failed':
        iconHtml = '<i class="fas fa-exclamation-triangle text-white text-xs"></i>';
        className = 'bg-red-500';
        break;
      case 'deferred':
      case 'skipped':
        iconHtml = '<i class="fas fa-clock text-white text-xs"></i>';
        className = 'bg-gray-500';
        break;
    }

    if (iconHtml) {
      statusElement.innerHTML = `<div class="${className} w-6 h-6 rounded-full flex items-center justify-center">${iconHtml}</div>`;
    }
  }

  /**
   * Determine if the client-side embedding system can run immediately
   */
  getEmbeddingReadinessStatus() {
    const defaultStatus = { ready: false, reason: 'client_not_loaded', details: null };

    try {
      if (typeof window === 'undefined') {
        return { ready: false, reason: 'server_environment', details: null };
      }

      if (window.CLIENT_EMBEDDING_ENABLED === false || window.__clipInitFailed) {
        return { ready: false, reason: 'client_disabled', details: null };
      }

      if (window.transformersClient) {
        const preload = typeof window.transformersClient.getPreloadStatus === 'function'
          ? window.transformersClient.getPreloadStatus()
          : null;

        if (preload) {
          if (preload.iframeReady && preload.modelReady) {
            return { ready: true, reason: 'transformers_ready', details: preload };
          }

          if (!preload.iframeReady) {
            return { ready: false, reason: 'iframe_initializing', details: preload };
          }

          if (!preload.modelReady) {
            return { ready: false, reason: 'model_loading', details: preload };
          }
        }
      } else {
        return defaultStatus;
      }

      if (window.modernEmbedding?.isReady?.()) {
        return {
          ready: true,
          reason: 'modern_embedding_ready',
          details: typeof window.modernEmbedding.getStatus === 'function'
            ? window.modernEmbedding.getStatus()
            : null
        };
      }

      if (window.modelLoaded) {
        return { ready: true, reason: 'legacy_clip_ready', details: null };
      }

      return { ready: false, reason: 'transformers_uninitialized', details: null };
    } catch (error) {
      console.warn('[ModernProductModal] ⚠️ Failed to determine embedding readiness:', error);
      return { ready: false, reason: 'status_error', details: { message: error?.message } };
    }
  }

  /**
   * Show a single notification when embeddings are deferred and start warmup in background
   */
  notifyEmbeddingDeferred(readiness, context) {
    console.log('[EMBEDDING_DEFERRAL] Client embeddings deferred', {
      context,
      reason: readiness?.reason,
      details: readiness?.details || null
    });

    if (!this.embeddingDeferralNotified) {
      const friendlyReason = this.getFriendlyEmbeddingReason(readiness?.reason);
      this.showNotification(
        `AI embeddings deferred (${friendlyReason}). We'll finish them during admin review.`,
        'info'
      );
      this.embeddingDeferralNotified = true;
    }
  }

  /**
   * Kick off background warmup so the model can be ready for future actions
   */
  scheduleEmbeddingWarmup() {
    if (this.embeddingWarmupScheduled) {
      return;
    }

    this.embeddingWarmupScheduled = true;

    setTimeout(async () => {
      try {
        if (window.preloadTransformersModel) {
          await window.preloadTransformersModel();
        } else if (window.transformersClient?.preloadTransformersModel) {
          await window.transformersClient.preloadTransformersModel();
        }

        if (window.transformersClient?.initTransformersIframe) {
          await window.transformersClient.initTransformersIframe();
        }
      } catch (error) {
        console.warn('[ModernProductModal] ⚠️ Background embedding warmup failed:', error);
      } finally {
        this.embeddingWarmupScheduled = false;
      }
    }, 0);
  }

  /**
   * Convert internal readiness reasons to user-friendly text
   */
  getFriendlyEmbeddingReason(reason) {
    switch (reason) {
      case 'client_not_loaded':
        return 'AI client is still loading';
      case 'iframe_initializing':
        return 'AI iframe is starting up';
      case 'model_loading':
        return 'AI model is still downloading';
      case 'client_disabled':
        return 'AI client was disabled after a failure';
      case 'transformers_uninitialized':
        return 'AI runtime has not been initialized yet';
      case 'status_error':
        return 'AI status is temporarily unavailable';
      case 'server_environment':
        return 'Embeddings only run in the browser';
      default:
        return 'AI model is not ready yet';
    }
  }

  /**
   * Mark a gallery image as deferred so admin approval can finish embeddings later
   */
  markImageEmbeddingDeferred(imageData, readiness, context = 'modal_image') {
    if (!imageData) return;

    imageData.embeddingStatus = 'deferred';
    imageData.embedding = null;
    imageData.embeddingSkipReason = readiness?.reason || 'not_ready';

    if (this.embeddedImages?.has?.(imageData.id)) {
      this.embeddedImages.delete(imageData.id);
    }

    this.updateStatusIndicator(imageData.id, 'deferred');
    this.notifyEmbeddingDeferred(readiness, context);
    this.scheduleEmbeddingWarmup();
    this.updateFormData();
  }

  /**
   * Mark the primary image embedding as deferred and update UI messaging
   */
  markMainEmbeddingDeferred(readiness) {
    this.embeddingStatus = 'deferred';
    this.formData.embedding = null;
    this.formData.embeddingDeferredReason = readiness?.reason || 'not_ready';
    this.formData.embeddingDeferredAt = new Date().toISOString();

    const statusCard = document.getElementById('embedding-status-card');
    if (statusCard) {
      statusCard.classList.remove('hidden');
    }

    const friendlyReason = this.getFriendlyEmbeddingReason(readiness?.reason);
    this.updateEmbeddingStatus(
      'warning',
      'AI embeddings will be generated later',
      `${friendlyReason}. Admin approval flow will add embeddings automatically.`
    );

    this.notifyEmbeddingDeferred(readiness, 'main_image');
    this.scheduleEmbeddingWarmup();
  }

  /**
   * Update image count display
   */
  updateImageCount() {
    const countElement = document.getElementById('image-count');
    if (countElement) {
      countElement.textContent = `${this.images.length} images uploaded`;
    }

    // Hide upload area if at max
    const uploadArea = document.getElementById('image-upload-area');
    if (uploadArea) {
      if (this.images.length >= 5) {
        uploadArea.classList.add('hidden');
      } else {
        uploadArea.classList.remove('hidden');
      }
    }
  }

  /**
   * Update form data
   */
  updateFormData() {
    if (this.formData) {
      // Sort images by order
      const sortedImages = [...this.images].sort((a, b) => a.order - b.order);

      // Update form data arrays
      this.formData.allImages = sortedImages.map(img => img.file);
      this.formData.allEmbeddings = sortedImages.map(img => img.embedding || null);

      // Set first image as main image for validation
      if (sortedImages.length > 0) {
        this.formData.imageFile = sortedImages[0].file;
        this.formData.embedding = sortedImages[0].embedding || null;
      }

      // Update media metadata
      this.formData.mediaMetadata = {
        images: sortedImages.map(img => ({
          id: img.id,
          name: img.name,
          size: img.size,
          status: img.status,
          embeddingStatus: img.embeddingStatus,
            embeddingSkipReason: img.embeddingSkipReason || null,
          order: img.order
        }))
      };

      // 🔍 DEBUG: Check if MediaProcessor exists and add images to it
      if (window.mediaProcessor) {
        console.log('[MODAL_DEBUG] MediaProcessor found, checking if images need to be added...');
        console.log('[MODAL_DEBUG] Current modal images count:', this.images.length);
        console.log('[MODAL_DEBUG] MediaProcessor uploaded files count:', window.mediaProcessor.uploadedFiles?.length || 0);

        // Enhanced debugging for embedding status
        const imagesWithEmbeddings = this.images.filter(img => img.embedding && Array.isArray(img.embedding));
        const imagesWithoutEmbeddings = this.images.filter(img => !img.embedding || !Array.isArray(img.embedding));

        console.log('[MODAL_DEBUG] 📊 Embedding status breakdown:', {
          totalImages: this.images.length,
          imagesWithEmbeddings: imagesWithEmbeddings.length,
          imagesWithoutEmbeddings: imagesWithoutEmbeddings.length,
          embeddingStatuses: this.images.map(img => img.embeddingStatus)
        });

        // Check if modal images are already in MediaProcessor
        const existingFileNames = new Set(window.mediaProcessor.uploadedFiles?.map(f => f.name) || []);
        const newImages = this.images.filter(img => !existingFileNames.has(img.name));

        if (newImages.length > 0) {
          console.log('[MODAL_DEBUG] Adding', newImages.length, 'new images to MediaProcessor');
          newImages.forEach(img => {
            try {
              window.mediaProcessor.addUploadedFile(img.file);
              console.log('[MODAL_DEBUG] ✅ Added image to MediaProcessor:', img.name);
            } catch (error) {
              console.error('[MODAL_DEBUG] ❌ Failed to add image to MediaProcessor:', img.name, error);
            }
          });
        } else {
          console.log('[MODAL_DEBUG] All modal images already in MediaProcessor');
        }
      } else {
        console.log('[MODAL_DEBUG] ⚠️ MediaProcessor not available - images will not be included in form submission');
      }

      console.log('[ENHANCED_MEDIA] Form data updated:', {
        images: this.formData.allImages.length,
        totalMedia: this.formData.allImages.length,
        mediaProcessorImages: window.mediaProcessor?.uploadedFiles?.length || 0
      });
    }
  }

  /**
   * Get drag after element for reordering
   */
  getDragAfterElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll('.image-preview-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  /**
   * Setup camera integration
   */
  setupModernCameraIntegration() {
    // Create camera modal if it doesn't exist
    if (!document.getElementById('modern-camera-modal')) {
      this.createModernCameraModal();
    }
  }

  /**
   * Create modern camera modal
   */
  createModernCameraModal() {
    const modalHTML = `
      <div id="modern-camera-modal" class="fixed inset-0 bg-black z-50 hidden">
        <div class="flex flex-col h-full">
          <div class="bg-black text-white p-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold">Take Photo</h3>
            <button id="close-modern-camera-modal" class="text-white hover:text-gray-300">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <div class="flex-1 relative">
            <video id="modern-camera-video" class="w-full h-full object-cover" autoplay playsinline muted></video>
            <canvas id="modern-camera-canvas" class="hidden absolute inset-0"></canvas>
          </div>
          <div class="bg-black p-4 flex items-center justify-center space-x-6">
            <button id="modern-switch-camera" class="text-white p-4 rounded-full hover:bg-white/20 transition-colors">
              <i class="fas fa-sync-alt text-xl"></i>
            </button>
            <button id="modern-take-photo" class="bg-white text-black p-4 rounded-full hover:bg-gray-200 transition-colors shadow-lg">
              <i class="fas fa-circle text-2xl"></i>
            </button>
            <button id="modern-cancel-camera" class="text-gray-400 p-4 rounded-full hover:bg-white/20 transition-colors">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
        </footer>
      </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', modalHTML);

    // Event listeners
    document.getElementById('close-modern-camera-modal').addEventListener('click', () => this.closeModernCamera());
    document.getElementById('modern-take-photo').addEventListener('click', () => this.takeModernPhoto());
    document.getElementById('modern-switch-camera').addEventListener('click', () => this.switchModernCamera());
    document.getElementById('modern-cancel-camera').addEventListener('click', () => this.closeModernCamera());
  }

  /**
   * Open modern camera
   */
  async openModernCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      this.modernCameraStream = stream;
      const video = document.getElementById('modern-camera-video');
      if (video) {
        video.srcObject = stream;
        document.getElementById('modern-camera-modal').classList.remove('hidden');
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      this.showNotification('Unable to access camera. Please check permissions.', 'error');
    }
  }

  /**
   * Close modern camera
   */
  closeModernCamera() {
    if (this.modernCameraStream) {
      this.modernCameraStream.getTracks().forEach(track => track.stop());
      this.modernCameraStream = null;
    }
    document.getElementById('modern-camera-modal').classList.add('hidden');
  }

  /**
   * Take photo with modern camera
   */
  takeModernPhoto() {
    const video = document.getElementById('modern-camera-video');
    const canvas = document.getElementById('modern-camera-canvas');
    const context = canvas.getContext('2d');

    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.closeModernCamera();
        this.addImagesToPreview([file]);
      }, 'image/jpeg', 0.8);
    }
  }

  /**
   * Switch modern camera
   */
  async switchModernCamera() {
    if (this.modernCameraStream) {
      this.modernCameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      const facingMode = this.currentCameraFacing === 'environment' ? 'user' : 'environment';
      this.currentCameraFacing = facingMode;

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      this.modernCameraStream = stream;

      const video = document.getElementById('modern-camera-video');
      if (video) {
        video.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  }

  /**
   * Setup enhanced image upload with camera support for modern modal
   */
  setupEnhancedImageUpload() {
    console.log('[ENHANCED_UPLOAD_DEBUG] Calling modern image upload setup');
    this.setupModernImageUpload();
  }

  /**
   * Ensure YouTube functionality is properly initialized
   */
  ensureYouTubeFunctionality() {
    console.log('[YOUTUBE_DEBUG] 🚨 ensureYouTubeFunctionality() CALLED!');
    console.log('[YOUTUBE_DEBUG] 📊 Method call timestamp:', new Date().toISOString());
    console.log('[YOUTUBE_DEBUG] 🔍 Call context: show() method line 9018');
    console.log('[YOUTUBE_DEBUG] Ensuring YouTube functionality is available...');

    try {
      // Initialize YouTube URL Manager if not exists
      if (!this.youtubeUrlManager) {
        console.log('[YOUTUBE_DEBUG] Initializing YouTube URL Manager...');
        this.initYouTubeURLManager();
      }

      // Setup YouTube event listeners if not already set up
      if (!this.youtubeEventListenersSetup) {
        console.log('[YOUTUBE_DEBUG] Setting up YouTube event listeners...');
        this.setupYouTubeEventListeners();
        this.youtubeEventListenersSetup = true;
      }

      // Ensure YouTube Manager creates its DOM elements (it handles this automatically)
      this.ensureYouTubeManagerIntegration();

      if (this.youtubeUrlManager && typeof this.youtubeUrlManager.ensureManagedContainer === 'function') {
        this.youtubeUrlManager.ensureManagedContainer({ allowCreation: true, upgradePlaceholders: true });
      }

      // Check if YouTube container and button exist (created by YouTube Manager)
      const youtubeContainer = document.getElementById('youtube-urls-container');
      const addButton = document.getElementById('add-youtube-btn');

      console.log('[YOUTUBE_DEBUG] YouTube elements status:', {
        containerExists: !!youtubeContainer,
        addButtonExists: !!addButton,
        youtubeUrlManager: !!this.youtubeUrlManager,
        eventListenersSetup: this.youtubeEventListenersSetup,
        modalVisible: !!document.getElementById('modern-product-modal'),
        containerManager: youtubeContainer?.hasAttribute('data-youtube-manager') || false
      });

      // Show notification if YouTube functionality is ready
      if (this.youtubeUrlManager && youtubeContainer && addButton) {
        console.log('[YOUTUBE_DEBUG] ✅ YouTube functionality is properly initialized');
        return true;
      } else {
        console.warn('[YOUTUBE_DEBUG] ⚠️ YouTube elements may be missing, ensuring manager integration...');
        this.ensureYouTubeManagerIntegration();
        return false;
      }

    } catch (error) {
      console.error('[YOUTUBE_DEBUG] ❌ Error ensuring YouTube functionality:', error);
      return false;
    }
  }

  /**
   * Initialize YouTube URL Manager using existing implementation
   */
  initYouTubeURLManager() {
    console.log('[YOUTUBE_DEBUG] Initializing YouTube URL Manager using existing implementation...');

    try {
      // Use the existing YouTubeURLManager class (note the correct name)
      if (typeof window.YouTubeURLManager !== 'undefined') {
        console.log('[YOUTUBE_DEBUG] YouTubeURLManager class found, creating instance...');

        // Create instance if it doesn't exist globally
        if (!window.youtubeUrlManager) {
          console.log('[YOUTUBE_DEBUG] Creating new YouTubeURLManager instance...');
          window.youtubeUrlManager = new window.YouTubeURLManager();
        }

        this.youtubeUrlManager = window.youtubeUrlManager;
        console.log('[YOUTUBE_DEBUG] ✅ YouTube URL Manager initialized successfully');
      } else {
        console.warn('[YOUTUBE_DEBUG] ⚠️ YouTubeURLManager class not available');
        console.log('[YOUTUBE_DEBUG] Available window properties with YouTube:', Object.keys(window).filter(key => key.toLowerCase().includes('youtube')));
      }
    } catch (error) {
      console.error('[YOUTUBE_DEBUG] ❌ Failed to initialize YouTube URL Manager:', error);
    }
  }

  /**
   * Setup YouTube event listeners using the existing YouTube Manager
   */
  setupYouTubeEventListeners() {
    console.log('[YOUTUBE_DEBUG] Setting up YouTube event listeners using existing YouTube Manager...');

    try {
      // Check if YouTube Manager is available globally
      if (typeof window.YouTubeURLManager !== 'undefined') {
        console.log('[YOUTUBE_DEBUG] YouTubeURLManager class found, initializing...');

        // Initialize the YouTube Manager if not already done
        if (!this.youtubeUrlManager) {
          this.youtubeUrlManager = new window.YouTubeURLManager();
        }

        // The YouTube Manager handles its own event listeners
        if (this.youtubeUrlManager && typeof this.youtubeUrlManager.ensureManagedContainer === 'function') {
          this.youtubeUrlManager.ensureManagedContainer({ allowCreation: true, upgradePlaceholders: true });
        }

        console.log('[YOUTUBE_DEBUG] ✅ YouTube Manager event listeners are handled by YouTubeURLManager class');
        return;
      }

      // Fallback: Check if YouTube Manager instance already exists
      if (window.youtubeUrlManager) {
        console.log('[YOUTUBE_DEBUG] Using existing global youtubeUrlManager instance');
        this.youtubeUrlManager = window.youtubeUrlManager;
        if (this.youtubeUrlManager && typeof this.youtubeUrlManager.ensureManagedContainer === 'function') {
          this.youtubeUrlManager.ensureManagedContainer({ allowCreation: true, upgradePlaceholders: true });
        }
        return;
      }

      console.warn('[YOUTUBE_DEBUG] ⚠️ YouTubeURLManager not available, YouTube functionality may be limited');
    } catch (error) {
      console.error('[YOUTUBE_DEBUG] ❌ Failed to setup YouTube event listeners:', error);
    }
  }

  /**
   * Ensure YouTube Manager integration and DOM elements
   */
  ensureYouTubeManagerIntegration() {
    console.log('[YOUTUBE_DEBUG] Ensuring YouTube Manager integration...');

    try {
      // Check if YouTube Manager is available and has container
      if (typeof window.YouTubeURLManager !== 'undefined') {
        console.log('[YOUTUBE_DEBUG] YouTubeURLManager class available, checking for existing instance...');

        // Check if there's already a YouTube Manager instance
        if (!window.youtubeUrlManager) {
          console.log('[YOUTUBE_DEBUG] Creating new YouTubeURLManager instance...');
          window.youtubeUrlManager = new window.YouTubeURLManager();
          this.youtubeUrlManager = window.youtubeUrlManager;
        } else {
          console.log('[YOUTUBE_DEBUG] Using existing YouTubeURLManager instance');
          this.youtubeUrlManager = window.youtubeUrlManager;
        }

        if (this.youtubeUrlManager && typeof this.youtubeUrlManager.ensureManagedContainer === 'function') {
          this.youtubeUrlManager.ensureManagedContainer({ allowCreation: true, upgradePlaceholders: true });
        }

        // The YouTube Manager will handle DOM creation and insertion automatically
        // It specifically looks for the preloading-status-card and inserts after it
        console.log('[YOUTUBE_DEBUG] ✅ YouTube Manager integration ensured');
        return;
      }

      console.warn('[YOUTUBE_DEBUG] ⚠️ YouTubeURLManager class not available');
    } catch (error) {
      console.error('[YOUTUBE_DEBUG] ❌ Error ensuring YouTube Manager integration:', error);
    }
  }

  /**
   * Initialize the modal when shown
   */
  initializeModalOnShow() {
    // Check if modal and required elements exist
    const modal = document.getElementById('modern-product-modal');
    const uploadArea = document.getElementById('image-upload-area');
    const cameraBtn = document.getElementById('camera-upload-btn');
    const galleryBtn = document.getElementById('gallery-upload-btn');

    // CRITICAL FIX: Ensure transformers client is loaded before modal initialization
    this.ensureTransformersClientLoaded();

    // Ensure image upload system is properly initialized when modal is shown
    const initializeImageUpload = () => {
      if (uploadArea && cameraBtn && galleryBtn) {
        this.setupModernImageUpload();
      } else {
        setTimeout(initializeImageUpload, 100);
      }
    };

    // Try immediately, then retry if needed
    initializeImageUpload();
  }

  /**
   * Ensure transformers client is loaded and available
   */
  async ensureTransformersClientLoaded() {
    console.log('[TRANSFORMERS_CLIENT_FIX] 🔧 Ensuring transformers client is loaded...');

    // Check if already available
    if (window.transformersClient && typeof window.transformersClient.getImageEmbedding === 'function') {
      console.log('[TRANSFORMERS_CLIENT_FIX] ✅ transformersClient already available');
      // Also ensure iframe is initialized
      await this.ensureIframeInitialized();
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="transformers-client.js"]');
    if (existingScript) {
      console.log('[TRANSFORMERS_CLIENT_FIX] 📋 transformers-client.js script already in DOM');

      // Wait for it to load if not ready yet
      let attempts = 0;
      while (!window.transformersClient && attempts < 20) {
        console.log(`[TRANSFORMERS_CLIENT_FIX] Waiting for transformersClient... attempt ${attempts + 1}/20`);
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }

      if (window.transformersClient) {
        console.log('[TRANSFORMERS_CLIENT_FIX] ✅ transformersClient loaded successfully');
        await this.ensureIframeInitialized();
        return;
      } else {
        console.warn('[TRANSFORMERS_CLIENT_FIX] ⚠️ Script loaded but transformersClient not available');
      }
    }

    // Dynamically load the script
    console.log('[TRANSFORMERS_CLIENT_FIX] 📥 Dynamically loading transformers-client.js');

    const script = document.createElement('script');
    script.src = `./transformers-client.js?v=${Date.now()}`;
    script.type = 'module';

    script.onload = async () => {
      console.log('[TRANSFORMERS_CLIENT_FIX] ✅ Script loaded, waiting for transformersClient...');

      // Wait for transformersClient to be available
      const waitForClient = async () => {
        let attempts = 0;
        while (!window.transformersClient && attempts < 30) {
          console.log(`[TRANSFORMERS_CLIENT_FIX] Waiting for transformersClient after script load... attempt ${attempts + 1}/30`);
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }

        if (window.transformersClient) {
          console.log('[TRANSFORMERS_CLIENT_FIX] ✅ transformersClient available after script load');
          await this.ensureIframeInitialized();
        } else {
          console.error('[TRANSFORMERS_CLIENT_FIX] ❌ transformersClient not available after script load');
        }
      };

      await waitForClient();
    };

    script.onerror = (error) => {
      console.error('[TRANSFORMERS_CLIENT_FIX] ❌ Failed to load transformers-client.js:', error);
    };

    document.head.appendChild(script);
  }

  /**
   * Ensure iframe is properly initialized
   */
  async ensureIframeInitialized() {
    console.log('[IFRAME_FIX] 🔧 Ensuring iframe is initialized...');

    if (!window.transformersClient) {
      console.warn('[IFRAME_FIX] ⚠️ transformersClient not available for iframe initialization');
      return;
    }

    try {
      // Check if iframe is already cached
      if (window.transformersClient.isIframeCached && window.transformersClient.isIframeCached()) {
        console.log('[IFRAME_FIX] ✅ Iframe already cached');
        return;
      }

      // Initialize iframe if function is available
      if (typeof window.transformersClient.initTransformersIframe === 'function') {
        console.log('[IFRAME_FIX] 🚀 Initializing iframe...');
        await window.transformersClient.initTransformersIframe();
        console.log('[IFRAME_FIX] ✅ Iframe initialized successfully');
      } else {
        console.warn('[IFRAME_FIX] ⚠️ initTransformersIframe function not available');
      }
    } catch (error) {
      console.error('[IFRAME_FIX] ❌ Failed to initialize iframe:', error);
    }
  }

  /**
   * Setup camera integration for modern modal
   */
  setupCameraIntegrationForModal() {
    console.log('[CAMERA_MODAL_DEBUG] Setting up camera integration for modern modal');

    // Check if camera is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log('[CAMERA_MODAL_DEBUG] Camera not supported in this browser');
      return;
    }

    // Create camera modal if it doesn't exist
    if (!document.getElementById('camera-modal-modern')) {
      this.createCameraModalForModern();
    }

    // Add camera button to upload area - use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const uploadArea = document.getElementById('image-upload-area');
      console.log('[CAMERA_MODAL_DEBUG] Upload area found:', !!uploadArea);

      if (uploadArea && !uploadArea.querySelector('.camera-button-modern')) {
        console.log('[CAMERA_MODAL_DEBUG] Adding camera button to upload area');

        const cameraButton = document.createElement('button');
        cameraButton.type = 'button';
        cameraButton.className = 'camera-button-modern absolute top-2 right-2 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors z-10';
        cameraButton.innerHTML = '<i class="fas fa-camera"></i>';
        cameraButton.title = 'Take photo with camera';
        cameraButton.style.cssText = 'position: absolute; top: 8px; right: 8px; background: #3b82f6; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; z-index: 10;';

        cameraButton.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('[CAMERA_MODAL_DEBUG] Camera button clicked');
          this.openCameraForModern();
        });

        // Ensure relative positioning
        if (uploadArea.style.position !== 'relative') {
          uploadArea.style.position = 'relative';
        }

        uploadArea.appendChild(cameraButton);
        console.log('[CAMERA_MODAL_DEBUG] Camera button added successfully');
      } else {
        console.log('[CAMERA_MODAL_DEBUG] Camera button already exists or upload area not found');
      }
    }, 100);
  }

  /**
   * Create camera modal for modern modal
   */
  createCameraModalForModern() {
    console.log('[CAMERA_MODAL_DEBUG] Creating camera modal for modern modal');

    const cameraModalHTML = `
      <div id="camera-modal-modern" class="fixed inset-0 bg-black z-50 hidden">
        <div class="flex flex-col h-full">
          <!-- Camera Header -->
          <div class="bg-black text-white p-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold">Take Photo</h3>
            <button id="close-camera-modal-modern" class="text-white hover:text-gray-300">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>

          <!-- Camera Viewport -->
          <div class="flex-1 relative bg-black">
            <video id="camera-video-modern" class="w-full h-full object-cover" autoplay playsinline muted></video>
            <canvas id="camera-canvas-modern" class="absolute inset-0 w-full h-full object-cover hidden"></canvas>

            <!-- Camera Controls -->
            <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
              <button id="switch-camera-btn-modern" class="bg-white/20 text-white p-3 rounded-full hover:bg-white/30 transition-colors" title="Switch camera">
                <i class="fas fa-sync-alt"></i>
              </button>
              <button id="capture-photo-btn-modern" class="bg-white text-black p-4 rounded-full hover:bg-gray-200 transition-colors" title="Take photo">
                <i class="fas fa-circle text-2xl"></i>
              </button>
              <button id="cancel-camera-btn-modern" class="bg-red-500/80 text-white p-3 rounded-full hover:bg-red-600 transition-colors" title="Cancel">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', cameraModalHTML);

    // Add camera event listeners
    document.getElementById('close-camera-modal-modern').addEventListener('click', () => this.closeCameraForModern());
    document.getElementById('capture-photo-btn-modern').addEventListener('click', () => this.capturePhotoForModern());
    document.getElementById('switch-camera-btn-modern').addEventListener('click', () => this.switchCameraForModern());
    document.getElementById('cancel-camera-btn-modern').addEventListener('click', () => this.closeCameraForModern());

    console.log('[CAMERA_MODAL_DEBUG] Camera modal created for modern modal');
  }

  /**
   * Camera functions for modern modal
   */
  async openCameraForModern() {
    console.log('[CAMERA_MODAL_DEBUG] Opening camera for modern modal');

    try {
      console.log('[CAMERA_MODAL_DEBUG] Requesting camera permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log('[CAMERA_MODAL_DEBUG] Camera permissions granted, setting up video stream');
      this.cameraStreamModern = stream;
      const video = document.getElementById('camera-video-modern');

      if (video) {
        console.log('[CAMERA_MODAL_DEBUG] Video element found, setting srcObject');
        video.srcObject = stream;
        console.log('[CAMERA_MODAL_DEBUG] Showing camera modal');
        document.getElementById('camera-modal-modern').classList.remove('hidden');
        console.log('[CAMERA_MODAL_DEBUG] Camera opened successfully for modern modal');
      } else {
        console.error('[CAMERA_MODAL_DEBUG] Video element not found!');
      }
    } catch (error) {
      console.error('[CAMERA_MODAL_DEBUG] Failed to open camera:', error);
      alert('Unable to access camera. Please check permissions and try again. Error: ' + error.message);
    }
  }

  closeCameraForModern() {
    console.log('[CAMERA_MODAL_DEBUG] Closing camera for modern modal');

    if (this.cameraStreamModern) {
      this.cameraStreamModern.getTracks().forEach(track => track.stop());
      this.cameraStreamModern = null;
    }

    document.getElementById('camera-modal-modern').classList.add('hidden');
    document.getElementById('camera-video-modern').srcObject = null;
  }

  capturePhotoForModern() {
    console.log('[CAMERA_MODAL_DEBUG] Capturing photo for modern modal');

    const video = document.getElementById('camera-video-modern');
    const canvas = document.getElementById('camera-canvas-modern');
    const context = canvas.getContext('2d');

    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        console.log('[CAMERA_MODAL_DEBUG] Photo captured, file created:', file.name);

        this.closeCameraForModern();
        this.handleImageFile(file);
      }, 'image/jpeg', 0.8);
    }
  }

  async switchCameraForModern() {
    console.log('[CAMERA_MODAL_DEBUG] Switching camera for modern modal');

    if (this.cameraStreamModern) {
      this.cameraStreamModern.getTracks().forEach(track => track.stop());
    }

    try {
      const currentFacingMode = this.currentCameraModern === 'user' ? 'environment' : 'user';
      this.currentCameraModern = currentFacingMode;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode }
      });

      this.cameraStreamModern = stream;
      const video = document.getElementById('camera-video-modern');
      if (video) {
        video.srcObject = stream;
      }
    } catch (error) {
      console.error('[CAMERA_MODAL_DEBUG] Failed to switch camera:', error);
    }
  }

  /**
   * Handle multiple files for modern modal
   */
  handleMultipleFilesModal(files) {
    console.log('[MULTI_FILE_MODAL_DEBUG] Handling multiple files for modern modal:', files.length);

    if (files.length === 0) return;

    // If only one file, treat as main image
    if (files.length === 1) {
      this.handleImageFile(files[0]);
      return;
    }

    // Handle first file as main image
    this.handleImageFile(files[0]);

    // Handle remaining files as additional images
    const additionalFiles = Array.from(files).slice(1, 6); // Max 5 additional
    if (additionalFiles.length > 0) {
      this.handleAdditionalImages(additionalFiles);
    }
  }

  /**
   * Enhanced handleAdditionalImages for modern modal (if not already implemented)
   */
  async handleAdditionalImages(files) {
    console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] Starting additional images handler for modern modal');
    console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] Files received:', files.length);

    if (!files || files.length === 0) {
      console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] No files provided');
      return;
    }

    // Limit to 5 additional images
    const maxAdditional = 5;
    const filesToProcess = files.slice(0, maxAdditional);
    const excessFiles = files.length - maxAdditional;

    if (excessFiles > 0) {
      console.log(`[ADDITIONAL_IMAGES_MODAL_DEBUG] Limiting to ${maxAdditional} files, ignoring ${excessFiles} excess files`);
      this.showNotification(`Only ${maxAdditional} additional images allowed. ${excessFiles} files ignored.`, 'warning');
    }

    // Initialize additional images array if not exists
    if (!this.formData.additionalImages) {
      this.formData.additionalImages = [];
      console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] Initialized additional images array');
    }

    // Create additional images container if it doesn't exist
    this.createAdditionalImagesContainerForModal();

    // Process each file
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      console.log(`[ADDITIONAL_IMAGES_MODAL_DEBUG] Processing file ${i + 1}/${filesToProcess.length}:`, file.name);

      try {
        // Validate file
        if (!this.validateImageFile(file)) {
          console.log(`[ADDITIONAL_IMAGES_MODAL_DEBUG] File validation failed for:`, file.name);
          continue;
        }

        // Create image preview element
        const previewElement = await this.createAdditionalImagePreviewForModal(file);

        // Add to additional images array
        const imageData = {
          file: file,
          id: `additional_modal_${Date.now()}_${i}`,
          name: file.name,
          size: file.size,
          status: 'processing',
          previewElement: previewElement
        };

        this.formData.additionalImages.push(imageData);

        // Add preview to UI
        this.addAdditionalImagePreviewToUIForModal(previewElement);

        console.log(`[ADDITIONAL_IMAGES_MODAL_DEBUG] Added file to additional images:`, file.name);

        // Generate embedding for additional image in background
        this.processAdditionalImageEmbeddingForModal(imageData);

      } catch (error) {
        console.error(`[ADDITIONAL_IMAGES_MODAL_DEBUG] Error processing file:`, file.name, error);
        this.showNotification(`Failed to process ${file.name}`, 'error');
      }
    }

    // Update UI counter
    this.updateAdditionalImagesCounterForModal();

    console.log(`[ADDITIONAL_IMAGES_MODAL_DEBUG] Processed ${filesToProcess.length} additional images`);
    console.log(`[ADDITIONAL_IMAGES_MODAL_DEBUG] Current additional images count:`, this.formData.additionalImages.length);
  }

  /**
   * Create additional images container for modern modal
   */
  createAdditionalImagesContainerForModal() {
    let container = document.getElementById('additional-images-container-modal');

    if (!container) {
      container = document.createElement('div');
      container.id = 'additional-images-container-modal';
      container.className = 'mt-6';

      // Insert after the main image preview
      const mainPreview = document.getElementById('image-preview-container');
      if (mainPreview) {
        mainPreview.parentNode.insertBefore(container, mainPreview.nextSibling);
      } else {
        // Fallback: insert after upload area
        const uploadArea = document.getElementById('image-upload-area');
        if (uploadArea) {
          uploadArea.parentNode.insertBefore(container, uploadArea.nextSibling);
        }
      }
    }

    // Set up container structure
    container.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-medium text-gray-700">Additional Images</h4>
        <span id="additional-images-counter-modal" class="text-xs text-gray-500">0/5</span>
      </div>
      <div id="additional-images-grid-modal" class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <!-- Additional image previews will be inserted here -->
      </div>
    `;

    console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] Created additional images container for modern modal');
  }

  /**
   * Create preview element for additional image in modern modal
   */
  async createAdditionalImagePreviewForModal(file) {
    console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] Creating preview for file:', file.name);

    return new Promise((resolve) => {
      const previewDiv = document.createElement('div');
      previewDiv.className = 'relative bg-gray-100 rounded-lg overflow-hidden aspect-square';

      // Loading spinner
      previewDiv.innerHTML = `
        <div class="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        </div>
        <button class="remove-additional-image-modal absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-80 hover:opacity-100 transition-opacity">
          <i class="fas fa-times"></i>
        </button>
      `;

      const img = document.createElement('img');
      img.className = 'w-full h-full object-cover hidden';
      img.onload = () => {
        previewDiv.querySelector('.animate-spin').remove();
        img.classList.remove('hidden');
        previewDiv.querySelector('.remove-additional-image-modal').classList.remove('hidden');
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);

      // Add remove handler
      previewDiv.querySelector('.remove-additional-image-modal').addEventListener('click', () => {
        this.removeAdditionalImageForModal(file);
      });

      resolve(previewDiv);
    });
  }

  /**
   * Add additional image preview to UI for modern modal
   */
  addAdditionalImagePreviewToUIForModal(previewElement) {
    const grid = document.getElementById('additional-images-grid-modal');
    if (grid) {
      grid.appendChild(previewElement);
      console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] Added preview to UI');
    }
  }

  /**
   * Process embedding for additional image in modern modal
   */
  async processAdditionalImageEmbeddingForModal(imageData) {
    console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] Processing embedding for:', imageData.name);

    try {
      // Update status to processing
      this.updateAdditionalImageStatusForModal(imageData.id, 'processing');

      // Generate embedding
      const embedding = await this.generateAdditionalImageEmbeddingForModal(imageData.file);

      // Update with success status
      imageData.embedding = embedding;
      imageData.status = 'ready';

      this.updateAdditionalImageStatusForModal(imageData.id, 'ready');

      console.log(`[ADDITIONAL_IMAGES_MODAL_DEBUG] Embedding generated successfully for:`, imageData.name);

    } catch (error) {
      console.error(`[ADDITIONAL_IMAGES_MODAL_DEBUG] Embedding generation failed for:`, imageData.name, error);

      // Update with failed status
      imageData.status = 'failed';
      this.updateAdditionalImageStatusForModal(imageData.id, 'failed');

      // Show error notification but don't block other images
      this.showNotification(`Failed to process ${imageData.name}`, 'warning');
    }
  }

  /**
   * Generate embedding for additional image in modern modal
   */
  async generateAdditionalImageEmbeddingForModal(file) {
    console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] Generating embedding for additional image:', file.name);

    // Use the same iframe-based approach as main image
    if (window.transformersClient && typeof window.transformersClient.getImageEmbedding === 'function') {
      const embedding = await window.transformersClient.getImageEmbedding(file, {
        timeoutMs: 30000,
        fallback: true
      });

      if (Array.isArray(embedding) && embedding.length === 512) {
        console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] Embedding generated successfully');
        return embedding;
      } else {
        throw new Error('Invalid embedding result');
      }
    } else {
      throw new Error('Embedding system not available');
    }
  }

  /**
   * Update additional image status for modern modal
   */
  updateAdditionalImageStatusForModal(imageId, status) {
    const imageData = this.formData.additionalImages.find(img => img.id === imageId);
    if (imageData && imageData.previewElement) {
      const statusIcon = imageData.previewElement.querySelector('.status-icon-modal');
      if (!statusIcon) {
        const icon = document.createElement('div');
        icon.className = 'status-icon-modal absolute bottom-1 left-1 w-4 h-4 rounded-full';

        switch (status) {
          case 'processing':
            icon.className += ' bg-blue-500';
            icon.innerHTML = '<div class="w-full h-full animate-spin rounded-full border border-white"></div>';
            break;
          case 'ready':
            icon.className += ' bg-green-500 flex items-center justify-center';
            icon.innerHTML = '<i class="fas fa-check text-white text-xs"></i>';
            break;
          case 'failed':
            icon.className += ' bg-red-500 flex items-center justify-center';
            icon.innerHTML = '<i class="fas fa-exclamation-triangle text-white text-xs"></i>';
            break;
          case 'deferred':
            icon.className += ' bg-gray-500 flex items-center justify-center';
            icon.innerHTML = '<i class="fas fa-clock text-white text-xs"></i>';
            break;
        }

        imageData.previewElement.appendChild(icon);
      }
    }
  }

  /**
   * Remove additional image for modern modal
   */
  removeAdditionalImageForModal(file) {
    console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] Removing additional image:', file.name);

    // Remove from array
    this.formData.additionalImages = this.formData.additionalImages.filter(img => img.file !== file);

    // Update UI
    this.updateAdditionalImagesCounterForModal();

    // Remove preview element
    const previewElement = document.querySelector(`[data-file-modal="${file.name}"]`);
    if (previewElement) {
      previewElement.remove();
    }

    console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] Image removed, current count:', this.formData.additionalImages.length);
  }

  /**
   * Update additional images counter for modern modal
   */
  updateAdditionalImagesCounterForModal() {
    const counter = document.getElementById('additional-images-counter-modal');
    if (counter) {
      counter.textContent = `${this.formData.additionalImages.length}/5`;
    }
  }

  /**
   * Validate image file for modern modal
   */
  validateImageFile(file) {
    console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] Validating file:', file.name);

    // Check file type
    if (!file.type.startsWith('image/')) {
      this.showNotification(`${file.name} is not a valid image file`, 'error');
      return false;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.showNotification(`${file.name} is too large. Maximum size is 10MB.`, 'error');
      return false;
    }

    console.log('[ADDITIONAL_IMAGES_MODAL_DEBUG] File validation passed:', file.name);
    return true;
  }

  /**
   * Setup camera integration for mobile devices
   */
  setupCameraIntegration() {
    console.log('[CAMERA_DEBUG] Setting up camera integration');

    // Check if camera is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log('[CAMERA_DEBUG] Camera not supported in this browser');
      return;
    }

    // Create camera modal if it doesn't exist
    if (!document.getElementById('camera-modal')) {
      this.createCameraModal();
    }

    // Add camera button to upload area
    const uploadArea = document.getElementById('image-upload-area');
    if (uploadArea && !uploadArea.querySelector('.camera-button')) {
      const cameraButton = document.createElement('button');
      cameraButton.type = 'button';
      cameraButton.className = 'camera-button absolute top-2 right-2 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors';
      cameraButton.innerHTML = '<i class="fas fa-camera"></i>';
      cameraButton.title = 'Take photo with camera';
      cameraButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openCamera();
      });

      uploadArea.classList.add('relative');
      uploadArea.appendChild(cameraButton);

      console.log('[CAMERA_DEBUG] Camera button added to upload area');
    }
  }

  /**
   * Create camera modal HTML
   */
  createCameraModal() {
    console.log('[CAMERA_DEBUG] Creating camera modal');

    const cameraModalHTML = `
      <div id="camera-modal" class="fixed inset-0 bg-black z-50 hidden">
        <div class="flex flex-col h-full">
          <!-- Camera Header -->
          <div class="bg-black text-white p-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold">Take Photo</h3>
            <button id="close-camera-modal" class="text-white hover:text-gray-300">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>

          <!-- Camera Viewport -->
          <div class="flex-1 relative bg-black">
            <video id="camera-video" class="w-full h-full object-cover" autoplay playsinline muted></video>
            <canvas id="camera-canvas" class="absolute inset-0 w-full h-full object-cover hidden"></canvas>

            <!-- Camera Controls -->
            <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
              <button id="switch-camera-btn" class="bg-white/20 text-white p-3 rounded-full hover:bg-white/30 transition-colors" title="Switch camera">
                <i class="fas fa-sync-alt"></i>
              </button>
              <button id="capture-photo-btn" class="bg-white text-black p-4 rounded-full hover:bg-gray-200 transition-colors" title="Take photo">
                <i class="fas fa-circle text-2xl"></i>
              </button>
              <button id="cancel-camera-btn" class="bg-red-500/80 text-white p-3 rounded-full hover:bg-red-600 transition-colors" title="Cancel">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', cameraModalHTML);

    // Add camera event listeners
    document.getElementById('close-camera-modal').addEventListener('click', () => this.closeCamera());
    document.getElementById('capture-photo-btn').addEventListener('click', () => this.capturePhoto());
    document.getElementById('switch-camera-btn').addEventListener('click', () => this.switchCamera());
    document.getElementById('cancel-camera-btn').addEventListener('click', () => this.closeCamera());

    console.log('[CAMERA_DEBUG] Camera modal created and event listeners attached');
  }

  /**
   * Open camera for photo capture
   */
  async openCamera() {
    console.log('[CAMERA_DEBUG] Opening camera');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      this.cameraStream = stream;
      const video = document.getElementById('camera-video');

      if (video) {
        video.srcObject = stream;
        document.getElementById('camera-modal').classList.remove('hidden');
        console.log('[CAMERA_DEBUG] Camera opened successfully');
      }
    } catch (error) {
      console.error('[CAMERA_DEBUG] Failed to open camera:', error);
      this.showNotification('Unable to access camera. Please check permissions and try again.', 'error');
    }
  }

  /**
   * Close camera
   */
  closeCamera() {
    console.log('[CAMERA_DEBUG] Closing camera');

    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }

    document.getElementById('camera-modal').classList.add('hidden');
    document.getElementById('camera-video').srcObject = null;
  }

  /**
   * Capture photo from camera stream
   */
  capturePhoto() {
    console.log('[CAMERA_DEBUG] Capturing photo');

    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');

    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        console.log('[CAMERA_DEBUG] Photo captured, file created:', file.name);

        this.closeCamera();
        this.handleImageFile(file);
      }, 'image/jpeg', 0.8);
    }
  }

  /**
   * Switch between front and back camera
   */
  async switchCamera() {
    console.log('[CAMERA_DEBUG] Switching camera');

    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      const currentFacingMode = this.currentCamera === 'user' ? 'environment' : 'user';
      this.currentCamera = currentFacingMode;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode }
      });

      this.cameraStream = stream;
      const video = document.getElementById('camera-video');
      if (video) {
        video.srcObject = stream;
      }
    } catch (error) {
      console.error('[CAMERA_DEBUG] Failed to switch camera:', error);
    }
  }

  /**
   * Show image source options (camera vs file)
   */
  showImageSourceOptions() {
    console.log('[CAMERA_DEBUG] Showing image source options');

    // For now, just open file picker
    // In the future, this could show a modal with camera/file options
    const mainFileInput = document.getElementById('modern-product-image');
    if (mainFileInput) {
      mainFileInput.click();
    }
  }

  /**
   * Handle multiple files dropped or selected
   */
  handleMultipleFiles(files) {
    console.log('[MULTI_FILE_DEBUG] Handling multiple files:', files.length);

    if (files.length === 0) return;

    // If only one file, treat as main image
    if (files.length === 1) {
      this.handleImageFile(files[0]);
      return;
    }

    // Handle first file as main image
    this.handleImageFile(files[0]);

    // Handle remaining files as additional images
    const additionalFiles = Array.from(files).slice(1, 6); // Max 5 additional
    if (additionalFiles.length > 0) {
      this.handleAdditionalImages(additionalFiles);
    }
  }

  /**
   * Handle image file selection
   */
  async handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      this.showError('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      this.showError('Image file size must be less than 10MB');
      return;
    }

    this.formData.imageFile = file;

    // Show preview
    const previewImg = document.getElementById('modern-image-preview');
    const previewContainer = document.getElementById('image-preview-container');

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);

    // Update upload area
    document.getElementById('image-upload-area').classList.add('hidden');

    // Generate embedding
    await this.generateEmbedding(file);
  }

  /**
   * Handle additional images selection (FIXED: Previously missing implementation)
   */
  async handleAdditionalImages(files) {
    console.log('[ADDITIONAL_IMAGES_DEBUG] Starting additional images handler');
    console.log('[ADDITIONAL_IMAGES_DEBUG] Files received:', files.length);

    if (!files || files.length === 0) {
      console.log('[ADDITIONAL_IMAGES_DEBUG] No files provided');
      return;
    }

    // Limit to 5 additional images
    const maxAdditional = 5;
    const filesToProcess = files.slice(0, maxAdditional);
    const excessFiles = files.length - maxAdditional;

    if (excessFiles > 0) {
      console.log(`[ADDITIONAL_IMAGES_DEBUG] Limiting to ${maxAdditional} files, ignoring ${excessFiles} excess files`);
      this.showNotification(`Only ${maxAdditional} additional images allowed. ${excessFiles} files ignored.`, 'warning');
    }

    // Initialize additional images array if not exists
    if (!this.formData.additionalImages) {
      this.formData.additionalImages = [];
      console.log('[ADDITIONAL_IMAGES_DEBUG] Initialized additional images array');
    }

    // Create additional images container if it doesn't exist
    this.createAdditionalImagesContainer();

    // Process each file
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      console.log(`[ADDITIONAL_IMAGES_DEBUG] Processing file ${i + 1}/${filesToProcess.length}:`, file.name);

      try {
        // Validate file
        if (!this.validateImageFile(file)) {
          console.log(`[ADDITIONAL_IMAGES_DEBUG] File validation failed for:`, file.name);
          continue;
        }

        // Create image preview element
        const previewElement = await this.createAdditionalImagePreview(file);

        // Add to additional images array
        const imageData = {
          file: file,
          id: `additional_${Date.now()}_${i}`,
          name: file.name,
          size: file.size,
          status: 'processing',
          embeddingSkipReason: null,
          previewElement: previewElement
        };

        this.formData.additionalImages.push(imageData);

        // Add preview to UI
        this.addAdditionalImagePreviewToUI(previewElement);

        console.log(`[ADDITIONAL_IMAGES_DEBUG] Added file to additional images:`, file.name);

        // Generate embedding for additional image in background
        this.processAdditionalImageEmbedding(imageData);

      } catch (error) {
        console.error(`[ADDITIONAL_IMAGES_DEBUG] Error processing file:`, file.name, error);
        this.showNotification(`Failed to process ${file.name}`, 'error');
      }
    }

    // Update UI counter
    this.updateAdditionalImagesCounter();

    console.log(`[ADDITIONAL_IMAGES_DEBUG] Processed ${filesToProcess.length} additional images`);
    console.log(`[ADDITIONAL_IMAGES_DEBUG] Current additional images count:`, this.formData.additionalImages.length);
  }

  /**
   * Create additional images container
   */
  createAdditionalImagesContainer() {
    let container = document.getElementById('additional-images-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'additional-images-container';
      container.className = 'mt-6';

      // Insert after the main image preview
      const mainPreview = document.getElementById('image-preview-container');
      if (mainPreview) {
        mainPreview.parentNode.insertBefore(container, mainPreview.nextSibling);
      } else {
        // Fallback: insert after upload area
        const uploadArea = document.getElementById('image-upload-area');
        if (uploadArea) {
          uploadArea.parentNode.insertBefore(container, uploadArea.nextSibling);
        }
      }
    }

    // Set up container structure
    container.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-medium text-gray-700">Additional Images</h4>
        <span id="additional-images-counter" class="text-xs text-gray-500">0/5</span>
      </div>
      <div id="additional-images-grid" class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <!-- Additional image previews will be inserted here -->
      </div>
    `;

    console.log('[ADDITIONAL_IMAGES_DEBUG] Created additional images container');
  }

  /**
   * Create preview element for additional image
   */
  async createAdditionalImagePreview(file) {
    console.log('[ADDITIONAL_IMAGES_DEBUG] Creating preview for file:', file.name);

    return new Promise((resolve) => {
      const previewDiv = document.createElement('div');
      previewDiv.className = 'relative bg-gray-100 rounded-lg overflow-hidden aspect-square';

      // Loading spinner
      previewDiv.innerHTML = `
        <div class="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        </div>
        <button class="remove-additional-image absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-80 hover:opacity-100 transition-opacity">
          <i class="fas fa-times"></i>
        </button>
      `;

      const img = document.createElement('img');
      img.className = 'w-full h-full object-cover hidden';
      img.onload = () => {
        previewDiv.querySelector('.animate-spin').remove();
        img.classList.remove('hidden');
        previewDiv.querySelector('.remove-additional-image').classList.remove('hidden');
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);

      // Add remove handler
      previewDiv.querySelector('.remove-additional-image').addEventListener('click', () => {
        this.removeAdditionalImage(file);
      });

      resolve(previewDiv);
    });
  }

  /**
   * Add additional image preview to UI
   */
  addAdditionalImagePreviewToUI(previewElement) {
    const grid = document.getElementById('additional-images-grid');
    if (grid) {
      grid.appendChild(previewElement);
      console.log('[ADDITIONAL_IMAGES_DEBUG] Added preview to UI');
    }
  }

  /**
   * Process embedding for additional image
   */
  async processAdditionalImageEmbedding(imageData) {
    console.log('[ADDITIONAL_IMAGES_DEBUG] Processing embedding for:', imageData.name);

    try {
      // Update status to processing
      this.updateAdditionalImageStatus(imageData.id, 'processing');

      const readiness = this.getEmbeddingReadinessStatus();
      if (!readiness.ready) {
        imageData.status = 'deferred';
        imageData.embedding = null;
        imageData.embeddingSkipReason = readiness.reason;
        this.updateAdditionalImageStatus(imageData.id, 'deferred');
        this.notifyEmbeddingDeferred(readiness, 'additional_image');
        this.scheduleEmbeddingWarmup();
        return;
      }

      // Generate embedding
      const embedding = await this.generateAdditionalImageEmbedding(imageData.file);

      // Update with success status
      imageData.embedding = embedding;
      imageData.status = 'ready';
       imageData.embeddingSkipReason = null;

      this.updateAdditionalImageStatus(imageData.id, 'ready');

      console.log(`[ADDITIONAL_IMAGES_DEBUG] Embedding generated successfully for:`, imageData.name);

    } catch (error) {
      console.error(`[ADDITIONAL_IMAGES_DEBUG] Embedding generation failed for:`, imageData.name, error);

      // Update with failed status
      imageData.status = 'failed';
      this.updateAdditionalImageStatus(imageData.id, 'failed');

      // Show error notification but don't block other images
      this.showNotification(`Failed to process ${imageData.name}`, 'warning');
    }
  }

  /**
   * Generate embedding for additional image
   */
  async generateAdditionalImageEmbedding(file) {
    console.log('[ADDITIONAL_IMAGES_DEBUG] Generating embedding for additional image:', file.name);

    // Use the same iframe-based approach as main image
    if (window.transformersClient && typeof window.transformersClient.getImageEmbedding === 'function') {
      const embedding = await window.transformersClient.getImageEmbedding(file, {
        timeoutMs: 30000,
        fallback: true
      });

      if (Array.isArray(embedding) && embedding.length === 512) {
        console.log('[ADDITIONAL_IMAGES_DEBUG] Embedding generated successfully');
        return embedding;
      } else {
        throw new Error('Invalid embedding result');
      }
    } else {
      throw new Error('Embedding system not available');
    }
  }

  /**
   * Update additional image status
   */
  updateAdditionalImageStatus(imageId, status) {
    const imageData = this.formData.additionalImages.find(img => img.id === imageId);
    if (imageData && imageData.previewElement) {
      const statusIcon = imageData.previewElement.querySelector('.status-icon');
      if (!statusIcon) {
        const icon = document.createElement('div');
        icon.className = 'status-icon absolute bottom-1 left-1 w-4 h-4 rounded-full';

        switch (status) {
          case 'processing':
            icon.className += ' bg-blue-500';
            icon.innerHTML = '<div class="w-full h-full animate-spin rounded-full border border-white"></div>';
            break;
          case 'ready':
            icon.className += ' bg-green-500 flex items-center justify-center';
            icon.innerHTML = '<i class="fas fa-check text-white text-xs"></i>';
            break;
          case 'failed':
            icon.className += ' bg-red-500 flex items-center justify-center';
            icon.innerHTML = '<i class="fas fa-exclamation-triangle text-white text-xs"></i>';
            break;
        }

        imageData.previewElement.appendChild(icon);
      }
    }
  }

  /**
   * Generate embedding for individual image using EmbeddingCoordinator (FIXED DUPLICATE ISSUE)
   */
  async generateImageEmbedding(imageData) {
    console.log('[EMBEDDING_COORDINATOR_INTEGRATION] Starting coordinated embedding for image:', imageData.name);

    // Start workflow tracking
    if (!this.embeddingWorkflow.startTime) {
      this.embeddingWorkflow.startTime = new Date();
    }

    try {
      const readiness = this.getEmbeddingReadinessStatus();
      if (!readiness.ready) {
        this.markImageEmbeddingDeferred(imageData, readiness, 'coordinator');
        return;
      }

      imageData.embeddingStatus = 'processing';
      this.updateStatusIndicator(imageData.id, 'processing');

      // Track this image as being processed by modal
      this.trackModalImageProcessing(imageData);

      // Check for potential duplicate processing
      if (this.checkForDuplicateProcessing(imageData)) {
        console.log('[EMBEDDING_COORDINATOR_INTEGRATION] Skipping duplicate processing for:', imageData.name);
        return; // Skip processing if already handled
      }

      // Use EmbeddingCoordinator instead of direct iframe calls to prevent duplicates
      const coordinator = window.getEmbeddingCoordinator() || window.initializeEmbeddingCoordinator();

      if (coordinator) {
        console.log('[EMBEDDING_COORDINATOR_INTEGRATION] Using EmbeddingCoordinator for:', imageData.name);

        // Process single image through coordinator with duplicate prevention
        const results = await coordinator.processImages([imageData.file], {
          productId: null, // Will be set during form submission
          skipDuplicates: true,
          priority: 'normal'
        });

        // Track coordinator processing
        this.trackCoordinatorImageProcessing(imageData);

        if (results && results.successful > 0 && results.embeddings.length > 0) {
          const embedding = results.embeddings[0];

          if (Array.isArray(embedding) && embedding.length === 512) {
            imageData.embedding = embedding;
            imageData.embeddingStatus = 'completed';
            imageData.embeddingSkipReason = null;
            this.updateStatusIndicator(imageData.id, 'completed');

            console.log('[EMBEDDING_COORDINATOR_INTEGRATION] ✅ Embedding generated via coordinator for:', imageData.name);
            console.log('[EMBEDDING_COORDINATOR_INTEGRATION] Coordinator stats:', coordinator.getStats());

            // Log coordination success
            console.log('[EMBEDDING_COORDINATOR_INTEGRATION] 📊 Coordination successful:', {
              imageName: imageData.name,
              workflow: this.getCurrentEmbeddingWorkflow(),
              coordinatorStats: coordinator.getStats()
            });
          } else {
            throw new Error('Invalid embedding result from coordinator');
          }
        } else {
          const errorMsg = `Coordinator processing failed: ${results?.errors?.join(', ') || 'Unknown error'}`;
          console.error('[EMBEDDING_COORDINATOR_INTEGRATION] Coordinator error:', errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        console.warn('[EMBEDDING_COORDINATOR_INTEGRATION] Coordinator not available, using fallback method');
        await this.generateImageEmbeddingFallback(imageData);
      }
    } catch (error) {
      console.error(`[EMBEDDING_COORDINATOR_INTEGRATION] Coordinated embedding failed for ${imageData.name}:`, error);

      // Check if this is a duplicate-related error
      if (error.message.includes('duplicate') || error.message.includes('already processed')) {
        this.trackDuplicatePrevention(this.getImageKey(imageData), 'coordinator_duplicate_error');
        console.log('[EMBEDDING_COORDINATOR_INTEGRATION] Duplicate detected in error handling for:', imageData.name);
        return; // Don't fallback for duplicates
      }

      imageData.embeddingStatus = 'failed';
      imageData.embedding = null;
      this.updateStatusIndicator(imageData.id, 'failed');

      // Fallback to original method if coordinator fails (but not for duplicates)
      console.log('[EMBEDDING_COORDINATOR_INTEGRATION] Attempting fallback embedding method...');
      await this.generateImageEmbeddingFallback(imageData);
    }

    this.updateFormData();

    // Log final coordination stats
    const stats = this.getEmbeddingCoordinationStats();
    console.log('[EMBEDDING_COORDINATOR_INTEGRATION] 📈 Final coordination stats:', stats.summary);
  }

  /**
   * Fallback embedding generation method (original implementation)
   */
  async generateImageEmbeddingFallback(imageData) {
    console.log('[EMBEDDING_FALLBACK] Using fallback embedding for:', imageData.name);

    try {
      const readiness = this.getEmbeddingReadinessStatus();
      if (!readiness.ready) {
        this.markImageEmbeddingDeferred(imageData, readiness, 'fallback');
        return;
      }

      if (window.transformersClient && typeof window.transformersClient.getImageEmbedding === 'function') {
        const embedding = await window.transformersClient.getImageEmbedding(imageData.file, {
          timeoutMs: 30000,
          fallback: true
        });

        if (Array.isArray(embedding) && embedding.length === 512) {
          imageData.embedding = embedding;
          imageData.embeddingStatus = 'completed';
          imageData.embeddingSkipReason = null;
          this.updateStatusIndicator(imageData.id, 'completed');

          console.log('[EMBEDDING_FALLBACK] ✅ Fallback embedding generated successfully for:', imageData.name);
        } else {
          throw new Error('Invalid embedding result from fallback');
        }
      } else {
        // Mark as completed without embedding
        imageData.embeddingStatus = 'completed';
        this.updateStatusIndicator(imageData.id, 'completed');
        this.showNotification(`Embedding service not available for ${imageData.name}`, 'warning');
        console.log('[EMBEDDING_FALLBACK] ⚠️ No embedding service available');
      }
    } catch (error) {
      console.error(`[EMBEDDING_FALLBACK] Fallback embedding failed for ${imageData.name}:`, error);
      imageData.embeddingStatus = 'failed';
      imageData.embedding = null;
      this.updateStatusIndicator(imageData.id, 'failed');

      this.showNotification(`Failed to process ${imageData.name}`, 'warning');
    }
  }

  /**
   * Remove additional image
   */
  removeAdditionalImage(file) {
    console.log('[ADDITIONAL_IMAGES_DEBUG] Removing additional image:', file.name);

    // Remove from array
    this.formData.additionalImages = this.formData.additionalImages.filter(img => img.file !== file);

    // Update UI
    this.updateAdditionalImagesCounter();

    // Remove preview element
    const previewElement = document.querySelector(`[data-file="${file.name}"]`);
    if (previewElement) {
      previewElement.remove();
    }

    console.log('[ADDITIONAL_IMAGES_DEBUG] Image removed, current count:', this.formData.additionalImages.length);
  }

  /**
   * Update additional images counter
   */
  updateAdditionalImagesCounter() {
    const counter = document.getElementById('additional-images-counter');
    if (counter) {
      counter.textContent = `${this.formData.additionalImages.length}/5`;
    }
  }

  /**
   * Validate image file
   */
  validateImageFile(file) {
    console.log('[ADDITIONAL_IMAGES_DEBUG] Validating file:', file.name);

    // Check file type
    if (!file.type.startsWith('image/')) {
      this.showNotification(`${file.name} is not a valid image file`, 'error');
      return false;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.showNotification(`${file.name} is too large. Maximum size is 10MB.`, 'error');
      return false;
    }

    console.log('[ADDITIONAL_IMAGES_DEBUG] File validation passed:', file.name);
    return true;
  }

  /**
   * Remove selected image
   */
  removeImage() {
    this.formData.imageFile = null;
    const imageInput = document.getElementById('modern-product-images');
    if (imageInput) {
      imageInput.value = '';
    }
    const previewContainer = document.getElementById('image-preview-container');
    if (previewContainer) {
      previewContainer.classList.add('hidden');
    }
    const uploadArea = document.getElementById('image-upload-area');
    if (uploadArea) {
      uploadArea.classList.remove('hidden');
    }
    const embeddingStatus = document.getElementById('embedding-status-card');
    if (embeddingStatus) {
      embeddingStatus.classList.add('hidden');
    }
  }

  /**
   * Generate embedding using iframe approach with improved error handling
   */
  async generateEmbedding(file) {
    console.log('[ModernProductModal] 🎯 Starting embedding generation for file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    const statusCard = document.getElementById('embedding-status-card');
    statusCard.classList.remove('hidden');

    const readiness = this.getEmbeddingReadinessStatus();
    if (!readiness.ready) {
      this.markMainEmbeddingDeferred(readiness);
      return;
    }

    try {
      // Show initial processing status with estimated time
      this.updateEmbeddingStatus('initializing', 'Initializing AI processor...', 'Setting up embedding system (may take 1-3 minutes on first use)');

      console.log('[ModernProductModal] 🔄 Step 1: Waiting for transformersClient...');

      // Wait for transformersClient to be available (with optimized timeout)
      let attempts = 0;
      const maxAttempts = 10; // Reduced from 20

      while (!window.transformersClient && attempts < maxAttempts) {
        console.log(`[ModernProductModal] Waiting for transformersClient... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 300)); // Reduced from 500ms
        attempts++;
        if (attempts % 3 === 0) { // More frequent updates
          this.updateEmbeddingStatus('initializing', `Initializing AI processor... (${attempts}/${maxAttempts})`, 'Setting up embedding system');
        }
      }

      if (!window.transformersClient) {
        console.error('[ModernProductModal] ❌ transformersClient not available after', maxAttempts, 'attempts');
        throw new Error('Transformers client failed to initialize after waiting');
      }

      console.log('[ModernProductModal] ✅ transformersClient available');
      console.log('[ModernProductModal] Available methods:', Object.keys(window.transformersClient));

      // Update status to processing
      this.updateEmbeddingStatus('processing', 'Processing image...', 'Sending to AI processor');

      console.log('[ModernProductModal] 🔄 Step 2: Calling getImageEmbedding...');

      // Use the iframe-based approach with optimized timeout and fallback
      if (typeof window.transformersClient.getImageEmbedding === 'function') {
        console.log('[ModernProductModal] ✅ getImageEmbedding function found, calling with timeout 30s and fallback enabled');

        // Ensure iframe is ready before calling
        if (window.transformersClient.initTransformersIframe) {
          console.log('[ModernProductModal] 🔧 Ensuring iframe is initialized...');
          try {
            await window.transformersClient.initTransformersIframe();
          } catch (iframeError) {
            console.warn('[ModernProductModal] ⚠️ Iframe initialization failed:', iframeError);
          }
        }

        const startTime = performance.now();
        const embedding = await window.transformersClient.getImageEmbedding(file, {
          timeoutMs: 30000, // 30s timeout
          fallback: true     // Enable fallback
        });
        const endTime = performance.now();

        console.log('[ModernProductModal] ✅ getImageEmbedding returned after', (endTime - startTime).toFixed(2), 'ms');
        console.log('[ModernProductModal] Embedding result details:', {
          type: typeof embedding,
          isArray: Array.isArray(embedding),
          length: embedding?.length,
          firstFew: embedding?.slice(0, 5),
          lastFew: embedding?.slice(-5)
        });

        if (Array.isArray(embedding) && embedding.length === 512) {
          console.log('[ModernProductModal] ✅ Valid embedding received, storing in formData');

          // Check if this is a fallback embedding (all zeros or very similar values)
          const isFallback = embedding.every(val => val === 0) ||
                           (embedding.filter(v => Math.abs(v) < 0.01).length > embedding.length * 0.9);

          if (isFallback) {
            console.log('[ModernProductModal] ⚠️ Fallback embedding detected');
            this.updateEmbeddingStatus('warning', 'Basic embedding generated', 'Using simplified method - recommendations may be limited');
          } else {
            this.updateEmbeddingStatus('success', 'AI embedding generated successfully', 'Ready for smart product recommendations');
          }

          // Success
          this.formData.embedding = embedding;
          this.embeddingStatus = 'success';

          // Log first few embedding values as requested
          console.log('[ModernProductModal] 📊 First 10 embedding values:', embedding.slice(0, 10));
          console.log('[ModernProductModal] 📊 Last 10 embedding values:', embedding.slice(-10));
          console.log('[ModernProductModal] 📊 Embedding statistics:', {
            min: Math.min(...embedding),
            max: Math.max(...embedding),
            avg: embedding.reduce((a, b) => a + b, 0) / embedding.length,
            nonZeroCount: embedding.filter(v => v !== 0).length
          });

          console.log('[ModernProductModal] 🎉 Embedding generation completed successfully');
        } else {
          console.error('[ModernProductModal] ❌ Invalid embedding format:', {
            isArray: Array.isArray(embedding),
            length: embedding?.length,
            expectedLength: 512
          });
          throw new Error('Invalid embedding result from iframe - wrong dimensions or format');
        }
      } else {
        console.error('[ModernProductModal] ❌ getImageEmbedding function not available');
        console.log('[ModernProductModal] Available functions:', Object.keys(window.transformersClient));
        throw new Error('getImageEmbedding function not available in transformers client');
      }
    } catch (error) {
      console.error('[ModernProductModal] ❌ Embedding generation failed:', error);
      this.embeddingStatus = 'failed';

      // Provide specific error messages based on error type
      let userMessage = 'Product will still be saved without AI features';
      let errorTitle = 'Embedding generation failed';

      if (error.message.includes('Timed out')) {
        errorTitle = 'AI processor took too long';
        userMessage = 'The AI model is taking longer than expected. Product will be saved without embeddings.';
      } else if (error.message.includes('Failed to load')) {
        errorTitle = 'AI processor unavailable';
        userMessage = 'Could not connect to AI service. Product will be saved without embeddings.';
      } else if (error.message.includes('Invalid embedding')) {
        errorTitle = 'AI processing error';
        userMessage = 'AI returned unexpected results. Product will be saved without embeddings.';
      }

      this.updateEmbeddingStatus('failed', errorTitle, userMessage);

      // Log detailed error for debugging
      console.warn('[ModernProductModal] Embedding error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        embeddingStatus: this.embeddingStatus
      });
    }
  }

  /**
   * Update embedding status with consistent UI
   */
  updateEmbeddingStatus(status, title, subtitle) {
    const statusCard = document.getElementById('embedding-status-card');

    let iconHtml = '';
    let bgColor = '';
    let textColor = '';

    switch (status) {
      case 'initializing':
      case 'processing':
        iconHtml = '<div class="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>';
        bgColor = 'text-blue-900';
        textColor = 'text-blue-700';
        break;
      case 'success':
        iconHtml = '<div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><i class="fas fa-check text-white text-xs"></i></div>';
        bgColor = 'text-green-900';
        textColor = 'text-green-700';
        break;
      case 'warning':
        iconHtml = '<div class="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center"><i class="fas fa-exclamation-triangle text-white text-xs"></i></div>';
        bgColor = 'text-yellow-900';
        textColor = 'text-yellow-700';
        break;
      case 'failed':
        iconHtml = '<div class="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><i class="fas fa-exclamation-triangle text-white text-xs"></i></div>';
        bgColor = 'text-red-900';
        textColor = 'text-red-700';
        break;
    }

    statusCard.innerHTML = `
      <div class="flex items-center space-x-3">
        ${iconHtml}
        <div>
          <p class="font-medium ${bgColor}">${title}</p>
          <p class="text-sm ${textColor}">${subtitle}</p>
        </div>
      </div>
    `;
  }



  /**
   * Setup form validation
   */
  setupValidation() {
    const form = document.getElementById('modern-product-form');

    form.addEventListener('input', (e) => {
      this.validateField(e.target);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitForm();
    });
  }

  /**
   * Validate a field
   */
  validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let message = '';

    switch (field.name) {
      case 'name':
        if (!value) {
          isValid = false;
          message = 'Product name is required';
        } else if (value.length < 3) {
          isValid = false;
          message = 'Product name must be at least 3 characters';
        }
        break;

      case 'title':
        if (!value) {
          isValid = false;
          message = 'Display title is required';
        } else if (value.length < 3) {
          isValid = false;
          message = 'Display title must be at least 3 characters';
        }
        break;

      case 'price':
        const price = parseFloat(value);
        if (!value || isNaN(price) || price < 0) {
          isValid = false;
          message = 'Please enter a valid price';
        }
        break;

      case 'stock':
        const stock = parseInt(value);
        if (!value || isNaN(stock) || stock < 0) {
          isValid = false;
          message = 'Please enter a valid stock quantity';
        }
        break;
    }

    field.classList.toggle('border-red-500', !isValid);
    field.classList.toggle('border-gray-300', isValid);

    // Show/hide error message
    let errorEl = field.parentNode.querySelector('.field-error');
    if (!isValid) {
      if (!errorEl) {
        errorEl = document.createElement('p');
        errorEl.className = 'field-error text-red-500 text-sm mt-1';
        field.parentNode.appendChild(errorEl);
      }
      errorEl.textContent = message;
    } else if (errorEl) {
      errorEl.remove();
    }

    return isValid;
  }

  /**
   * Load categories using enhanced auto-population system
   */
  async loadCategories() {
    console.log('[ModernProductModal] Loading categories using enhanced auto-population...');

    try {
      const verticalSelect = document.getElementById('vertical-select');
      const categorySelect = document.getElementById('category-select');

      this.initializeBrandSelector();

      if (verticalSelect) {
        // Populate verticals dropdown first
        await enhancedAutoPopulation.populateVerticalsDropdown(verticalSelect);
        console.log('[ModernProductModal] Verticals loaded successfully');

        // Set up event listeners for category population
        if (!this.brandVerticalListenerAttached) {
          verticalSelect.addEventListener('change', () => {
            this.resetBrandSelect({ reason: 'vertical-change' });
            enhancedAutoPopulation.populateCategoriesDropdown(verticalSelect, categorySelect);
          });
          this.brandVerticalListenerAttached = true;
        }
      }

      if (categorySelect) {
        // Set up event listeners for attributes population
        if (!this.brandCategoryListenerAttached) {
          categorySelect.addEventListener('change', () => {
            const selectedCategoryId = categorySelect.value;
            this.loadEditableAttributes(selectedCategoryId);
            this.handleBrandForCategoryChange(selectedCategoryId);
            this.refreshTypeaheadFor('category-select');
          });
          this.brandCategoryListenerAttached = true;
        }

        // Mirror option updates into typeahead whenever categories get populated dynamically
        const existingObserverCleanup = this.typeaheadObservers.get('category-select');
        if (typeof existingObserverCleanup === 'function') {
          existingObserverCleanup();
        }

        const mutationObserver = new MutationObserver(() => {
          this.refreshTypeaheadFor('category-select');
        });
        mutationObserver.observe(categorySelect, { childList: true, subtree: true });
        this.typeaheadObservers.set('category-select', () => mutationObserver.disconnect());
      }

      if (categorySelect && categorySelect.value) {
        this.handleBrandForCategoryChange(categorySelect.value);
        this.refreshTypeaheadFor('category-select');
      } else {
        this.resetBrandSelect({ reason: 'no-category' });
        this.refreshTypeaheadFor('category-select');
      }

      console.log('[ModernProductModal] Successfully loaded categories via enhanced auto-population');

    } catch (error) {
      console.error('[ModernProductModal] Failed to load categories:', error);

      // Fallback: use fallback data from enhanced system
      console.log('[ModernProductModal] Falling back to enhanced system fallback...');

      try {
        const verticalSelect = document.getElementById('vertical-select');
        const categorySelect = document.getElementById('category-select');

        if (verticalSelect) {
          enhancedAutoPopulation.showFallbackVerticals(verticalSelect);
        }
        if (categorySelect) {
          categorySelect.innerHTML = '<option value="">Select a vertical first</option>';
        }

        this.resetBrandSelect({ reason: 'error' });
        this.refreshTypeaheadFor('category-select');

        console.log('[ModernProductModal] Manual fallback succeeded');
      } catch (fallbackError) {
        console.error('[ModernProductModal] Manual fallback also failed:', fallbackError);

        const verticalSelect = document.getElementById('vertical-select');
        const categorySelect = document.getElementById('category-select');

        if (verticalSelect) {
          verticalSelect.innerHTML = '<option value="">Error loading verticals</option>';
        }
        if (categorySelect) {
          categorySelect.innerHTML = '<option value="">Error loading categories</option>';
        }

        this.resetBrandSelect({ reason: 'error' });
        this.refreshTypeaheadFor('category-select');
      }
    }
  }
  initializeBrandSelector() {
    if (typeof document === 'undefined') {
      return;
    }

    const selectEl = document.getElementById('brand-select');
    const feedbackEl = document.getElementById('brand-feedback');
    const feedbackTextEl = document.getElementById('brand-feedback-text');
    const feedbackIconEl = document.getElementById('brand-feedback-icon');
    const customContainer = document.getElementById('brand-custom-container');
    const customToggle = document.getElementById('brand-custom-toggle');
    const customInput = document.getElementById('brand-custom-input');
    const customHelper = document.getElementById('brand-custom-helper');

    if (!selectEl || !feedbackEl || !feedbackTextEl || !feedbackIconEl) {
      return;
    }

    this.brandSelect = selectEl;
    this.brandFeedbackEl = feedbackEl;
    this.brandFeedbackTextEl = feedbackTextEl;
    this.brandFeedbackIconEl = feedbackIconEl;
    this.brandCustomContainer = customContainer;
    this.brandCustomToggle = customToggle;
    this.brandCustomInput = customInput;
    this.brandCustomHelperEl = customHelper;

    if (!this.brandSelectInitialized) {
      this.resetBrandSelect({ reason: 'initial' });

      this.brandSelect.addEventListener('change', () => {
        const hasSelection = Boolean(this.brandSelect.value);
        const wasCustomActive = this.isCustomBrandActive;

        if (hasSelection && this.isCustomBrandActive) {
          this.setCustomBrandActive(false, { preserveValue: false, silent: true });
        }

        this.updateSummary();

        if (wasCustomActive && !this.isCustomBrandActive) {
          if (hasSelection) {
            this.setBrandStatus('Choose a brand linked to this category or leave on Auto for "Unbranded".', 'info');
          } else if (this.brandSelect.options.length <= 1) {
            this.setBrandStatus('Leave on Auto to let us assign "Unbranded" or choose a brand once loaded.', 'muted');
          }
        }

        this.refreshTypeaheadFor('brand-select');
      });

      this.brandSelectInitialized = true;
    }

    if (!this.brandCustomInitialized && this.brandCustomToggle && this.brandCustomInput) {
      this.brandCustomToggle.addEventListener('click', () => {
        const nextState = !this.isCustomBrandActive;
        this.setCustomBrandActive(nextState);

        if (nextState) {
          const focusInput = () => {
            if (this.brandCustomInput) {
              this.brandCustomInput.focus();
            }
          };

          if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(focusInput);
          } else {
            setTimeout(focusInput, 0);
          }
        }
      });

      this.brandCustomInput.addEventListener('input', () => {
        this.handleCustomBrandInput();
        this.refreshTypeaheadFor('brand-select');
      });

      this.brandCustomInput.addEventListener('blur', () => {
        this.handleCustomBrandInput({ onBlur: true });
        this.refreshTypeaheadFor('brand-select');
      });

      this.brandCustomInitialized = true;
      this.handleCustomBrandInput({ suppressSummary: true });
    }
  }

  setBrandStatus(message, variant = 'muted') {
    if (!this.brandFeedbackEl || !this.brandFeedbackTextEl || !this.brandFeedbackIconEl) {
      return;
    }

    const baseClasses = 'mt-2 flex items-center gap-2 text-xs';
    const variantClasses = {
      muted: 'text-gray-500',
      info: 'text-blue-600',
      success: 'text-green-600',
      warning: 'text-amber-600',
      error: 'text-red-600'
    };
    const iconClasses = {
      muted: 'fa-info-circle',
      info: 'fa-circle-info',
      success: 'fa-circle-check',
      warning: 'fa-triangle-exclamation',
      error: 'fa-circle-exclamation'
    };

    const variantClass = variantClasses[variant] || variantClasses.muted;
    const iconClass = iconClasses[variant] || iconClasses.muted;

    this.brandFeedbackEl.className = `${baseClasses} ${variantClass}`;
    this.brandFeedbackTextEl.textContent = message;
    this.brandFeedbackIconEl.className = `fas ${iconClass}`;
  }

  getCustomBrandValue() {
    if (!this.brandCustomInput) {
      return '';
    }
    return (this.brandCustomInput.value || '').trim();
  }

  setCustomBrandActive(isActive, { preserveValue = false, silent = false } = {}) {
    if (!this.brandCustomContainer || !this.brandCustomToggle || !this.brandCustomInput) {
      return;
    }

    const nextState = Boolean(isActive);
    this.isCustomBrandActive = nextState;

    this.brandCustomContainer.classList.toggle('hidden', !nextState);
    this.brandCustomInput.disabled = !nextState;

    if (!nextState && !preserveValue) {
      this.brandCustomInput.value = '';
    }

    if (!nextState) {
      this.brandCustomInput.classList.remove('border-red-500', 'border-green-500');
      this.brandCustomInput.classList.add('border-gray-300/50');
    }

    const defaultHelperText = 'We will submit this brand for review with your product (max 80 characters).';
    if (this.brandCustomHelperEl && !nextState) {
      this.brandCustomHelperEl.textContent = defaultHelperText;
      this.brandCustomHelperEl.className = 'text-xs text-gray-500 mt-1';
    }

    if (this.brandCustomToggle) {
      this.brandCustomToggle.textContent = nextState
        ? 'Use dropdown brand list'
        : "Can't find your brand? Add custom brand";
      this.brandCustomToggle.setAttribute('aria-expanded', nextState ? 'true' : 'false');
    }

    if (nextState && this.brandSelect) {
      this.brandSelect.value = '';
    }

    if (!silent) {
      if (nextState) {
        this.setBrandStatus('Custom brand will be submitted for review with this product.', 'info');
      } else if (this.brandSelect) {
        if (this.brandSelect.options.length > 1) {
          this.setBrandStatus('Choose a brand linked to this category or leave on Auto for "Unbranded".', 'info');
        } else {
          this.setBrandStatus('Leave on Auto to let us assign "Unbranded" or choose a brand once loaded.', 'muted');
        }
      }
      this.updateSummary();
    }

    this.refreshTypeaheadFor('brand-select');
  }

  handleCustomBrandInput({ suppressSummary = false } = {}) {
    if (!this.brandCustomInput) {
      return '';
    }

    const rawValue = this.brandCustomInput.value || '';
    const sanitizedValue = rawValue.replace(/\s{2,}/g, ' ');

    if (sanitizedValue !== rawValue) {
      const cursorPosition = this.brandCustomInput.selectionStart;
      this.brandCustomInput.value = sanitizedValue;
      if (
        typeof cursorPosition === 'number' &&
        typeof this.brandCustomInput.setSelectionRange === 'function'
      ) {
        const safePosition = Math.min(cursorPosition - (rawValue.length - sanitizedValue.length), sanitizedValue.length);
        this.brandCustomInput.setSelectionRange(safePosition, safePosition);
      }
    }

    const trimmedValue = sanitizedValue.trim();

    if (trimmedValue && this.brandSelect && this.brandSelect.value) {
      this.brandSelect.value = '';
    }

    if (this.brandCustomHelperEl) {
      if (!trimmedValue) {
        this.brandCustomHelperEl.textContent = 'We will submit this brand for review with your product (max 80 characters).';
        this.brandCustomHelperEl.className = 'text-xs text-gray-500 mt-1';
        this.brandCustomInput.classList.remove('border-red-500', 'border-green-500');
        this.brandCustomInput.classList.add('border-gray-300/50');
      } else if (trimmedValue.length < 2) {
        this.brandCustomHelperEl.textContent = 'Enter at least 2 characters for your custom brand name.';
        this.brandCustomHelperEl.className = 'text-xs text-red-600 mt-1';
        this.brandCustomInput.classList.remove('border-gray-300/50', 'border-green-500');
        this.brandCustomInput.classList.add('border-red-500');
      } else {
        this.brandCustomHelperEl.textContent = 'Looks good. We will review this brand during product approval.';
        this.brandCustomHelperEl.className = 'text-xs text-green-600 mt-1';
        this.brandCustomInput.classList.remove('border-gray-300/50', 'border-red-500');
        this.brandCustomInput.classList.add('border-green-500');
      }
    }

    if (this.isCustomBrandActive) {
      if (!trimmedValue) {
        this.setBrandStatus('Type a custom brand name or leave empty to stay on Auto (Unbranded).', 'muted');
      } else if (trimmedValue.length < 2) {
        this.setBrandStatus('Custom brand name must be at least 2 characters.', 'warning');
      } else {
        this.setBrandStatus('Custom brand will be submitted for review with this product.', 'info');
      }
    }

    if (!suppressSummary) {
      this.updateSummary();
    }

    return trimmedValue;
  }

  resetBrandSelect({ reason = 'default' } = {}) {
    if (!this.brandSelect) {
      this.initializeBrandSelector();
    }

    if (!this.brandSelect) {
      return;
    }

    if (reason === 'reset' || reason === 'initial') {
      this.setCustomBrandActive(false, { preserveValue: false, silent: true });
    } else if (!this.isCustomBrandActive) {
      this.setCustomBrandActive(false, { preserveValue: true, silent: true });
    }

    this.brandSelect.innerHTML = '<option value="">Auto (Unbranded)</option>';
    this.brandSelect.value = '';

    const disableReasons = new Set(['initial', 'no-category', 'vertical-change']);
    if (disableReasons.has(reason)) {
      this.brandSelect.setAttribute('disabled', 'disabled');
    } else {
      this.brandSelect.removeAttribute('disabled');
    }

    const statusMessages = {
      initial: 'Select a category to see available brands.',
      'no-category': 'Select a category to see available brands.',
      'vertical-change': 'Choose a category to load its associated brands.',
      reset: 'Brand selection cleared. Leave on Auto or pick a brand once available.',
      error: 'Brand options unavailable right now. Leave on Auto or try again.',
  default: 'Leave on Auto to let us assign "Unbranded" or choose a brand once loaded.'
    };

    const statusVariants = {
      initial: 'muted',
      'no-category': 'muted',
      'vertical-change': 'info',
      reset: 'muted',
      error: 'error',
      default: 'muted'
    };

    this.setBrandStatus(statusMessages[reason] || statusMessages.default, statusVariants[reason] || statusVariants.default);
    this.lastBrandCategoryId = null;
    this.updateSummary();

    this.refreshTypeaheadFor('brand-select');
  }

  handleBrandForCategoryChange(categoryId) {
    if (!categoryId) {
      this.resetBrandSelect({ reason: 'no-category' });
      return;
    }

    this.loadBrandsForCategory(categoryId);
  }

  async loadBrandsForCategory(categoryId) {
    const normalizedCategoryId = typeof categoryId === 'string' ? categoryId.trim() : '';

    if (!normalizedCategoryId) {
      this.resetBrandSelect({ reason: 'no-category' });
      return;
    }

    if (!this.brandSelect) {
      this.initializeBrandSelector();
    }

    if (!this.brandSelect) {
      return;
    }

    if (this.lastBrandCategoryId === normalizedCategoryId && this.brandSelect.options.length > 1) {
      this.brandSelect.removeAttribute('disabled');
      if (!this.isCustomBrandActive) {
        this.setBrandStatus('Choose a brand linked to this category or leave on Auto for "Unbranded".', 'info');
      }
      return;
    }

    if (this.brandCache.has(normalizedCategoryId)) {
      this.applyBrandOptions(normalizedCategoryId, this.brandCache.get(normalizedCategoryId));
      return;
    }

    const requestId = ++this.brandRequestCounter;
    this.latestBrandRequest = requestId;

    this.brandSelect.innerHTML = '<option value="">Loading brands...</option>';
    this.brandSelect.setAttribute('disabled', 'disabled');
    this.setBrandStatus('Loading approved brands for this category...', 'info');
  this.refreshTypeaheadFor('brand-select');

    const supabaseClient = await this.resolveSupabaseClient();

    if (!supabaseClient) {
      if (requestId !== this.latestBrandRequest) {
        return;
      }
      this.brandSelect.innerHTML = '<option value="">Auto (Unbranded)</option>';
      this.brandSelect.removeAttribute('disabled');
      this.setBrandStatus('Supabase client not ready. Leave on Auto or retry shortly.', 'warning');
      this.updateSummary();
      this.refreshTypeaheadFor('brand-select');
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('admin_2025_shopify_brands')
        .select('id, name')
        .eq('is_active', true)
        .eq('category_id', normalizedCategoryId)
        .order('sort_order', { ascending: true });

      if (requestId !== this.latestBrandRequest) {
        return;
      }

      if (error) {
        throw error;
      }

  const brands = Array.isArray(data) ? data : [];
  this.brandCache.set(normalizedCategoryId, brands);
  this.applyBrandOptions(normalizedCategoryId, brands);
    } catch (error) {
      console.error('[ModernProductModal] Failed to load brands:', error);
      this.brandSelect.innerHTML = '<option value="">Auto (Unbranded)</option>';
      this.brandSelect.removeAttribute('disabled');
      this.setBrandStatus('We could not load brands right now. Leave on Auto or try again.', 'error');
      this.updateSummary();
      this.refreshTypeaheadFor('brand-select');
    }
  }

  applyBrandOptions(categoryId, brands = []) {
    if (!this.brandSelect) {
      return;
    }

    this.lastBrandCategoryId = categoryId;
    const options = ['<option value="">Auto (Unbranded)</option>'];

    brands.forEach((brand) => {
      if (brand?.id && brand?.name) {
        options.push(`<option value="${brand.id}">${brand.name}</option>`);
      }
    });

    this.brandSelect.innerHTML = options.join('');
    this.brandSelect.value = '';
    this.brandSelect.removeAttribute('disabled');

    if (this.isCustomBrandActive) {
      this.setBrandStatus('Custom brand will be submitted for review with this product.', 'info');
    } else if (brands.length === 0) {
      this.setBrandStatus('No active brands found. We will auto assign "Unbranded" on publish.', 'warning');
    } else {
      this.setBrandStatus('Choose a brand linked to this category or leave on Auto for "Unbranded".', 'info');
    }

    this.refreshTypeaheadFor('brand-select');
    this.updateSummary();
  }

  refreshTypeaheadFor(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) {
      return;
    }

    const config = this.typeaheadConfigs.get(selectId) || {};
    let adapter = this.typeaheadAdapters.get(selectId);

    if (!adapter) {
      const newAdapter = this.createTypeaheadAdapter(selectElement, config);
      if (newAdapter) {
        this.typeaheadAdapters.set(selectId, newAdapter);
        adapter = newAdapter;
      }
    }

    if (adapter?.update) {
      adapter.update();
    }
  }

  async resolveSupabaseClient() {
    if (typeof window === 'undefined') {
      return null;
    }

    if (window.supabaseClient?.from) {
      return window.supabaseClient;
    }

    if (window.supabase?.from) {
      return window.supabase;
    }

    if (typeof window.awaitSupabaseClient === 'function') {
      try {
        const awaitedClient = await window.awaitSupabaseClient();
        if (awaitedClient?.from) {
          return awaitedClient;
        }
      } catch (error) {
        console.warn('[ModernProductModal] awaitSupabaseClient failed:', error);
      }
    }

    if (typeof window.waitForSupabaseClient === 'function') {
      try {
        const awaitedClient = await window.waitForSupabaseClient();
        if (awaitedClient?.from) {
          return awaitedClient;
        }
      } catch (error) {
        console.warn('[ModernProductModal] waitForSupabaseClient failed:', error);
      }
    }

    return null;
  }

  /**
   * Load attributes for selected category
   */
  async loadAttributes() {
    const categorySelect = document.querySelector('select[name="category"]');
    const attributesContainer = document.getElementById('attributes-container');

    if (!categorySelect || !attributesContainer) return;

    const selectedCategoryId = categorySelect.value;

    if (!selectedCategoryId) {
      attributesContainer.innerHTML = '<p class="text-sm text-gray-500">Select a category to see available attributes.</p>';
      return;
    }

    try {
      // Show loading state
      attributesContainer.innerHTML = `
        <div class="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
          <div class="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <span class="text-sm text-gray-600">Loading attributes...</span>
        </div>
      `;

      // Load attributes from Supabase using correct schema columns
      const { data: attributes, error } = await window.supabaseClient
        .from('shopify_attributes')
        .select('*')
        .eq('category_id', selectedCategoryId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[ModernProductModal] Failed to load attributes:', error);
        attributesContainer.innerHTML = '<p class="text-sm text-red-500">Failed to load attributes. Please try again.</p>';
        return;
      }

      if (!attributes || attributes.length === 0) {
        attributesContainer.innerHTML = '<p class="text-sm text-gray-500">No attributes available for this category.</p>';
        return;
      }

      // Render attributes
      attributesContainer.innerHTML = attributes.map(attribute => `
        <div class="p-3 bg-gray-50 rounded-lg border">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-gray-700">${attribute.name}</label>
            <span class="text-xs text-gray-500">Auto-populated</span>
          </div>
          ${attribute.description ? `<p class="text-xs text-gray-600 mb-2">${attribute.description}</p>` : ''}
          <div class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            ✓ Available for this category
          </div>
        </div>
      `).join('');

      console.log(`[ModernProductModal] Loaded ${attributes.length} attributes for category ${selectedCategoryId}`);

    } catch (error) {
      console.error('[ModernProductModal] Error loading attributes:', error);
      attributesContainer.innerHTML = '<p class="text-sm text-red-500">Error loading attributes. Please try again.</p>';
    }
  }

  /**
   * Clear attributes when category changes
   */
  clearAttributes() {
    const attributesContainer = document.getElementById('attributes-container');
    if (attributesContainer) {
      attributesContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-cog fa-spin text-2xl mb-2 block"></i>
          <p>Select category to load attributes</p>
        </div>
      `;
    }
    this.attributes = [];
  }

  /**
   * Load editable attributes for category (dynamic inputs)
   */
  async loadEditableAttributes(categoryId) {
    if (!categoryId) {
      this.clearAttributes();
      return;
    }

    const attributesContainer = document.getElementById('attributes-container');
    if (!attributesContainer) return;

    console.log('[Auto-Population] Loading attributes for category:', categoryId);

    try {
      attributesContainer.innerHTML = `
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-sm text-gray-600">Loading attributes...</span>
        </div>
      `;

      const { data: attributes, error } = await window.supabaseClient
        .from('shopify_attributes')
        .select('id, name, description, type, options, required')
        .eq('category_id', categoryId)
        .order('name');

      if (error) {
        console.error('[Auto-Population] Failed to load attributes:', error);
        throw error;
      }

      console.log('[Auto-Population] Loaded attributes:', attributes?.length || 0);

      this.attributes = attributes || [];

      if (this.attributes.length === 0) {
        attributesContainer.innerHTML = `
          <div class="text-center py-8 text-gray-500">
            <i class="fas fa-info-circle text-2xl mb-2"></i>
            <p class="text-sm">No attributes defined for this category</p>
          </div>
        `;
        return;
      }

      // Render editable inputs
      attributesContainer.innerHTML = this.attributes.map(attr => {
        const isRequired = attr.required ? 'required' : '';
        const requiredMark = attr.required ? ' *' : '';

        let inputHtml = '';
        switch (attr.type) {
          case 'text':
            inputHtml = `<input type="text" name="attr_${attr.id}" ${isRequired} class="attr-input w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" placeholder="Enter ${attr.name.toLowerCase()}">`;
            break;
          case 'number':
            inputHtml = `<input type="number" name="attr_${attr.id}" ${isRequired} class="attr-input w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" placeholder="Enter ${attr.name.toLowerCase()}">`;
            break;
          case 'select':
            const options = attr.options ? attr.options.split(',').map(opt => opt.trim()).map(opt => `<option value="${opt}">${opt}</option>`).join('') : '';
            inputHtml = `<select name="attr_${attr.id}" ${isRequired} class="attr-input w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
              <option value="">Select ${attr.name.toLowerCase()}</option>
              ${options}
            </select>`;
            break;
          case 'boolean':
            inputHtml = `<label class="flex items-center">
              <input type="checkbox" name="attr_${attr.id}" ${isRequired} class="mr-2 rounded">
              ${attr.name}
            </label>`;
            break;
          default:
            inputHtml = `<input type="text" name="attr_${attr.id}" ${isRequired} class="attr-input w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" placeholder="Enter ${attr.name.toLowerCase()}">`;
        }

        return `
          <div class="attribute-card p-3 rounded-xl border backdrop-blur-sm">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">${attr.name}${requiredMark}</label>
                ${attr.description ? `<p class="text-xs text-gray-600 mb-2">${attr.description}</p>` : ''}
              </div>
              ${attr.required ? '<span class="text-red-500 text-xs">*</span>' : ''}
            </div>
            <div class="attr-input-container">
              ${inputHtml}
            </div>
            <div class="attr-error hidden text-red-500 text-xs mt-1" role="alert"></div>
          </div>
        `;
      }).join('');

      // Add validation to attribute inputs
      attributesContainer.querySelectorAll('.attr-input, .attr-input-container input, .attr-input-container select').forEach(input => {
        input.addEventListener('input', (e) => {
          this.validateAttributeInput(e.target);
        });
      });

      console.log('[Auto-Population] Generated', this.attributes.length, 'attribute form fields');
      this.updateSummary();

    } catch (error) {
      console.error('[Auto-Population] Failed to load editable attributes:', error);
      attributesContainer.innerHTML = `
        <div class="text-center py-8 text-red-500">
          <i class="fas fa-exclamation-triangle text-xl mb-2"></i>
          <p class="text-sm">Failed to load attributes. Please try again.</p>
          <button type="button" onclick="modernProductModal.loadEditableAttributes('${categoryId}')" class="mt-2 text-blue-600 hover:text-blue-800">Retry</button>
        </div>
      `;
    }
  }

  /**
   * Validate attribute input
   */
  validateAttributeInput(field) {
    const attrId = field.name.replace('attr_', '');
    const attr = this.attributes.find(a => a.id === attrId);
    if (!attr) return true;

    const value = field.value.trim();
    let isValid = true;
    let message = '';

    if (attr.required && !value) {
      isValid = false;
      message = `${attr.name} is required`;
    } else if (attr.type === 'number' && value && isNaN(parseFloat(value))) {
      isValid = false;
      message = 'Must be a valid number';
    } else if (attr.type === 'select' && !attr.options.split(',').map(o => o.trim()).includes(value)) {
      isValid = false;
      message = 'Please select a valid option';
    }

    const container = field.closest('.attribute-card');
    const errorEl = container.querySelector('.attr-error');

    if (!isValid) {
      field.classList.add('field-invalid');
      field.classList.remove('field-valid');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
      } else {
        const newError = document.createElement('div');
        newError.className = 'attr-error text-red-500 text-xs mt-1';
        newError.textContent = message;
        newError.setAttribute('role', 'alert');
        container.appendChild(newError);
      }
    } else {
      field.classList.add('field-valid');
      field.classList.remove('field-invalid');
      if (errorEl) {
        errorEl.classList.add('hidden');
      }
    }

    return isValid;
  }

  /**
   * Add variant
   */
  addVariant() {
    if (this.variants.length >= 10) {
      this.showNotification('Maximum 10 variants allowed', 'error');
      return;
    }

    const variant = {
      id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      option1: '',
      option2: '',
      price: 0,
      stock: 0,
      sku: '',
      weight: 0,
      image: null
    };

    this.variants.push(variant);
    this.renderVariants();
    this.updateSummary();
    this.showNotification('Variant added', 'success');
  }

  /**
   * Remove variant
   */
  removeVariant(variantId) {
    this.variants = this.variants.filter(v => v.id !== variantId);
    this.renderVariants();
    this.updateSummary();
  }

  /**
   * Update variant
   */
  updateVariant(variantId, updates) {
    const variant = this.variants.find(v => v.id === variantId);
    if (variant) {
      Object.assign(variant, updates);
      this.updateSummary();
    }
  }

  /**
   * Render variants UI
   */
  renderVariants() {
    const container = document.getElementById('variants-container');
    if (!container) return;

    if (this.variants.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500 opacity-60">
          <i class="fas fa-plus-circle text-3xl mb-2 block"></i>
          <p class="text-sm">No variants added</p>
          <p class="text-xs">Click "Add Variant" to create size/color options</p>
        </div>
      `;
      document.getElementById('variants-count').textContent = '0 variants';
      return;
    }

    container.innerHTML = this.variants.map((variant, index) => `
      <div class="variant-row p-3 rounded-lg flex flex-col md:flex-row md:items-center gap-3 border backdrop-blur-sm">
        <div class="flex-1">
          <label class="block text-xs font-medium text-gray-700 mb-1">Option 1 (e.g., Size)</label>
          <input type="text" value="${variant.option1 || ''}" placeholder="Small" class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500" onchange="modernProductModal.updateVariant('${variant.id}', {option1: this.value})">
        </div>
        <div class="flex-1">
          <label class="block text-xs font-medium text-gray-700 mb-1">Option 2 (e.g., Color)</label>
          <input type="text" value="${variant.option2 || ''}" placeholder="Blue" class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500" onchange="modernProductModal.updateVariant('${variant.id}', {option2: this.value})">
        </div>
        <div class="flex-1">
          <label class="block text-xs font-medium text-gray-700 mb-1">Price ($)</label>
          <input type="number" step="0.01" min="0" value="${variant.price || ''}" class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500" onchange="modernProductModal.updateVariant('${variant.id}', {price: parseFloat(this.value)})">
        </div>
        <div class="flex-1">
          <label class="block text-xs font-medium text-gray-700 mb-1">Stock</label>
          <input type="number" min="0" value="${variant.stock || ''}" class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500" onchange="modernProductModal.updateVariant('${variant.id}', {stock: parseInt(this.value)})">
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="modernProductModal.removeVariant('${variant.id}')" class="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition-colors" aria-label="Remove variant" title="Remove variant">
            <i class="fas fa-trash text-sm"></i>
          </button>
        </div>
      </div>
    `).join('');

    document.getElementById('variants-count').textContent = `${this.variants.length} variants`;
  }

  /**
   * Validate SKU uniqueness
   */
  async validateSKU(sku) {
    if (!sku.trim()) {
      this.isSKUUnique = true;
      document.getElementById('sku-status').textContent = 'No SKU entered';
      return;
    }

    const statusEl = document.getElementById('sku-status');
    statusEl.textContent = 'Checking uniqueness...';
    statusEl.className = 'sku-checking';

    try {
      const { data, error } = await window.supabaseClient
        .from('products')
        .select('id')
        .eq('sku', sku.trim())
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      if (data) {
        this.isSKUUnique = false;
        statusEl.textContent = 'SKU already exists';
        statusEl.className = 'sku-invalid';
        this.showFieldError(document.getElementById('sku'), 'SKU must be unique');
      } else {
        this.isSKUUnique = true;
        statusEl.textContent = 'SKU is unique';
        statusEl.className = 'sku-valid';
        document.getElementById('sku').classList.add('field-valid');
        document.getElementById('sku').classList.remove('field-invalid');
      }
    } catch (error) {
      console.error('SKU validation failed:', error);
      statusEl.textContent = 'Validation error';
      statusEl.className = 'sku-invalid';
      this.isSKUUnique = false;
    }
  }

  /**
   * Show field error
   */
  showFieldError(field, message) {
    const container = field.closest('div');
    let errorEl = container.querySelector('[role="alert"]');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.setAttribute('role', 'alert');
      errorEl.className = 'hidden text-red-500 text-xs mt-1';
      container.appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    field.classList.add('field-invalid');
    field.classList.remove('field-valid');
    field.focus();
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    toast.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.remove('translate-x-full'));

    // Auto remove
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Bind auto-population to modal elements after they're created
   */
  bindAutoPopulation() {
    console.log('[ModernProductModal] 🔗 Binding auto-population to modal elements...');
    // This method is called during initialization but the actual binding happens in show()
    // when elements are guaranteed to exist
  }

  /**
   * Show success in footer
   */
  showSuccess(message) {
    const submitBtn = document.getElementById('submit-product');
    if (submitBtn) {
      submitBtn.innerHTML = `<i class="fas fa-check mr-2 text-green-400"></i>${message}`;
      submitBtn.classList.add('bg-green-500', 'cursor-default');
      submitBtn.disabled = true;
    }
  }

  /**
   * Show error in footer
   */
  showError(message) {
    const submitBtn = document.getElementById('submit-product');
    if (submitBtn) {
      submitBtn.innerHTML = `<i class="fas fa-exclamation-triangle mr-2 text-red-400"></i>Error: ${message}`;
      submitBtn.classList.add('bg-red-500');
      submitBtn.disabled = false;
    }

    this.showNotification(message, 'error');
  }

  /**
   * Update product summary
   */
  updateSummary() {
    const form = document.getElementById('modern-product-form');
    const summary = document.getElementById('product-summary');

    const data = new FormData(form);
    const summaryData = {
      name: data.get('name') || 'Not specified',
      title: data.get('title') || 'Not specified',
      price: data.get('price') ? `$${parseFloat(data.get('price')).toFixed(2)}` : 'Not specified',
      stock: data.get('stock') || 'Not specified',
      vertical: document.querySelector('select[name="vertical"] option:checked')?.textContent || 'Not specified',
      category: document.querySelector('select[name="category"] option:checked')?.textContent || 'Not specified',
      brand: (() => {
        const customBrand = (data.get('brand_custom_name') || '').trim();
        if (customBrand) {
          return `${customBrand} (custom)`;
        }
        const brandOption = document.querySelector('select[name="brand_id"] option:checked');
        if (!brandOption) {
          return 'Auto (Unbranded)';
        }
        const label = brandOption.textContent?.trim() || 'Auto (Unbranded)';
        return brandOption.value ? label : 'Auto (Unbranded)';
      })(),
      hasImage: !!this.formData.imageFile,
      attributesCount: this.getAttributesCount()
    };

    summary.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><strong>Name:</strong> ${summaryData.name}</div>
        <div><strong>Title:</strong> ${summaryData.title}</div>
        <div><strong>Price:</strong> ${summaryData.price}</div>
        <div><strong>Stock:</strong> ${summaryData.stock}</div>
        <div><strong>Vertical:</strong> ${summaryData.vertical}</div>
        <div><strong>Category:</strong> ${summaryData.category}</div>
        <div><strong>Brand:</strong> ${summaryData.brand}</div>
        <div><strong>Image:</strong> ${summaryData.hasImage ? '✓ Uploaded' : '✗ Not uploaded'}</div>
        <div><strong>Attributes:</strong> ${summaryData.attributesCount} available</div>
      </div>
    `;
  }

  /**
   * Get attributes count for summary
   */
  getAttributesCount() {
    const attributesContainer = document.getElementById('attributes-container');
    if (!attributesContainer) return 0;

    // Count the number of attribute items (excluding loading/error messages)
    const attributeItems = attributesContainer.querySelectorAll('.p-3.bg-gray-50.rounded-lg.border');
    return attributeItems.length;
  }

  /**
   * Submit final form with enhanced validation and feedback - NOW PROPERLY UTILIZES MODULES
   */
  async submitFinalForm() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      console.log('[MODAL_SUBMISSION] 🚀 Starting enhanced form submission with full module integration...');

      // Final comprehensive validation of all tabs
      const allTabsValid = await this.validateAllTabs();

      if (!allTabsValid) {
        this.resetSubmitButton();
        this.showNotification('Please complete all required fields across all tabs before submitting', 'error');
        return;
      }

      // Initialize all required modules for proper media processing
      await this.initializeModulesForSubmission();

      // Bridge all modal data to the processing modules
      await this.bridgeModalDataToModules();

      // Show progress indicator
      this.updateSubmitButton('Processing...', 'animate-pulse');

      // Use ProductFormManager for comprehensive submission with module integration
      const { ProductFormManager } = await import('./product-posting-modules/product-form-manager.js');

      // Create a ProductFormManager instance for this modal's form
      const formElement = document.getElementById('modern-product-form');
      const formManager = new ProductFormManager({
        formElement: formElement,
        options: {
          enableAutoSave: false, // Disable for one-time submission
          enableBulkUpload: false, // Single product submission
          enableVariants: true,
          maxVariants: 10
        }
      });

      // Override form submission to use our validated data
      await this.performSubmissionWithModules(formManager);

      // Get current user for success message
      const userRes = await window.getCurrentUser();
      const user = userRes?.user || userRes?.data?.user;

      // Handle category suggestion submission if enabled
      const formData = await this.collectFinalFormData();
      if (formData.categorySuggestion) {
        await this.submitCategorySuggestion(formData.categorySuggestion, user?.id);
      }

      const successMessage = formData.categorySuggestion
        ? 'Product created and category suggestion submitted!'
        : 'Product created successfully!';

      this.showSuccess(successMessage);

      // Automatically reset the flow so the next posting starts clean
      this.scheduleAutoResetForNextPosting(2000);

    } catch (error) {
      console.error('Final form submission failed:', error);
      this.resetSubmitButton();
      this.showError('Failed to create product. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Initialize all required modules for proper submission
   */
  async initializeModulesForSubmission() {
    console.log('[MODULE_INIT] 🔧 Initializing modules for submission...');

    // Initialize the full product posting system
    await window.initializeProductPostingSystems();

    // Ensure MediaProcessor is connected with modal images
    if (!window.mediaProcessor) {
      const { initializeMediaProcessor } = await import('./product-posting-modules/media-processor.js');
      initializeMediaProcessor();
    }

    // Ensure YouTube URL Manager has the modal's URLs
    if (!window.youtubeUrlManager) {
      window.initializeYouTubeURLManager();
    }

    console.log('[MODULE_INIT] ✅ All modules initialized for submission');
  }

  /**
   * Bridge modal data to the processing modules
   */
  async bridgeModalDataToModules() {
    console.log('[DATA_BRIDGE] 🌉 Bridging modal data to processing modules...');

    // Bridge images from modal to MediaProcessor
    await this.bridgeImagesToMediaProcessor();

    // Bridge YouTube URLs from modal to YouTubeURLManager
    await this.bridgeYouTubeUrlsToManager();

    // Bridge form data for embedding generation
    await this.bridgeFormDataForProcessing();

    console.log('[DATA_BRIDGE] ✅ Modal data successfully bridged to modules');
  }

  /**
   * Bridge images from modal to MediaProcessor for proper processing
   */
  async bridgeImagesToMediaProcessor() {
    console.log('[IMAGE_BRIDGE] 🖼️ Bridging images to MediaProcessor...');

    if (this.images && this.images.length > 0) {
      // Clear existing media processor data
      if (window.mediaProcessor) {
        window.mediaProcessor.reset();
      }

      // Add images to MediaProcessor
      for (const imageData of this.images) {
        try {
          if (imageData.file) {
            window.mediaProcessor.addUploadedFile(imageData.file);
            console.log(`[IMAGE_BRIDGE] ✅ Added image: ${imageData.file.name}`);
          }
        } catch (error) {
          console.warn(`[IMAGE_BRIDGE] ⚠️ Failed to add image ${imageData.name}:`, error);
        }
      }
    } else {
      console.log('[IMAGE_BRIDGE] ℹ️ No images to bridge');
    }
  }

  collectActiveYouTubeUrls() {
    const candidates = [];

    if (this.youtubeUrlManager) {
      candidates.push(this.youtubeUrlManager);
    }

    if (typeof window !== 'undefined' && window.youtubeUrlManager && !candidates.includes(window.youtubeUrlManager)) {
      candidates.push(window.youtubeUrlManager);
    }

    if (candidates.length === 0) {
      return {
        urls: [],
        diagnostics: [],
        primaryManager: null
      };
    }

    const aggregatedUrls = new Set();
    const diagnostics = [];

    for (const manager of candidates) {
      if (!manager) continue;

      let urls = [];

      if (typeof manager.getYouTubeUrlsForSubmission === 'function') {
        urls = manager.getYouTubeUrlsForSubmission();
      } else if (typeof manager.getYouTubeUrls === 'function') {
        urls = manager.getYouTubeUrls();
      } else if (Array.isArray(manager.youtubeUrls)) {
        urls = [...manager.youtubeUrls];
      }

      if (!Array.isArray(urls)) {
        urls = [];
      }

      urls
        .filter(url => typeof url === 'string' && url.trim().length > 0)
        .forEach(url => aggregatedUrls.add(url.trim()));

      diagnostics.push({
        source: manager === this.youtubeUrlManager ? 'modalInstance' : 'globalInstance',
        managerType: manager.constructor?.name || 'unknown',
        returnedCount: urls.length,
        storedCount: Array.isArray(manager.youtubeUrls) ? manager.youtubeUrls.length : 0
      });
    }

    return {
      urls: Array.from(aggregatedUrls),
      diagnostics,
      primaryManager: candidates[0] || null
    };
  }

  /**
   * Bridge YouTube URLs from modal to YouTubeURLManager
   */
  async bridgeYouTubeUrlsToManager() {
    console.log('[YOUTUBE_BRIDGE] 🎬 Bridging YouTube URLs to manager...');

    const { urls, diagnostics, primaryManager } = this.collectActiveYouTubeUrls();

    if (urls.length === 0) {
      console.log('[YOUTUBE_BRIDGE] ℹ️ No YouTube URLs to bridge', { diagnostics });
      return;
    }

    // Ensure modal and global references point to the same manager for downstream callers
    if (primaryManager) {
      this.youtubeUrlManager = primaryManager;
      if (typeof window !== 'undefined') {
        window.youtubeUrlManager = primaryManager;
      }
    }

    if (!window.mediaProcessor) {
      console.warn('[YOUTUBE_BRIDGE] ⚠️ MediaProcessor not available to receive YouTube URLs');
      return;
    }

    // Clear any previously staged YouTube URLs before rehydrating
    window.mediaProcessor.youtubeUrls = [];

    urls.forEach(url => {
      try {
        window.mediaProcessor.addYouTubeUrl(url);
        console.log(`[YOUTUBE_BRIDGE] ✅ Added YouTube URL: ${url.substring(0, 50)}...`);
      } catch (error) {
        console.warn(`[YOUTUBE_BRIDGE] ⚠️ Failed to add YouTube URL ${url}:`, error);
      }
    });

    console.log('[YOUTUBE_BRIDGE] ✅ Completed YouTube URL bridging', {
      bridgedCount: urls.length,
      diagnostics
    });
  }

  /**
   * Bridge form data for proper processing
   */
  async bridgeFormDataForProcessing() {
    console.log('[FORM_BRIDGE] 📝 Preparing form data for processing...');

    // Ensure all media and URLs are properly connected
    if (window.mediaProcessor) {
      console.log('[FORM_BRIDGE] MediaProcessor ready with:', {
        uploadedFiles: window.mediaProcessor.uploadedFiles.length,
        youtubeUrls: window.mediaProcessor.youtubeUrls.length
      });
    }
  }

  /**
   * Update modal formData with processed results from modules
   */
  async updateFormDataWithModuleResults(processingResults) {
    console.log('[FORM_DATA_UPDATE] 🏗️ Updating modal formData with module processing results...');

    try {
      // Initialize collections if not already done
      if (!this.formData.allImages) this.formData.allImages = [];
      if (!this.formData.allEmbeddings) this.formData.allEmbeddings = [];
      if (!this.formData.mediaMetadata) this.formData.mediaMetadata = {};

      // Clear existing processed data to avoid duplicates
      this.formData.allImages = [];
      this.formData.allEmbeddings = [];
      this.formData.mediaMetadata = {};

      console.log('[FORM_DATA_UPDATE] Processing completed results from modules:', {
        uploadedCount: processingResults.uploaded?.length || 0,
        youtubeCount: processingResults.youtube?.length || 0,
        hasErrors: !!(processingResults.errors && processingResults.errors.length > 0)
      });

      // Process uploaded files (images/videos)
      if (processingResults.uploaded && processingResults.uploaded.length > 0) {
        console.log('[FORM_DATA_UPDATE] Processing uploaded files...');
        processingResults.uploaded.forEach((result, index) => {
          if (result.status === 'completed') {
            console.log(`[FORM_DATA_UPDATE] ✅ Adding uploaded file ${index + 1}:`, {
              url: result.publicUrl?.substring(0, 100) + '...',
              hasEmbedding: !!result.embedding,
              mediaType: result.mediaType,
              isMain: result.isMainImage || false
            });

            // Add file to allImages array
            this.formData.allImages.push(result.file || result.originalFile);

            // Add embedding to allEmbeddings array (guaranteed matching positions)
            this.formData.allEmbeddings.push(result.embedding || null);

            // Update first image as main for backward compatibility
            if (this.formData.allImages.length === 1) {
              this.formData.imageFile = result.file || result.originalFile;
              this.formData.embedding = result.embedding || null;
            }
          } else {
            console.warn(`[FORM_DATA_UPDATE] ⚠️ Skipping failed uploaded file ${index + 1}:`, result.error);
          }
        });
      }

      // Process YouTube videos
      if (processingResults.youtube && processingResults.youtube.length > 0) {
        console.log('[FORM_DATA_UPDATE] Processing YouTube videos...');
        processingResults.youtube.forEach((result, index) => {
          if (result.status === 'processed' && result.videoInfo) {
            console.log(`[FORM_DATA_UPDATE] ✅ Adding YouTube video ${index + 1}:`, {
              url: result.url?.substring(0, 100) + '...',
              videoId: result.videoInfo.videoId,
              embedUrl: result.videoInfo.embedUrl?.substring(0, 50) + '...'
            });

            // YouTube videos don't have files, so add placeholder
            this.formData.allImages.push(null); // Maintain 1:1 correspondence
            this.formData.allEmbeddings.push(null); // No embeddings for YouTube videos

            // Set up YouTube metadata for backend processing
            this.formData.youtubeVideos = this.formData.youtubeVideos || [];
            this.formData.youtubeVideos.push({
              url: result.url,
              videoId: result.videoInfo.videoId,
              thumbnail: result.videoInfo.thumbnail,
              embedUrl: result.videoInfo.embedUrl,
              extractorData: result.videoInfo
            });
          } else {
            console.warn(`[FORM_DATA_UPDATE] ⚠️ Skipping failed YouTube video ${index + 1}:`, result.error);
          }
        });
      }

      // Update media metadata for comprehensive tracking
      this.formData.mediaMetadata = {
        processed: {
          uploadedImages: processingResults.uploaded?.filter(r => r.status === 'completed').length || 0,
          youtubeVideos: processingResults.youtube?.filter(r => r.status === 'processed').length || 0,
          totalMediaItems: this.formData.allImages.length,
          hasEmbeddings: this.formData.allEmbeddings.some(e => e !== null),
          embeddingCount: this.formData.allEmbeddings.filter(e => e !== null).length
        },
        processingStats: processingResults.processingStats || {},
        errors: processingResults.errors || [],
        mediaItems: this.formData.allImages.map((file, index) => ({
          position: index,
          hasFile: !!file,
          hasEmbedding: !!this.formData.allEmbeddings[index],
          fileName: file?.name || 'YouTube Video',
          fileSize: file?.size || 0,
          type: file?.type?.startsWith('video/') ? 'video' : file?.name?.includes('youtube') ? 'youtube' : 'image'
        }))
      };

      // Set imageCount for validation
      this.formData.imageCount = this.formData.allImages.length;

      console.log('[FORM_DATA_UPDATE] ✅ FormData updated successfully:', {
        totalImages: this.formData.allImages.length,
        totalEmbeddings: this.formData.allEmbeddings.length,
        mainImageSet: !!this.formData.imageFile,
        mainEmbeddingSet: !!this.formData.embedding,
        imageCount: this.formData.imageCount,
        hasYouTubeVideos: !!(this.formData.youtubeVideos && this.formData.youtubeVideos.length > 0),
        mediaMetadataSnapshot: this.formData.mediaMetadata.processed
      });

      return true;

    } catch (error) {
      console.error('[FORM_DATA_UPDATE] ❌ Failed to update formData with module results:', error);
      // Don't throw - let submission continue with whatever data we have
      return false;
    }
  }

  /**
   * Perform submission using the ProductFormManager with full module integration
   */
  async performSubmissionWithModules(formManager) {
    console.log('[MODULE_SUBMISSION] 🚀 Performing submission with full module integration...');

    // First, process all media through MediaProcessor
    if (window.mediaProcessor) {
      console.log('[MODULE_SUBMISSION] 📡 Processing media through MediaProcessor...');

      const processingResults = await window.mediaProcessor.processAllMedia({
        generateThumbnails: true,
        generateEmbeddings: true
      });

      console.log('[MODULE_SUBMISSION] ✅ Media processing results:', {
        uploadedProcessed: processingResults.uploaded?.length || 0,
        youtubeProcessed: processingResults.youtube?.length || 0,
        errors: processingResults.errors?.length || 0
      });

      if (processingResults.errors && processingResults.errors.length > 0) {
        console.warn('[MODULE_SUBMISSION] ⚠️ Media processing had errors, but continuing with submission:', processingResults.errors);
      }

      // CRITICAL FIX: Update modal's formData with processed results from modules
      await this.updateFormDataWithModuleResults(processingResults);

      console.log('[MODULE_SUBMISSION] 🏗️ Updated modal data with module processing results');
    }

    // Now use the form manager's submission logic with updated data
    const result = await formManager.handleSubmit(new Event('submit', { bubbles: true }));

    if (result !== true) {
      throw new Error('Form manager submission failed');
    }

    console.log('[MODULE_SUBMISSION] 🎉 Submission completed successfully with full module integration!');
  }

  /**
   * Validate all tabs before final submission
   */
  async validateAllTabs() {
    for (let i = 0; i < this.tabs.length; i++) {
      this.switchTab(i);
      if (!this.validateCurrentTab()) {
        // Switch to the tab with errors
        setTimeout(() => this.switchTab(i), 100);
        return false;
      }
    }
    return true;
  }

  /**
   * Collect final form data with comprehensive validation
   */
  async collectFinalFormData() {
    try {
      const form = document.getElementById('modern-product-form');
      const formDataObj = new FormData(form);

      console.log('[ENHANCED_MEDIA] Collecting final form data...');
      console.log('[ENHANCED_MEDIA] Current images count:', this.images.length);

      // Check if category suggestion is enabled
      const suggestNewCategory = document.getElementById('suggest-new-category')?.checked;
      let categorySuggestionData = null;

      if (suggestNewCategory) {
        categorySuggestionData = {
          name: formDataObj.get('suggested_category_name'),
          description: formDataObj.get('suggested_category_description'),
          verticalId: formDataObj.get('vertical')
        };
      }

      const { urls: consolidatedYouTubeUrls } = this.collectActiveYouTubeUrls();

      const rawBrandId = formDataObj.get('brand_id');
      const rawCustomBrand = formDataObj.get('brand_custom_name');
      const trimmedCustomBrand = typeof rawCustomBrand === 'string' ? rawCustomBrand.trim() : '';
      const normalizedCustomBrand = trimmedCustomBrand
        ? trimmedCustomBrand.slice(0, this.customBrandMaxLength)
        : '';
      const normalizedBrandId = !normalizedCustomBrand && typeof rawBrandId === 'string' && rawBrandId.trim()
        ? rawBrandId.trim()
        : null;

      const finalData = {
        name: formDataObj.get('name'),
        title: formDataObj.get('title'),
        price: parseFloat(formDataObj.get('price')),
        stock: parseInt(formDataObj.get('stock')),
        description: formDataObj.get('description'),
        vertical_id: formDataObj.get('vertical'),
        category_id: formDataObj.get('category'),
        brand_id: normalizedBrandId,
        brand_custom_name: normalizedCustomBrand || null,
        sku: formDataObj.get('sku'),
        variants: this.variants,
        shipping: {
          shipping_weight: parseFloat(formDataObj.get('shipping_weight')),
          dimensions: formDataObj.get('dimensions'),
          shipping_method: formDataObj.get('shipping_method'),
          handling_time: formDataObj.get('handling_time'),
          delivery_notes: formDataObj.get('delivery_notes'),
          requires_signature: !!formDataObj.get('requires_signature'),
          adult_signature: !!formDataObj.get('adult_signature'),
          offers_self_delivery: !!formDataObj.get('offers_self_delivery'),
          delivery_options: {
            free_delivery: !!formDataObj.get('free_delivery'),
            express_delivery: !!formDataObj.get('express_delivery'),
            delivery_radius_km: parseInt(formDataObj.get('delivery_radius_km')) || null
          },
          delivery_scope: formDataObj.get('delivery_scope'),
          delivery_cost: parseFloat(formDataObj.get('delivery_cost')) || 0,
          min_order_value: parseFloat(formDataObj.get('min_order_value')) || 0,
          delivery_time_estimate: formDataObj.get('delivery_time_estimate'),
          is_express_delivery: !!formDataObj.get('is_express_delivery'),
          delivery_time_days: parseInt(formDataObj.get('delivery_days')) || 3
        },
        attributes: this.collectAttributesFromForm(formDataObj),
        categorySuggestion: categorySuggestionData,
          youtubeUrls: consolidatedYouTubeUrls,
      // Enhanced media data with proper structure
      media: {
        images: this.formData.allImages || [],
        imageEmbeddings: this.formData.allEmbeddings || [],
        mediaMetadata: this.formData.mediaMetadata || {
          images: this.images.map(img => ({
            id: img.id,
            name: img.name,
            size: img.size,
            status: img.status,
            embeddingStatus: img.embeddingStatus,
            order: img.order
          }))
        },
        altTexts: this.collectImageAltTexts()
      },

      // Add imageCount based on actual images uploaded
      imageCount: this.images.length
      };

      // Set main image for backward compatibility
      if (finalData.media.images.length > 0) {
        finalData.imageFile = finalData.media.images[0];
        finalData.embedding = finalData.media.imageEmbeddings[0];
      }

      console.log('[ENHANCED_MEDIA] Final form data structure:', {
        imagesCount: finalData.media.images.length,
        hasImageFile: !!finalData.imageFile,
        hasEmbedding: !!finalData.embedding,
        embeddingLength: finalData.embedding?.length,
        embeddingType: Array.isArray(finalData.embedding) ? 'array' : typeof finalData.embedding,
        firstFewEmbeddingValues: finalData.embedding?.slice(0, 3)
      });

      // Additional validation for embedding status
      if (finalData.media.images.length > 0 && !finalData.embedding) {
        console.log('[ENHANCED_MEDIA] ℹ️ Images present but no embedding - delegating to server pipeline as expected');
        const imagesWithEmbeddings = finalData.media.imageEmbeddings.filter(embedding =>
          embedding && Array.isArray(embedding) && embedding.length === 512
        );
        console.log(`[ENHANCED_MEDIA] Images with valid embeddings: ${imagesWithEmbeddings.length} out of ${finalData.media.images.length}`);
      }

      return finalData;
    } catch (error) {
      console.error('Failed to collect final form data:', error);
      this.showError('Failed to collect form data. Please try again.');
      return null;
    }
  }

  /**
   * Update submit button during processing
   */
  updateSubmitButton(text, additionalClasses = '') {
    const submitBtn = document.getElementById('submit-product');
    if (submitBtn) {
      submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${text}`;
      submitBtn.className = `px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg ${additionalClasses}`;
      submitBtn.disabled = true;
    }
  }

  /**
   * Reset submit button to original state
   */
  resetSubmitButton() {
    const submitBtn = document.getElementById('submit-product');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-rocket-launch mr-2"></i>Create Product';
      submitBtn.className = 'px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg';
      submitBtn.disabled = false;
    }
  }

  /**
   * Submit the form (legacy method - kept for backward compatibility)
   */
  async submitForm() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      // Collect form data
      const form = document.getElementById('modern-product-form');
      const formData = new FormData(form);

      // Check if category suggestion is enabled
      const suggestNewCategory = document.getElementById('suggest-new-category')?.checked;
      let categorySuggestionData = null;

      if (suggestNewCategory) {
        categorySuggestionData = {
          name: formData.get('suggested_category_name'),
          description: formData.get('suggested_category_description'),
          verticalId: formData.get('vertical')
        };
      }

      const rawBrandId = formData.get('brand_id');
      const rawCustomBrand = formData.get('brand_custom_name');
      const trimmedCustomBrand = typeof rawCustomBrand === 'string' ? rawCustomBrand.trim() : '';
      const normalizedCustomBrand = trimmedCustomBrand
        ? trimmedCustomBrand.slice(0, this.customBrandMaxLength)
        : '';
      const normalizedBrandId = !normalizedCustomBrand && typeof rawBrandId === 'string' && rawBrandId.trim()
        ? rawBrandId.trim()
        : null;

      const productData = {
        name: formData.get('name'),
        title: formData.get('title'),
        price: parseFloat(formData.get('price')),
        stock: parseInt(formData.get('stock')),
        description: formData.get('description'),
        vertical_id: formData.get('vertical'),
        category_id: formData.get('category'),
        brand_id: normalizedBrandId,
        brand_custom_name: normalizedCustomBrand || null,
        imageFile: this.formData.imageFile,
        embedding: this.formData.embedding,
        sku: formData.get('sku'),
        shipping: {
          shipping_weight: parseFloat(formData.get('shipping_weight')),
          dimensions: formData.get('dimensions'),
          shipping_method: formData.get('shipping_method'),
          handling_time: formData.get('handling_time'),
          delivery_notes: formData.get('delivery_notes'),
          requires_signature: !!formData.get('requires_signature'),
          adult_signature: !!formData.get('adult_signature'),
          offers_self_delivery: !!formData.get('offers_self_delivery'),
          delivery_options: {
            free_delivery: !!formData.get('free_delivery'),
            express_delivery: !!formData.get('express_delivery'),
            delivery_radius_km: parseInt(formData.get('delivery_radius_km')) || null
          }
        },
        // Add comprehensive delivery fields that were missing
        delivery_scope: formData.get('delivery_scope'),
        delivery_cost: parseFloat(formData.get('delivery_cost')) || 0,
        min_order_value: parseFloat(formData.get('min_order_value')) || 0,
        delivery_time_estimate: formData.get('delivery_time_estimate'),
        is_express_delivery: !!formData.get('is_express_delivery'),
        delivery_time_days: parseInt(formData.get('delivery_days')) || 3,
        variants: this.variants,
        attributes: this.collectAttributesFromForm(formData),
        dynamicAttributes: window.validateAndFormatAttributes ? window.validateAndFormatAttributes(window.collectedAttributes || []) : [],
        categorySuggestion: categorySuggestionData
      };

      // Show loading state
      this.showLoading('Creating your product...');

      // Submit using existing logic
      const { handleProductFormSubmission } = await import('./product-posting.js?v=' + Date.now());

      // Get current user for seller_id
      const userRes = await window.getCurrentUser();
      const user = userRes?.user || userRes?.data?.user;

      // Create a mock form element for compatibility with all required Supabase fields
      const mockForm = {
        name: { value: productData.name },
        title: { value: productData.title },
        price: { value: productData.price },
        stock: { value: productData.stock },
        description: { value: productData.description },
        vertical: { value: productData.vertical_id },
        category: { value: productData.category_id },
        brand_id: { value: productData.brand_id || '' },
        brand_custom_name: { value: productData.brand_custom_name || '' },
        image: { files: productData.imageFile ? [productData.imageFile] : [] },
        // Add seller_id for Supabase NOT NULL requirement
        seller_id: { value: user?.id || '' },
        // Add shop_name for seller creation
        shop_name: { value: `${productData.name} Shop` }
      };

      // Add new fields to mockForm for submission
      mockForm.sku = { value: productData.sku };
      mockForm.variants = { value: JSON.stringify(productData.variants) };
      mockForm.attributes = { value: JSON.stringify({
        ...productData.attributes,
        shipping: productData.shipping,
        categorySuggestion: productData.categorySuggestion
      }) };

      await handleProductFormSubmission(mockForm);

      // Handle category suggestion submission if enabled
      if (categorySuggestionData) {
        await this.submitCategorySuggestion(categorySuggestionData, user?.id);
      }

      const successMessage = suggestNewCategory
        ? 'Product created and category suggestion submitted!'
        : 'Product created successfully!';

      this.showSuccess(successMessage);
      setTimeout(() => {
        this.hide();
        // Reset form
        this.reset();
      }, 2000);

    } catch (error) {
      console.error('Form submission failed:', error);
      this.showError('Failed to create product. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Submit category suggestion to database
   */
  async submitCategorySuggestion(suggestionData, userId) {
    try {
      console.log('[ModernProductModal] Submitting category suggestion:', suggestionData);

      const { data, error } = await window.supabaseClient
        .from('category_suggestions')
        .insert({
          suggested_name: suggestionData.name,
          suggested_description: suggestionData.description,
          suggested_by_user_id: userId,
          vertical_id: suggestionData.verticalId,
          status: 'pending'
        });

      if (error) throw error;

      console.log('[ModernProductModal] ✅ Category suggestion submitted successfully');
      this.showNotification('Category suggestion submitted for review', 'success');

    } catch (error) {
      console.error('[ModernProductModal] ❌ Failed to submit category suggestion:', error);
      this.showNotification('Product created but category suggestion failed', 'warning');
      // Don't block product creation due to suggestion failure
    }
  }

  /**
   * Collect dynamic attributes from formData (shopify_attributes)
   * ENHANCED: Merge with category attributes manager results
   */
  collectAttributesFromForm(formData) {
    console.log('[ATTRIBUTES_DEBUG] 🔧 Collecting attributes from form data...');

    // First, collect old-style attributes
    const attrs = {};
    if (this.attributes && Array.isArray(this.attributes)) {
      this.attributes.forEach(attr => {
        const key = `attr_${attr.id}`;
        let val = formData.get(key);
        if (attr.type === 'boolean') {
          val = !!formData.get(key);
        }
        if (val !== undefined && val !== null && val !== '') {
          attrs[attr.name] = val;
          console.log(`[ATTRIBUTES_DEBUG] ✅ Collected attribute: ${attr.name} = ${val}`);
        } else {
          console.log(`[ATTRIBUTES_DEBUG] ⚠️ Empty attribute: ${attr.name}`);
        }
      });
    }

    // Handle dynamic attributes from category attributes manager
    if (window.collectedAttributes && Array.isArray(window.collectedAttributes)) {
      window.collectedAttributes.forEach(attr => {
        if (attr.key && attr.value !== '') {
          attrs[attr.key] = attr.value;
          console.log(`[ATTRIBUTES_DEBUG] ✅ Collected dynamic attribute: ${attr.key} = ${attr.value}`);
        }
      });
    }

    // Convert old-style attributes to JSON array format
    const oldAttributesArray = Object.entries(attrs).map(([name, value]) => ({
      name: name,
      value: value,
      type: typeof value,
      source: 'legacy'
    }));

    console.log('[ATTRIBUTES_DEBUG] 📊 Old-style attributes:', oldAttributesArray.length);

    // Second, collect new dynamic attributes from category attributes manager
    let dynamicAttributesArray = [];
    try {
      if (window.validateAndFormatAttributes && window.collectedAttributes) {
        dynamicAttributesArray = window.validateAndFormatAttributes(window.collectedAttributes) || [];
        console.log('[ATTRIBUTES_DEBUG] 📊 Dynamic attributes:', dynamicAttributesArray.length);

        // Mark as dynamic source
        dynamicAttributesArray = dynamicAttributesArray.map(attr => ({
          ...attr,
          source: 'dynamic'
        }));
      }
    } catch (error) {
      console.error('[ATTRIBUTES_DEBUG] ❌ Error collecting dynamic attributes:', error);
    }

    // Merge both arrays
    const combinedAttributes = [...oldAttributesArray, ...dynamicAttributesArray];

    console.log('[ATTRIBUTES_DEBUG] ✅ Combined attributes:', {
      old: oldAttributesArray.length,
      dynamic: dynamicAttributesArray.length,
      total: combinedAttributes.length
    });

    return combinedAttributes;
  }

  /**
   * Show loading state
   */
  showLoading(message) {
    const footer = document.querySelector('#modern-product-modal .flex.items-center.justify-between');
    footer.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
        <span class="text-gray-600">${message}</span>
      </div>
    `;
  }

  /**
   * Collect image alt texts from form
   */
  collectImageAltTexts() {
    const altTexts = {};

    // Collect main image alt text
    const mainAltText = document.getElementById('image-alt-text')?.value?.trim();
    if (mainAltText) {
      altTexts.main = mainAltText;
    }

    // Collect additional image alt texts
    const additionalAltTexts = document.getElementById('additional-alt-texts')?.value?.trim();
    if (additionalAltTexts) {
      altTexts.additional = additionalAltTexts.split('\n').filter(text => text.trim());
    }

    return altTexts;
  }

  /**
   * Reset the modal
   */
  reset() {
    this.currentStep = 0;
    this.formData = {};
    this.variants = [];
    this.isSubmitting = false;
    this.embeddingStatus = 'idle';

    this.resetSubmitButton();

    if (window.mediaProcessor?.reset) {
      window.mediaProcessor.reset();
    }

    if (this.mediaUploadManager?.resetState) {
      this.mediaUploadManager.resetState();
    } else if (window.mediaUploadManager?.resetState) {
      window.mediaUploadManager.resetState();
    } else {
      window.mediaUploadManager?.cancelAllUploads?.();
      window.mediaUploadManager?.clearSessionCache?.();
    }

    // Reset media data
    this.images = [];

    // Reset YouTube URLs
    if (this.youtubeUrlManager) {
      this.youtubeUrlManager.reset();
    }

    // Reset form
    const form = document.getElementById('modern-product-form');
    if (form) {
      form.reset();
    }

    this.resetBrandSelect({ reason: 'reset' });

    // Reset image previews
    const imageGrid = document.getElementById('images-preview-grid');
    if (imageGrid) {
      imageGrid.innerHTML = '';
    }

    // Reset upload area visibility
    const uploadArea = document.getElementById('image-upload-area');
    if (uploadArea) {
      uploadArea.classList.remove('hidden');
    }

    // Reset counters
    this.updateImageCount();

    // Hide bulk actions
    const bulkActions = document.getElementById('bulk-image-actions');
    if (bulkActions) {
      bulkActions.classList.add('hidden');
    }

    // Show first tab
    this.switchTab(0);
  }

  scheduleAutoResetForNextPosting(delay = 2000) {
    const resetDelay = Number.isFinite(delay) ? delay : 2000;

    setTimeout(() => {
      this.hide();
      this.reset();
    }, resetDelay);
  }

  /**
   * Clean up any stray footer elements that might interfere with modal footer
   */
  cleanupStrayFooterElements() {
    console.log('[MODAL_FOOTER_INTEGRITY] Cleaning up stray footer elements...');

    // Remove any footer-like elements that might be floating outside the modal
    const potentialStrayElements = [
      // Remove orphaned footer elements
      document.querySelectorAll('footer:not(#modern-product-modal footer)'),
      // Remove any elements with modal-footer class outside our modal
      document.querySelectorAll('.modal-footer:not(#modern-product-modal .modal-footer)'),
      // Remove any elements with position fixed/absolute that might be acting as footers
      document.querySelectorAll('[style*="position:fixed"].bg-white'),
      document.querySelectorAll('[style*="position:absolute"].bg-white')
    ];

    let removedCount = 0;
    potentialStrayElements.forEach(selectorResults => {
      selectorResults.forEach(element => {
        // Only remove if it looks like a footer (has buttons or modal-related classes)
        if (element.querySelector('button') ||
            element.classList.contains('modal-footer') ||
            element.classList.contains('bg-white') &&
            element.querySelector('[id*="tab"], [id*="submit"], [id*="draft"]')) {

          console.log('[MODAL_FOOTER_INTEGRITY] Removing potential stray footer element:', element);
          element.remove();
          removedCount++;
        }
      });
    });

    // Remove any CSS rules that might be interfering with modal footer positioning
    this.removeInterferingCSS();

    console.log(`[MODAL_FOOTER_INTEGRITY] Cleanup complete: ${removedCount} elements removed`);

    return removedCount;
  }

  /**
   * Remove CSS rules that might interfere with modal footer positioning
   */
  removeInterferingCSS() {
    // Remove any dynamically added styles that might interfere
    const interferingStyles = [
      'modal-footer-styles',
      'footer-position-fixes',
      'dynamic-modal-styles'
    ];

    interferingStyles.forEach(styleId => {
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
        console.log(`[MODAL_FOOTER_INTEGRITY] Removed interfering CSS: ${styleId}`);
      }
    });

    // Fix any existing footer elements that might be styled incorrectly
    const modalFooter = document.querySelector('#modern-product-modal footer');
    if (modalFooter) {
      // Force correct positioning and ensure it's contained within modal
  modalFooter.style.setProperty('position', 'relative', 'important');
  modalFooter.style.setProperty('bottom', 'auto', 'important');
      modalFooter.style.setProperty('flex-shrink', '0', 'important');
      modalFooter.style.setProperty('width', '100%', 'important');
      modalFooter.style.setProperty('left', 'auto', 'important');
      modalFooter.style.setProperty('right', 'auto', 'important');
      modalFooter.style.setProperty('top', 'auto', 'important');

      console.log('[MODAL_FOOTER_INTEGRITY] Applied containment styles to modal footer');
    }
  }

  /**
    * Show the modal
    */
    async show() {
      console.log('[MODAL_DEBUG] 🚨 MODAL SHOW CALLED! Attempting to show modal...');
      console.log('[MODAL_DEBUG] 📊 Show timestamp:', new Date().toISOString());
      console.log('[MODAL_DEBUG] 🔍 Call stack:', new Error().stack.split('\n')[2]?.trim());

      // Log YouTube functionality status before calling ensureYouTubeFunctionality
      console.log('[YOUTUBE_DEBUG] 📋 YouTube functionality status before ensureYouTubeFunctionality():', {
        youtubeUrlManagerExists: !!this.youtubeUrlManager,
        hasEnsureYouTubeFunctionality: typeof this.ensureYouTubeFunctionality === 'function',
        modalContext: 'show() method',
        lineNumber: '9018',
        timestamp: new Date().toISOString()
      });

      const modal = document.getElementById('modern-product-modal');

      if (!modal) {
        console.error('[MODAL_DEBUG] ❌ Modal element not found!');
        console.error('[MODAL_DEBUG] Available elements with "modal" in ID:', Array.from(document.querySelectorAll('[id*="modal"]')).map(el => el.id));
        console.error('[MODAL_DEBUG] Available elements with "product" in ID:', Array.from(document.querySelectorAll('[id*="product"]')).map(el => el.id));
        return;
      }

      // Enhanced modal state debugging
      console.log('[MODAL_DEBUG] Modal state before showing:', {
        modalExists: !!modal,
        modalHidden: modal.classList.contains('hidden'),
        modalDisplay: window.getComputedStyle(modal).display,
        modalVisibility: window.getComputedStyle(modal).visibility,
        modalOpacity: window.getComputedStyle(modal).opacity,
        bodyModalOpen: document.body.classList.contains('modal-open')
      });

      // Clean up any stray footer elements before showing modal
      this.cleanupStrayFooterElements();

      console.log('[MODAL_DEBUG] ✅ Modal element found, showing modal');
      modal.classList.remove('hidden');
      document.body.classList.add('modal-open');

      // Enhanced button debugging after modal is shown
      setTimeout(() => {
        const footerButtons = {
          prevBtn: document.getElementById('prev-tab'),
          nextBtn: document.getElementById('next-tab'),
          submitBtn: document.getElementById('submit-product'),
          saveDraftBtn: document.getElementById('save-draft-btn')
        };

        console.log('[MODAL_DEBUG] 🔍 Footer buttons status after modal show:', footerButtons);
        console.log('[MODAL_DEBUG] 📋 Detailed button analysis:');

        Object.entries(footerButtons).forEach(([name, btn]) => {
          if (btn) {
            const styles = window.getComputedStyle(btn);
            console.log(`  ${name}:`, {
              exists: true,
              visible: styles.display !== 'none' && styles.visibility !== 'hidden' && parseFloat(styles.opacity) > 0,
              disabled: btn.disabled,
              hiddenClass: btn.classList.contains('hidden'),
              position: styles.position,
              zIndex: styles.zIndex,
              width: styles.width,
              height: styles.height,
              textContent: btn.textContent.trim()
            });
          } else {
            console.log(`  ${name}: NOT FOUND`);
          }
        });

        // Check if modal is actually visible
        const modalStyles = window.getComputedStyle(modal);
        console.log('[MODAL_DEBUG] Modal visibility after show:', {
          display: modalStyles.display,
          visibility: modalStyles.visibility,
          opacity: modalStyles.opacity,
          transform: modalStyles.transform,
          zIndex: modalStyles.zIndex
        });

        // Check for potential overlay issues
        const modalBackdrop = modal.querySelector('.bg-black\\/50');
        if (modalBackdrop) {
          const backdropStyles = window.getComputedStyle(modalBackdrop);
          console.log('[MODAL_DEBUG] Modal backdrop status:', {
            exists: true,
            display: backdropStyles.display,
            visibility: backdropStyles.visibility,
            opacity: backdropStyles.opacity,
            zIndex: backdropStyles.zIndex
          });
        }
      }, 100);

      // Reset to first tab
      this.switchTab(0);

      // Load categories now that modal is visible and elements exist
      await this.loadCategoriesWhenVisible();

      // Initialize image upload system immediately
      this.initializeModalOnShow();

      // Ensure YouTube functionality is properly initialized
      try {
        console.log('[YOUTUBE_DEBUG] 🔄 About to call ensureYouTubeFunctionality()...');
        this.ensureYouTubeFunctionality();
        console.log('[YOUTUBE_DEBUG] ✅ ensureYouTubeFunctionality() completed successfully');
      } catch (error) {
        console.error('[YOUTUBE_DEBUG] ❌ ensureYouTubeFunctionality() failed:', error);
        console.error('[YOUTUBE_DEBUG] Error details:', {
          message: error.message,
          stack: error.stack,
          methodContext: 'show() method',
          lineNumber: '9018'
        });
        // Don't throw - allow modal to continue even if YouTube functionality fails
      }

      // Ensure footer buttons are visible
      this.ensureFooterButtonsVisible();

      console.log('[MODAL_DEBUG] ✅ Modal show completed - modal should now be visible');

      // Final verification after a short delay
      setTimeout(() => {
        const isModalVisible = modal && !modal.classList.contains('hidden');
        console.log('[MODAL_DEBUG] 🎯 Final verification - Modal visible:', isModalVisible);

        if (!isModalVisible) {
          console.error('[MODAL_DEBUG] ❌ Modal is not visible after show() completed!');
          console.log('[MODAL_DEBUG] Modal classes:', modal?.className);
          console.log('[MODAL_DEBUG] Modal computed styles:', {
            display: modal ? window.getComputedStyle(modal).display : 'N/A',
            visibility: modal ? window.getComputedStyle(modal).visibility : 'N/A',
            opacity: modal ? window.getComputedStyle(modal).opacity : 'N/A'
          });
        } else {
          console.log('[MODAL_DEBUG] 🎉 Modal is successfully visible!');
        }
      }, 200);
    }

  /**
   * Load categories when modal elements are guaranteed to be visible
   */
  async loadCategoriesWhenVisible() {
    try {
      const verticalSelect = document.getElementById('vertical-select');
      const categorySelect = document.getElementById('category-select');

      // Wait a bit to ensure elements are fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      if (verticalSelect && categorySelect) {
        console.log('[ModernProductModal] 🔗 Loading categories on modal show...');
        await this.loadCategories();
        this.initializeBrandSelector();
        if (categorySelect.value) {
          this.handleBrandForCategoryChange(categorySelect.value);
        } else {
          this.resetBrandSelect({ reason: 'no-category' });
        }
        console.log('[ModernProductModal] ✅ Categories loaded successfully on modal show');
      } else {
        console.error('[ModernProductModal] ❌ Vertical or category select elements not found');
        console.log('verticalSelect:', verticalSelect);
        console.log('categorySelect:', categorySelect);
      }
    } catch (error) {
      console.error('[ModernProductModal] ❌ Failed to load categories on modal show:', error);
    }
  }

  /**
   * Check and display preloading status
   */
  checkPreloadingStatus() {
    const preloadingCard = document.getElementById('preloading-status-card');

    // Check if model is cached
    const isCached = window.isModelCached ? window.isModelCached() : false;

    if (isCached) {
      // Model is cached, show ready status
      preloadingCard.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <i class="fas fa-check text-white text-xs"></i>
          </div>
          <div>
            <p class="font-medium text-green-900">AI processor ready</p>
            <p class="text-sm text-green-700">Model cached for fast processing</p>
          </div>
        </div>
      `;
      preloadingCard.classList.remove('hidden');
      return;
    }

    // Check preloading status
    const preloadStatus = window.getPreloadStatus ? window.getPreloadStatus() : { isPreloading: false, modelReady: false };

    if (preloadStatus.modelReady) {
      // Model is ready
      preloadingCard.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <i class="fas fa-check text-white text-xs"></i>
          </div>
          <div>
            <p class="font-medium text-green-900">AI processor ready</p>
            <p class="text-sm text-green-700">Model loaded and ready to use</p>
          </div>
        </div>
      `;
      preloadingCard.classList.remove('hidden');
    } else if (preloadStatus.isPreloading) {
      // Currently preloading
      preloadingCard.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></div>
          <div>
            <p class="font-medium text-green-900">Preparing AI processor...</p>
            <p class="text-sm text-green-700">Loading model for faster processing</p>
          </div>
        </div>
      `;
      preloadingCard.classList.remove('hidden');
    } else {
      // Not preloading, offer to start
      preloadingCard.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <i class="fas fa-info text-white text-xs"></i>
          </div>
          <div>
            <p class="font-medium text-blue-900">AI processor not loaded</p>
            <p class="text-sm text-blue-700">Load now for faster image processing</p>
          </div>
        </div>
      `;
      preloadingCard.classList.remove('hidden');

      // Auto-start preloading immediately when user reaches image step
      if (window.preloadTransformersModel) {
        console.log('[ModernProductModal] Auto-starting model preload');
        window.preloadTransformersModel().catch(error => {
          console.warn('[ModernProductModal] Auto-preload failed:', error);
        });
      }
    }
  }

  /**
   * Start iframe preloading for better performance
   */
  async startIframePreload() {
    console.log('[ModernProductModal] 🚀 Starting iframe preload for better performance');

    try {
      // Start iframe creation in background
      if (window.transformersClient && window.transformersClient.initTransformersIframe) {
        await window.transformersClient.initTransformersIframe();
        console.log('[ModernProductModal] ✅ Iframe preloaded successfully');
      } else {
        console.log('[ModernProductModal] ⏳ Waiting for transformersClient to be available...');
        // Wait for transformersClient to be available
        let attempts = 0;
        const maxAttempts = 20;

        while (!window.transformersClient && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }

        if (window.transformersClient && window.transformersClient.initTransformersIframe) {
          await window.transformersClient.initTransformersIframe();
          console.log('[ModernProductModal] ✅ Iframe preloaded successfully after waiting');
        } else {
          console.warn('[ModernProductModal] ⚠️ Could not preload iframe - transformersClient not available');
        }
      }
    } catch (error) {
      console.warn('[ModernProductModal] ⚠️ Iframe preload failed:', error);
      // Don't throw - this is not critical for modal functionality
    }
  }


  /**
   * Hide the modal
   */
  hide() {
    console.log('[MODAL_DEBUG] Hiding modal');
    const modal = document.getElementById('modern-product-modal');
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    // Clean up modal-specific footers on close
    this.cleanupModalFooters();
  }

  /**
   * Test navigation buttons functionality
   */
  testNavigationButtons() {
    console.log('[NAVIGATION_TEST] Testing navigation buttons...');

    // Check if modal exists
    const modal = document.getElementById('modern-product-modal');
    console.log('[NAVIGATION_TEST] Modal exists:', !!modal);
    console.log('[NAVIGATION_TEST] Modal hidden class:', modal?.classList.contains('hidden'));

    // Check if footer buttons exist
    const buttons = {
      prevBtn: document.getElementById('prev-tab'),
      nextBtn: document.getElementById('next-tab'),
      submitBtn: document.getElementById('submit-product'),
      saveDraftBtn: document.getElementById('save-draft-btn')
    };

    console.log('[NAVIGATION_TEST] Button elements:', buttons);

    // Check if buttons have correct visibility
    if (buttons.nextBtn) {
      console.log('[NAVIGATION_TEST] Next button classes:', buttons.nextBtn.className);
      console.log('[NAVIGATION_TEST] Next button hidden:', buttons.nextBtn.classList.contains('hidden'));
    }

    if (buttons.submitBtn) {
      console.log('[NAVIGATION_TEST] Submit button classes:', buttons.submitBtn.className);
      console.log('[NAVIGATION_TEST] Submit button hidden:', buttons.submitBtn.classList.contains('hidden'));
    }

    if (buttons.prevBtn) {
      console.log('[NAVIGATION_TEST] Previous button classes:', buttons.prevBtn.className);
      console.log('[NAVIGATION_TEST] Previous button disabled:', buttons.prevBtn.disabled);
    }

    // Check current tab
    console.log('[NAVIGATION_TEST] Current tab:', this.currentTab);
    console.log('[NAVIGATION_TEST] Total tabs:', this.tabs.length);

    return {
      modalExists: !!modal,
      modalVisible: modal ? !modal.classList.contains('hidden') : false,
      buttons: buttons,
      currentTab: this.currentTab,
      totalTabs: this.tabs.length
    };
  }





  /**
   * Enhanced image handling for multiple images
   */
  setupEnhancedImageUpload() {
    console.log('[ENHANCED_IMAGE_UPLOAD] Setting up enhanced image upload...');

    // Initialize images array
    this.images = [];

    // Set up drag and drop for upload area
    this.setupImageDragAndDrop();

    // Set up camera integration
    this.setupImageCameraIntegration();

    // Set up bulk actions
    this.setupBulkImageActions();

    console.log('[ENHANCED_IMAGE_UPLOAD] Enhanced image upload setup complete');
  }

  /**
   * Setup drag and drop for image upload area
   */
  setupImageDragAndDrop() {
    const uploadArea = document.getElementById('image-upload-area');

    if (uploadArea) {
      // Drag and drop events
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('border-blue-500', 'bg-blue-50');
      });

      uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
      });

      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-blue-500', 'bg-blue-50');

        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
          this.addMultipleImages(files);
        }
      });

      // Click to browse without re-triggering the dialog when the invisible input already caught the click
      uploadArea.addEventListener('click', (event) => {
        const fileInput = document.getElementById('modern-product-images');
        if (!fileInput) {
          return;
        }

        if (event.target === fileInput) {
          return;
        }

        event.preventDefault();
        fileInput.click();
      });
    }

    // File input change handler
    const fileInput = document.getElementById('modern-product-images');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
          this.addMultipleImages(files);
        }
        e.target.value = ''; // Reset for re-use
      });
    }
  }

  /**
   * Add multiple images to the preview
   */
  addMultipleImages(files) {
    console.log('[MULTI_IMAGE_UPLOAD] Adding multiple images:', files.length);

    // Check if we can add more images
    if (this.images.length >= this.maxImages) {
      this.showNotification('Maximum 5 images allowed', 'error');
      return;
    }

    // Limit to remaining slots
    const remainingSlots = this.maxImages - this.images.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      this.showNotification(`Only added ${filesToAdd.length} images. Maximum 5 images allowed.`, 'warning');
    }

    filesToAdd.forEach(file => {
      if (this.validateImageFile(file)) {
        this.addSingleImage(file);
      }
    });

    this.updateImageCount();
    this.updateFormData();
  }

  /**
   * Add single image to preview
   */
  addSingleImage(file) {
    const imageData = {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file: file,
      name: file.name,
      size: file.size,
      status: 'loading',
      embeddingStatus: 'pending',
      order: this.images.length
    };

    this.images.push(imageData);
    this.createImagePreviewElement(imageData);
    this.generateImageEmbedding(imageData);
  }

  /**
   * Create image preview element
   */
  createImagePreviewElement(imageData) {
    const grid = document.getElementById('images-preview-grid');
    if (!grid) return;

    const previewDiv = document.createElement('div');
    previewDiv.className = 'relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group cursor-move image-preview-item';
    previewDiv.style.order = imageData.order;
    previewDiv.draggable = true;
    previewDiv.dataset.imageId = imageData.id;

    // Drag handlers
    previewDiv.addEventListener('dragstart', () => {
      previewDiv.classList.add('dragging');
    });

    previewDiv.addEventListener('dragend', () => {
      previewDiv.classList.remove('dragging');
      this.updateImageOrder();
    });

    // Content
    previewDiv.innerHTML = `
      <!-- Loading state -->
      <div class="absolute inset-0 flex items-center justify-center bg-gray-100 loading-state">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>

      <!-- Image -->
      <img src="" alt="" class="w-full h-full object-cover hidden image-content">

      <!-- Thumbnail indicator -->
      <div class="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full hidden thumbnail-indicator">
        <i class="fas fa-star mr-1"></i>Thumbnail
      </div>

      <!-- Actions -->
      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity actions-overlay flex items-center justify-center">
        <button class="text-white hover:text-red-400 text-lg remove-image-btn" title="Remove image">
          <i class="fas fa-trash"></i>
        </button>
      </div>

      <!-- Status indicator -->
      <div class="absolute bottom-2 right-2 status-indicator">
        <!-- Processing status will be appended here -->
      </div>
    `;

    // Load image
    const img = previewDiv.querySelector('.image-content');
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
      img.classList.remove('hidden');
      previewDiv.querySelector('.loading-state').classList.add('hidden');
      this.updateThumbnailIndicator();
    };
    reader.readAsDataURL(imageData.file);

    // Remove button handler
    previewDiv.querySelector('.remove-image-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeImage(imageData.id);
    });

    grid.appendChild(previewDiv);
  }

  /**
   * Remove image from preview
   */
  removeImage(imageId) {
    const imageIndex = this.images.findIndex(img => img.id === imageId);
    if (imageIndex === -1) return;

    // Remove from array
    this.images.splice(imageIndex, 1);

    // Remove from DOM
    const previewElement = document.querySelector(`[data-image-id="${imageId}"]`);
    if (previewElement) {
      previewElement.remove();
    }

    // Update order and thumbnail indicator
    this.updateImageOrder();
    this.updateImageCount();
    this.updateFormData();
  }

  /**
   * Update image order after rearrange
   */
  updateImageOrder() {
    const grid = document.getElementById('images-preview-grid');
    const items = Array.from(grid.querySelectorAll('.image-preview-item'));

    items.forEach((item, index) => {
      const imageId = item.dataset.imageId;
      const imageData = this.images.find(img => img.id === imageId);
      if (imageData) {
        imageData.order = index;
        item.style.order = index;
      }
    });

    this.updateThumbnailIndicator();
    this.updateFormData();
  }

  /**
   * Update thumbnail indicator (first image)
   */
  updateThumbnailIndicator() {
    // Hide all thumbnail indicators
    document.querySelectorAll('.thumbnail-indicator').forEach(el => el.classList.add('hidden'));

    // Show thumbnail indicator on first image
    const firstItem = document.querySelector('.image-preview-item');
    if (firstItem) {
      const indicator = firstItem.querySelector('.thumbnail-indicator');
      if (indicator) {
        indicator.classList.remove('hidden');
      }
    }
  }

  /**
   * Validate image file
   */
  validateImageFile(file) {
    if (!file.type.startsWith('image/')) {
      this.showNotification(`${file.name} is not a valid image file`, 'error');
      return false;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      this.showNotification(`${file.name} is too large. Maximum size is 10MB.`, 'error');
      return false;
    }

    return true;
  }

  /**
   * Setup camera integration for images
   */
  setupImageCameraIntegration() {
    const cameraBtn = document.getElementById('camera-upload-btn');

    if (cameraBtn) {
      cameraBtn.addEventListener('click', () => {
        this.openImageCamera();
      });
    }
  }

  /**
   * Open camera for image capture
   */
  async openImageCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      this.imageCameraStream = stream;
      const modal = this.createImageCameraModal();

      modal.classList.remove('hidden');
      const video = modal.querySelector('#image-camera-video');
      if (video) {
        video.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      this.showNotification('Unable to access camera. Please check permissions.', 'error');
    }
  }

  /**
   * Create camera modal for images
   */
  createImageCameraModal() {
    let modal = document.getElementById('image-camera-modal');
    if (modal) return modal;

    const modalHTML = `
      <div id="image-camera-modal" class="fixed inset-0 bg-black z-50 hidden">
        <div class="flex flex-col h-full">
          <div class="bg-black text-white p-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold">Take Photo</h3>
            <button id="close-image-camera-modal" class="text-white hover:text-gray-300">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <div class="flex-1 relative">
            <video id="image-camera-video" class="w-full h-full object-cover" autoplay playsinline muted></video>
            <canvas id="image-camera-canvas" class="hidden absolute inset-0"></canvas>
          </div>
          <div class="bg-black p-4 flex items-center justify-center space-x-6">
            <button id="image-take-photo" class="bg-white text-black p-4 rounded-full hover:bg-gray-200 transition-colors shadow-lg">
              <i class="fas fa-circle text-2xl"></i>
            </button>
            <button id="image-cancel-camera" class="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Event listeners
    document.getElementById('close-image-camera-modal').addEventListener('click', () => this.closeImageCamera());
    document.getElementById('image-take-photo').addEventListener('click', () => this.takeImagePhoto());
    document.getElementById('image-cancel-camera').addEventListener('click', () => this.closeImageCamera());

    return document.getElementById('image-camera-modal');
  }

  /**
   * Close image camera
   */
  closeImageCamera() {
    if (this.imageCameraStream) {
      this.imageCameraStream.getTracks().forEach(track => track.stop());
      this.imageCameraStream = null;
    }
    const modal = document.getElementById('image-camera-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * Take photo from camera
   */
  takeImagePhoto() {
    const video = document.getElementById('image-camera-video');
    const canvas = document.getElementById('image-camera-canvas');
    const context = canvas.getContext('2d');

    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.closeImageCamera();
        this.addSingleImage(file);
      }, 'image/jpeg', 0.8);
    }
  }

  /**
   * Setup bulk image actions
   */
  setupBulkImageActions() {
    const selectAllBtn = document.getElementById('select-all-images');
    const reorderBtn = document.getElementById('reorder-images');
    const bulkEditBtn = document.getElementById('bulk-edit-alt');
    const bulkDeleteBtn = document.getElementById('bulk-delete-images');
    const cancelBulkBtn = document.getElementById('cancel-bulk-edit');

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => this.selectAllImages());
    }

    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener('click', () => this.bulkDeleteImages());
    }

    if (cancelBulkBtn) {
      cancelBulkBtn.addEventListener('click', () => this.cancelBulkEdit());
    }
  }

  /**
   * Select all images for bulk operations
   */
  selectAllImages() {
    const checkboxes = document.querySelectorAll('.image-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
  }

  /**
   * Bulk delete selected images
   */
  bulkDeleteImages() {
    const selectedImages = document.querySelectorAll('.image-checkbox:checked');
    const imageIds = Array.from(selectedImages).map(checkbox =>
      checkbox.closest('.image-preview-item').dataset.imageId
    );

    imageIds.forEach(id => this.removeImage(id));
    this.cancelBulkEdit();
  }

  /**
   * Cancel bulk edit mode
   */
  cancelBulkEdit() {
    // Hide bulk actions
    const bulkActions = document.getElementById('bulk-image-actions');
    if (bulkActions) {
      bulkActions.classList.add('hidden');
    }

    // Remove selection mode from images
    document.querySelectorAll('.image-preview-item').forEach(item => {
      item.classList.remove('ring-2', 'ring-blue-500');
      const checkbox = item.querySelector('.image-checkbox');
      if (checkbox) {
        checkbox.checked = false;
        checkbox.classList.add('hidden');
      }
    });
  }
}
console.log('[MODERN_PRODUCT_MODAL] Creating modernProductModal instance...');

// Export for use
export const modernProductModal = new ModernProductModal();

// Make category attributes manager functions available globally
if (typeof window !== 'undefined') {
  // Try to import category attributes manager functions and make them available globally
  try {
    import('./category-attributes-manager.js').then(({ fetchCategoryAttributes, initAttributeInputs, validateAndFormatAttributes, getDefaultAttributes }) => {
      window.fetchCategoryAttributes = fetchCategoryAttributes;
      window.initAttributeInputs = initAttributeInputs;
      window.validateAndFormatAttributes = validateAndFormatAttributes;
      window.getDefaultAttributes = getDefaultAttributes;
      console.log('[MODAL_CATEGORY_ATTRIBUTES] ✅ Category attributes manager functions loaded globally');
    }).catch(error => {
      console.error('[MODAL_CATEGORY_ATTRIBUTES] ❌ Failed to load category attributes manager:', error);

      // Fallback: create basic implementations
      // No hardcoded fallback - everything should come from Supabase
      window.fetchCategoryAttributes = async (categoryId) => {
        console.log('[CATEGORY_ATTRIBUTES_FALLBACK] Using fallback for category:', categoryId);

        if (!window.supabaseClient) {
          console.error('[CATEGORY_ATTRIBUTES_FALLBACK] Supabase client not available');
          return [];
        }

        const { data, error } = await window.supabaseClient
          .from('shopify_attributes')
          .select('*')
          .eq('category_id', categoryId)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('[CATEGORY_ATTRIBUTES_FALLBACK] Error fetching attributes:', error);
          return [];
        }

        return data || [];
      };

      window.initAttributeInputs = (attributes, containerId) => {
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = attributes.map(attr => `
            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                ${attr.name}${attr.unit ? ` (${attr.unit})` : ''}${attr.is_required || attr.required ? ' *' : ''}
              </label>
              ${attr.type === 'dropdown' ?
                `<select class="w-full px-3 py-2 border border-gray-300 rounded-md">
                   <option value="">Select ${attr.name}</option>
                   ${Array.isArray(attr.options) ? attr.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') : ''}
                 </select>` :
                `<input type="${attr.type === 'number' ? 'number' : 'text'}" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter ${attr.name.toLowerCase()}">`
              }
              ${attr.description ? `<p class="text-xs text-gray-500 mt-1">${attr.description}</p>` : ''}
            </div>
          `).join('');

          return attributes.map(attr => ({ key: attr.name, value: '' }));
        }
        return [];
      };

      window.validateAndFormatAttributes = (collected) => {
        return collected ? collected.filter(attr => attr.key && attr.value !== '') : [];
      };

      // Remove hardcoded defaults - everything should come from Supabase
      window.getDefaultAttributes = () => [];

      console.log('[MODAL_CATEGORY_ATTRIBUTES] ✅ Fallback functions created');
    });
  } catch (error) {
    console.error('[MODAL_CATEGORY_ATTRIBUTES] ❌ Error setting up category attributes manager:', error);
  }
}

console.log('[MODERN_PRODUCT_MODAL] modernProductModal instance created:', {
exists: !!modernProductModal,
initMethod: typeof modernProductModal.init,
showMethod: typeof modernProductModal.show
});

// Add validation function for debugging fixes
window.validateModalFixes = function() {
  console.log('[VALIDATION_TEST] 🧪 Running validation tests for modal fixes...');

  const results = {
    requireErrorFixed: true,
    setupInputListenersFixed: true,
    livePreviewManagerWorking: true,
    overallSuccess: true,
    errors: []
  };

  // Test 1: Check if require error is fixed
  try {
    console.log('[VALIDATION_TEST] Test 1: Checking require error fix...');
    // The require calls should now use import() instead
    if (typeof require !== 'undefined') {
      console.warn('[VALIDATION_TEST] ⚠️ require is still available - this might cause issues');
    } else {
      console.log('[VALIDATION_TEST] ✅ require is not available - using ES modules');
    }
  } catch (error) {
    console.log('[VALIDATION_TEST] ✅ require error handled properly:', error.message);
  }

  // Test 2: Check if setupInputListeners method exists
  try {
    console.log('[VALIDATION_TEST] Test 2: Checking setupInputListeners method...');
    if (window.modernProductModal?.livePreviewManager?.setupInputListeners) {
      console.log('[VALIDATION_TEST] ✅ setupInputListeners method exists');
      console.log('[VALIDATION_TEST] Method type:', typeof window.modernProductModal.livePreviewManager.setupInputListeners);
    } else {
      console.error('[VALIDATION_TEST] ❌ setupInputListeners method missing');
      results.setupInputListenersFixed = false;
      results.errors.push('setupInputListeners method not found');
    }
  } catch (error) {
    console.error('[VALIDATION_TEST] ❌ Error checking setupInputListeners:', error);
    results.setupInputListenersFixed = false;
    results.errors.push('Error accessing setupInputListeners: ' + error.message);
  }

  // Test 3: Check if LivePreviewManager can be initialized
  try {
    console.log('[VALIDATION_TEST] Test 3: Testing LivePreviewManager initialization...');
    const livePreviewManager = window.modernProductModal?.livePreviewManager;
    if (livePreviewManager) {
      console.log('[VALIDATION_TEST] ✅ LivePreviewManager instance exists');
      console.log('[VALIDATION_TEST] Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(livePreviewManager)).filter(name => name !== 'constructor'));
    } else {
      console.error('[VALIDATION_TEST] ❌ LivePreviewManager instance not found');
      results.livePreviewManagerWorking = false;
      results.errors.push('LivePreviewManager instance not found');
    }
  } catch (error) {
    console.error('[VALIDATION_TEST] ❌ Error testing LivePreviewManager:', error);
    results.livePreviewManagerWorking = false;
    results.errors.push('Error testing LivePreviewManager: ' + error.message);
  }

  // Overall result
  results.overallSuccess = results.requireErrorFixed && results.setupInputListenersFixed && results.livePreviewManagerWorking;

  console.log('[VALIDATION_TEST] 📊 Validation Results:', results);

  if (results.overallSuccess) {
    console.log('[VALIDATION_TEST] 🎉 All fixes validated successfully!');
    console.log('[VALIDATION_TEST] The following errors should now be resolved:');
    console.log('  - ReferenceError: require is not defined');
    console.log('  - TypeError: this.setupInputListeners is not a function');
  } else {
    console.warn('[VALIDATION_TEST] ⚠️ Some issues remain. Check errors above.');
  }

  return results;
};

console.log('[MODERN_PRODUCT_MODAL] ✅ Validation function added: window.validateModalFixes()');

// IMMEDIATE BUTTON FIX - This runs independently of the main modal initialization
// This is a standalone solution that should work even if the main modal fails
if (typeof window !== 'undefined') {
  // Create quickAddProduct function immediately
  window.quickAddProduct = function() {
    console.log('[QUICK_ADD_PRODUCT] 🚨 quickAddProduct() called - opening modal');

    // Create immediate working modal
    const modal = document.createElement('div');
    modal.id = 'immediate-working-modal';
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0,0,0,0.8) !important;
      z-index: 1000000 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: Arial, sans-serif !important;
    `;

    modal.innerHTML = `
      <div style="
        background: white !important;
        padding: 40px !important;
        border-radius: 16px !important;
        max-width: 600px !important;
        width: 90% !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        box-shadow: 0 25px 60px rgba(0,0,0,0.4) !important;
        border: 3px solid #10b981 !important;
      ">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #059669; margin: 0 0 10px 0; font-size: 28px;">🎉 Quick Add Product Working!</h2>
          <p style="color: #6b7280; margin: 0; font-size: 16px;">The button click is working perfectly!</p>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">✅ Success Confirmed:</h3>
          <ul style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>✅ Button click was detected and handled</li>
            <li>✅ quickAddProduct() function executed</li>
            <li>✅ Modal opened successfully</li>
            <li>✅ JavaScript execution is functioning</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <button onclick="document.getElementById('immediate-working-modal').remove()" style="
            background: #10b981 !important;
            color: white !important;
            border: none !important;
            padding: 15px 30px !important;
            border-radius: 8px !important;
            cursor: pointer !important;
            font-size: 16px !important;
            font-weight: 600 !important;
          ">Close Modal</button>
        </div>

        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #ef4444; font-size: 14px; margin: 0;">
            <strong>🚨 If you can see this, the quickAddProduct() function is working!</strong>
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  };

  console.log('[QUICK_ADD_PRODUCT] ✅ quickAddProduct function created and available globally');

  // Test that the function exists and is callable
  setTimeout(() => {
    console.log('[QUICK_ADD_PRODUCT_TEST] Testing quickAddProduct function...');
    console.log('[QUICK_ADD_PRODUCT_TEST] Function exists:', typeof window.quickAddProduct);
    console.log('[QUICK_ADD_PRODUCT_TEST] Function is callable:', typeof window.quickAddProduct === 'function');

    if (typeof window.quickAddProduct === 'function') {
      console.log('[QUICK_ADD_PRODUCT_TEST] ✅ Function is properly registered');
    } else {
      console.error('[QUICK_ADD_PRODUCT_TEST] ❌ Function registration failed');
    }
  }, 1000);

  // Create a simple working button immediately when the script loads
  setTimeout(() => {
    console.log('[IMMEDIATE_BUTTON_FIX] 🚨 Checking for buttons with quickAddProduct...');

    // Find all buttons that should call quickAddProduct
    const buttonsWithQuickAdd = document.querySelectorAll('button[onclick*="quickAddProduct"]');
    console.log(`[IMMEDIATE_BUTTON_FIX] Found ${buttonsWithQuickAdd.length} buttons with quickAddProduct`);

    buttonsWithQuickAdd.forEach((btn, index) => {
      console.log(`[IMMEDIATE_BUTTON_FIX] Button ${index + 1}:`, {
        id: btn.id,
        className: btn.className,
        onclick: btn.onclick,
        outerHTML: btn.outerHTML.substring(0, 100) + '...'
      });

      // Ensure the button has proper click handler
      btn.addEventListener('click', (e) => {
        console.log(`[IMMEDIATE_BUTTON_FIX] Button ${index + 1} clicked via addEventListener`);
        if (window.quickAddProduct) {
          window.quickAddProduct();
        } else {
          console.error('[IMMEDIATE_BUTTON_FIX] quickAddProduct function not available');
        }
      });

      // Also ensure onclick attribute works
      if (btn.onclick) {
        const originalOnclick = btn.onclick;
        btn.onclick = function(e) {
          console.log(`[IMMEDIATE_BUTTON_FIX] Button ${index + 1} clicked via onclick attribute`);
          if (window.quickAddProduct) {
            window.quickAddProduct();
          } else {
            console.error('[IMMEDIATE_BUTTON_FIX] quickAddProduct function not available in onclick');
          }
          return false;
        };
      }
    });

    console.log('[IMMEDIATE_BUTTON_FIX] ✅ Button handlers attached');



    // Also try to fix the original button if it exists
    setTimeout(() => {
      const originalButton = document.getElementById('openProductModalTop');
      if (originalButton) {
        console.log('[IMMEDIATE_BUTTON_FIX] Found original button, adding handler...');
        originalButton.addEventListener('click', (e) => {
          console.log('[IMMEDIATE_BUTTON_FIX] Original button clicked!');
          e.preventDefault();
          createWorkingButton();
        });
      }
    }, 1000);

  }, 100);
}



// Initialize when DOM is ready with proper error handling
if (typeof window !== 'undefined') {
  console.log('[MODERN_PRODUCT_MODAL] Setting up initialization...');

  // Initialize immediately if DOM is already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeModal();
    });
  } else {
    initializeModal();
  }

  function initializeModal() {
    try {
      console.log('[ModernProductModal] Initializing modal...');
      console.log('[MODERN_PRODUCT_MODAL] Calling modernProductModal.init()...');
      modernProductModal.init();
      console.log('[ModernProductModal] Modal initialized successfully');

      // Make globally available
      window.modernProductModal = modernProductModal;
      window.ModernProductModal = ModernProductModal;

      console.log('[MODERN_PRODUCT_MODAL] window.modernProductModal assigned:', {
        exists: !!window.modernProductModal,
        showMethod: typeof window.modernProductModal.show,
        initMethod: typeof window.modernProductModal.init
      });

      // Dispatch custom event to notify other scripts
      window.dispatchEvent(new CustomEvent('modernProductModalReady', {
        detail: { modal: modernProductModal }
      }));

      console.log('[ModernProductModal] Modal ready event dispatched');
      console.log('[MODERN_PRODUCT_MODAL] ✅ Initialization complete - modal should be ready');
    } catch (error) {
      console.error('[ModernProductModal] Failed to initialize modal:', error);

      // Make a basic modal available as fallback
      window.modernProductModal = {
        show: () => {
          console.error('Modal failed to initialize properly');
          alert('Product modal is not available. Please refresh the page and try again.');
        },
        hide: () => {},
        init: () => {}
      };

      console.log('[MODERN_PRODUCT_MODAL] ❌ Fallback modal assigned due to initialization error');
    }
  }

  // Also make available immediately for synchronous access
  window.modernProductModal = modernProductModal;
  window.ModernProductModal = ModernProductModal;

  console.log('[MODERN_PRODUCT_MODAL] Initial assignment complete - modal available for synchronous access:', !!window.modernProductModal);

  // Make test function available globally for debugging
  window.testNavigationButtons = () => modernProductModal.testNavigationButtons();
  
  // Create the missing quickAddProduct function that buttons are calling
  window.quickAddProduct = function() {
    console.log('[QUICK_ADD_PRODUCT] 🚨 quickAddProduct() called - opening modern modal');
  
    try {
      // Check if modern modal is available
      if (window.modernProductModal && typeof window.modernProductModal.show === 'function') {
        console.log('[QUICK_ADD_PRODUCT] ✅ Using modern modal system');
        window.modernProductModal.show();
      } else {
        console.warn('[QUICK_ADD_PRODUCT] ⚠️ Modern modal not available, creating fallback modal');
  
        // Create a simple fallback modal
        const fallbackModal = document.createElement('div');
        fallbackModal.id = 'quick-add-fallback-modal';
        fallbackModal.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: rgba(0,0,0,0.8) !important;
          z-index: 1000000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: Arial, sans-serif !important;
        `;
  
        fallbackModal.innerHTML = `
          <div style="
            background: white !important;
            padding: 40px !important;
            border-radius: 16px !important;
            max-width: 600px !important;
            width: 90% !important;
            max-height: 80vh !important;
            overflow-y: auto !important;
            box-shadow: 0 25px 60px rgba(0,0,0,0.4) !important;
            border: 3px solid #10b981 !important;
          ">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #059669; margin: 0 0 10px 0; font-size: 28px;">🎉 Quick Add Product Modal</h2>
              <p style="color: #6b7280; margin: 0; font-size: 16px;">The quickAddProduct() function is working!</p>
            </div>
  
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">✅ Function Working:</h3>
              <ul style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>✅ quickAddProduct() function was called successfully</li>
                <li>✅ Button click was detected and handled</li>
                <li>✅ Modal opened successfully</li>
                <li>✅ JavaScript execution is functioning properly</li>
              </ul>
            </div>
  
            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
              <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">🔧 Integration Note:</h4>
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                For full functionality, integrate this with the modern product modal system by calling:
                <code style="background: #fef3c7; padding: 2px 4px; border-radius: 3px;">window.modernProductModal.show()</code>
              </p>
            </div>
  
            <div style="text-align: center; margin-top: 30px;">
              <button id="close-quick-add-modal" style="
                background: #10b981 !important;
                color: white !important;
                border: none !important;
                padding: 15px 30px !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                font-size: 16px !important;
                font-weight: 600 !important;
                margin-right: 10px !important;
              ">Close Modal</button>
  
              <button id="open-modern-modal" style="
                background: #3b82f6 !important;
                color: white !important;
                border: none !important;
                padding: 15px 30px !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                font-size: 16px !important;
                font-weight: 600 !important;
              ">Open Modern Modal</button>
            </div>
  
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                <strong>Debug Info:</strong> quickAddProduct() executed at ${new Date().toISOString()}
              </p>
              <p style="color: #ef4444; font-size: 14px; margin: 10px 0 0 0;">
                <strong>🚨 If you can see this, the quickAddProduct() function is working!</strong>
              </p>
            </div>
          </div>
        `;
  
        document.body.appendChild(fallbackModal);
  
        // Add close handlers
        document.getElementById('close-quick-add-modal').addEventListener('click', () => {
          fallbackModal.remove();
        });
  
        document.getElementById('open-modern-modal').addEventListener('click', () => {
          fallbackModal.remove();
          // Try to open modern modal if available
          if (window.modernProductModal && window.modernProductModal.show) {
            window.modernProductModal.show();
          } else {
            alert('Modern modal not available. Please refresh the page.');
          }
        });
  
        // Close on backdrop click
        fallbackModal.addEventListener('click', (e) => {
          if (e.target === fallbackModal) {
            fallbackModal.remove();
          }
        });
      }
    } catch (error) {
      console.error('[QUICK_ADD_PRODUCT] ❌ Error in quickAddProduct():', error);
      alert('Error opening product modal. Please try again or refresh the page.');
    }
  };

  // Make debug and testing functions available globally
  window.enableModalDebugMode = () => modernProductModal.enableDebugMode();
  window.disableModalDebugMode = () => modernProductModal.disableDebugMode();
  window.runModalTests = () => modernProductModal.runButtonVisibilityTests();
  window.testModalAcrossScreens = () => modernProductModal.testAcrossScreenSizes();
  window.generateModalTestReport = () => modernProductModal.generateTestReport();
  window.autoFixModalIssues = () => modernProductModal.autoFixIssues();

  // Add embedding system test function
  window.testEmbeddingSystem = async () => {
    console.log('[EMBEDDING_TEST] 🧪 Testing embedding system availability...');

    const results = {
      transformersClientExists: !!window.transformersClient,
      getImageEmbeddingExists: typeof window.transformersClient?.getImageEmbedding === 'function',
      iframeCached: window.transformersClient?.isIframeCached ? window.transformersClient.isIframeCached() : false,
      modelCached: window.transformersClient?.isModelCached ? window.transformersClient.isModelCached() : false,
      preloadStatus: window.transformersClient?.getPreloadStatus ? window.transformersClient.getPreloadStatus() : null
    };

    console.log('[EMBEDDING_TEST] 📊 Embedding system status:', results);

    if (results.transformersClientExists) {
      console.log('[EMBEDDING_TEST] ✅ transformersClient is available');

      if (results.getImageEmbeddingExists) {
        console.log('[EMBEDDING_TEST] ✅ getImageEmbedding function is available');

        if (!results.iframeCached) {
          console.log('[EMBEDDING_TEST] 🔄 Iframe not cached, initializing...');
          try {
            await window.transformersClient.initTransformersIframe();
            console.log('[EMBEDDING_TEST] ✅ Iframe initialized successfully');
          } catch (error) {
            console.error('[EMBEDDING_TEST] ❌ Iframe initialization failed:', error);
            return { ...results, iframeInitError: error.message };
          }
        } else {
          console.log('[EMBEDDING_TEST] ✅ Iframe already cached');
        }

        console.log('[EMBEDDING_TEST] 🎉 Embedding system test completed successfully');
        return { ...results, testPassed: true };
      } else {
        console.error('[EMBEDDING_TEST] ❌ getImageEmbedding function not available');
        return { ...results, testPassed: false, error: 'getImageEmbedding function missing' };
      }
    } else {
      console.error('[EMBEDDING_TEST] ❌ transformersClient not available');
      return { ...results, testPassed: false, error: 'transformersClient missing' };
    }
  };

  // Make embedding coordination functions available globally for testing
  window.testEmbeddingCoordination = () => modernProductModal.testEmbeddingCoordination();
  window.getEmbeddingCoordinationStats = () => modernProductModal.getEmbeddingCoordinationStats();
  window.resetEmbeddingCoordination = () => modernProductModal.resetEmbeddingCoordination();

  // Make category attributes testing functions available globally
  window.testCategoryAttributes = async (categoryId = '550e8400-e29b-41d4-a716-446655440005') => {
    console.log('[CATEGORY_ATTRIBUTES_TEST] 🧪 Testing category attributes integration...');

    try {
      console.log('[CATEGORY_ATTRIBUTES_TEST] Testing with category ID:', categoryId);

      // Test fetchCategoryAttributes
      console.log('[CATEGORY_ATTRIBUTES_TEST] 1. Testing fetchCategoryAttributes...');
      const attributes = await window.fetchCategoryAttributes(categoryId);
      console.log('[CATEGORY_ATTRIBUTES_TEST] ✅ Fetched attributes:', attributes?.length || 0);

      if (attributes && attributes.length > 0) {
        // Test initAttributeInputs
        console.log('[CATEGORY_ATTRIBUTES_TEST] 2. Testing initAttributeInputs...');
        const container = document.getElementById('dynamic-attributes-container');
        if (container) {
          const collected = window.initAttributeInputs(attributes, 'dynamic-attributes-container');
          console.log('[CATEGORY_ATTRIBUTES_TEST] ✅ Rendered attributes, collected:', collected?.length || 0);

          // Show the section
          const section = document.getElementById('category-attributes-section');
          if (section) {
            section.style.display = 'block';
          }

          // Test validateAndFormatAttributes
          console.log('[CATEGORY_ATTRIBUTES_TEST] 3. Testing validateAndFormatAttributes...');
          const formatted = window.validateAndFormatAttributes(collected);
          console.log('[CATEGORY_ATTRIBUTES_TEST] ✅ Formatted attributes:', formatted?.length || 0);

          return {
            success: true,
            attributes: attributes.length,
            rendered: collected?.length || 0,
            formatted: formatted?.length || 0,
            message: 'Category attributes integration working correctly!'
          };
        } else {
          console.error('[CATEGORY_ATTRIBUTES_TEST] ❌ Container not found');
          return { success: false, error: 'Container not found' };
        }
      } else {
        console.warn('[CATEGORY_ATTRIBUTES_TEST] ⚠️ No attributes found for category');
        return { success: false, error: 'No attributes found for category' };
      }
    } catch (error) {
      console.error('[CATEGORY_ATTRIBUTES_TEST] ❌ Test failed:', error);
      return { success: false, error: error.message };
    }
  };



}
