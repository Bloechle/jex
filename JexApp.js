/**
 * JexApp.js - Ultra-simplified app foundation for Jex Framework
 *
 * CLASS STRUCTURE:
 * ---------------
 * Public Fields:
 *   - config {Object}: Application configuration
 *   - toast {JexToast}: Toast notification system
 *   - state {Object}: Application state
 *   - dom {Object}: DOM element references
 *   - initialized {boolean}: Initialization status
 *
 * Private Fields:
 *   - #eventCleanup {Array}: Event cleanup functions
 *   - #loadingEl {Jex}: Loading overlay element
 *   - #jex {Jex}: DOM manipulation instance
 *   - #logger {JexLogger}: Logger instance
 *   - #toast {JexToast}: Toast instance
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
 *   - Jex: Core DOM manipulation library
 *   - JexLogger: Advanced logging and debugging system
 *   - JexToast: Toast notification system
 *
 * Relations:
 *   - Part of: Jex Framework ecosystem
 *   - Extended by: All Jex-based applications
 *   - Uses: Individual components directly (no JexPackage dependency)
 *
 * Last Modified: 2025-09-16 - Removed JexPackage dependency to fix circular imports
 */

import { jex, Jex } from './Jex.js';

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
    #jex = null;
    #logger = null;
    #toast = null;

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

        // Setup core references
        this.#jex = jex;

        console.debug('JexApp created:', this.config.name);
    }

    async init() {
        try {
            console.info('Initializing JexApp:', this.config.name);

            // Load optional components dynamically
            await this.#loadOptionalComponents();

            // Initialize toast system if available
            if (this.#toast) {
                this.#toast.mount();
                this.toast = this.#toast; // Expose publicly
            }

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

            console.info('JexApp ready:', this.config.name);

        } catch (error) {
            console.error('JexApp initialization failed:', error);
            if (this.#toast) {
                this.#toast.error('Application failed to initialize');
            }
            throw error;
        }
    }

    async #loadOptionalComponents() {
        // Load logger
        try {
            const { logger } = await import('./JexLogger.js');
            this.#logger = logger;
            console.debug('Logger loaded');
        } catch (error) {
            console.warn('Logger not available:', error.message);
        }

        // Load toast
        try {
            const { toast } = await import('./JexToast.js');
            this.#toast = toast;
            console.debug('Toast loaded');
        } catch (error) {
            console.warn('Toast not available:', error.message);
        }
    }

    #setupCommonDOM() {
        // Find header
        const headerEl = document.querySelector(this.config.headerSelector);
        if (headerEl) {
            this.dom.header = new Jex(headerEl);
        }

        // Find main content area
        const mainEl = document.querySelector('main, #main, .main');
        if (mainEl) {
            this.dom.main = new Jex(mainEl);
        }

        // Store body reference
        this.dom.body = new Jex(document.body);
    }

    #setupHeaderAutoHide() {
        JexApp.setupHeaderScroll(this.config.headerSelector.split(',')[0].trim().replace('#', ''));
    }

    #setupKeyboardShortcuts() {
        const cleanup = this.#jex.onWindow('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                if (this.#logger && this.#logger.toggleConsole) {
                    this.#logger.toggleConsole();
                }
            }
        });

        this.#eventCleanup.push(cleanup);
    }

    async onInit() {
        // Override in subclass
    }

    onReady() {
        // Override in subclass
        if (this.#toast) {
            this.#toast.success(`${this.config.name} ready!`);
        }
    }

    destroy() {
        console.info('Destroying JexApp:', this.config.name);

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

    showLoading(message = 'Loading...') {
        if (this.#loadingEl) return;

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

    hideLoading() {
        if (!this.#loadingEl) return;
        this.#loadingEl.remove();
        this.#loadingEl = null;
    }

    navigateTo(url) {
        console.debug('Navigating to:', url);
        window.location.href = url;
    }

    setState(updates) {
        if (typeof updates === 'function') {
            updates(this.state);
        } else {
            Object.assign(this.state, updates);
        }
        console.debug('State updated:', this.state);
    }

    static setupHeaderScroll(headerId = 'topHeader') {
        let lastScrollTop = 0;
        const header = jex.$(headerId);
        const scrollThreshold = 5;

        if (!header) {
            console.warn(`Header element not found: ${headerId}`);
            return;
        }

        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            if (Math.abs(scrollTop - lastScrollTop) > scrollThreshold) {
                if (scrollTop > lastScrollTop && scrollTop > 100) {
                    header.cls('+header-hidden');
                } else {
                    header.cls('-header-hidden');
                }
                lastScrollTop = scrollTop;
            }
        });
    }

    static async launch(AppClass = JexApp, config = {}) {
        try {
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

            console.info('JexApp launched successfully:', config.name || 'Unknown App');

            return app;

        } catch (error) {
            console.error('Failed to launch JexApp:', error);
            throw error;
        }
    }

    get jex() {
        return this.#jex;
    }

    get logger() {
        return this.#logger;
    }
}

export default JexApp;