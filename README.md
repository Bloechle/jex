# Jex.js

![Version](https://img.shields.io/badge/version-2025.07.02-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Size](https://img.shields.io/badge/size-~15kb-orange.svg)
![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)

> Modern DOM manipulation library with jQuery-like syntax and zero dependencies

Jex.js provides an intuitive API for element selection, manipulation, and event handling while maintaining a small footprint and excellent performance.

## Installation

### CDN (Recommended)
```html
<script type="module">
  import { jex } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/Jex.js';
  
  // Select and manipulate elements
  jex.$('myButton').cls('+active').text('Click me!');
</script>
```

### Download
Download `Jex.js` from the repository and include it in your project:
```html
<script type="module" src="./Jex.js">
  import { jex } from './Jex.js';
  // Your code here
</script>
```

## Quick Start

```javascript
import { jex } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/Jex.js';

// Select and manipulate elements
jex.$('myButton').cls('+active').text('Click me!');

// Create new elements
const div = jex.create('div').cls('container').html('<p>Hello!</p>');

// Event handling with automatic cleanup
const cleanup = jex.onDocument('click', (e) => console.log('Clicked!'));

// Method chaining
jex.$('myContainer')
  .find('.item')
  .cls('+highlight')
  .on('click', handler);
```

## Key Features

- **Lightweight** - ~15KB minified, zero dependencies
- **Familiar Syntax** - jQuery-like API for easy adoption
- **Method Chaining** - Fluent interface for cleaner code
- **Event Delegation** - Built-in delegation with automatic cleanup
- **Universal** - Works with HTML and SVG elements
- **Modern** - ES6+ class-based architecture
- **TypeScript Ready** - Full JSDoc annotations

## API Reference

### Element Selection

```javascript
// Select by ID
jex.$('elementId')                    // Returns Jex instance or null
jex.$('?elementId')                   // Returns boolean (exists check)

// Select by CSS selector
jex.select('.className')              // First matching element
jex.find('.items')                    // All matching children (JexCollection)

// DOM traversal
element.parent()                      // Get parent element
element.children()                    // Get all children
element.siblings()                    // Get siblings
element.next()                        // Next sibling
element.prev()                        // Previous sibling
element.closest('.selector')          // Closest ancestor
```

### Element Creation

```javascript
// Create new elements
const div = jex.create('div', 'myId');           // <div id="myId">
const svg = jex.create('circle', null, true);    // SVG element

// Create and append in one step
const button = container.add('button', 'btnId'); // Creates and appends
```

### DOM Manipulation

```javascript
// Content manipulation
element.html('<p>Hello</p>')          // Set/get innerHTML
element.text('Hello World')           // Set/get textContent
element.value('input value')          // Set/get input value
element.clear()                       // Remove all children

// Element insertion
element.append(child1, child2, '<p>HTML</p>')   // Add to end
element.prepend(child1, child2)                 // Add to beginning
element.mount(parentElement)                    // Mount to parent
element.mountToBody()                           // Mount to document.body
```

### Class Manipulation

```javascript
// Special syntax with prefixes
element.cls('+active')                // Add class
element.cls('-hidden')                // Remove class
element.cls('~selected')              // Toggle class
element.cls('?disabled')              // Check if has class (returns boolean)

// Multiple classes
element.cls('+active +visible -hidden')
element.cls('class1', 'class2', '+class3')

// Utility methods
element.clearCls('newClass1', 'newClass2')      // Clear all, add new
element.timeCls('flash', 1000)                  // Add class temporarily
```

### Attributes & Properties

```javascript
// Attributes
element.attr('data-id', '123')        // Set attribute
element.attr('data-id')               // Get attribute
element.attr({id: 'test', class: 'btn'})  // Set multiple

// Properties
element.props('disabled', true)       // Set property
element.props('disabled')             // Get property

// Data attributes
element.data('userId', '123')         // Set data-user-id="123"
element.data('userId')                // Get data-user-id value
```

### Styling

```javascript
// CSS styles
element.style('color', 'red')         // Set single style
element.style({                       // Set multiple styles
  color: 'red',
  backgroundColor: 'blue',
  fontSize: '16px'
})

// Dimensions
element.dim('width', 300)             // Set width to 300px
element.dim('width', '50%')           // Set width to 50%
element.dim('height')                 // Get height

// Visibility
element.show()                        // Make visible
element.hide()                        // Hide element
element.isVisible()                   // Check if visible
```

### Event Handling

```javascript
// Basic events
element.on('click', handler)          // Add event listener
element.on('click', handler, {passive: true})  // With options
element.off('click', handler)         // Remove specific handler
element.off('click')                  // Remove all click handlers

// Convenient click handler
element.onClick(handler, {preventDefault: true})

// Event delegation
container.delegate('click', '.button', handler)

// Global events
const cleanup = jex.onDocument('click', handler)
const cleanup2 = jex.onWindow('resize', handler)
const cleanup3 = jex.onKey('Ctrl+K', handler)  // Keyboard shortcuts

// Cleanup all listeners
cleanup()
cleanup2() 
cleanup3()
```

## Examples

### Basic Usage

```javascript
import { jex } from './Jex.js';

// Create a dynamic button
const button = jex.create('button', 'myBtn')
  .text('Click me!')
  .cls('+btn +btn-primary')
  .onClick(() => alert('Hello!'))
  .mountToBody();

// Update existing elements
jex.$('existingDiv')
  .html('<p>Updated content</p>')
  .cls('+updated')
  .style({backgroundColor: '#f0f0f0'});
```

### Form Handling

```javascript
// Create a complete form
const form = jex.create('form')
  .cls('+space-y-4')
  .append(
    jex.create('input')
      .attr({type: 'text', placeholder: 'Name', required: true})
      .cls('+form-input'),
    
    jex.create('button')
      .attr('type', 'submit')
      .text('Submit')
      .cls('+btn +btn-primary')
  )
  .on('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    console.log('Form data:', Object.fromEntries(formData));
  })
  .mountToBody();
```

### Event Delegation

```javascript
// Handle clicks on dynamic content
jex.$('container').delegate('click', '.item', function(e) {
  const item = jex.wrap ? jex.wrap(this) : new jex.constructor(this);
  item.cls('~selected');
  
  if (item.cls('?deletable')) {
    item.remove();
  }
});
```

### Modal Dialog

```javascript
function createModal(title, content) {
  const modal = jex.create('div')
    .cls('+fixed +inset-0 +bg-black +bg-opacity-50 +flex +items-center +justify-center')
    .append(
      jex.create('div')
        .cls('+bg-white +p-6 +rounded-lg +max-w-md +w-full')
        .append(
          jex.create('h2').text(title).cls('+text-xl +font-bold +mb-4'),
          jex.create('p').text(content).cls('+mb-4'),
          jex.create('button')
            .text('Close')
            .cls('+btn +btn-primary')
            .onClick(() => modal.remove())
        )
    )
    .onClick((e) => {
      if (e.target === modal.ref) modal.remove();
    })
    .mountToBody();
  
  return modal;
}

// Usage
createModal('Welcome', 'Welcome to Jex.js!');
```

## Collections

Jex.js automatically returns `JexCollection` for multi-element operations:

```javascript
// Find all buttons and add click handlers
jex.find('.button').on('click', (e) => {
  console.log('Button clicked:', e.target);
});

// Chain operations on collections
jex.find('.item')
  .cls('+processed')
  .style({opacity: '0.8'})
  .on('mouseenter', handler);

// Access individual elements
const buttons = jex.find('.button');
buttons.first().cls('+first');
buttons.last().cls('+last');
```

## Browser Support

- **Chrome/Edge**: 80+
- **Firefox**: 75+  
- **Safari**: 13+
- **Mobile**: iOS 13+, Android 8+

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Repository:** https://github.com/Bloechle/jex
