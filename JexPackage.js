/**
 * JexPackage.js - Unified package for the complete Jex ecosystem
 *
 * CLASS STRUCTURE:
 * ---------------
 * Public Fields:
 *   - version {string}: Package version identifier
 *   - components {Object}: Available package components
 *
 * Private Fields:
 *   - #initialized {boolean}: Package initialization status
 *   - #loadingPromises {Map}: Component loading state tracking
 *
 * Public Methods:
 *   - init(): Promise<void> - Initialize all package components
 *   - getComponent(name: string): Object - Get specific package component
 *   - isReady(): boolean - Check if package is fully loaded
 *   - destroy(): void - Clean up all package resources
 *
 * Dependencies:
 *   - Jex.js: Core DOM manipulation library
 *   - JexLogger.js: Advanced logging and debugging system
 *   - JexToast.js: Toast notification system
 *   - JexInspector.js: DOM element inspection tools
 *   - JexApp.js: Application foundation framework
 *
 * Relations:
 *   - Provides: Unified access to all Jex components
 *   - Used by: All Jex-based applications requiring full ecosystem
 *   - Manages: Component lifecycle and dependencies
 *
 * Last Modified: 2025-01-16 - Updated to use raw GitHub imports
 */

// Import all Jex ecosystem components from raw GitHub
import { jex, Jex, JexCollection, JEX_VERSION } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@main/Jex.js';
import { logger, JexLogger, LOGGER_VERSION } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@main/JexLogger.js';
import { toast, JexToast } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@main/JexToast.js';
import { inspector, JexInspector, INSPECTOR_VERSION } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@main/JexInspector.js';
import { JexApp } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@main/JexApp.js';

export class JexPackage {
    // Public fields
    version = '2025.07.02';
    components = {};

    // Private fields
    #initialized = false;
    #loadingPromises = new Map();

    constructor() {
        this.#setupComponents();
        this.#logPackageInfo();
    }

    #setupComponents() {
        // Core components
        this.components = {
            // Core DOM manipulation
            jex: jex,
            Jex: Jex,
            JexCollection: JexCollection,

            // Logging system
            logger: logger,
            JexLogger: JexLogger,

            // Toast notifications
            toast: toast,
            JexToast: JexToast,

            // DOM inspector
            inspector: inspector,
            JexInspector: JexInspector,

            // Application framework
            JexApp: JexApp
        };
    }

    #logPackageInfo() {
        console.info('%c📦 Jex Package Loaded', 'color: #3b82f6; font-weight: bold; font-size: 14px;');
        console.info(`%cVersion: ${this.version}`, 'color: #6b7280; font-size: 12px;');
        console.info('%cComponents:', 'color: #6b7280; font-size: 12px;', Object.keys(this.components));

        // Log individual component versions if available
        const versions = {
            'Jex Core': JEX_VERSION,
            'Logger': LOGGER_VERSION,
            'Inspector': INSPECTOR_VERSION
        };

        console.info('%cComponent Versions:', 'color: #6b7280; font-size: 12px;', versions);
    }

    async init() {
        if (this.#initialized) {
            return this;
        }

        try {
            // Initialize toast system first (required by others)
            if (this.components.toast && typeof this.components.toast.mount === 'function') {
                this.components.toast.mount();
            }

            // Initialize logger (should be ready by default)
            if (this.components.logger) {
                this.components.logger.info('Jex Package initialization started');
            }

            this.#initialized = true;

            if (this.components.logger) {
                this.components.logger.info('Jex Package fully initialized');
            }

            return this;
        } catch (error) {
            console.error('Jex Package initialization failed:', error);
            throw error;
        }
    }

    getComponent(name) {
        if (!this.components[name]) {
            console.warn(`Jex Package: Component '${name}' not found`);
            return null;
        }
        return this.components[name];
    }

    isReady() {
        return this.#initialized;
    }

    destroy() {
        // Clean up toast system
        if (this.components.toast && typeof this.components.toast.destroy === 'function') {
            this.components.toast.destroy();
        }

        // Clean up inspector
        if (this.components.inspector && typeof this.components.inspector.destroy === 'function') {
            this.components.inspector.destroy();
        }

        // Clean up logger
        if (this.components.logger && typeof this.components.logger.destroy === 'function') {
            this.components.logger.destroy();
        }

        this.#initialized = false;
        this.#loadingPromises.clear();

        console.info('Jex Package destroyed');
    }

    // Convenience method to create JexApp instances
    createApp(AppClass = JexApp, config = {}) {
        if (!this.#initialized) {
            console.warn('Jex Package: Package not initialized. Call init() first.');
        }

        return JexApp.launch(AppClass, config);
    }

    // Quick access to frequently used components
    get jex() { return this.components.jex; }
    get logger() { return this.components.logger; }
    get toast() { return this.components.toast; }
    get inspector() { return this.components.inspector; }
    get JexApp() { return this.components.JexApp; }
}

// Create and export package instance
export const jexPackage = new JexPackage();

// Export individual components for convenience
export {
    jex,
    Jex,
    JexCollection,
    logger,
    JexLogger,
    toast,
    JexToast,
    inspector,
    JexInspector,
    JexApp
};

// Auto-initialize package
jexPackage.init().catch(error => {
    console.error('Failed to auto-initialize Jex Package:', error);
});

// Export default for single import
export default jexPackage;