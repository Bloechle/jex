# Jex.js

<img src="https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/jex-logo.svg" alt="Jex.js Logo" width="200" />

> Lightweight DOM manipulation library with jQuery-like syntax and zero dependencies

## Features

- **Zero dependencies** - Pure JavaScript, no external requirements
- **Small footprint** - ~15KB minified, optimized for performance
- **jQuery-like syntax** - Familiar API for easy adoption
- **Method chaining** - Fluent interface for cleaner code
- **Modern ES6+** - Class-based architecture with full JSDoc support
- **Universal** - Works with HTML, SVG elements, and all modern browsers

## Quick Start

```javascript
import { jex } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/Jex.js';

// Element selection and manipulation
jex.$('myButton').cls('+active').text('Click me!');

// Create and mount elements
jex.create('div')
  .cls('+container +p-4')
  .html('<h1>Hello World!</h1>')
  .mountToBody();

// Event handling with cleanup
const cleanup = jex.onDocument('click', (e) => console.log('Clicked!'));
```

## Core API

### Selection & Creation
```javascript
jex.$('elementId')                // Select by ID → Jex | null
jex.$('?elementId')               // Check existence → boolean
jex.select('.class')              // First match → Jex | null
jex.find('.items')                // All matches → JexCollection
jex.create('div', 'myId')         // Create element → Jex
```

### Content & Attributes
```javascript
element.text('content')           // Set/get text
element.html('<p>content</p>')    // Set/get HTML
element.value('input value')      // Set/get form values
element.attr('id', 'value')       // Set/get attributes
element.data('key', 'value')      // Set/get data-* attributes
```

### Classes & Styling
```javascript
element.cls('+add -remove ~toggle')  // Class manipulation
element.cls('?exists')               // Check class → boolean
element.style({color: 'red'})        // Set styles
element.show() / element.hide()      // Visibility
```

### DOM Manipulation
```javascript
element.append(child1, child2)    // Add children
element.prepend(content)          // Add at start
element.mount(parent)             // Mount to parent
element.remove()                  // Remove from DOM
element.clear()                   // Clear children
```

### Events
```javascript
element.on('click', handler)         // Add listener
element.onClick(handler)             // Convenient click
element.delegate('click', '.btn', handler)  // Event delegation
jex.onDocument('keydown', handler)   // Global document events
jex.onKey('Ctrl+K', handler)         // Keyboard shortcuts
```

### Navigation
```javascript
element.parent()                  // Get parent → Jex
element.siblings()                // Get siblings → JexCollection  
element.next() / element.prev()   // Adjacent siblings → Jex
element.closest('.selector')      // Find ancestor → Jex
```

## Collections

Multi-element operations return `JexCollection` with batch methods:

```javascript
jex.find('.buttons')
  .cls('+styled')
  .on('click', handler)
  .style({opacity: '0.8'});

// Access individual elements
const items = jex.find('.item');
items.first().cls('+first');
items.last().cls('+last');
```

## Complete Example

```javascript
import { jex } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/Jex.js';

// Create a modal dialog
function createModal(title, message) {
  return jex.create('div')
    .cls('+fixed +inset-0 +bg-black +bg-opacity-50 +flex +items-center +justify-center +z-50')
    .append(
      jex.create('div')
        .cls('+bg-white +p-6 +rounded-lg +max-w-md +w-full +mx-4')
        .append(
          jex.create('h2').text(title).cls('+text-xl +font-bold +mb-4'),
          jex.create('p').text(message).cls('+text-gray-600 +mb-6'),
          jex.create('button')
            .text('Close')
            .cls('+px-4 +py-2 +bg-blue-500 +text-white +rounded +hover:bg-blue-600')
            .onClick(() => modal.remove())
        )
    )
    .onClick((e) => e.target === modal.ref && modal.remove())
    .mountToBody();
}

// Usage
const modal = createModal('Success', 'Operation completed successfully!');
```

## Installation

### CDN (Recommended)
```html
<script type="module">
  import { jex } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/Jex.js';
  // Your code here
</script>
```

### Download
```bash
# Download individual files
wget https://raw.githubusercontent.com/Bloechle/jex/main/Jex.js

# Or clone the repository
git clone https://github.com/Bloechle/jex.git
```

### Import
```javascript
// ES6 modules
import { jex, Jex, JexCollection } from './Jex.js';

// Or from CDN
import { jex } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/Jex.js';
```

## Ecosystem

The Jex framework includes additional components:

- **JexLogger.js** - Advanced console and logging system
- **JexInspector.js** - Visual DOM element inspector
- **JexToast.js** - Toast notification system

```javascript
// Use the complete ecosystem
import { jex } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/Jex.js';
import { logger } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/JexLogger.js';
import { toast } from 'https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/JexToast.js';

logger.info('Application started');
toast.success('Welcome to Jex.js!');
```

## Browser Support

- **Chrome/Edge**: 80+
- **Firefox**: 75+
- **Safari**: 13+
- **Mobile**: iOS 13+, Android 8+

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- **Repository**: https://github.com/Bloechle/jex
- **Issues**: https://github.com/Bloechle/jex/issues
- **CDN**: https://cdn.jsdelivr.net/gh/Bloechle/jex@latest/