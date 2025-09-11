/**
 * JexLogger.js - Debug console and logging system for Jex Framework
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
 *
 * Public Methods:
 *   - toggleConsole(): void - Toggle console visibility
 *   - updateDisplayedMessages(): void - Update displayed messages based on filter
 *   - clearConsole(): void - Clear all console messages
 *   - destroy(): void - Clean up and restore original console methods
 *   - info/debug/warn/error/trace(...args): void - Logging methods
 *   - showWelcomeMessage(): void - Show welcome message
 *
 * Public Constants:
 *   - LOGGER_VERSION: Current version of JexLogger
 *
 * Dependencies:
 *   - Jex: For DOM manipulation
 *
 * Relations:
 *   - Part of: Jex Framework
 *   - Used by: All Jex components and application code
 *   - Uses: jex from Jex.js
 *
 * Last Modified: 2025-09-11 - Renamed from TopLogger to JexLogger
 */

// Use CDN imports for Jex framework
import { jex } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/Jex.js';

// Version constant
export const LOGGER_VERSION = '2025.09.11';

export class JexLogger {
    #config = {
        levels: {
            trace: {
                textColor: 'text-purple-400',
                bgColor: 'bg-purple-500/10',
                borderColor: 'border-l-purple-500',
                hoverBg: 'hover:bg-purple-500/20',
                indicatorBg: 'bg-purple-500'
            },
            debug: {
                textColor: 'text-blue-300',
                bgColor: 'bg-blue-400/10',
                borderColor: 'border-l-blue-400',
                hoverBg: 'hover:bg-blue-400/20',
                indicatorBg: 'bg-blue-400'
            },
            info: {
                textColor: 'text-green-500',
                bgColor: 'bg-green-600/10',
                borderColor: 'border-l-green-600',
                hoverBg: 'hover:bg-green-600/20',
                indicatorBg: 'bg-green-600'
            },
            warn: {
                textColor: 'text-yellow-400',
                bgColor: 'bg-yellow-500/10',
                borderColor: 'border-l-yellow-500',
                hoverBg: 'hover:bg-yellow-500/20',
                indicatorBg: 'bg-yellow-500'
            },
            error: {
                textColor: 'text-red-400',
                bgColor: 'bg-red-500/10',
                borderColor: 'border-l-red-500',
                hoverBg: 'hover:bg-red-500/20',
                indicatorBg: 'bg-red-500'
            }
        },
        defaults: {
            maxLogs: 1000,
            height: '30vh',
            minHeight: 100,
            maxHeight: window.innerHeight * 0.8,
            animationDuration: 300,
            showTimestamp: true,
            showCaller: true,
            showIndex: true,
            groupSimilar: true,
            showStacktraceOnHover: true
        }
    };

    #state = {
        messages: [], // { id, level, args, timestamp, caller, stacktrace, count }
        messageCount: 0,
        lastMessage: null,
        currentFilter: 'all',
        isConsoleVisible: false,
        isAnimating: false,
        originals: {} // Store original console methods
    };

    #dom = {
        root: null,
        header: null,
        output: null,
        resizeHandle: null,
        toggleButton: null,
        clearButton: null,
        filterButtons: null,
        stacktraceTooltip: null,
        bottomFiller: null
    };

    #messageIndex = 0;

    // Public properties
    logLevels = { trace: 0, debug: 1, info: 2, warn: 3, error: 4 };
    currentLogLevel = 'trace';

    constructor(options = {}) {
        this.#config.defaults = { ...this.#config.defaults, ...options };
        this.#initializeLogger();
    }

    #initializeLogger() {
        this.#interceptConsole();
        this.#initUI();
        this.#setupKeyboardShortcuts();
        this.#createBottomFiller();
        this.showWelcomeMessage();
    }

    #interceptConsole() {
        ['info', 'debug', 'warn', 'error', 'trace'].forEach(level => {
            this.#state.originals[level] = console[level];
            console[level] = (...args) => {
                this.#state.originals[level].apply(console, args);
                this.#addLogMessage(level, args);
            };
        });

        // Handle console.log as info
        this.#state.originals.log = console.log;
        console.log = (...args) => {
            this.#state.originals.log.apply(console, args);
            this.#addLogMessage('info', args);
        };
    }

    #setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                this.toggleConsole();
            }
        });
    }

    #createBottomFiller() {
        this.#dom.bottomFiller = jex.create('div')
            .cls('h-0 transition-all duration-300')
            .mountToBody();
    }

    #addLogMessage(level, args) {
        const timestamp = new Date().toLocaleTimeString();
        const stacktrace = this.#captureStackTrace();
        const caller = this.#extractCaller(stacktrace);

        const messageData = this.#formatMessage(level, args, timestamp, caller, stacktrace);

        // Check for grouping
        if (this.#config.defaults.groupSimilar && this.#state.lastMessage &&
            this.#state.lastMessage.formatted === messageData.formatted) {
            this.#state.lastMessage.count++;
            this.#updateLastMessage();
            return;
        }

        const message = {
            id: ++this.#messageIndex,
            level,
            args,
            timestamp,
            caller,
            stacktrace,
            formatted: messageData.formatted,
            index: messageData.index,
            count: 1
        };

        this.#state.messages.push(message);
        this.#state.lastMessage = message;
        this.#state.messageCount++;

        // Limit messages
        if (this.#state.messages.length > this.#config.defaults.maxLogs) {
            this.#state.messages.shift();
        }

        this.#renderMessage(message);
        this.#scrollToBottom();
    }

    #captureStackTrace() {
        const error = new Error();
        return error.stack || '';
    }

    #extractCaller(stacktrace) {
        if (!stacktrace) return '';

        const lines = stacktrace.split('\n');
        // Skip Error, this method, #addLogMessage, and console method
        const callerLine = lines[4] || lines[3] || '';

        const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
            const [, method, file, line] = match;
            const fileName = file.split('/').pop();
            return `${method} (${fileName}:${line})`;
        }

        const altMatch = callerLine.match(/at\s+(.+?):(\d+):(\d+)/);
        if (altMatch) {
            const [, file, line] = altMatch;
            const fileName = file.split('/').pop();
            return `${fileName}:${line}`;
        }

        return '';
    }

    #formatMessage(level, args, timestamp, caller, stacktrace) {
        const parts = [];

        if (this.#config.defaults.showIndex) {
            parts.push(`[${this.#messageIndex}]`);
        }

        if (this.#config.defaults.showTimestamp) {
            parts.push(`[${timestamp}]`);
        }

        parts.push(`[${level.toUpperCase()}]`);

        if (this.#config.defaults.showCaller && caller) {
            parts.push(`[${caller}]`);
        }

        const prefix = parts.join(' ');
        const content = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        return {
            formatted: `${prefix} ${content}`,
            index: this.#messageIndex,
            caller
        };
    }

    #renderMessage(message) {
        if (!this.#shouldShowMessage(message)) return;

        const config = this.#config.levels[message.level];
        const messageEl = jex.create('div')
            .cls(`message-item border-l-4 p-3 mb-2 font-mono text-sm cursor-pointer transition-colors ${config.bgColor} ${config.borderColor} ${config.hoverBg}`)
            .attr('data-level', message.level)
            .attr('data-id', message.id);

        // Content container
        const contentEl = jex.create('div').cls(`${config.textColor}`);

        // Add count badge if grouped
        if (message.count > 1) {
            const countBadge = jex.create('span')
                .cls(`inline-block px-2 py-1 text-xs rounded-full mr-2 ${config.indicatorBg} text-white`)
                .text(message.count);
            contentEl.append(countBadge);
        }

        // Message text
        const textEl = jex.create('pre').cls('whitespace-pre-wrap break-words').text(message.formatted);
        contentEl.append(textEl);

        messageEl.append(contentEl);

        // Add hover tooltip for stacktrace
        if (this.#config.defaults.showStacktraceOnHover && message.stacktrace) {
            this.#setupStacktraceTooltip(messageEl, message);
        }

        this.#dom.output.append(messageEl);
    }

    #setupStacktraceTooltip(messageEl, message) {
        messageEl.on('mouseenter', (e) => {
            this.#showStacktraceTooltip(e, message.stacktrace);
        });

        messageEl.on('mouseleave', () => {
            this.#hideStacktraceTooltip();
        });
    }

    #showStacktraceTooltip(e, stacktrace) {
        if (!this.#dom.stacktraceTooltip) {
            this.#dom.stacktraceTooltip = jex.create('div')
                .cls('jex-logger-stacktrace')
                .mountToBody();
        }

        const formattedStack = this.#formatStackTrace(stacktrace);
        this.#dom.stacktraceTooltip.text(formattedStack);

        const rect = e.target.getBoundingClientRect();
        const tooltipRect = this.#dom.stacktraceTooltip.node.getBoundingClientRect();

        let left = rect.left + 10;
        let top = rect.bottom + 5;

        // Adjust if tooltip goes off screen
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top + tooltipRect.height > window.innerHeight) {
            top = rect.top - tooltipRect.height - 5;
        }

        this.#dom.stacktraceTooltip.style({
            left: `${left}px`,
            top: `${top}px`,
            display: 'block'
        });
    }

    #hideStacktraceTooltip() {
        if (this.#dom.stacktraceTooltip) {
            this.#dom.stacktraceTooltip.style({ display: 'none' });
        }
    }

    #formatStackTrace(stacktrace) {
        return stacktrace
            .split('\n')
            .slice(1) // Skip first line (Error)
            .map(line => {
                const trimmed = line.trim();
                if (!trimmed.startsWith('at ')) return trimmed;

                const match = trimmed.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
                if (match) {
                    const [, method, file, line, col] = match;
                    const fileName = file.split('/').pop();
                    return `  → ${method} (${fileName}:${line}:${col})`;
                }

                const altMatch = trimmed.match(/at\s+(.+?):(\d+):(\d+)/);
                if (altMatch) {
                    const [, file, line, col] = altMatch;
                    const fileName = file.split('/').pop();
                    return `  → ${fileName}:${line}:${col}`;
                }

                return `  ${trimmed}`;
            })
            .join('\n');
    }

    #updateLastMessage() {
        const lastMessageEl = this.#dom.output.node.querySelector(`[data-id="${this.#state.lastMessage.id}"]`);
        if (lastMessageEl) {
            lastMessageEl.remove();
            this.#renderMessage(this.#state.lastMessage);
        }
    }

    #shouldShowMessage(message) {
        if (this.#state.currentFilter === 'all') return true;
        return message.level === this.#state.currentFilter;
    }

    #scrollToBottom() {
        if (this.#dom.output) {
            this.#dom.output.node.scrollTop = this.#dom.output.node.scrollHeight;
        }
    }

    toggleConsole() {
        if (this.#state.isAnimating) return;

        this.#state.isAnimating = true;
        this.#state.isConsoleVisible = !this.#state.isConsoleVisible;

        if (this.#state.isConsoleVisible) {
            this.#dom.root.cls('-hidden');
            this.#dom.bottomFiller.style({ height: this.#config.defaults.height });
            setTimeout(() => {
                this.#dom.root.cls('-translate-y-full');
                this.#scrollToBottom();
            }, 10);
        } else {
            this.#dom.root.cls('+translate-y-full');
            this.#dom.bottomFiller.style({ height: '0' });
        }
    }

    updateDisplayedMessages() {
        this.#dom.output.clear();
        this.#state.messages.forEach(message => {
            this.#renderMessage(message);
        });
        this.#scrollToBottom();
    }

    clearConsole() {
        this.#state.messages = [];
        this.#state.messageCount = 0;
        this.#state.lastMessage = null;
        this.#messageIndex = 0;
        this.#dom.output.clear();
        this.showWelcomeMessage();
    }

    destroy() {
        // Restore original console methods
        Object.entries(this.#state.originals).forEach(([method, orig]) => {
            console[method] = orig;
        });

        // Remove DOM elements
        this.#dom.root?.remove();
        this.#dom.bottomFiller?.remove();
        this.#dom.stacktraceTooltip?.remove();

        jex.remove('jexLoggerStyles');

        // Clear state
        this.#state.messages = [];
        this.#state.messageCount = 0;
        this.#messageIndex = 0;
    }

    showWelcomeMessage() {
        console.info('Jex Framework Logger v' + LOGGER_VERSION + ' | Press F2 to toggle console');
    }

    #initUI() {
        this.#injectStyles();
        this.#createContainer();
        this.#createHeader();
        this.#createOutputArea();
        this.#setupResizeHandler();

        this.#dom.root
            .mountToBody()
            .on('transitionend', () => {
                if (!this.#state.isConsoleVisible) {
                    this.#dom.root.cls('+hidden');
                }
                this.#state.isAnimating = false;
            });
    }

    #injectStyles() {
        jex.injectStyles('jexLoggerStyles', () => `
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
            
            .jex-logger-stacktrace {
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
                max-height: 400px;
                overflow: auto;
                display: none;
                pointer-events: none;
            }
            
            .jex-logger-resize-handle:hover {
                background-color: rgba(59, 130, 246, 0.3) !important;
            }
        `);
    }

    #createContainer() {
        this.#dom.root = jex.create('div')
            .id('jexLoggerConsole')
            .cls('fixed bottom-0 left-0 right-0 z-[10000] bg-gray-900/95 border-t border-gray-700 backdrop-blur-sm transform translate-y-full transition-transform duration-300 hidden')
            .style({ height: this.#config.defaults.height });
    }

    #createHeader() {
        this.#dom.header = jex.create('div')
            .cls('flex items-center justify-between p-2 bg-gray-800/90 border-b border-gray-700')
            .appendTo(this.#dom.root);

        // Left side - Title and filters
        const leftSide = jex.create('div').cls('flex items-center space-x-2');

        jex.create('span')
            .cls('text-white font-semibold text-sm')
            .text('Jex Logger')
            .appendTo(leftSide);

        // Filter buttons
        const filterContainer = jex.create('div').cls('flex space-x-1');

        ['all', 'trace', 'debug', 'info', 'warn', 'error'].forEach(level => {
            const btn = jex.create('button')
                .cls(`px-2 py-1 text-xs rounded transition-colors ${level === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`)
                .text(level.toUpperCase())
                .on('click', () => this.#setFilter(level))
                .appendTo(filterContainer);
        });

        filterContainer.appendTo(leftSide);
        leftSide.appendTo(this.#dom.header);

        // Right side - Controls
        const rightSide = jex.create('div').cls('flex items-center space-x-2');

        this.#dom.clearButton = jex.create('button')
            .cls('px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors')
            .text('Clear')
            .on('click', () => this.clearConsole())
            .appendTo(rightSide);

        this.#dom.toggleButton = jex.create('button')
            .cls('px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors')
            .text('Hide')
            .on('click', () => this.toggleConsole())
            .appendTo(rightSide);

        rightSide.appendTo(this.#dom.header);

        // Resize handle
        this.#dom.resizeHandle = jex.create('div')
            .cls('jex-logger-resize-handle absolute top-0 left-0 right-0 h-1 bg-gray-600/50 cursor-ns-resize transition-colors')
            .appendTo(this.#dom.root);
    }

    #createOutputArea() {
        this.#dom.output = jex.create('div')
            .id('jexLoggerOutput')
            .cls('flex-1 overflow-y-auto p-2 text-gray-300')
            .style({ height: 'calc(100% - 40px)' })
            .appendTo(this.#dom.root);
    }

    #setupResizeHandler() {
        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        this.#dom.resizeHandle.on('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = this.#dom.root.node.offsetHeight;
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const deltaY = startY - e.clientY;
            const newHeight = Math.max(
                this.#config.defaults.minHeight,
                Math.min(this.#config.defaults.maxHeight, startHeight + deltaY)
            );

            this.#dom.root.style({ height: `${newHeight}px` });
            this.#dom.bottomFiller.style({ height: `${newHeight}px` });
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
            }
        });
    }

    #setFilter(level) {
        this.#state.currentFilter = level;

        // Update button styles
        this.#dom.header.findAll('button').forEach(btn => {
            const isActive = btn.text().toLowerCase() === level;
            btn.cls(isActive ?
                '-bg-gray-700 -text-gray-300 +bg-blue-600 +text-white' :
                '-bg-blue-600 -text-white +bg-gray-700 +text-gray-300 hover:bg-gray-600'
            );
        });

        this.updateDisplayedMessages();
    }

    // Convenience logging methods
    info(...args) {
        console.info(...args);
    }

    debug(...args) {
        (console.debug || console.log).apply(console, args);
    }

    warn(...args) {
        console.warn(...args);
    }

    error(...args) {
        console.error(...args);
    }

    trace(...args) {
        console.trace(...args);
    }
}

// Create and export the logger instance
export const logger = new JexLogger();