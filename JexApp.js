/**
 * JexApp.js - Ultra-simplified app foundation for Jex Framework (Dark Theme Only)
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
 *   - showLoading(message?): void - Show dark loading overlay
 *   - hideLoading(): void - Hide loading overlay
 *   - navigateTo(url): void - Navigate to another page
 *   - setState(updates): void - Update application state
 *   - static createDarkApp(title, icon?): string - Generate dark app HTML template
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
 *   - Uses: Individual components directly with enforced dark theme
 *
 * Last Modified: 2025-09-16 - Clean configuration without repetition
 */

import { jex, Jex } from './Jex.js';

export class JexApp {
    // Configuration for CDN/Local switching
    static CDN_BASE = 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest';
    static LOCAL_BASE = '.';
    static USE_CDN = false;

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

        // Setup core references
        this.#jex = jex;

        // Enforce dark theme always
        this.#enforceDarkTheme();

        console.debug('JexApp created:', this.config.name);
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

        console.debug('JexApp: Dark theme enforced');
    }

    #getImportPath(filename) {
        const base = JexApp.USE_CDN ? JexApp.CDN_BASE : JexApp.LOCAL_BASE;
        return `${base}/${filename}`;
    }

    async init() {
        try {
            console.info(`Initializing JexApp: ${this.config.name} (Dark Mode Only)`);

            await this.#loadOptionalComponents();

            if (this.#toast) {
                this.#toast.mount();
                this.toast = this.#toast;
            }

            if (this.config.enableHeader && this.config.headerAutoHide) {
                this.#setupHeaderAutoHide();
            }

            if (this.config.enableKeyboardShortcuts) {
                this.#setupKeyboardShortcuts();
            }

            this.#setupCommonDOM();

            await this.onInit();

            this.initialized = true;

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
        try {
            const { logger } = await import(this.#getImportPath('JexLogger.js'));
            this.#logger = logger;
            console.debug('Logger loaded');
        } catch (error) {
            console.warn('Logger not available:', error.message);
        }

        try {
            const { toast } = await import(this.#getImportPath('JexToast.js'));
            this.#toast = toast;
            console.debug('Toast loaded');
        } catch (error) {
            console.warn('Toast not available:', error.message);
        }
    }

    #setupCommonDOM() {
        const headerEl = document.querySelector(this.config.headerSelector);
        if (headerEl) {
            this.dom.header = new Jex(headerEl);
        }

        const mainEl = document.querySelector('main, #main, .main');
        if (mainEl) {
            this.dom.main = new Jex(mainEl);
        }

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
        // Override in subclass - silent by default
        console.log(`${this.config.name} ready`);
    }

    destroy() {
        console.info('Destroying JexApp:', this.config.name);

        this.#eventCleanup.forEach(cleanup => cleanup?.());
        this.#eventCleanup = [];
        this.hideLoading();

        this.state = {};
        this.dom = {};
        this.initialized = false;
    }

    showLoading(message = 'Loading...') {
        if (this.#loadingEl) return;

        this.#loadingEl = this.#jex.create('div')
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

    static createDarkApp(title, icon = 'app-window') {
        return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Jex Framework</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        dark: {
                            50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0',
                            300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b',
                            600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a'
                        }
                    }
                }
            }
        }
    </script>
</head>
<body class="dark bg-dark-900 text-gray-100 min-h-screen">

<div class="max-w-4xl mx-auto px-6 py-8">
    
    <!-- Header -->
    <div class="text-center mb-8">
        <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <i data-lucide="${icon}" class="w-6 h-6 text-white"></i>
        </div>
        <h1 class="text-3xl font-light text-gray-100">${title}</h1>
        <p class="text-gray-400 mt-2">Built with Jex Framework</p>
    </div>

    <!-- App Content -->
    <div id="appContent">
        <!-- Your app content goes here -->
    </div>
</div>

<script type="module">
    const { JexApp } = await import('./JexApp.js');
    
    class ${title.replace(/\s+/g, '')}App extends JexApp {
        constructor() {
            super({
                name: '${title}',
                version: '1.0.0'
            });
        }

        async onInit() {
            this.#setupUI();
        }

        #setupUI() {
            const content = this.jex.$('appContent');
            
            const card = this.jex.create('div')
                .cls(JexApp.DARK_THEME.classes.card)
                .html('<p class="text-gray-100">Welcome to your new dark app!</p>');
            
            content.append(card);
        }
    }

    // Launch app
    await ${title.replace(/\s+/g, '')}App.launch(${title.replace(/\s+/g, '')}App);
    lucide.createIcons();
</script>

</body>
</html>`;
    }

    static async launch(AppClass = JexApp, config = {}) {
        try {
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            const app = new AppClass(config);
            await app.init();

            try {
                window.app = app;
            } catch (error) {
                window.jexApp = app;
                console.warn('Could not assign to window.app (readonly), using window.jexApp instead');
            }

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