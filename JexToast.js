/**
 * JexToast.js - Advanced toast notification component for Jex Framework
 *
 * CLASS STRUCTURE:
 * ---------------
 * Public Fields:
 *   - options {Object}: Configuration options for the toast
 *   - isVisible {boolean}: Whether any toast is currently visible
 *
 * Private Fields:
 *   - #dom {Object}: DOM element references
 *   - #mounted {boolean}: Whether the toast is mounted to DOM
 *   - #queue {Array}: Queue of pending toast messages
 *   - #visibleToasts {number}: Count of visible toasts
 *   - #activeToasts {Map}: Map of active toast elements and their data
 *   - #lastToast {Object}: Reference to last shown toast for duplicate detection
 *
 * Public Methods:
 *   - constructor(options: Object): Creates toast instance
 *   - mount(): JexToast - Mount toast to document body
 *   - show(type: string, message: string, duration?: number): void - Show toast message
 *   - success(message: string, duration?: number): void - Show success toast
 *   - error(message: string, duration?: number): void - Show error toast
 *   - warning(message: string, duration?: number): void - Show warning toast
 *   - info(message: string, duration?: number): void - Show info toast
 *   - command(message: string, duration?: number): void - Show command toast
 *   - check(condition: any, errorMessage: string, callback?: Function): boolean - Check condition and show error if false
 *   - clearAll(): void - Clear all toasts
 *   - destroy(): void - Remove toast from DOM
 *
 * Dependencies:
 *   - Jex: DOM manipulation from Jex Framework
 *   - JexLogger: Logging from Jex Framework
 *
 * Relations:
 *   - Part of: Jex Framework widgets
 *   - Used by: Jex applications
 *   - Uses: jex, logger from Jex Framework
 *
 * Last Modified: 2025-09-16 - Final corrected version
 */

import { jex } from 'https://raw.githubusercontent.com/Bloechle/jex/main/Jex.js';
import { logger } from 'https://raw.githubusercontent.com/Bloechle/jex/main/JexLogger.js';


export class JexToast {
    // Public fields
    options = {};
    isVisible = false;

    // Private fields
    #dom = {};
    #mounted = false;
    #queue = [];
    #visibleToasts = 0;
    #activeToasts = new Map();
    #lastToast = null;

    constructor(options = {}) {
        // Default configuration
        this.options = {
            // Positioning
            position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
            maxVisible: 3,

            // Behavior
            duration: 5000,
            queueMessages: true,
            detectDuplicates: true,
            showProgress: true,

            // Styling
            maxWidth: 'max-w-md',
            customClass: '',

            // Animation
            animationDuration: 400,

            // Toast types configuration
            types: {
                success: {
                    icon: '✓',
                    bgClass: 'bg-green-600',
                    borderClass: 'border-green-700',
                    textClass: 'text-white',
                    progressClass: 'bg-green-400'
                },
                error: {
                    icon: '✕',
                    bgClass: 'bg-red-500',
                    borderClass: 'border-red-600',
                    textClass: 'text-white',
                    progressClass: 'bg-red-300'
                },
                warning: {
                    icon: '⚠',
                    bgClass: 'bg-amber-500',
                    borderClass: 'border-amber-600',
                    textClass: 'text-white',
                    progressClass: 'bg-amber-300'
                },
                info: {
                    icon: 'ℹ',
                    bgClass: 'bg-blue-500',
                    borderClass: 'border-blue-600',
                    textClass: 'text-white',
                    progressClass: 'bg-blue-300'
                },
                command: {
                    icon: '⌘',
                    bgClass: 'bg-gray-700',
                    borderClass: 'border-gray-600',
                    textClass: 'text-white',
                    progressClass: 'bg-gray-400'
                }
            },

            ...options
        };

        // Initialize toast system
        this.#initToastSystem();
    }

    #initToastSystem() {
        // Inject CSS animations
        this.#injectStyles();

        // Create container
        this.#createContainer();

