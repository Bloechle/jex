/**
 * JexInspector.js - Visual element inspection tool for Jex ecosystem
 *
 * CLASS STRUCTURE:
 * ---------------
 * Public Fields:
 *   - isEnabled {boolean}: Whether inspector mode is active
 *   - options {Object}: Configuration options (toggleKey, enabled, showTooltip)
 *
 * Private Fields:
 *   - #container {Jex}: Parent container for all overlay elements
 *   - #overlays {Object}: DOM overlay element references
 *   - #tooltip {Jex}: Tooltip element reference
 *   - #hoveredElement {Element}: Currently inspected element
 *   - #eventCleanup {Object}: Event cleanup functions
 *
 * Public Methods:
 *   - enable(): void - Enable inspector mode
 *   - disable(): void - Disable inspector mode
 *   - toggle(): void - Toggle inspector mode
 *   - setEnabled(enabled: boolean): void - Enable/disable keyboard shortcuts
 *   - setToggleKey(key: string): void - Set the toggle key
 *   - destroy(): void - Clean up all resources
 *
 * Dependencies:
 *   - Jex: For DOM manipulation and event handling
 *   - JexLogger: For console integration (logger)
 *
 * Relations:
 *   - Part of: Jex ecosystem
 *   - Used by: Jex-based applications
 *   - Uses: jex from Jex.js, logger from JexLogger.js
 *
 * Last Modified: 2025-01-13 - Fixed highlighting issues and updated IDs
 */

import { jex } from 'https://raw.githubusercontent.com/Bloechle/jex/main/Jex.js';
import { logger } from 'https://raw.githubusercontent.com/Bloechle/jex/main/JexLogger.js';

// Version constant
export const INSPECTOR_VERSION = '2025.01.13';

export class JexInspector {
    // Private fields
    #container = null;
    #overlays = {};
    #tooltip = null;
    #hoveredElement = null;
    #eventCleanup = {};

    constructor(options = {}) {
        // Inspector state
        this.isEnabled = false;

        // Configuration options
        this.options = {
            toggleKey: 'F2',
            enabled: true,
            showTooltip: true,
            ...options
        };

        this.#init();
    }

    #init() {
        this.#injectStyles();
        this.#createContainer();
        this.#createOverlays();

        if (this.options.showTooltip) {
            this.#createTooltip();
        }

