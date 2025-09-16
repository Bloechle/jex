/**
 * JexApp.js - Ultra-simplified app foundation integrated into Jex Framework
 *
 * CLASS STRUCTURE:
 * ---------------
 * Public Fields:
 *   - config {Object}: Application configuration
 *   - toast {JexToast}: Toast notification system
 *   - state {Object}: Application state - plain object structure
 *   - dom {Object}: DOM element references
 *   - initialized {boolean}: Initialization status
 *
 * Private Fields:
 *   - #eventCleanup {Array}: Event cleanup functions
 *   - #loadingEl {Jex}: Loading overlay element
 *   - #package {JexPackage}: Reference to JexPackage instance
 *   - #jex {Jex}: DOM manipulation instance
 *   - #logger {JexLogger}: Logger instance
 *
 * Public Methods:
 *   - constructor(config: Object): Creates the application
 *   - init(): Promise<void> - Initializes the application
 *   - onReady(): void - Hook called when app is ready (override in subclass)
 *   - onInit(): void - Hook called during initialization (override in subclass)
 *   - destroy(): void - Clean up the application
 *   - showLoading(message?): void - Show simple loading overlay
 *   - hideLoading(): void - Hide loading overlay
 *   - navigateTo(url): void - Navigate to another page
 *   - setState(updates): void - Update application state
 *   - static setupHeaderScroll(headerId?): void - Setup header auto-hide
 *   - static launch(AppClass, config?): JexApp - Static app launcher
 *
 * Dependencies:
 *   - JexPackage: Unified package for complete Jex ecosystem
 *
 * Relations:
 *   - Part of: Jex Framework ecosystem
 *   - Extended by: All Jex-based applications
 *   - Uses: JexPackage for all framework components
 *
 * Last Modified: 2025-01-16 - Updated to use JexPackage with raw GitHub imports
 */

import jexPackage from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@main/JexPackage.js';

/**
 * JexApp - Ultra-simplified app foundation for Jex Framework
 */
export class JexApp {
    // Public fields
    config = {};
    toast = null;
    state = {};
    dom = {};
    initialized = false;

    // Private fields
    #eventCleanup = [];
    #loadingEl = null;
    #package = jexPackage;
    #jex = null;
    #logger = null;

    /**
     * Create a new JexApp instance
     * @param {Object} config - Application configuration
     */
    constructor(config = {}) {
        this.config = {
            // Default configuration
            name: 'JexApp',
            version: '1.0.0',

            // UI settings
            enableKeyboardShortcuts: true,

            // Header settings
            enableHeader: true,
            headerSelector: 'header, nav, #header, #nav',
            headerAutoHide: false,

            // Override with user config
            ...config
        };

        // Initialize state
        this.state = config.initialState || {};

        // Setup package references
        this.#jex = this.#package.jex;
        this.#logger = this.#package.logger;
        this.toast = this.#package.toast;

        this.#logger.debug('JexApp created:', this.config.name);
    }

    /**
     * Initialize the application
     * @returns {Promise<void>}
     */
    async init() {
        try {
            this.#logger.info('Initializing JexApp:', this.config.name);

            // Ensure package is initialized
            if (!this.#package.isReady()) {
                await this.#package.init();
            }

            // Initialize toast system
            this.toast.mount();

            // Setup header auto-hide if enabled
            if (this.config.enableHeader && this.config.headerAutoHide) {
                this.#setupHeaderAutoHide();
            }

            // Setup keyboard shortcuts
            if (this.config.enableKeyboardShortcuts) {
                this.#setupKeyboardShortcuts();
            }

            // Setup common DOM elements
            this.#setupCommonDOM();

            // Call user initialization hook
            await this.onInit();

            // Mark as initialized
            this.initialized = true;

            // Call ready hook
            this.onReady();

            this.#logger.info('JexApp ready:', this.config.name);

        } catch (error) {
            this.#logger.error('JexApp initialization failed:', error);
            this.toast.error('Application failed to initialize');
            throw error;
        }
    }

    /**
     * Setup common DOM elements
     * @private
     */
    #setupCommonDOM() {
        // Find header
        const headerEl = document.querySelector(this.config.headerSelector);
        if (headerEl) {
            this.dom.header = new this.#package.Jex(headerEl);
        }

        // Find main content area
        const mainEl = document.querySelector('main, #main, .main');
        if (mainEl) {
            this.dom.main = new this.#package.Jex(mainEl);
        }

