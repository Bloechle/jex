/**
 * Jex.js - Lightweight DOM Manipulation Library
 *
 * A modern, jQuery-like library for DOM manipulation with zero dependencies.
 * Provides an intuitive API for element selection, manipulation, and event handling.
 *
 * FEATURES:
 * ---------
 * - Lightweight and fast with no external dependencies
 * - jQuery-like syntax for familiar development experience
 * - Supports method chaining for cleaner code
 * - Built-in event delegation and cleanup
 * - Works with both HTML and SVG elements
 * - Modern ES6+ class-based architecture
 * - TypeScript-friendly with JSDoc annotations
 *
 * BASIC USAGE:
 * -----------
 * import { jex, Jex } from './Jex.js';
 *
 * // Select and manipulate elements
 * jex.$('myButton').cls('+active').text('Click me!');
 *
 * // Create new elements
 * const div = jex.create('div').cls('container').html('<p>Hello!</p>');
 *
 * // Event handling with automatic cleanup
 * const cleanup = jex.onDocument('click', (e) => console.log('Clicked!'));
 *
 * // Select element by CSS selector
 * jex.select('.header').cls('+highlight');
 *
 * // Find multiple elements within a container
 * const container = jex.$('myContainer');
 * container.find('.item').cls('+highlight').on('click', handler);
 *
 * PUBLIC API:
 * ----------
 * Classes:
 *   - Jex: Main DOM wrapper class for single elements
 *   - JexCollection: Array-like class for handling multiple elements
 *
 * Global Instance:
 *   - jex: Pre-initialized Jex instance for immediate use
 *
 * Version:
 *   - JEX_VERSION: Current library version string
 *
 * @author TOPLabs
 * @license MIT
 * @version 2025.07.02
 */

// Version constant
export const JEX_VERSION = '2025.07.02';

/////////////////////////
// Core DOM API Classes
/////////////////////////

/**
 * Collection class for batch DOM operations
 * @extends Array
 */
export class JexCollection extends Array {
    /**
     * Create a new JexCollection
     * @param {Jex[]} items - Array of Jex instances
     */
    constructor(items = []) {
        super(...items);
        const methods = [
            'on', 'off', 'cls', 'attr', 'props', 'style', 'html',
            'text', 'value', 'append', 'prepend', 'clear', 'dim',
            'clearCls', 'timeCls', 'fadeIn', 'fadeOut', 'show', 'hide'
        ];

        methods.forEach(method => {
            this[method] = (...args) => {
                this.forEach(item => {
                    if (item[method]) item[method](...args);
                });
                return this;
            };
        });
    }

    /**
     * Filter collection items
     * @param {Function} fn - Filter function
     * @returns {JexCollection} Filtered collection
     */
    filter(fn) {
        return new JexCollection(super.filter(fn));
    }

    /**
     * Get first element in collection
     * @returns {Jex|null} First Jex instance or null
     */
    first() {
        return this[0] || null;
    }

    /**
     * Get last element in collection
     * @returns {Jex|null} Last Jex instance or null
     */
    last() {
        return this[this.length - 1] || null;
    }
}

/**
 * Main DOM manipulation class
 */
export class Jex {
    #ref;
    #doc;
    #isSvg;
    #eventHandlers = new Map();

    /**
     * Create a new Jex instance
     * @param {string|HTMLElement|SVGElement|Jex} tag - Element tag name, DOM element, or Jex instance
     */
    constructor(tag = document.documentElement) {
        if (tag instanceof Jex) {
            this.#ref = tag.ref;
        } else if (typeof tag === 'object' && typeof tag.addEventListener === 'function') {
            this.#ref = tag;
        } else if (typeof tag === 'string') {
            this.#ref = document.createElement(tag);
        } else {
            this.#ref = document.documentElement;
        }
        this.#doc = this.#ref.ownerDocument;
        this.#isSvg = this.#ref instanceof SVGElement;
    }

