/**
 * JexDebug.js - Visual debugging tools for Jex Framework
 *
 * CLASS STRUCTURE:
 * ---------------
 * Public Fields:
 *   - isEnabled {boolean}: Whether debug mode is active
 *   - options {Object}: Configuration options (toggleKey, enabled)
 *
 * Private Fields:
 *   - #container {Jex}: Parent container for all debug elements
 *   - #dom {Object}: DOM element references
 *   - #hoveredElement {Element}: Currently hovered element
 *   - #cleanupDocEvents {Function}: Cleanup function for document events
 *   - #cleanupWinEvents {Function}: Cleanup function for window events
 *   - #cleanupKeyboard {Function}: Cleanup function for keyboard events
 *   - #cleanupConsoleEvents {Function}: Cleanup function for console events
 *
 * Public Methods:
 *   - enable(): void - Enable debug mode
 *   - disable(): void - Disable debug mode
 *   - toggle(): void - Toggle debug mode
 *   - setupKeyboardShortcuts(): void - Setup keyboard shortcuts
 *   - setEnabled(enabled: boolean): void - Enable/disable keyboard shortcuts
 *   - setToggleKey(key: string): void - Set the toggle key
 *   - destroy(): void - Clean up all resources
 *
 * Public Constants:
 *   - DEBUG_VERSION: Current version of JexDebug
 *
 * Dependencies:
 *   - Jex: For DOM manipulation
 *   - JexLogger: For console integration
 *
 * Relations:
 *   - Part of: Jex Framework
 *   - Used by: Jex Framework applications
 *   - Uses: jex from Jex.js, logger from JexLogger.js
 *
 * Last Modified: 2025-09-11 - Renamed from TopDebug to JexDebug
 */

// Use CDN imports for Jex framework
import { jex } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/Jex.js';
import { logger } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/JexLogger.js';

// Version constant
export const DEBUG_VERSION = '2025.09.11';

export class JexDebug {
    // Private fields
    #container = null;
    #dom = {};
    #hoveredElement = null;
    #cleanupDocEvents = null;
    #cleanupWinEvents = null;
    #cleanupKeyboard = null;
    #cleanupConsoleEvents = null;