        logger.debug('JexToast system initialized');
    }

    #injectStyles() {
        jex.injectStyles('jexToastStyles', `
            @keyframes jexToastSlideIn {
                from {
                    transform: translateX(var(--slide-from));
                    opacity: 0;
                    scale: 0.95;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                    scale: 1;
                }
            }
            
            @keyframes jexToastSlideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                    scale: 1;
                }
                to {
                    transform: translateX(var(--slide-to));
                    opacity: 0;
                    scale: 0.95;
                }
            }
            
            @keyframes jexToastPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
            
            .jex-toast-enter {
                animation: jexToastSlideIn var(--duration, 400ms) cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }
            
            .jex-toast-exit {
                animation: jexToastSlideOut var(--duration, 400ms) ease-in;
            }
            
            .jex-toast-pulse {
                animation: jexToastPulse 300ms ease-in-out;
            }
            
            .jex-toast-progress {
                transition: width linear;
            }
        `);
    }

    #createContainer() {
        // Determine position classes
        const positionClasses = this.#getPositionClasses();

        // Create container with proper ID - NO CHAINING WITH .id() after creation!
        this.#dom.container = jex.create('div', 'jexToastContainer')
            .cls(
                'fixed',
                'z-[10000]',
                'pointer-events-none',
                'flex',
                'flex-col',
                'gap-3',
                'p-4',
                positionClasses,
                this.options.customClass
            )
            .attr('aria-live', 'polite')
            .attr('aria-label', 'Notifications');
    }

    #getPositionClasses() {
        const position = this.options.position;

        switch (position) {
            case 'top-left':
                return 'top-0 left-0 items-start';
            case 'top-right':
                return 'top-0 right-0 items-end';
            case 'bottom-left':
                return 'bottom-0 left-0 items-start';
            case 'bottom-right':
            default:
                return 'bottom-0 right-0 items-end';
        }
    }

    mount() {
        if (!this.#mounted) {
            this.#dom.container.mountToBody();
            this.#mounted = true;
            logger.debug('JexToast mounted');
        }
        return this;
    }

    #createToastElement(message, type) {
        const config = this.options.types[type] || this.options.types.info;
        const isLeft = this.options.position.includes('left');

        // Main toast container
        const toast = jex.create('div')
            .attr('role', 'alert')
            .attr('aria-live', 'assertive')
            .attr('data-type', type)
            .attr('data-message', message)
            .cls(
                'jex-toast',
                'pointer-events-auto',
                'relative',
                'rounded-lg',
                'shadow-lg',
                'border',
                'overflow-hidden',
                'transform-gpu', // Hardware acceleration
                this.options.maxWidth,
                config.bgClass,
                config.borderClass,
                config.textClass
            )
            .style({
                '--slide-from': isLeft ? '-100%' : '100%',
                '--slide-to': isLeft ? '-100%' : '100%',
                '--duration': `${this.options.animationDuration}ms`
            });

        // Content wrapper
        const content = toast.add('div')
            .cls('flex', 'items-start', 'p-4', 'gap-3');

        // Icon
        const icon = content.add('div')
            .cls('flex-shrink-0', 'text-xl', 'leading-none')
            .text(config.icon);

        // Message
        const messageEl = content.add('div')
            .cls('flex-1', 'text-sm', 'font-medium', 'break-words', 'leading-relaxed')
            .text(message);

        // Close button
        const closeBtn = content.add('button')
            .cls(
                'flex-shrink-0',
                'ml-2',
                'text-current',
                'opacity-70',
                'hover:opacity-100',
                'transition-opacity',
                'focus:outline-none',
                'focus:ring-2',
                'focus:ring-white',
                'focus:ring-opacity-50',
                'rounded',
                'w-6',
                'h-6',
                'flex',
                'items-center',
                'justify-center'
            )
            .attr('aria-label', 'Close notification')
            .text('×')
            .on('click', () => this.#removeToast(toast));

        // Progress bar (if enabled)
        let progressBar = null;
        if (this.options.showProgress) {
            progressBar = toast.add('div')
                .cls(
                    'absolute',
                    'bottom-0',
                    'left-0',
                    'h-1',
                    'w-full',
                    'jex-toast-progress',
                    config.progressClass,
                    'opacity-50'
                );
        }

        return { toast, progressBar };
    }

    show(type, message, duration = null) {
        if (!this.#mounted) {
            this.mount();
        }

        const actualDuration = duration !== null ? duration : this.options.duration;

        // Check for duplicates
        if (this.options.detectDuplicates && this.#isDuplicate(type, message)) {
            this.#handleDuplicate(type, message);
            return;
        }

        // Handle queue if max visible reached
        if (this.#visibleToasts >= this.options.maxVisible) {
            if (this.options.queueMessages) {
                this.#queue.push({ type, message, duration: actualDuration });
                return;
            } else {
                // Remove oldest toast
                this.#removeOldestToast();
            }
        }

        this.#showToast(type, message, actualDuration);
    }

    #isDuplicate(type, message) {
        return this.#lastToast &&
            this.#lastToast.type === type &&
            this.#lastToast.message === message &&
            (Date.now() - this.#lastToast.timestamp) < 1000; // 1 second window
    }

    #handleDuplicate(type, message) {
        // Find existing toast and pulse it
        for (const [toastEl, data] of this.#activeToasts) {
            if (data.type === type && data.message === message) {
                toastEl.cls('+jex-toast-pulse');
                setTimeout(() => toastEl.cls('-jex-toast-pulse'), 300);

                // Reset timer
                if (data.timer) {
                    clearTimeout(data.timer);
                }
                data.timer = setTimeout(() => this.#removeToast(toastEl), this.options.duration);
                break;
            }
        }
    }

    #showToast(type, message, duration) {
        const { toast, progressBar } = this.#createToastElement(message, type);

        // Add to container with animation
        toast.cls('+jex-toast-enter');
        this.#dom.container.append(toast);

        // Track toast
        const toastData = {
            type,
            message,
            duration,
            timer: null,
            progressBar
        };

        this.#activeToasts.set(toast, toastData);
        this.#visibleToasts++;
        this.isVisible = true;

        // Update last toast reference
        this.#lastToast = {
            type,
            message,
            timestamp: Date.now()
        };

        // Setup auto-removal timer
        if (duration > 0) {
            toastData.timer = setTimeout(() => {
                this.#removeToast(toast);
            }, duration);

            // Animate progress bar
            if (progressBar) {
                setTimeout(() => {
                    progressBar.style({
                        width: '0%',
                        transitionDuration: `${duration}ms`
                    });
                }, 50);
            }
        }

        // Remove enter animation class
        setTimeout(() => {
            toast.cls('-jex-toast-enter');
        }, this.options.animationDuration);

        logger.debug(`Toast shown: ${type} - ${message}`);
    }

    #removeToast(toastElement) {
        const toastData = this.#activeToasts.get(toastElement);
        if (!toastData) return;

        // Clear timer
        if (toastData.timer) {
            clearTimeout(toastData.timer);
        }

        // Add exit animation
        toastElement.cls('+jex-toast-exit');

        // Remove after animation
        setTimeout(() => {
            toastElement.remove();
            this.#activeToasts.delete(toastElement);
            this.#visibleToasts--;

            // Update visibility state
            if (this.#visibleToasts === 0) {
                this.isVisible = false;
            }

            // Process queue
            this.#processQueue();
        }, this.options.animationDuration);
    }

    #removeOldestToast() {
        const oldestToast = this.#activeToasts.keys().next().value;
        if (oldestToast) {
            this.#removeToast(oldestToast);
        }
    }

    #processQueue() {
        if (this.#queue.length > 0 && this.#visibleToasts < this.options.maxVisible) {
            const { type, message, duration } = this.#queue.shift();
            this.#showToast(type, message, duration);
        }
    }

    // Convenience methods
    success(message, duration) {
        logger.info(`Toast Success: ${message}`);
        this.show('success', message, duration);
    }

    error(message, duration) {
        logger.error(`Toast Error: ${message}`);
        this.show('error', message, duration);
    }

    warning(message, duration) {
        logger.warn(`Toast Warning: ${message}`);
        this.show('warning', message, duration);
    }

    info(message, duration) {
        this.show('info', message, duration);
    }

    command(message, duration) {
        this.show('command', message, duration);
    }

    check(condition, errorMessage, callback = null) {
        if (!condition) {
            this.error(errorMessage);
            return false;
        }

        if (typeof callback === 'function') {
            callback(condition);
        }

        return true;
    }

    clearAll() {
        // Clear all timers
        for (const toastData of this.#activeToasts.values()) {
            if (toastData.timer) {
                clearTimeout(toastData.timer);
            }
        }

        // Clear queue
        this.#queue = [];

        // Remove all toasts
        this.#dom.container?.clear();

        // Reset state
        this.#activeToasts.clear();
        this.#visibleToasts = 0;
        this.#lastToast = null;
        this.isVisible = false;
    }

    destroy() {
        this.clearAll();

        if (this.#mounted) {
            this.#dom.container?.remove();
            this.#mounted = false;
        }

        // Remove injected styles
        const styleEl = jex.$('jexToastStyles');
        if (styleEl) {
            styleEl.remove();
        }

        logger.debug('JexToast destroyed');
    }
}

// Create and export global instance
export const toast = new JexToast();