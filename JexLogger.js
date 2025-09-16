/**
 * JexLogger.js - Console and logging system for Jex ecosystem
 *
 * CLASS STRUCTURE:
 * ---------------
 * Public Fields:
 *   - logLevels {Object}: Numeric mapping for log filtering
 *   - currentLogLevel {string}: Current active log level
 *
 * Private Fields:
 *   - #config {Object}: Configuration for levels and defaults
 *   - #state {Object}: Console state (messages, visibility, etc.)
 *   - #dom {Object}: DOM element references
 *   - #messageIndex {number}: Global message counter
 *   - #tooltipTimeout {number}: Tooltip hide timeout
 *
 * Public Methods:
 *   - toggleConsole(): void - Toggle console visibility
 *   - updateDisplayedMessages(): void - Update displayed messages based on filter
 *   - clearConsole(): void - Clear all console messages
 *   - destroy(): void - Clean up and restore original console methods
 *   - info/debug/warn/error/trace(...args): void - Logging methods
 *
 * Dependencies:
 *   - Jex: For DOM manipulation and event handling
 *
 * Relations:
 *   - Part of: Jex ecosystem
 *   - Used by: All Jex-based applications
 *   - Uses: jex from Jex.js
 *
 * Last Modified: 2025-01-13 - Refactored as JexLogger with DRY improvements
 */

import { jex } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@main/Jex.js';

// Version constant
export const LOGGER_VERSION = '2025.01.13';

export class JexLogger {
    // Private fields
    #config = {
        levels: {
            trace: { color: 'purple', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-l-purple-500', hover: 'hover:bg-purple-500/20', indicator: 'bg-purple-500' },
            debug: { color: 'blue', text: 'text-blue-300', bg: 'bg-blue-400/10', border: 'border-l-blue-400', hover: 'hover:bg-blue-400/20', indicator: 'bg-blue-400' },
            info: { color: 'green', text: 'text-green-500', bg: 'bg-green-600/10', border: 'border-l-green-600', hover: 'hover:bg-green-600/20', indicator: 'bg-green-600' },
            warn: { color: 'yellow', text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-l-yellow-500', hover: 'hover:bg-yellow-500/20', indicator: 'bg-yellow-500' },
            error: { color: 'red', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-l-red-500', hover: 'hover:bg-red-500/20', indicator: 'bg-red-500' }
        },
        defaults: {
            maxLogs: 1000,
            height: '30vh',
            maxHeight: window.innerHeight * 0.8,
            animationDuration: 300
        }
    };

    #state = {
        messages: [],
        isVisible: false,
        isAnimating: false,
        isMinimized: false,
        lastHeight: null,
        lastMessage: null,
        originals: {}
    };

    #dom = {};
    #messageIndex = 0;
    #tooltipTimeout = null;

    // Public fields
    logLevels = { trace: 0, debug: 1, info: 2, warn: 3, error: 4 };
    currentLogLevel = 'debug';

    constructor() {
        this.#init();
    }

    #init() {
        this.#injectStyles();
        this.#createUI();
        this.#createFiller();
        this.#interceptConsole();
        this.#showWelcome();
    }