        // Store body reference
        this.dom.body = new this.#package.Jex(document.body);
    }

    /**
     * Setup header auto-hide functionality
     * @private
     */
    #setupHeaderAutoHide() {
        // Use the improved static method
        JexApp.setupHeaderScroll(this.config.headerSelector.split(',')[0].trim().replace('#', ''));
    }

    /**
     * Setup keyboard shortcuts
     * @private
     */
    #setupKeyboardShortcuts() {
        // F2 for debug console (if logger supports it)
        const cleanup1 = this.#jex.onWindow('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                if (this.#logger.toggleConsole) {
                    this.#logger.toggleConsole();
                }
            }
        });

        this.#eventCleanup.push(cleanup1);
    }

    /**
     * Hook called during initialization - override in subclass
     */
    async onInit() {
        // Override in subclass
    }

    /**
     * Hook called when app is ready - override in subclass
     */
    onReady() {
        // Override in subclass
        this.toast.success(`${this.config.name} ready!`);
    }

    /**
     * Clean up the application
     */
    destroy() {
        this.#logger.info('Destroying JexApp:', this.config.name);

        // Clean up event handlers
        this.#eventCleanup.forEach(cleanup => cleanup?.());
        this.#eventCleanup = [];

        // Hide loading if visible
        this.hideLoading();

        // Clear state
        this.state = {};
        this.dom = {};
        this.initialized = false;
    }

    /**
     * Show simple loading overlay
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        if (this.#loadingEl) return; // Already showing

        this.#loadingEl = this.#jex.create('div')
            .cls('fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50')
            .html(`
                <div class="bg-white rounded-lg p-6 shadow-xl flex items-center space-x-4">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span class="text-gray-800 font-medium">${message}</span>
                </div>
            `)
            .mountToBody();
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (!this.#loadingEl) return;

        this.#loadingEl.remove();
        this.#loadingEl = null;
    }

    /**
     * Navigate to another page
     * @param {string} url - URL to navigate to
     */
    navigateTo(url) {
        this.#logger.debug('Navigating to:', url);
        window.location.href = url;
    }

    /**
     * Update application state
     * @param {Object|Function} updates - State updates or updater function
     */
    setState(updates) {
        if (typeof updates === 'function') {
            updates(this.state);
        } else {
            Object.assign(this.state, updates);
        }
        this.#logger.debug('State updated:', this.state);
    }

    /**
     * Setup header scroll behavior (static utility)
     * @param {string} headerId - ID of header element (default: 'topHeader')
     * @static
     */
    static setupHeaderScroll(headerId = 'topHeader') {
        let lastScrollTop = 0;
        const header = jexPackage.jex.$(headerId);
        const scrollThreshold = 5;

        if (!header) {
            jexPackage.logger.warn(`Header element not found: ${headerId}`);
            return;
        }

        // Listen to window scroll events
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            // Only hide/show after scrolling past threshold
            if (Math.abs(scrollTop - lastScrollTop) > scrollThreshold) {
                if (scrollTop > lastScrollTop && scrollTop > 100) {
                    // Scrolling down & past 100px
                    header.cls('+header-hidden');
                } else {
                    // Scrolling up
                    header.cls('-header-hidden');
                }
                lastScrollTop = scrollTop;
            }
        });
    }

    /**
     * Static method to launch an application
     * @param {Class} AppClass - Application class to instantiate
     * @param {Object} config - Configuration object
     * @returns {Promise<JexApp>} The initialized application instance
     */
    static async launch(AppClass = JexApp, config = {}) {
        try {
            // Ensure package is ready
            if (!jexPackage.isReady()) {
                await jexPackage.init();
            }

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Create and initialize app
            const app = new AppClass(config);
            await app.init();

            // Store globally for debugging
            window.app = app;

            jexPackage.logger.info('JexApp launched successfully:', config.name || 'Unknown App');

            return app;

        } catch (error) {
            jexPackage.logger.error('Failed to launch JexApp:', error);
            throw error;
        }
    }

    /**
     * Get the JexPackage instance
     * @returns {JexPackage} The package instance
     */
    get package() {
        return this.#package;
    }

    /**
     * Get the Jex DOM manipulation instance
     * @returns {Jex} The Jex instance
     */
    get jex() {
        return this.#jex;
    }

    /**
     * Get the logger instance
     * @returns {JexLogger} The logger instance
     */
    get logger() {
        return this.#logger;
    }
}

// Export default for convenience
export default JexApp;