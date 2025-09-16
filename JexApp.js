/**
 * JexApp.js - Ultra-simplified app foundation for Jex Framework with full ecosystem
 *
 * CLASS STRUCTURE:
 * ---------------
 * Public Fields:
 *   - config {Object}: Application configuration
 *   - toast {JexToast}: Toast notification system
 *   - logger {JexLogger}: Logger instance
 *   - inspector {JexInspector}: DOM inspector instance
 *   - jex {Jex}: DOM manipulation instance (public for extending classes)
 *   - state {Object}: Application state
 *   - dom {Object}: DOM element references
 *   - initialized {boolean}: Initialization status
 *
 * Private Fields:
 *   - #eventCleanup {Array}: Event cleanup functions
 *   - #loadingEl {Jex}: Loading overlay element
 *
 * Public Methods:
 *   - constructor(config: Object): Creates the application
 *   - init(): Promise<void> - Initializes the application
 *   - onReady(): void - Hook called when app is ready (override in subclass)
 *   - onInit(): void - Hook called during initialization (override in subclass)
 *   - destroy(): void - Clean up the application
 *   - showLoading(message?): void - Show dark loading overlay
 *   - hideLoading(): void - Hide loading overlay
 *   - navigateTo(url): void - Navigate to another page
 *   - setState(updates): void - Update application state
 *   - static setupHeaderScroll(headerId?): void - Setup header auto-hide
 *   - static launch(AppClass, config?): JexApp - Static app launcher
 *
 * Dependencies:
 *   - Jex: Core DOM manipulation
 *   - JexLogger: Logging system
 *   - JexToast: Toast notifications
 *   - JexInspector: DOM inspection tools
 *
 * Relations:
 *   - Part of: Jex Framework ecosystem
 *   - Extended by: All Jex-based applications
 *   - Used by: JexPackage for unified ecosystem access
 *
 * Last Modified: 2025-09-16 - Fixed circular dependency by importing components directly
 */

// Import individual components to avoid circular dependency with JexPackage
import { jex, Jex } from './Jex.js';
import { logger } from './JexLogger.js';
import { toast } from './JexToast.js';
import { inspector } from './JexInspector.js';

export class JexApp {
    // Dark theme configuration - the only theme available
    static DARK_THEME = {
        colors: {
            primary: 'from-purple-500 to-blue-600',
            bg: 'bg-dark-900',
            cardBg: 'bg-dark-800',
            border: 'border-dark-700',
            text: 'text-gray-100',
            textMuted: 'text-gray-400',
            textDim: 'text-gray-600'
        },
        classes: {
            card: 'bg-dark-800 rounded-2xl p-6 border border-dark-700',
            button: 'px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 transform hover:scale-105',
            input: 'w-full bg-transparent text-gray-100 placeholder-gray-500 border border-dark-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors',
            textPrimary: 'text-gray-100',
            textSecondary: 'text-gray-400',
            textMuted: 'text-gray-600'
        }
    };

    // Public fields - accessible to extending classes
    config = {};
    toast = null;
    logger = null;
    inspector = null;
    jex = null; // Public DOM manipulation instance
    state = {};
    dom = {};
    initialized = false;

    // Private fields
    #eventCleanup = [];
    #loadingEl = null;

    constructor(config = {}) {
        this.config = {
            // Base configuration
            name: 'JexApp',
            version: '1.0.0',
            enableKeyboardShortcuts: true,
            enableHeader: true,
            headerSelector: 'header, nav, #header, #nav',
            headerAutoHide: false,

            // User overrides
            ...config,

            // Enforced dark theme - never allow light mode
            theme: 'dark'
        };

        // Initialize state
        this.state = config.initialState || {};

        // Setup all components directly (no package dependency)
        this.jex = jex;
        this.toast = toast;
        this.logger = logger;
        this.inspector = inspector;

        // Enforce dark theme always
        this.#enforceDarkTheme();

        this.logger.debug('JexApp created with full Jex ecosystem:', this.config.name);
    }

    #enforceDarkTheme() {
        const htmlEl = new Jex(document.documentElement);
        const bodyEl = new Jex(document.body);

        // Force Tailwind dark mode
        htmlEl.cls('+dark');

        // Force dark theme classes
        bodyEl.cls('+bg-dark-900 +text-gray-100 +min-h-screen');

        // Remove any light mode classes
        bodyEl.cls('-bg-white -bg-gray-50 -bg-gray-100 -text-gray-900 -text-black');

        this.logger.debug('JexApp: Dark theme enforced');
    }

    async init() {
        try {
            this.logger.info(`Initializing JexApp: ${this.config.name} with full Jex ecosystem`);

            // CRITICAL: Ensure toast system is properly mounted
            if (this.toast && typeof this.toast.mount === 'function') {
                this.toast.mount();
            } else if (this.toast && typeof this.toast._getInstance === 'function') {
                // Handle lazy singleton pattern
                this.toast._getInstance().mount();
            }

            // Rest of initialization...
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

            this.logger.info('JexApp ready with all components:', this.config.name);

        } catch (error) {
            this.logger.error('JexApp initialization failed:', error);
            // Don't fail if toast isn't working
            console.error('Application failed to initialize:', error);
            throw error;
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
        // Use the static method
        JexApp.setupHeaderScroll(this.config.headerSelector.split(',')[0].trim().replace('#', ''));
    }

    #setupKeyboardShortcuts() {
        // F2 for debug console
        const cleanup = this.jex.onWindow('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                if (this.logger && this.logger.toggleConsole) {
                    this.logger.toggleConsole();
                }
            }
        });

        this.#eventCleanup.push(cleanup);
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
        // Override in subclass - show success toast by default
        this.toast.success(`${this.config.name} ready!`);
    }

    /**
     * Clean up the application
     */
    destroy() {
        this.logger.info('Destroying JexApp:', this.config.name);

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
     * Show dark loading overlay
     */
    showLoading(message = 'Loading...') {
        if (this.#loadingEl) return; // Already showing

        this.#loadingEl = this.jex.create('div')
            .cls('fixed inset-0 bg-dark-900 bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50');

        const loadingContent = this.#loadingEl.add('div')
            .cls('bg-dark-800 rounded-2xl p-8 shadow-2xl border border-dark-700 flex items-center space-x-6');

        loadingContent.add('div')
            .cls('animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent');

        loadingContent.add('span')
            .cls('text-gray-100 font-medium')
            .text(message);

        this.#loadingEl.mountToBody();
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
     */
    navigateTo(url) {
        this.logger.debug('Navigating to:', url);
        window.location.href = url;
    }

    /**
     * Update application state
     */
    setState(updates) {
        if (typeof updates === 'function') {
            updates(this.state);
        } else {
            Object.assign(this.state, updates);
        }
        this.logger.debug('State updated:', this.state);
    }

    /**
     * Setup header scroll behavior (static utility)
     */
    static setupHeaderScroll(headerId = 'topHeader') {
        let lastScrollTop = 0;
        const header = jex.$(headerId);
        const scrollThreshold = 5;

        if (!header) {
            logger.warn(`Header element not found: ${headerId}`);
            return;
        }

        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

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
     */
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
            try {
                window.app = app;
            } catch (error) {
                window.jexApp = app;
                logger.warn('Could not assign to window.app (readonly), using window.jexApp instead');
            }

            logger.info('JexApp launched successfully:', config.name || 'Unknown App');

            return app;

        } catch (error) {
            logger.error('Failed to launch JexApp:', error);
            throw error;
        }
    }
}

export default JexApp;