    #injectStyles() {
        jex.injectStyles('jexLoggerStyles', `
            #jexLoggerOutput::-webkit-scrollbar {
                width: 8px;
            }
            #jexLoggerOutput::-webkit-scrollbar-track {
                background: rgba(31, 41, 55, 0.5);
                border-radius: 4px;
            }
            #jexLoggerOutput::-webkit-scrollbar-thumb {
                background-color: rgba(107, 114, 128, 0.5);
                border-radius: 4px;
            }
            #jexLoggerOutput::-webkit-scrollbar-thumb:hover {
                background-color: rgba(156, 163, 175, 0.5);
            }
            
            .jex-logger-tooltip {
                position: fixed;
                z-index: 10001;
                background: rgba(0, 0, 0, 0.95);
                border: 1px solid rgba(59, 130, 246, 0.5);
                border-radius: 4px;
                padding: 12px;
                font-size: 11px;
                font-family: monospace;
                color: #e5e7eb;
                white-space: pre;
                max-width: 600px;
                max-height: 300px;
                overflow: auto;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            }
            
            .jex-logger-tooltip.visible {
                opacity: 1;
                pointer-events: auto;
            }
        `);
    }

    #createUI() {
        // Main console container
        this.#dom.root = jex.create('div', 'jexLoggerConsole')
            .cls('fixed inset-x-0 bottom-0 bg-gray-900 z-[10000] hidden transform translate-y-full ' +
                'transition-transform duration-300 ease-out font-mono shadow-[0_-4px_20px_rgba(0,0,0,0.3)]')
            .style({ height: this.#config.defaults.height })
            .mountToBody();

        this.#createHeader();
        this.#createOutput();
        this.#createTooltip();
        this.#setupResize();

        // Handle transition end
        this.#dom.root.on('transitionend', () => {
            if (!this.#state.isVisible) {
                this.#dom.root.cls('+hidden');
            }
            this.#state.isAnimating = false;
        });
    }

    #createHeader() {
        const header = this.#dom.root.add('div', 'jexLoggerHeader')
            .cls('flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 cursor-ns-resize h-8');

        // Left section
        const left = header.add('div').cls('flex items-center gap-4');

        this.#dom.title = left.add('span')
            .cls('text-gray-300 text-sm font-medium cursor-pointer hover:text-gray-100 transition-colors select-none')
            .text('Debug Console')
            .attr('title', 'Click to clear console')
            .onClick(() => this.clearConsole());

        this.#dom.messageCount = left.add('span')
            .cls('text-gray-500 text-xs')
            .text('0 messages');

        // Right section
        const right = header.add('div').cls('flex items-center gap-3');
        this.#createLevelSelector(right);
        this.#createCloseButton(right);
    }

    #createLevelSelector(parent) {
        this.#dom.levelIndicator = parent.add('div')
            .cls('flex items-center gap-1.5 px-3 py-1 bg-gray-700 rounded text-xs cursor-pointer ' +
                'hover:bg-gray-600 transition-all duration-200 select-none')
            .attr('title', 'Click to change log level')
            .onClick(() => this.#cycleLogLevel());

        this.#dom.levelSquare = this.#dom.levelIndicator.add('span')
            .cls(`inline-block w-3 h-3 rounded-sm ${this.#config.levels[this.currentLogLevel].indicator}`);

        this.#dom.levelText = this.#dom.levelIndicator.add('span')
            .cls('text-gray-300 font-medium uppercase tracking-wider')
            .text(this.currentLogLevel);

        this.#dom.levelIndicator.add('span')
            .cls('text-gray-500')
            .html('<i class="fas fa-chevron-down text-[10px]"></i>');
    }

    #createCloseButton(parent) {
        parent.add('button')
            .cls('text-gray-400 px-2 text-sm opacity-80 hover:opacity-100 hover:text-gray-200 ' +
                'transition-all bg-transparent border-0 cursor-pointer')
            .html('✕')
            .attr('title', 'Close Console (F2)')
            .onClick(() => this.toggleConsole());
    }

    #createOutput() {
        this.#dom.output = this.#dom.root.add('div', 'jexLoggerOutput')
            .cls('p-3 overflow-y-auto bg-black text-gray-300')
            .style({ height: 'calc(100% - 32px)' });
    }

    #createTooltip() {
        this.#dom.tooltip = jex.create('div', 'jexLoggerTooltip')
            .cls('jex-logger-tooltip')
            .mountToBody();
    }

    #createFiller() {
        this.#dom.filler = jex.create('div', 'jexLoggerFiller')
            .cls('w-full block transition-[height] duration-300 ease-out')
            .style({ height: '0px' })
            .mountToBody();
    }

    #setupResize() {
        this.#dom.root.select('#jexLoggerHeader').on('mousedown', (e) => {
            const startY = e.clientY;
            const startHeight = parseInt(getComputedStyle(this.#dom.root.ref).height);

            const resize = (e) => {
                const delta = startY - e.clientY;
                const newHeight = Math.min(Math.max(startHeight + delta, 32), this.#config.defaults.maxHeight);
                this.#dom.root.style({ height: `${newHeight}px` });
                this.#dom.filler.style({ height: `${newHeight}px` });
            };

            const stopResize = () => {
                cleanupMove();
                cleanupUp();

                const finalHeight = parseInt(getComputedStyle(this.#dom.root.ref).height);

                if (finalHeight <= 50) {
                    this.#dom.root.style({ height: '32px' });
                    this.#dom.filler.style({ height: '32px' });
                    this.#dom.output.cls('+hidden');
                    this.#state.isMinimized = true;
                } else {
                    this.#state.lastHeight = `${finalHeight}px`;
                    this.#dom.output.cls('-hidden');
                    this.#state.isMinimized = false;
                }
            };

            const cleanupMove = jex.onDocument('mousemove', resize);
            const cleanupUp = jex.onDocument('mouseup', stopResize);
            e.preventDefault();
        });
    }

    #cycleLogLevel() {
        const levels = Object.keys(this.#config.levels);
        const currentIndex = levels.indexOf(this.currentLogLevel);
        const nextIndex = (currentIndex + 1) % levels.length;

        this.currentLogLevel = levels[nextIndex];
        this.#updateLevelIndicator();
        this.updateDisplayedMessages();
    }

    #updateLevelIndicator() {
        this.#dom.levelText?.text(this.currentLogLevel);

        if (this.#dom.levelSquare) {
            // Remove old indicator class and add new one
            Object.values(this.#config.levels).forEach(config => {
                this.#dom.levelSquare.cls(`-${config.indicator}`);
            });
            this.#dom.levelSquare.cls(`+${this.#config.levels[this.currentLogLevel].indicator}`);
        }
    }

    #interceptConsole() {
        Object.keys(this.#config.levels).forEach(level => {
            this.#state.originals[level] = console[level] || console.log;

            console[level] = (...args) => {
                this.#state.originals[level].apply(console, args);

                const messageData = level === 'trace'
                    ? this.#formatTraceMessage(level, ...args)
                    : this.#formatLogMessage(level, ...args);

                this.#addMessage({
                    level,
                    text: messageData.formatted,
                    index: messageData.index,
                    caller: messageData.caller,
                    stacktrace: messageData.stacktrace,
                    timestamp: Date.now(),
                    count: 1
                });
            };
        });
    }

    #formatLogMessage(level, ...args) {
        const time = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        const caller = this.#getCaller();
        const stacktrace = this.#getStacktrace();

        const formattedArgs = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        this.#messageIndex++;

        const parts = [
            level.toUpperCase().padEnd(5),
            `#${this.#messageIndex}`,
            `[${time}]`
        ];

        if (caller && caller !== 'unknown') {
            parts.push(`<${caller}>`);
        }

        parts.push('\n' + formattedArgs);

        return {
            formatted: parts.join(' '),
            index: this.#messageIndex,
            caller,
            stacktrace
        };
    }

    #formatTraceMessage(level, ...args) {
        const baseData = this.#formatLogMessage(level, ...args);
        const stack = this.#getEnhancedStacktrace();

        return {
            ...baseData,
            formatted: `${baseData.formatted}\n${stack}`
        };
    }

    #getCaller() {
        const stack = new Error().stack;
        const lines = stack.split('\n');

        for (let i = 4; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes('JexLogger') ||
                line.includes('console.') ||
                line.includes('Object.') ||
                line.includes('Function.')) {
                continue;
            }

            const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) ||
                line.match(/at\s+(.+?):(\d+):(\d+)/);

            if (match) {
                const fileName = (match[2] || match[1]).split('/').pop();
                const lineNum = match[3] || match[2];
                return `${fileName}:${lineNum}`;
            }
        }

        return 'unknown';
    }

    #getStacktrace() {
        const stack = new Error().stack;
        const lines = stack.split('\n').slice(5);

        return lines
            .filter(line => line.trim() &&
                !line.includes('JexLogger') &&
                !line.includes('console.') &&
                !line.includes('Object.<anonymous>'))
            .map(line => this.#cleanStackLine(line))
            .join('\n');
    }

    #getEnhancedStacktrace() {
        const stack = new Error().stack;
        const lines = stack.split('\n').slice(5);

        return lines
            .filter(line => line.trim() &&
                !line.includes('JexLogger') &&
                !line.includes('console.trace'))
            .map(line => {
                const trimmed = line.trim();
                const match = trimmed.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) ||
                    trimmed.match(/at\s+(.+?):(\d+):(\d+)/);

                if (match) {
                    const method = match[1] || 'anonymous';
                    const fileName = (match[2] || match[1]).split('/').pop();
                    const lineNum = match[3] || match[2];
                    const colNum = match[4] || match[3];
                    return `  → ${method} (${fileName}:${lineNum}:${colNum})`;
                }

                return `  ${trimmed}`;
            })
            .join('\n');
    }

    #cleanStackLine(line) {
        const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/) ||
            line.match(/at\s+(.+):(\d+):(\d+)/);

        if (match) {
            const funcName = match[1] || 'anonymous';
            const fullPath = match[2] || match[1];
            const lineNum = match[3] || match[2];
            const colNum = match[4] || match[3];
            const cleanPath = fullPath.replace(/^https?:\/\/[^\/]+\//, '');

            return funcName !== 'anonymous'
                ? `at ${funcName} (${cleanPath}:${lineNum}:${colNum})`
                : `at ${cleanPath}:${lineNum}:${colNum}`;
        }

        return line;
    }

    #addMessage(message) {
        // Group similar messages
        const lastMsg = this.#state.messages[this.#state.messages.length - 1];

        if (lastMsg &&
            lastMsg.text === message.text &&
            lastMsg.level === message.level &&
            lastMsg.caller === message.caller) {
            lastMsg.count++;
            lastMsg.timestamp = Date.now();

            if (this.#state.isVisible) {
                this.updateDisplayedMessages();
            }
            return;
        }

        this.#state.messages.push(message);
        this.#state.lastMessage = message;

        if (this.#state.messages.length > this.#config.defaults.maxLogs) {
            this.#state.messages.shift();
        }

        if (this.#state.isVisible) {
            this.updateDisplayedMessages();
        }
    }

    updateDisplayedMessages() {
        const filtered = this.#state.messages.filter(
            m => this.logLevels[m.level] >= this.logLevels[this.currentLogLevel]
        );

        // Update message count
        if (this.#dom.messageCount) {
            const total = this.#state.messages.length;
            const shown = filtered.length;
            const text = total === shown ? `${total} messages` : `${shown} of ${total} messages`;
            this.#dom.messageCount.text(text);
        }

        // Clear and rebuild output
        this.#dom.output.clear();

        filtered.forEach((msg, idx) => {
            this.#renderMessage(msg, idx);
        });

        // Scroll to bottom
        this.#dom.output.ref.scrollTop = this.#dom.output.ref.scrollHeight;
    }

    #renderMessage(msg, idx) {
        const levelConfig = this.#config.levels[msg.level];

        const entry = this.#dom.output.add('div', `jexLoggerMessage${idx}`)
            .cls(`my-0.5 px-2.5 py-1.5 rounded border-l-[3px] relative transition-all duration-200 text-xs cursor-pointer ` +
                `${levelConfig.bg} ${levelConfig.border} ${levelConfig.text} ${levelConfig.hover}`)
            .attr('data-stacktrace', msg.stacktrace || '');

        // Add stacktrace hover
        if (msg.stacktrace) {
            entry.on('mouseenter', (e) => this.#showTooltip(e, msg.stacktrace));
            entry.on('mouseleave', () => this.#hideTooltip());
            entry.on('mousemove', (e) => this.#updateTooltipPosition(e));
        }

        // Count badge
        if (msg.count > 1) {
            entry.add('span')
                .cls('absolute right-2.5 top-1.5 bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold')
                .text(`×${msg.count}`);
        }

        this.#renderMessageContent(entry, msg, idx);
    }

    #renderMessageContent(entry, msg, idx) {
        const lines = msg.text.split('\n');
        const headerLine = lines[0];
        const messageLine = lines.slice(1).join('\n');

        // Parse header
        const headerMatch = headerLine.match(/^(\w+)\s+(#\d+)\s+\[(.*?)\](?:\s+<(.*?)>)?/);
        if (headerMatch) {
            const [, level, index, time, caller] = headerMatch;

            const header = entry.add('div').cls('flex items-center gap-2 flex-wrap');
            header.add('span').cls('font-bold uppercase').text(level);

            if (index) header.add('span').cls('text-gray-400 text-[11px]').text(index);
            if (time) header.add('span').cls('text-gray-400 text-[11px]').text(`[${time}]`);
            if (caller && caller !== 'unknown') {
                header.add('span').cls('text-gray-500 text-[11px] italic').text(`<${caller}>`);
            }

            if (msg.stacktrace) {
                header.add('span')
                    .cls('text-gray-400 text-[10px] ml-1')
                    .attr('title', 'Hover to see stacktrace')
                    .html('<i class="fas fa-layer-group"></i>');
            }
        }

        // Message content
        if (messageLine) {
            const msgDiv = entry.add('div').cls('mt-1 whitespace-pre-wrap break-words');

            if (this.#isJSON(messageLine)) {
                this.#renderJSON(msgDiv, messageLine);
            } else {
                msgDiv.text(messageLine);
            }
        }
    }

    #isJSON(str) {
        const trimmed = str.trim();
        return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'));
    }

    #renderJSON(container, jsonStr) {
        try {
            const obj = JSON.parse(jsonStr);
            const formatted = JSON.stringify(obj, null, 2);

            const highlighted = formatted
                .replace(/"([^"]+)":/g, '<span class="text-pink-400">"$1"</span>:')
                .replace(/:\s*"([^"]*)"/g, ': <span class="text-green-400">"$1"</span>')
                .replace(/:\s*(\d+)/g, ': <span class="text-yellow-400">$1</span>')
                .replace(/:\s*(true|false)/g, ': <span class="text-blue-400">$1</span>')
                .replace(/:\s*null/g, ': <span class="text-gray-500">null</span>');

            container.html(highlighted);
        } catch (e) {
            container.text(jsonStr);
        }
    }

    #showTooltip(event, stacktrace) {
        clearTimeout(this.#tooltipTimeout);

        this.#dom.tooltip.text(stacktrace);
        this.#dom.tooltip.style({ visibility: 'visible', opacity: '0' });

        this.#updateTooltipPosition(event);

        requestAnimationFrame(() => {
            this.#dom.tooltip.cls('+visible');
        });
    }

    #updateTooltipPosition(event) {
        const tooltip = this.#dom.tooltip;
        const rect = tooltip.ref.getBoundingClientRect();

        let left = event.clientX + 15;
        let top = event.clientY - rect.height - 10;

        if (left + rect.width > window.innerWidth - 10) {
            left = event.clientX - rect.width - 15;
        }

        if (top < 10) {
            top = event.clientY + 15;
        }

        tooltip.style({
            left: `${left}px`,
            top: `${top}px`
        });
    }

    #hideTooltip() {
        this.#tooltipTimeout = setTimeout(() => {
            this.#dom.tooltip.cls('-visible');
            setTimeout(() => {
                this.#dom.tooltip.style({ visibility: 'hidden' });
            }, 200);
        }, 100);
    }

    toggleConsole() {
        if (this.#state.isAnimating) return;

        this.#state.isAnimating = true;
        this.#state.isVisible = !this.#state.isVisible;

        setTimeout(() => {
            this.#state.isAnimating = false;
        }, this.#config.defaults.animationDuration + 50);

        if (this.#state.isVisible) {
            this.#dom.root.cls('-hidden');

            requestAnimationFrame(() => {
                this.#dom.root.cls('-translate-y-full');
                this.#dom.filler.style({
                    height: this.#state.lastHeight || this.#config.defaults.height
                });

                if (this.#state.isMinimized) {
                    this.#dom.output.cls('-hidden');
                }
                this.updateDisplayedMessages();
            });

            window.dispatchEvent(new CustomEvent('jex:console:show'));
        } else {
            this.#dom.root.cls('+translate-y-full');
            this.#dom.filler.style({ height: '0px' });

            window.dispatchEvent(new CustomEvent('jex:console:hide'));
        }
    }

    clearConsole() {
        this.#state.messages = [];
        this.#state.lastMessage = null;
        this.#messageIndex = 0;
        this.#dom.output.clear();
        this.#showWelcome();
    }

    #showWelcome() {
        console.info('Jex Logger v' + LOGGER_VERSION + ' | Press F2 to toggle console');
    }

    destroy() {
        // Restore original console methods
        Object.entries(this.#state.originals).forEach(([method, orig]) => {
            console[method] = orig;
        });

        // Remove DOM elements
        this.#dom.root?.remove();
        this.#dom.filler?.remove();
        this.#dom.tooltip?.remove();

        // Remove styles
        jex.remove('jexLoggerStyles');

        // Clear state
        this.#state.messages = [];
        this.#messageIndex = 0;
    }

    // Convenience logging methods
    info(...args) { console.info(...args); }
    debug(...args) { (console.debug || console.log).apply(console, args); }
    warn(...args) { console.warn(...args); }
    error(...args) { console.error(...args); }
    trace(...args) { console.trace(...args); }
}

// Create and export the logger instance
export const logger = new JexLogger();