    /**
     * Get the wrapped DOM element
     * @returns {HTMLElement|SVGElement} The wrapped element
     */
    get ref() {
        return this.#ref;
    }

    /**
     * Alias for ref
     * @returns {HTMLElement|SVGElement} The wrapped element
     */
    get element() {
        return this.#ref;
    }

    /**
     * Check if element exists in DOM
     * @returns {boolean} True if element has a parent node
     */
    exists() {
        return this.#ref && this.#ref.parentNode !== null;
    }

    /**
     * Check if element is visible
     * @returns {boolean} True if element is visible
     */
    isVisible() {
        if (!this.#ref) return false;
        const style = window.getComputedStyle(this.#ref);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    /**
     * Remove element from DOM and clean up event handlers
     * @param {string} [id] - Optional ID of element to remove
     * @returns {Jex} This instance for chaining
     */
    remove(id) {
        if (id) {
            // Remove element by ID
            const element = this.$(id);
            element?.remove();
            return this;
        }

        // Remove current element
        // Clean up event handlers
        this.#eventHandlers.forEach((handlers, event) => {
            handlers.forEach(handler => {
                this.#ref.removeEventListener(event, handler.fn, handler.options);
            });
        });
        this.#eventHandlers.clear();

        if (this.#ref && this.#ref.parentNode) {
            this.#ref.remove();
        }
        return this;
    }

    /**
     * Get parent element
     * @returns {Jex|null} Parent element wrapped in Jex or null
     */
    parent() {
        return this.#ref.parentElement ? new Jex(this.#ref.parentElement) : null;
    }

    /**
     * Find closest ancestor matching selector
     * @param {string} selector - CSS selector
     * @returns {Jex|null} Closest element wrapped in Jex or null
     */
    closest(selector) {
        const el = this.#ref.closest(selector);
        return el ? new Jex(el) : null;
    }

    /**
     * Trigger click on element
     * @returns {Jex} This instance for chaining
     */
    click() {
        if (this.#ref && typeof this.#ref.click === 'function') {
            this.#ref.click();
        }
        return this;
    }

    /**
     * Focus element
     * @returns {Jex} This instance for chaining
     */
    focus() {
        if (this.#ref && typeof this.#ref.focus === 'function') {
            this.#ref.focus();
        }
        return this;
    }

    /**
     * Blur element
     * @returns {Jex} This instance for chaining
     */
    blur() {
        if (this.#ref && typeof this.#ref.blur === 'function') {
            this.#ref.blur();
        }
        return this;
    }

    /**
     * Select element by ID
     * @param {string} id - Element ID (with or without #)
     * @returns {Jex|null|boolean} Element wrapped in Jex, null if not found, or boolean if id starts with '?'
     */
    $(id) {
        if (!id) {
            console.warn('Jex.$(): ID parameter is empty or undefined');
            return null;
        }

        const checkExists = id.startsWith('?');
        if (checkExists) {
            id = id.substring(1);
        }

        const el = this.#doc.getElementById(id.startsWith('#') ? id.substring(1) : id);

        if (checkExists) {
            return el !== null;
        }

        if (!el) {
            console.warn(`Jex.$(): Element with id "${id}" not found`);
        }

        return el ? new Jex(el) : null;
    }

    /**
     * Select first child element matching selector
     * @param {string} selector - CSS selector
     * @returns {Jex|null} First matching element wrapped in Jex or null
     */
    select(selector) {
        if (!selector || typeof selector !== 'string') {
            console.warn('Jex.select: Invalid selector provided');
            return null;
        }

        try {
            const el = this.#ref.querySelector(selector);
            if (!el) {
                console.warn(`Jex.select - Element not found: ${selector}`);
                return null;
            }
            return new Jex(el);
        } catch (e) {
            console.error(`Jex.select: Invalid selector syntax: ${selector}`);
            return null;
        }
    }

    /**
     * Find all child elements matching selector
     * @param {string} selector - CSS selector
     * @returns {JexCollection} Collection of matching elements
     */
    find(selector) {
        if (!selector || typeof selector !== 'string') {
            console.warn('Jex.find: Invalid selector provided');
            return new JexCollection();
        }

        try {
            return new JexCollection(
                Array.from(this.#ref.querySelectorAll(selector))
                    .map(el => new Jex(el))
            );
        } catch (e) {
            console.error(`Jex.find: Invalid selector syntax: ${selector}`);
            return new JexCollection();
        }
    }

    /**
     * Create new element
     * @param {string} tag - Element tag name
     * @param {string|null} id - Optional element ID
     * @param {boolean} svg - Whether to create SVG element
     * @returns {Jex} New element wrapped in Jex
     */
    create(tag, id = null, svg = false) {
        if (!tag || typeof tag !== 'string') {
            console.error('Jex.create: Tag name must be a non-empty string');
            return new Jex(document.createElement('div'));
        }

        try {
            const jx = new Jex(
                svg ? this.#doc.createElementNS('http://www.w3.org/2000/svg', tag)
                    : this.#doc.createElement(tag)
            );

            if (id !== null) {
                jx.attr('id', id);
            }

            return jx;
        } catch (e) {
            console.error(`Jex.create: Failed to create element "${tag}":`, e);
            return new Jex(document.createElement('div'));
        }
    }

    /**
     * Create and append new element
     * @param {string} tag - Element tag name
     * @param {string|null} id - Optional element ID
     * @param {boolean} svg - Whether to create SVG element
     * @returns {Jex} New element wrapped in Jex
     */
    add(tag, id = null, svg = false) {
        const jx = this.create(tag, id, svg);
        this.append(jx);
        return jx;
    }

    /**
     * Append elements to this element
     * @param {...(Jex|Node|string)} elements - Elements to append
     * @returns {Jex} This instance for chaining
     */
    append(...elements) {
        if (!this.#ref) {
            console.error('Jex.append: Cannot append to null reference');
            return this;
        }

        elements.forEach(el => {
            try {
                if (el instanceof Jex) {
                    this.#ref.appendChild(el.ref);
                } else if (el instanceof Node) {
                    this.#ref.appendChild(el);
                } else if (typeof el === 'string') {
                    this.#ref.insertAdjacentHTML('beforeend', el);
                } else {
                    console.warn('Jex.append: Skipping non-Node element:', el);
                }
            } catch (e) {
                console.error('Jex.append: Failed to append element:', e);
            }
        });
        return this;
    }

    /**
     * Prepend elements to this element
     * @param {...(Jex|Node|string)} elements - Elements to prepend
     * @returns {Jex} This instance for chaining
     */
    prepend(...elements) {
        if (!this.#ref) {
            console.error('Jex.prepend: Cannot prepend to null reference');
            return this;
        }

        elements.reverse().forEach(el => {
            try {
                if (el instanceof Jex) {
                    this.#ref.insertBefore(el.ref, this.#ref.firstChild);
                } else if (el instanceof Node) {
                    this.#ref.insertBefore(el, this.#ref.firstChild);
                } else if (typeof el === 'string') {
                    this.#ref.insertAdjacentHTML('afterbegin', el);
                }
            } catch (e) {
                console.error('Jex.prepend: Failed to prepend element:', e);
            }
        });
        return this;
    }

    /**
     * Mount element to parent
     * @param {Jex|HTMLElement|SVGElement} parent - Parent element
     * @returns {Jex} This instance for chaining
     */
    mount(parent) {
        if (!parent) {
            console.error('Jex.mount: Parent element is required');
            return this;
        }

        try {
            if (parent instanceof Jex) {
                parent.ref.appendChild(this.#ref);
            } else if (parent instanceof HTMLElement || parent instanceof SVGElement) {
                parent.appendChild(this.#ref);
            } else {
                console.error('Jex.mount: Parent must be a Jex instance or DOM element');
            }
        } catch (e) {
            console.error('Jex.mount: Failed to mount element:', e);
        }
        return this;
    }

    /**
     * Mount element to document body
     * @returns {Jex} This instance for chaining
     */
    mountToBody() {
        return this.mount(this.#doc.body);
    }

    /**
     * Mount element to document head
     * @returns {Jex} This instance for chaining
     */
    mountToHead() {
        return this.mount(this.#doc.head);
    }

    /**
     * Inject styles into the document head with a unique ID
     * @param {string} id - Unique ID for the style element
     * @param {string|Function} styles - CSS style rules or function returning CSS
     */
    injectStyles(id, styles) {
        if (!jex.$(`?${id}`)) {
            const css = typeof styles === 'function' ? styles() : styles;
            jex.create('style', id)
                .text(css)
                .mountToHead();
        }
    }

    /**
     * Get/set attributes
     * @param {string|Object} name - Attribute name or object of attributes
     * @param {string} [value] - Attribute value
     * @returns {Jex|string|null} This instance for chaining or attribute value
     */
    attr(name, value) {
        if (!this.#ref) return this;

        if (typeof name === 'object') {
            Object.entries(name).forEach(([k, v]) => this.attr(k, v));
            return this;
        }

        if (value === undefined) {
            return this.#ref.getAttribute(name);
        }

        if (value === null) {
            this.#ref.removeAttribute(name);
        } else {
            try {
                this.#ref.setAttribute(name, value);
            } catch (e) {
                console.error(`Jex.attr: Failed to set attribute "${name}":`, e);
            }
        }
        return this;
    }

    /**
     * Get/set properties
     * @param {string|Object} name - Property name or object of properties
     * @param {*} [value] - Property value
     * @returns {Jex|*} This instance for chaining or property value
     */
    props(name, value) {
        if (!this.#ref) return this;

        if (typeof name === 'object') {
            Object.entries(name).forEach(([k, v]) => this.props(k, v));
            return this;
        }

        if (value === undefined) {
            return this.#ref[name];
        }

        try {
            this.#ref[name] = value;
        } catch (e) {
            console.error(`Jex.props: Failed to set property "${name}":`, e);
        }
        return this;
    }

    /**
     * Get/set styles
     * @param {string|Object} name - Style property name or object of styles
     * @param {string} [value] - Style value
     * @returns {Jex|string} This instance for chaining or style value
     */
    style(name, value) {
        if (!this.#ref || !this.#ref.style) return this;

        if (typeof name === 'object') {
            Object.assign(this.#ref.style, name);
        } else if (value === undefined) {
            return this.#ref.style[name];
        } else {
            this.#ref.style[name] = value;
        }
        return this;
    }

    /**
     * Clear all classes and optionally add new ones
     * @param {...string} classes - Classes to add after clearing
     * @returns {Jex} This instance for chaining
     */
    clearCls(...classes) {
        if (this.#ref) {
            this.#ref.className = '';
        }
        return this.cls(...classes);
    }

    /**
     * Add class temporarily
     * @param {string} className - Class to add
     * @param {number} duration - Duration in milliseconds
     * @returns {Jex} This instance for chaining
     */
    timeCls(className, duration = 1000) {
        if (!className || !this.#ref) return this;

        this.cls(className);

        setTimeout(() => {
            if (this.#ref && this.#ref.parentNode) {
                this.cls(`-${className}`);
            }
        }, duration);

        return this;
    }

    /**
     * Manipulate classes with special syntax
     * @param {...string} classes - Classes with optional prefixes (+add, -remove, ~toggle, ?check)
     * @returns {Jex|boolean} This instance for chaining or boolean for ?check
     */
    cls(...classes) {
        if (!this.#ref || !this.#ref.classList) return this;

        if (!classes.length || classes[0] === undefined) {
            return this.#ref.classList;
        }

        const list = this.#ref.classList;
        const actions = {
            '-': name => name && list.remove(name),
            '~': name => name && list.toggle(name),
            '+': name => name && list.add(name),
            '?': name => name && list.contains(name)
        };

        const tokens = classes.join(' ').replace(/,/g, ' ').split(/\s+/).filter(Boolean);

        for (const cls of tokens) {
            const action = actions[cls[0]];
            if (action) {
                const result = action(cls.slice(1));
                // Return boolean for '?' queries
                if (cls[0] === '?') return result;
            } else {
                list.add(cls);
            }
        }

        return this;
    }

    /**
     * Get/set innerHTML
     * @param {string} [content] - HTML content
     * @returns {Jex|string} This instance for chaining or current HTML
     */
    html(content) {
        if (!this.#ref) return this;

        if (content === undefined) return this.#ref.innerHTML;

        try {
            this.#ref.innerHTML = content;
        } catch (e) {
            console.error('Jex.html: Failed to set innerHTML:', e);
        }
        return this;
    }

    /**
     * Get/set text content
     * @param {string} [content] - Text content
     * @returns {Jex|string} This instance for chaining or current text
     */
    text(content) {
        if (!this.#ref) return this;

        if (content === undefined) return this.#ref.textContent;
        this.#ref.textContent = content;
        return this;
    }

    /**
     * Get/set input value
     * @param {string} [val] - Value
     * @returns {Jex|string} This instance for chaining or current value
     */
    value(val) {
        if (!this.#ref) return this;

        if (val === undefined) return this.#ref.value;
        this.#ref.value = val;
        return this;
    }

    /**
     * Get/set data attributes
     * @param {string} key - Data attribute key (without data- prefix)
     * @param {string} [value] - Data value
     * @returns {Jex|string} This instance for chaining or data value
     */
    data(key, value) {
        if (!this.#ref) return this;

        if (value === undefined) {
            const attr = this.#ref.getAttribute(`data-${key}`);
            return attr === null ? "" : attr;
        } else {
            this.#ref.setAttribute(`data-${key}`, value);
            return this;
        }
    }

    /**
     * Clear element content
     * @returns {Jex} This instance for chaining
     */
    clear() {
        if (!this.#ref) return this;

        if (this.#isSvg) {
            while (this.#ref.firstChild) {
                this.#ref.removeChild(this.#ref.firstChild);
            }
        } else {
            this.#ref.innerHTML = '';
        }
        return this;
    }

    /**
     * Enable or disable element
     * @param {boolean} [enabled=true] - Whether to enable the element
     * @returns {Jex} This instance for chaining
     */
    enable(enabled = true) {
        return  this.props('disabled', !enabled);
    }

    /**
     * Disable element (convenience method)
     * @returns {Jex} This instance for chaining
     */
    disable() {
        return this.enable(false);
    }

    /**
     * Add event listener
     * @param {string} event - Event name (prefix with - to remove)
     * @param {Function} handler - Event handler
     * @param {boolean|Object} [options] - Event options
     * @returns {Jex} This instance for chaining
     */
    on(event, handler, options) {
        if (!this.#ref || !event || !handler) return this;

        try {
            if (event.startsWith('-')) {
                // Remove event listener
                this.off(event.slice(1), handler);
            } else {
                // Store handler reference for later removal
                if (!this.#eventHandlers.has(event)) {
                    this.#eventHandlers.set(event, []);
                }
                this.#eventHandlers.get(event).push({fn: handler, options});

                this.#ref.addEventListener(event, handler, options);
            }
        } catch (e) {
            console.error(`Jex.on: Failed to ${event.startsWith('-') ? 'remove' : 'add'} event listener:`, e);
        }
        return this;
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} [handler] - Event handler (removes all if not provided)
     * @returns {Jex} This instance for chaining
     */
    off(event, handler) {
        if (!this.#ref || !event) return this;

        const handlers = this.#eventHandlers.get(event);
        if (handlers) {
            if (handler) {
                // Remove specific handler
                const index = handlers.findIndex(h => h.fn === handler);
                if (index !== -1) {
                    const h = handlers[index];
                    this.#ref.removeEventListener(event, h.fn, h.options);
                    handlers.splice(index, 1);
                }
            } else {
                // Remove all handlers for this event
                handlers.forEach(h => {
                    this.#ref.removeEventListener(event, h.fn, h.options);
                });
                this.#eventHandlers.delete(event);
            }
        }
        return this;
    }

    /**
     * Add click event listener
     * @param {Function} handler - Click handler
     * @param {Object} [options={}] - Event options
     * @param {boolean} [options.preventDefault=false] - Whether to prevent default
     * @returns {Jex} This instance for chaining
     */
    onClick(handler, options = {}) {
        if (!handler || typeof handler !== 'function') {
            console.error('Jex.onClick: Handler must be a function');
            return this;
        }

        const {preventDefault = false, ...eventOptions} = options;
        this.on('click', (event) => {
            if (preventDefault) {
                event.preventDefault();
            }
            handler(event);
        }, eventOptions);
        return this;
    }

    /**
     * Set up event delegation
     * @param {string} event - Event name
     * @param {string} selector - CSS selector for target elements
     * @param {Function} handler - Event handler
     * @param {boolean|Object} [options] - Event options
     * @returns {Jex} This instance for chaining
     */
    delegate(event, selector, handler, options) {
        this.on(event, (e) => {
            const target = e.target.closest(selector);
            if (target && this.#ref.contains(target)) {
                handler.call(target, e);
            }
        }, options);
        return this;
    }

    /**
     * Show element
     * @returns {Jex} This instance for chaining
     */
    show() {
        if (this.#ref) {
            this.#ref.style.display = '';
        }
        return this;
    }

    /**
     * Hide element
     * @returns {Jex} This instance for chaining
     */
    hide() {
        if (this.#ref) {
            this.#ref.style.display = 'none';
        }
        return this;
    }

    /**
     * Get/set element dimensions
     * @param {string} prop - Dimension property (width, height, etc.)
     * @param {string|number} [value] - Dimension value
     * @returns {Jex|number} This instance for chaining or dimension value
     */
    dim(prop, value) {
        if (!this.#ref) return this;

        if (value === undefined) {
            const rect = this.#ref.getBoundingClientRect();
            return rect[prop];
        }

        this.style(prop, typeof value === 'number' ? `${value}px` : value);
        return this;
    }

    /**
     * Check if element contains child
     * @param {Jex|HTMLElement|SVGElement} child - Child element
     * @returns {boolean} True if contains child
     */
    contains(child) {
        if (!this.#ref || !child) return false;
        const childEl = child instanceof Jex ? child.ref : child;
        return this.#ref.contains(childEl);
    }

    /**
     * Get element index among siblings
     * @returns {number} Element index or -1
     */
    index() {
        if (!this.#ref || !this.#ref.parentNode) return -1;
        return Array.from(this.#ref.parentNode.children).indexOf(this.#ref);
    }

    /**
     * Get sibling elements
     * @returns {JexCollection} Collection of siblings
     */
    siblings() {
        if (!this.#ref || !this.#ref.parentNode) return new JexCollection();

        const siblings = Array.from(this.#ref.parentNode.children)
            .filter(el => el !== this.#ref)
            .map(el => new Jex(el));

        return new JexCollection(siblings);
    }

    /**
     * Get next sibling element
     * @returns {Jex|null} Next sibling wrapped in Jex or null
     */
    next() {
        return this.#ref.nextElementSibling ? new Jex(this.#ref.nextElementSibling) : null;
    }

    /**
     * Get previous sibling element
     * @returns {Jex|null} Previous sibling wrapped in Jex or null
     */
    prev() {
        return this.#ref.previousElementSibling ? new Jex(this.#ref.previousElementSibling) : null;
    }

    /**
     * Add event listener(s) to the document
     * @param {string|Object} eventOrEvents - Event name or object with event:handler pairs
     * @param {Function|boolean|Object} handlerOrOptions - Handler function (if first param is string) or options (if first param is object)
     * @param {boolean|Object} [options={ passive: true }] - Event options (only if first param is string)
     * @returns {Function} Cleanup function to remove all added listeners
     */
    onDocument(eventOrEvents, handlerOrOptions, options = {passive: true}) {
        const doc = this.#doc || document;
        const listeners = [];

        // Handle multiple events case
        if (typeof eventOrEvents === 'object' && eventOrEvents !== null) {
            // eventOrEvents is { 'mouseover': handler1, 'mouseout': handler2, ... }
            // handlerOrOptions is the options for all events
            const eventOptions = handlerOrOptions !== undefined ? handlerOrOptions : {passive: true};

            Object.entries(eventOrEvents).forEach(([event, eventHandler]) => {
                doc.addEventListener(event, eventHandler, eventOptions);
                listeners.push({event, handler: eventHandler, options: eventOptions});
            });
        }
        // Handle single event case
        else if (typeof eventOrEvents === 'string' && typeof handlerOrOptions === 'function') {
            doc.addEventListener(eventOrEvents, handlerOrOptions, options);
            listeners.push({event: eventOrEvents, handler: handlerOrOptions, options});
        } else {
            console.error('Jex.onDocument: Invalid parameters');
            return () => {
            }; // Return no-op function
        }

        // Return cleanup function
        return () => {
            listeners.forEach(({event, handler, options}) => {
                doc.removeEventListener(event, handler, options);
            });
        };
    }

    /**
     * Add event listener(s) to the window
     * @param {string|Object} eventOrEvents - Event name or object with event:handler pairs
     * @param {Function|boolean|Object} handlerOrOptions - Handler function (if first param is string) or options (if first param is object)
     * @param {boolean|Object} [options={ passive: true }] - Event options (only if first param is string)
     * @returns {Function} Cleanup function to remove all added listeners
     */
    onWindow(eventOrEvents, handlerOrOptions, options = {passive: true}) {
        const win = this.#doc?.defaultView || window;
        const listeners = [];

        // Handle multiple events case
        if (typeof eventOrEvents === 'object' && eventOrEvents !== null) {
            const eventOptions = handlerOrOptions !== undefined ? handlerOrOptions : {passive: true};

            Object.entries(eventOrEvents).forEach(([event, eventHandler]) => {
                win.addEventListener(event, eventHandler, eventOptions);
                listeners.push({event, handler: eventHandler, options: eventOptions});
            });
        }
        // Handle single event case
        else if (typeof eventOrEvents === 'string' && typeof handlerOrOptions === 'function') {
            win.addEventListener(eventOrEvents, handlerOrOptions, options);
            listeners.push({event: eventOrEvents, handler: handlerOrOptions, options});
        } else {
            console.error('Jex.onWindow: Invalid parameters');
            return () => {
            }; // Return no-op function
        }

        // Return cleanup function
        return () => {
            listeners.forEach(({event, handler, options}) => {
                win.removeEventListener(event, handler, options);
            });
        };
    }

    /**
     * Add global keydown listener with key combo string (e.g., "Ctrl+K")
     * @param {string} combo - Key combination string (e.g., "Ctrl+Shift+X")
     * @param {Function} handler - Callback function
     * @param {Object} [options={}] - Event listener options
     * @returns {Function} Cleanup function to remove the listener
     */
    onKey(combo, handler, options = {passive: true}) {
        const keys = combo.toLowerCase().split('+').map(k => k.trim());

        const listener = (e) => {
            const pressed = [
                e.ctrlKey ? 'ctrl' : null,
                e.metaKey ? 'meta' : null,
                e.altKey ? 'alt' : null,
                e.shiftKey ? 'shift' : null,
                e.key.toLowerCase()
            ].filter(Boolean);

            if (keys.every(k => pressed.includes(k))) {
                handler(e);
            }
        };

        window.addEventListener('keydown', listener, options);

        return () => window.removeEventListener('keydown', listener, options);
    }
}

// Global jex instance
export const jex = new Jex();