    constructor(options = {}) {
        // Debug state
        this.isEnabled = false;

        // Configuration options
        this.options = {
            toggleKey: 'F3',
            enabled: true,
            showTooltip: true,
            ...options
        };

        // Add stripe pattern styles
        this.#injectStyles();

        // Create main container and debug elements
        this.#createContainer();
        this.#createDebugElements();

        // Listen to console events
        this.#cleanupConsoleEvents = jex.onWindow({
            'jex:console:show': () => this.enable(),
            'jex:console:hide': () => this.disable()
        });

        // Setup keyboard shortcuts if enabled
        if (this.options.enabled) {
            this.setupKeyboardShortcuts();
        }
    }

    #injectStyles() {
        jex.injectStyles('jexDebugStyles', `
            /* Static stripes for margins */
            .jex-debug-stripes {
                background-image: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 10px,
                    rgba(59, 130, 246, 0.1) 10px,
                    rgba(59, 130, 246, 0.1) 20px
                );
            }
            
            /* Animated stripes for element background */
            .jex-debug-stripes-animated {
                background-image: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 10px,
                    rgba(59, 130, 246, 0.15) 10px,
                    rgba(59, 130, 246, 0.15) 20px
                );
                background-size: 28.28px 28.28px; /* sqrt(2) * 20px for smooth animation */
                animation: jex-debug-stripes-move 1s linear infinite;
            }
            
            @keyframes jex-debug-stripes-move {
                0% { background-position: 0 0; }
                100% { background-position: 28.28px 28.28px; }
            }
            
            /* Tooltip styles */
            .jex-debug-tooltip {
                position: fixed;
                z-index: 10000;
                background: rgba(0, 0, 0, 0.9);
                color: #fff;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-family: monospace;
                pointer-events: none;
                white-space: nowrap;
                max-width: 400px;
                overflow: hidden;
                text-overflow: ellipsis;
                border: 1px solid rgba(59, 130, 246, 0.5);
            }
            
            /* Element highlighting */
            .jex-debug-highlight {
                outline: 2px solid #3b82f6 !important;
                outline-offset: -2px !important;
                position: relative !important;
            }
            
            .jex-debug-highlight::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(59, 130, 246, 0.1);
                pointer-events: none;
                z-index: 1;
            }
        `);
    }

    #createContainer() {
        this.#container = jex.create('div')
            .id('jexDebugContainer')
            .cls('fixed inset-0 pointer-events-none z-[9999]')
            .style({ display: 'none' });
    }

    #createDebugElements() {
        // Margin/padding overlays
        this.#dom.marginTop = jex.create('div').cls('absolute jex-debug-stripes').appendTo(this.#container);
        this.#dom.marginRight = jex.create('div').cls('absolute jex-debug-stripes').appendTo(this.#container);
        this.#dom.marginBottom = jex.create('div').cls('absolute jex-debug-stripes').appendTo(this.#container);
        this.#dom.marginLeft = jex.create('div').cls('absolute jex-debug-stripes').appendTo(this.#container);

        this.#dom.paddingTop = jex.create('div').cls('absolute jex-debug-stripes-animated').appendTo(this.#container);
        this.#dom.paddingRight = jex.create('div').cls('absolute jex-debug-stripes-animated').appendTo(this.#container);
        this.#dom.paddingBottom = jex.create('div').cls('absolute jex-debug-stripes-animated').appendTo(this.#container);
        this.#dom.paddingLeft = jex.create('div').cls('absolute jex-debug-stripes-animated').appendTo(this.#container);

        // Content area
        this.#dom.content = jex.create('div')
            .cls('absolute border-2 border-blue-500 border-dashed')
            .appendTo(this.#container);

        // Tooltip
        this.#dom.tooltip = jex.create('div')
            .cls('jex-debug-tooltip')
            .style({ display: 'none' })
            .mountToBody();

        // Info panel
        this.#dom.infoPanel = jex.create('div')
            .cls('fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg font-mono text-sm border border-blue-500')
            .style({
                zIndex: '10001',
                minWidth: '300px',
                display: 'none'
            })
            .html(`
                <div class="flex items-center justify-between mb-2">
                    <span class="text-blue-400 font-semibold">Jex Debug Panel</span>
                    <button id="jexDebugClose" class="text-red-400 hover:text-red-300 ml-4">✕</button>
                </div>
                <div class="space-y-1 text-xs">
                    <div><span class="text-yellow-400">F3:</span> Toggle debug mode</div>
                    <div><span class="text-yellow-400">ESC:</span> Disable debug mode</div>
                    <div><span class="text-yellow-400">Hover:</span> Inspect elements</div>
                </div>
                <div id="jexDebugElementInfo" class="mt-3 pt-3 border-t border-gray-600">
                    <div class="text-gray-400">Hover over elements to inspect</div>
                </div>
            `)
            .mountToBody();

        // Close button handler
        this.#dom.infoPanel.find('#jexDebugClose').on('click', () => this.disable());
    }

    enable() {
        if (this.isEnabled) return;

        this.isEnabled = true;
        logger.info('Jex Debug mode enabled (Press F3 to toggle, ESC to disable)');

        // Show container and info panel
        this.#container.style({ display: 'block' }).mountToBody();
        this.#dom.infoPanel.style({ display: 'block' });

        // Setup event listeners
        this.#setupEventListeners();
    }

    disable() {
        if (!this.isEnabled) return;

        this.isEnabled = false;
        logger.info('Jex Debug mode disabled');

        // Hide elements
        this.#container.style({ display: 'none' });
        this.#dom.infoPanel.style({ display: 'none' });
        this.#dom.tooltip.style({ display: 'none' });

        // Remove highlighting from previously hovered element
        if (this.#hoveredElement) {
            this.#hoveredElement.classList.remove('jex-debug-highlight');
            this.#hoveredElement = null;
        }

        // Clean up event listeners
        this.#cleanupDocEvents?.();
        this.#cleanupWinEvents?.();
    }

    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    #setupEventListeners() {
        // Document events
        this.#cleanupDocEvents = jex.onDocument({
            mouseover: (e) => this.#handleMouseOver(e),
            mouseout: (e) => this.#handleMouseOut(e),
            mousemove: (e) => this.#handleMouseMove(e),
            click: (e) => this.#handleClick(e)
        });

        // Window events
        this.#cleanupWinEvents = jex.onWindow({
            resize: () => this.#updateDebugInfo(),
            scroll: () => this.#updateDebugInfo()
        });
    }

    #handleMouseOver(e) {
        if (!this.isEnabled) return;

        const target = e.target;

        // Skip debug elements
        if (target.closest('#jexDebugContainer') ||
            target.closest('.jex-debug-tooltip') ||
            target.closest('#jexDebugInfoPanel')) {
            return;
        }

        // Remove highlight from previous element
        if (this.#hoveredElement) {
            this.#hoveredElement.classList.remove('jex-debug-highlight');
        }

        // Add highlight to current element
        this.#hoveredElement = target;
        target.classList.add('jex-debug-highlight');

        // Update debug visualization
        this.#updateDebugVisualization(target);
        this.#updateElementInfo(target);
        this.#showTooltip(e, target);
    }

    #handleMouseOut(e) {
        if (!this.isEnabled) return;

        // Only hide tooltip, keep other visualizations for stability
        this.#dom.tooltip.style({ display: 'none' });
    }

    #handleMouseMove(e) {
        if (!this.isEnabled || !this.options.showTooltip) return;

        // Update tooltip position
        this.#dom.tooltip.style({
            left: `${e.clientX + 10}px`,
            top: `${e.clientY - 30}px`
        });
    }

    #handleClick(e) {
        if (!this.isEnabled) return;

        // Prevent default action when debugging
        e.preventDefault();
        e.stopPropagation();

        const target = e.target;
        logger.info('Clicked element:', {
            tagName: target.tagName,
            id: target.id,
            className: target.className,
            element: target
        });
    }

    #updateDebugVisualization(element) {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);

        // Parse margins and paddings
        const margin = {
            top: parseInt(computedStyle.marginTop) || 0,
            right: parseInt(computedStyle.marginRight) || 0,
            bottom: parseInt(computedStyle.marginBottom) || 0,
            left: parseInt(computedStyle.marginLeft) || 0
        };

        const padding = {
            top: parseInt(computedStyle.paddingTop) || 0,
            right: parseInt(computedStyle.paddingRight) || 0,
            bottom: parseInt(computedStyle.paddingBottom) || 0,
            left: parseInt(computedStyle.paddingLeft) || 0
        };

        // Position margin overlays
        this.#dom.marginTop.style({
            left: `${rect.left - margin.left}px`,
            top: `${rect.top - margin.top}px`,
            width: `${rect.width + margin.left + margin.right}px`,
            height: `${margin.top}px`
        });

        this.#dom.marginRight.style({
            left: `${rect.right}px`,
            top: `${rect.top - margin.top}px`,
            width: `${margin.right}px`,
            height: `${rect.height + margin.top + margin.bottom}px`
        });

        this.#dom.marginBottom.style({
            left: `${rect.left - margin.left}px`,
            top: `${rect.bottom}px`,
            width: `${rect.width + margin.left + margin.right}px`,
            height: `${margin.bottom}px`
        });

        this.#dom.marginLeft.style({
            left: `${rect.left - margin.left}px`,
            top: `${rect.top - margin.top}px`,
            width: `${margin.left}px`,
            height: `${rect.height + margin.top + margin.bottom}px`
        });

        // Position padding overlays
        this.#dom.paddingTop.style({
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${padding.top}px`
        });

        this.#dom.paddingRight.style({
            left: `${rect.right - padding.right}px`,
            top: `${rect.top}px`,
            width: `${padding.right}px`,
            height: `${rect.height}px`
        });

        this.#dom.paddingBottom.style({
            left: `${rect.left}px`,
            top: `${rect.bottom - padding.bottom}px`,
            width: `${rect.width}px`,
            height: `${padding.bottom}px`
        });

        this.#dom.paddingLeft.style({
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${padding.left}px`,
            height: `${rect.height}px`
        });

        // Position content area
        this.#dom.content.style({
            left: `${rect.left + padding.left}px`,
            top: `${rect.top + padding.top}px`,
            width: `${rect.width - padding.left - padding.right}px`,
            height: `${rect.height - padding.top - padding.bottom}px`
        });
    }

    #updateElementInfo(element) {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);

        const info = {
            tagName: element.tagName.toLowerCase(),
            id: element.id || 'none',
            classes: element.className || 'none',
            dimensions: `${Math.round(rect.width)}×${Math.round(rect.height)}`,
            position: `${Math.round(rect.left)}, ${Math.round(rect.top)}`,
            margin: `${computedStyle.margin}`,
            padding: `${computedStyle.padding}`,
            display: computedStyle.display,
            position_type: computedStyle.position
        };

        const infoHtml = `
            <div class="text-blue-400 font-semibold mb-2">&lt;${info.tagName}&gt;</div>
            <div class="space-y-1">
                <div><span class="text-yellow-400">ID:</span> ${info.id}</div>
                <div><span class="text-yellow-400">Classes:</span> ${info.classes}</div>
                <div><span class="text-yellow-400">Size:</span> ${info.dimensions}</div>
                <div><span class="text-yellow-400">Position:</span> ${info.position}</div>
                <div><span class="text-yellow-400">Display:</span> ${info.display}</div>
                <div><span class="text-yellow-400">Position:</span> ${info.position_type}</div>
                <div><span class="text-yellow-400">Margin:</span> ${info.margin}</div>
                <div><span class="text-yellow-400">Padding:</span> ${info.padding}</div>
            </div>
        `;

        this.#dom.infoPanel.find('#jexDebugElementInfo').html(infoHtml);
    }

    #showTooltip(e, element) {
        if (!this.options.showTooltip) return;

        const tagName = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : '';
        const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';

        const tooltipText = `${tagName}${id}${classes}`;

        this.#dom.tooltip
            .text(tooltipText)
            .style({
                display: 'block',
                left: `${e.clientX + 10}px`,
                top: `${e.clientY - 30}px`
            });
    }

    #updateDebugInfo() {
        if (!this.isEnabled || !this.#hoveredElement) return;
        this.#updateDebugVisualization(this.#hoveredElement);
    }

    setupKeyboardShortcuts() {
        this.#cleanupKeyboard = jex.onDocument({
            keydown: (e) => {
                if (e.key === this.options.toggleKey) {
                    e.preventDefault();
                    this.toggle();
                } else if (e.key === 'Escape' && this.isEnabled) {
                    e.preventDefault();
                    this.disable();
                }
            }
        });
    }

    setEnabled(enabled) {
        this.options.enabled = enabled;

        if (enabled && !this.#cleanupKeyboard) {
            this.setupKeyboardShortcuts();
        } else if (!enabled && this.#cleanupKeyboard) {
            this.#cleanupKeyboard();
            this.#cleanupKeyboard = null;
        }
    }

    setToggleKey(key) {
        this.options.toggleKey = key;
    }

    destroy() {
        // Disable first
        this.disable();

        // Remove container (which removes all child elements)
        this.#container?.remove();

        // Remove tooltip and info panel separately
        this.#dom.tooltip?.remove();
        this.#dom.infoPanel?.remove();

        // Clean up keyboard shortcuts
        this.#cleanupKeyboard?.();
        this.#cleanupConsoleEvents?.();

        // Remove pattern styles
        jex.remove('jexDebugStyles');

        // Clear references
        this.#hoveredElement = null;
        this.#container = null;
        this.#dom = {};
        this.#cleanupKeyboard = null;
        this.#cleanupDocEvents = null;
        this.#cleanupWinEvents = null;
        this.#cleanupConsoleEvents = null;
    }
}

// Create and export global instance
export const debug = new JexDebug();