        // Listen to logger console events
        this.#eventCleanup.console = jex.onWindow({
            'jex:console:show': () => this.enable(),
            'jex:console:hide': () => this.disable()
        });

        // Setup keyboard shortcuts
        if (this.options.enabled) {
            this.#setupKeyboard();
        }
    }

    #injectStyles() {
        jex.injectStyles('jexInspectorStyles', `
            /* Static stripes for margins */
            .jex-inspector-stripes {
                background-image: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 10px,
                    rgba(59, 130, 246, 0.1) 10px,
                    rgba(59, 130, 246, 0.1) 20px
                );
            }
            
            /* Animated stripes for element background */
            .jex-inspector-stripes-animated {
                background-image: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 10px,
                    rgba(59, 130, 246, 0.15) 10px,
                    rgba(59, 130, 246, 0.15) 20px
                );
                background-size: 28.28px 28.28px;
                animation: jex-inspector-move 1s linear infinite;
            }
            
            @keyframes jex-inspector-move {
                0% { background-position: 0 0; }
                100% { background-position: 28.28px 0; }
            }
        `);
    }

    #createContainer() {
        this.#container = jex.create('div', 'jexInspectorContainer')
            .cls('fixed inset-0 pointer-events-none z-[9995] hidden')
            .mountToBody();
    }

    #createOverlays() {
        const baseClasses = 'absolute pointer-events-none transition-opacity duration-150';

        // Margin overlays with stripes
        const marginClasses = `${baseClasses} bg-blue-400/10 border border-blue-400/50 jex-inspector-stripes`;

        this.#overlays.marginTop = this.#container.add('div', 'jexInspectorMarginTop')
            .cls(marginClasses);
        this.#overlays.marginRight = this.#container.add('div', 'jexInspectorMarginRight')
            .cls(marginClasses);
        this.#overlays.marginBottom = this.#container.add('div', 'jexInspectorMarginBottom')
            .cls(marginClasses);
        this.#overlays.marginLeft = this.#container.add('div', 'jexInspectorMarginLeft')
            .cls(marginClasses);

        // Element background with animated stripes
        this.#overlays.elementBg = this.#container.add('div', 'jexInspectorElementBg')
            .cls(`${baseClasses} bg-blue-400/20 jex-inspector-stripes-animated`);

        // Border indicator with glow
        this.#overlays.border = this.#container.add('div', 'jexInspectorBorder')
            .cls(`${baseClasses} border-2 border-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.8),0_0_40px_rgba(59,130,246,0.4)]`);

        // Content box
        this.#overlays.content = this.#container.add('div', 'jexInspectorContent')
            .cls(`${baseClasses} border border-blue-500 shadow-[inset_0_0_10px_rgba(59,130,246,0.3)]`);
    }

    #createTooltip() {
        this.#tooltip = jex.create('div', 'jexInspectorTooltip')
            .cls('fixed pointer-events-none hidden z-[10001] px-3 py-2 rounded-md text-xs ' +
                'bg-black/90 border border-blue-500/50 shadow-xl shadow-blue-500/20 font-mono ' +
                'backdrop-blur-sm')
            .mountToBody();
    }

    enable() {
        if (this.isEnabled) return;
        this.isEnabled = true;

        // Show container
        this.#container?.cls('-hidden');

        // Attach mouse events with capture phase for better detection
        this.#eventCleanup.document = jex.onDocument({
            'mouseover': (e) => this.#onMouseOver(e),
            'mousemove': (e) => this.#onMouseMove(e),
            'mouseout': (e) => this.#onMouseOut(e)
        }, true); // capture phase = true

        // Window scroll event
        this.#eventCleanup.window = jex.onWindow('scroll', () => this.#onScroll(), true);
    }

    disable() {
        if (!this.isEnabled) return;
        this.isEnabled = false;

        // Clean up events
        this.#eventCleanup.document?.();
        this.#eventCleanup.window?.();
        this.#eventCleanup.document = null;
        this.#eventCleanup.window = null;

        // Hide container and tooltip
        this.#container?.cls('+hidden');
        this.#tooltip?.cls('+hidden');
        this.#hideOverlays();
    }

    toggle() {
        this.isEnabled ? this.disable() : this.enable();
    }

    #onMouseOver(e) {
        if (!this.isEnabled) return;

        const target = e.target;

        // Skip inspector elements and logger console
        if (!target ||
            target.id?.startsWith('jexInspector') ||
            target.closest('#jexLoggerConsole') ||
            target.closest('#jexInspectorContainer')) {
            return;
        }

        this.#hoveredElement = target;
        this.#showInspection(target);
    }

    #onMouseMove(e) {
        if (!this.isEnabled || !this.options.showTooltip) return;

        // Update tooltip position
        if (this.#tooltip && !this.#tooltip.cls('?hidden')) {
            this.#positionTooltip(e.clientX, e.clientY);
        }
    }

    #onMouseOut(e) {
        if (!this.isEnabled) return;

        // Check if we're leaving the hovered element
        if (e.target === this.#hoveredElement) {
            this.#hoveredElement = null;
            this.#hideOverlays();
        }
    }

    #onScroll() {
        if (!this.isEnabled || !this.#hoveredElement) return;

        // Check if element is still in the DOM
        if (!this.#hoveredElement.isConnected) {
            this.#hoveredElement = null;
            this.#hideOverlays();
            return;
        }

        // Update overlay positions
        this.#showInspection(this.#hoveredElement);
    }

    #showInspection(element) {
        const rect = element.getBoundingClientRect();
        const computed = window.getComputedStyle(element);

        // Get box model values
        const margin = {
            top: parseFloat(computed.marginTop) || 0,
            right: parseFloat(computed.marginRight) || 0,
            bottom: parseFloat(computed.marginBottom) || 0,
            left: parseFloat(computed.marginLeft) || 0
        };

        const border = {
            top: parseFloat(computed.borderTopWidth) || 0,
            right: parseFloat(computed.borderRightWidth) || 0,
            bottom: parseFloat(computed.borderBottomWidth) || 0,
            left: parseFloat(computed.borderLeftWidth) || 0
        };

        const padding = {
            top: parseFloat(computed.paddingTop) || 0,
            right: parseFloat(computed.paddingRight) || 0,
            bottom: parseFloat(computed.paddingBottom) || 0,
            left: parseFloat(computed.paddingLeft) || 0
        };

        // Make all elements visible
        this.#showAllOverlays();

        // Position margin indicators
        this.#positionMargins(rect, margin);

        // Position element background with animated stripes
        this.#overlays.elementBg.style({
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
        });

        // Position border box (2px border, so offset by -2)
        this.#overlays.border.style({
            left: `${rect.left - 2}px`,
            top: `${rect.top - 2}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
        });

        // Position content box
        const contentWidth = rect.width - border.left - border.right - padding.left - padding.right;
        const contentHeight = rect.height - border.top - border.bottom - padding.top - padding.bottom;

        if (contentWidth > 0 && contentHeight > 0) {
            this.#overlays.content.style({
                left: `${rect.left + border.left + padding.left - 1}px`,
                top: `${rect.top + border.top + padding.top - 1}px`,
                width: `${contentWidth}px`,
                height: `${contentHeight}px`,
                opacity: '1'
            });
        } else {
            this.#overlays.content.style({ opacity: '0' });
        }

        // Update tooltip
        if (this.options.showTooltip && this.#tooltip) {
            this.#updateTooltip(element, margin, border, padding);
        }
    }

    #showAllOverlays() {
        // Show all overlays by setting opacity to 1
        Object.values(this.#overlays).forEach(overlay => {
            overlay.style({ opacity: '1' });
        });
    }

    #hideOverlays() {
        // Hide all overlays by setting opacity to 0
        Object.values(this.#overlays).forEach(overlay => {
            overlay.style({ opacity: '0' });
        });
        this.#tooltip?.cls('+hidden');
    }

    #positionMargins(rect, margin) {
        // Helper function to show/hide and position margin elements
        const setMargin = (overlay, show, styles) => {
            if (show && styles) {
                overlay.style({
                    ...this.#pxStyles(styles),
                    opacity: '1'
                });
            } else {
                overlay.style({ opacity: '0' });
            }
        };

        // Top margin
        setMargin(this.#overlays.marginTop, margin.top > 0, {
            left: rect.left - margin.left - 1,
            top: rect.top - margin.top - 1,
            width: rect.width + margin.left + margin.right,
            height: margin.top - 1
        });

        // Right margin
        setMargin(this.#overlays.marginRight, margin.right > 0, {
            left: rect.left + rect.width,
            top: rect.top - 1,
            width: margin.right - 1,
            height: rect.height
        });

        // Bottom margin
        setMargin(this.#overlays.marginBottom, margin.bottom > 0, {
            left: rect.left - margin.left - 1,
            top: rect.top + rect.height,
            width: rect.width + margin.left + margin.right,
            height: margin.bottom - 1
        });

        // Left margin
        setMargin(this.#overlays.marginLeft, margin.left > 0, {
            left: rect.left - margin.left - 1,
            top: rect.top - 1,
            width: margin.left - 1,
            height: rect.height
        });
    }

    #pxStyles(styles) {
        const result = {};
        Object.entries(styles).forEach(([key, value]) => {
            result[key] = `${value}px`;
        });
        return result;
    }

    #updateTooltip(element, margin, border, padding) {
        const tag = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : '';
        const classes = element.className ?
            `.${element.className.trim().split(/\s+/).filter(c => c && !c.startsWith('hover:')).slice(0, 3).join('.')}` : '';

        const rect = element.getBoundingClientRect();

        // Clear and rebuild tooltip content
        this.#tooltip.clear();

        // Element info section
        const elementInfo = this.#tooltip.add('div').cls('flex items-center gap-2');
        elementInfo.add('span').cls('text-blue-300 font-bold').text(`<${tag}>`);
        if (id) elementInfo.add('span').cls('text-white').text(id);
        if (classes) elementInfo.add('span').cls('text-gray-400 text-[10px]').text(classes);

        // Dimensions
        this.#tooltip.add('div')
            .cls('mt-1 text-white font-medium')
            .text(`${Math.round(rect.width)} × ${Math.round(rect.height)} px`);

        // Position info
        this.#tooltip.add('div')
            .cls('text-gray-500 text-[10px]')
            .text(`(${Math.round(rect.left)}, ${Math.round(rect.top)})`);

        // Box model info if any values exist
        const hasBoxModel = margin.top || margin.right || margin.bottom || margin.left ||
            border.top || border.right || border.bottom || border.left ||
            padding.top || padding.right || padding.bottom || padding.left;

        if (hasBoxModel) {
            const boxModel = this.#tooltip.add('div')
                .cls('mt-2 pt-2 border-t border-gray-700 space-y-0.5');

            // Helper to format box values
            const addBoxInfo = (label, values, labelColor, valueColor) => {
                const hasValues = values.top || values.right || values.bottom || values.left;
                if (hasValues) {
                    const div = boxModel.add('div').cls('flex items-center gap-2');
                    div.add('span').cls(`${labelColor} font-bold w-4`).text(label);
                    div.add('span').cls(`${valueColor} text-[11px] font-mono`)
                        .text(`${values.top} ${values.right} ${values.bottom} ${values.left}`);
                }
            };

            // Use light blue for all box model labels
            addBoxInfo('M', margin, 'text-blue-300', 'text-gray-300');
            addBoxInfo('B', border, 'text-blue-300', 'text-gray-300');
            addBoxInfo('P', padding, 'text-blue-300', 'text-gray-300');
        }

        this.#tooltip.cls('-hidden');
    }

    #positionTooltip(mouseX, mouseY) {
        if (!this.#tooltip) return;

        const tooltip = this.#tooltip.ref;
        const tooltipRect = tooltip.getBoundingClientRect();

        let left = mouseX + 15;
        let top = mouseY + 15;

        // Adjust if tooltip would go off screen
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = mouseX - tooltipRect.width - 15;
        }

        if (top + tooltipRect.height > window.innerHeight - 10) {
            top = mouseY - tooltipRect.height - 15;
        }

        this.#tooltip.style({
            left: `${left}px`,
            top: `${top}px`
        });
    }

    #setupKeyboard() {
        // Clean up any existing handler first
        this.#eventCleanup.keyboard = jex.onDocument('keydown',
            (e) => this.#handleKeyboard(e),
            { passive: false }
        );
    }

    #handleKeyboard(e) {
        if (e.key === this.options.toggleKey) {
            e.preventDefault();
            logger.toggleConsole();
        }
    }

    setEnabled(enabled) {
        this.options.enabled = enabled;
        if (enabled) {
            this.#setupKeyboard();
        } else {
            // Clean up keyboard handler
            this.#eventCleanup.keyboard?.();
            this.#eventCleanup.keyboard = null;
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

        // Remove tooltip separately
        this.#tooltip?.remove();

        // Clean up keyboard shortcuts
        this.#eventCleanup.keyboard?.();
        this.#eventCleanup.console?.();

        // Remove pattern styles
        jex.remove('jexInspectorStyles');

        // Clear references
        this.#hoveredElement = null;
        this.#container = null;
        this.#overlays = {};
        this.#tooltip = null;
        this.#eventCleanup = {};
    }
}

// Create global instance
export const inspector = new JexInspector();