# ngx-image-magnifier

A highly performant, customizable Angular image magnifier directive with keyboard modifier support, smart positioning, mobile optimization, and smooth GPU-accelerated animations.

## Features

✨ **Performance-Optimized**

- GPU-accelerated positioning using `transform: translate()`
- Passive event listeners for better scroll performance
- Selective keyboard listener attachment (only when needed)
- CSS containment for isolated rendering
- RequestAnimationFrame batching for 60fps smooth movement

🎯 **Smart Positioning**

- Intelligent "auto" positioning that adapts to viewport constraints
- 9 manual positioning modes: `right`, `left`, `top`, `bottom`, `bottom-right`, `bottom-left`, `top-right`, `top-left`, `auto`
- Automatic avoidance of the source image
- Padding customization for screen edge spacing

📱 **Mobile Optimized**

- Separate configuration for mobile devices
- Mobile-specific size, ratio, and positioning options
- Touch-friendly interactions
- Responsive breakpoint detection (768px)

⌨️ **Keyboard Modifier Support**

- Optional requirement for `shift`, `ctrl`, or `alt` keys
- Smart hint tooltips with auto-generated text
- Seamless modifier state tracking
- Mobile devices ignore modifier requirements

🎨 **Customizable**

- Configurable magnifier size and aspect ratio
- Custom border radius (including fully rounded circles)
- Smooth transition animations
- Custom hint text or disable tooltips entirely

## Installation

```bash
npm install ngx-image-magnifier
```

## Quick Start

Import the directive and apply it to any image:

```typescript
import { Component } from '@angular/core';
import { ImageMagnifierDirective } from 'ngx-image-magnifier';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [ImageMagnifierDirective],
  template: ` <img appImageMagnifier src="photo.jpg" alt="Gallery image" /> `,
})
export class GalleryComponent {}
```

## Usage Examples

### Basic Magnification (Hover to Magnify)

```html
<img appImageMagnifier src="product.jpg" alt="Product" [magnifierSize]="300" />
```

### With Keyboard Modifier

Require holding `Ctrl` to magnify:

```html
<img
  appImageMagnifier
  src="detailed-map.jpg"
  alt="Map"
  [magnifierSize]="400"
  requireKeyModifier="ctrl"
/>
```

Mobile users can view the magnifier without holding the modifier.

### Custom Hint Text

```html
<img
  appImageMagnifier
  src="artwork.jpg"
  alt="Fine Art"
  [magnifierSize]="350"
  [hintText]="'Click to zoom in'"
/>
```

### Disabled Hint Tooltip

```html
<img
  appImageMagnifier
  src="thumbnail.jpg"
  alt="Thumbnail"
  [magnifierSize]="250"
  [showHint]="false"
/>
```

### Mobile-Specific Configuration

```html
<img
  appImageMagnifier
  src="responsive-image.jpg"
  alt="Responsive"
  [magnifierSize]="400"
  [magnifierSizeMobile]="250"
  [magnifierRatio]="'16/9'"
  [magnifierRatioMobile]="'1/1'"
  position="auto"
  [positionMobile]="'bottom'"
/>
```

### Rounded Magnifier

```html
<img appImageMagnifier src="profile.jpg" alt="Profile" [magnifierSize]="300" [rounded]="true" />
```

### Custom Positioning

```html
<img
  appImageMagnifier
  src="centered-image.jpg"
  alt="Centered"
  position="right"
  [animateTransition]="true"
  [padding]="30"
/>
```

## API Reference

### @Input Properties

| Property               | Type                                                                                                                       | Default  | Description                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `magnifierSize`        | `number`                                                                                                                   | `300`    | Width of magnifier window in pixels                                                    |
| `magnifierSizeMobile`  | `number \| null`                                                                                                           | `null`   | Mobile-specific magnifier size (60% of desktop if not set)                             |
| `magnifierRatio`       | `string \| null`                                                                                                           | `null`   | Aspect ratio as string, e.g., `'1/1'` or `'16/9'`. If null, uses image's natural ratio |
| `magnifierRatioMobile` | `string \| null`                                                                                                           | `null`   | Mobile-specific aspect ratio                                                           |
| `position`             | `'auto' \| 'right' \| 'left' \| 'top' \| 'bottom' \| 'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'`         | `'auto'` | Positioning strategy for magnifier placement                                           |
| `positionMobile`       | `'auto' \| 'right' \| 'left' \| 'top' \| 'bottom' \| 'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left' \| null` | `null`   | Mobile-specific positioning (uses desktop position if null)                            |
| `animateTransition`    | `boolean`                                                                                                                  | `true`   | Enable smooth 320ms transitions when moving magnifier                                  |
| `rounded`              | `boolean`                                                                                                                  | `false`  | Apply circular border-radius (50%) to magnifier                                        |
| `padding`              | `number \| null`                                                                                                           | `null`   | Padding from screen edges. Auto-calculated (5% of size + 20px min) if null             |
| `requireKeyModifier`   | `'shift' \| 'ctrl' \| 'alt' \| null`                                                                                       | `null`   | Require holding modifier key to display magnifier. Ignored on mobile                   |
| `showHint`             | `boolean`                                                                                                                  | `true`   | Show tooltip hint on first hover (only when modifier required)                         |
| `hintText`             | `string \| null`                                                                                                           | `null`   | Custom hint text. Auto-generated based on modifier if null                             |

## Positioning Strategies

### Auto (Default)

Intelligently places the magnifier to fit the viewport while avoiding the source image. Adapts based on available space.

### Right / Left

Places magnifier to the right or left of cursor, vertically centered.

### Top / Bottom

Places magnifier above or below cursor, horizontally centered.

### Bottom-Right / Bottom-Left

Places magnifier diagonally (right/left with slight downward offset).

### Top-Right / Top-Left

Places magnifier diagonally (right/left with slight upward offset).

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome/Firefox on Android

**SSR Compatible**: The directive uses `isPlatformBrowser` checks for universal rendering support.

## Performance

The directive is optimized for 60fps smooth interactions:

- **GPU Acceleration**: Uses `transform: translate()` instead of layout-affecting properties
- **Passive Listeners**: Mouse events don't block scrolling
- **Event Batching**: Position updates batched with `requestAnimationFrame`
- **Lazy Listeners**: Keyboard listeners only attached when `requireKeyModifier` is set
- **CSS Containment**: Rendering isolated from page layout

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Changelog

### 2.0.1 (January 28, 2026)

**Changed**

- Magnifier now uses zoom scaling when no ratio is set.

### 2.0.0 (January 27, 2026)

**Changed**

- Renamed positioning options:
  - `right-below` → `bottom-right`
  - `left-below` → `bottom-left`
  - `right-above` → `top-right`
  - `left-above` → `top-left`
- Documentation and API updated to reflect new names.

### 1.0.5 (January 22, 2026)

**Added**

- New positioning options: `right-above` and `left-above` for both `position` and `positionMobile` inputs.
- Documentation updated to reflect new options.

### 1.0.4 (January 15, 2026)

**Fixed**

- Fixed TypeScript type compatibility for timeout handling
  - Changed timeout type from `number` to `ReturnType<typeof setTimeout>` for proper cross-environment support
  - Ensures compatibility with both browser and Node.js environments

### 1.0.3 (January 15, 2026)

**Improved**

- Comprehensive memory leak prevention enhancements
  - Fixed orphaned event listeners that weren't being cleaned up on component destruction
  - Properly track and clear all timeouts (hint, fadeout, and removal) with proper `ReturnType<typeof setTimeout>` typing
  - Store media query listener reference for proper cleanup
  - Nullify all handler references to enable garbage collection
  - Improved `ngOnDestroy()` with complete cleanup of keyboard, mouse, and media query listeners
  - Fixed TypeScript type compatibility for timeout handling

### 1.0.2 (January 15, 2026)

**Fixed**

- Fixed tooltip glitching issue when hovering over images and leaving too quickly
  - Added guard to prevent duplicate hint instances
  - Improved hint cleanup logic to prevent visual glitches
  - Better lifecycle management for hint tooltips

### 1.0.1 (January 10, 2026)

**Fixed**

- Fixed hint tooltip showing on mobile devices
  - Added mobile device check to prevent tooltips on touch devices

### 1.0.0 (Initial Release)

- Full-featured image magnifier directive
- GPU-accelerated smooth positioning
- Keyboard modifier support with smart hints
- Mobile optimization with responsive sizing
- Comprehensive customization options
- Production-ready performance optimizations
