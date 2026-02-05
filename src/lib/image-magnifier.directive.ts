import { Directive, ElementRef, Input, OnDestroy, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
    selector: '[appImageMagnifier]',
    standalone: true
})
export class ImageMagnifierDirective implements OnInit, OnDestroy {
    @Input() magnifierSize = 300;
    @Input() magnifierSizeMobile: number | null = null; // mobile-specific size (defaults to 60% of desktop)
    @Input() magnifierRatio: string | null = null; // e.g. '1/1' for square, '16/9' for wide
    @Input() magnifierRatioMobile: string | null = null; // mobile-specific ratio (defaults to same as desktop)
    @Input() position: 'auto' | 'right' | 'left' | 'top' | 'bottom' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'auto';
    @Input() positionMobile: 'auto' | 'right' | 'left' | 'top' | 'bottom' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | null = null; // mobile-specific position (defaults to same as desktop)
    @Input() rounded = false; // fully round the image (border-radius: 50%)
    @Input() padding: number | null = null; // override auto padding (null = auto: 5% of magnifierSize + 20px min)
    @Input() requireKeyModifier: 'shift' | 'ctrl' | 'alt' | null = null; // require holding a keyboard modifier to show magnifier (null = no modifier required)
    @Input() showHint = true; // enable/disable hint tooltip on first hover (defaults to true)
    @Input() hintText: string | null = null; // custom hint text (overrides auto-generated hint)
    @Input() zoom: number | null = null; // zoom factor for magnifier (null = no zoom unless set)
    @Input() zoomFocus: 'center' | 'cursor' | 'top-left' | 'top' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right' | 'custom' = 'center';
    @Input() zoomFocusX: number | null = null; // custom focus X percentage (0-100)
    @Input() zoomFocusY: number | null = null; // custom focus Y percentage (0-100)

    private duplicate: HTMLElement | null = null;
    private hint: HTMLElement | null = null;
    private isMobile = false;
    private isHovering = false;
    private lastMouseEvent: MouseEvent | null = null;
    private hintTimeout: ReturnType<typeof setTimeout> | null = null;
    private hintFadeoutTimeout: ReturnType<typeof setTimeout> | null = null;
    private hintRemovalTimeout: ReturnType<typeof setTimeout> | null = null;
    private modifierKey: { shift: boolean; ctrl: boolean; alt: boolean } = { shift: false, ctrl: false, alt: false };
    private onKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
    private onKeyUpHandler: ((e: KeyboardEvent) => void) | null = null;
    private onMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
    private onMouseEnterHandler: (() => void) | null = null;
    private onMouseLeaveHandler: (() => void) | null = null;
    private mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;
    private mediaQueryList: MediaQueryList | null = null;

    constructor(
        private elementRef: ElementRef,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        if (isPlatformBrowser(this.platformId)) {
            this.mediaQueryList = window.matchMedia('(max-width: 768px)');
            this.isMobile = this.mediaQueryList.matches;

            // Create listener function that can be removed later
            this.mediaQueryListener = (e: MediaQueryListEvent) => {
                this.isMobile = e.matches;
            };
            this.mediaQueryList.addEventListener('change', this.mediaQueryListener);

            // Create event handler functions that can be removed later
            this.onMouseMoveHandler = (e: MouseEvent) => this.onMouseMove(e);
            this.onMouseEnterHandler = () => this.onMouseEnter();
            this.onMouseLeaveHandler = () => this.onMouseLeave();

            // Attach mousemove listener with passive flag for better scroll performance
            const img = this.elementRef.nativeElement as HTMLImageElement;
            img.addEventListener('mousemove', this.onMouseMoveHandler, { passive: true });
            img.addEventListener('mouseenter', this.onMouseEnterHandler, { passive: true });
            img.addEventListener('mouseleave', this.onMouseLeaveHandler, { passive: true });
        }
    }

    private createDuplicate() {
        if (this.duplicate) return;
        const img = this.elementRef.nativeElement as HTMLImageElement;
        const size = this.isMobile && this.magnifierSizeMobile !== null ? this.magnifierSizeMobile : this.magnifierSize;
        let aspectRatio = 1;
        function parseRatio(ratio: string | null): number | null {
            if (!ratio) return null;
            const parts = ratio.split('/').map(s => s.trim());
            if (parts.length !== 2) return null;
            const w = Number(parts[0]);
            const h = Number(parts[1]);
            if (!isFinite(w) || !isFinite(h) || h === 0 || w <= 0 || h <= 0) return null;
            return w / h;
        }
        if (this.isMobile && this.magnifierRatioMobile && this.magnifierRatioMobile.trim() !== '') {
            const parsed = parseRatio(this.magnifierRatioMobile);
            if (parsed) aspectRatio = parsed;
            else if (this.magnifierRatio && this.magnifierRatio.trim() !== '') {
                const fallback = parseRatio(this.magnifierRatio);
                if (fallback) aspectRatio = fallback;
                else if (img.naturalWidth && img.naturalHeight) {
                    aspectRatio = img.naturalWidth / img.naturalHeight;
                }
            } else if (img.naturalWidth && img.naturalHeight) {
                aspectRatio = img.naturalWidth / img.naturalHeight;
            }
        } else if (this.magnifierRatio && this.magnifierRatio.trim() !== '') {
            const parsed = parseRatio(this.magnifierRatio);
            if (parsed) aspectRatio = parsed;
            else if (img.naturalWidth && img.naturalHeight) {
                aspectRatio = img.naturalWidth / img.naturalHeight;
            }
        } else if (img.naturalWidth && img.naturalHeight) {
            aspectRatio = img.naturalWidth / img.naturalHeight;
        }
        let width: number, height: number;
        if (aspectRatio >= 1) {
            // Wider than tall: width = size, height = size / aspectRatio
            width = size;
            height = size / aspectRatio;
        } else {
            // Taller than wide: width = size * aspectRatio, height = size
            width = size * aspectRatio;
            height = size;
        }
        this.duplicate = document.createElement('div');
        this.duplicate.className = 'image-magnifier-duplicate';
        this.duplicate.style.backgroundImage = `url(${img.src})`;
        this.duplicate.style.width = `${width}px`;
        this.duplicate.style.height = `${height}px`;
        this.duplicate.style.position = 'fixed';
        this.duplicate.style.left = '0';
        this.duplicate.style.top = '0';
        this.duplicate.style.borderRadius = this.rounded ? '50%' : '12px';
        // Use cover if a ratio is set, otherwise use zoom value
        const hasRatio = (this.isMobile && this.magnifierRatioMobile && this.magnifierRatioMobile.trim() !== '') || (this.magnifierRatio && this.magnifierRatio.trim() !== '');
        if (hasRatio) {
            this.duplicate.style.backgroundSize = 'cover';
        } else if (typeof this.zoom === 'number' && this.zoom > 0) {
            const bgWidth = img.naturalWidth * this.zoom;
            const bgHeight = img.naturalHeight * this.zoom;
            this.duplicate.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
        } else {
            this.duplicate.style.backgroundSize = 'contain';
        }
        this.duplicate.style.backgroundRepeat = 'no-repeat';
        this.duplicate.style.backgroundPosition = 'center';
        this.duplicate.style.pointerEvents = 'none';
        this.duplicate.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';
        this.duplicate.style.zIndex = '1000';
        this.duplicate.style.willChange = 'transform';
        this.duplicate.style.contain = 'layout paint';
        document.body.appendChild(this.duplicate);
        this.updateBackgroundPosition(this.lastMouseEvent ?? undefined);
    }

    ngOnInit() {
        // Only attach keyboard listeners if a modifier is required
        if (this.requireKeyModifier && isPlatformBrowser(this.platformId)) {
            this.onKeyDownHandler = (e: KeyboardEvent) => {
                this.modifierKey.shift = e.shiftKey;
                this.modifierKey.ctrl = e.ctrlKey || e.metaKey;
                this.modifierKey.alt = e.altKey;
                this.updateMagnifierVisibility();
            };

            this.onKeyUpHandler = (e: KeyboardEvent) => {
                this.modifierKey.shift = e.shiftKey;
                this.modifierKey.ctrl = e.ctrlKey || e.metaKey;
                this.modifierKey.alt = e.altKey;
                this.updateMagnifierVisibility();
            };

            window.addEventListener('keydown', this.onKeyDownHandler);
            window.addEventListener('keyup', this.onKeyUpHandler);
        }
    }

    private onMouseEnter() {
        this.isHovering = true;

        // Show hint on hover if enabled, modifier is required, NOT on mobile, and the modifier is NOT currently pressed
        if (this.showHint && !this.isMobile && this.requireKeyModifier && !this.modifierKey[this.requireKeyModifier]) {
            this.showHintTooltip();
        }

        this.updateMagnifierVisibility();
    }

    private onMouseLeave() {
        this.isHovering = false;
        this.removeDuplicate();
        this.removeHint();
    }

    private updateMagnifierVisibility() {
        if (!this.isHovering) return;

        // On mobile, ignore modifier requirement and always show on hover
        const hasModifier = this.isMobile || this.requireKeyModifier === null || this.modifierKey[this.requireKeyModifier];

        if (hasModifier && !this.duplicate) {
            this.createDuplicate();
            // Position the magnifier using the last recorded mouse position
            if (this.lastMouseEvent) {
                this.positionDuplicate(this.lastMouseEvent);
            }
            // Remove hint when magnifier appears
            this.removeHint();
        } else if (!hasModifier && this.duplicate) {
            this.removeDuplicate();
        }
    }

    private pendingPositionUpdate = false;

    private onMouseMove(event: MouseEvent) {
        // Store the latest mouse position for when modifier key is pressed without movement
        this.lastMouseEvent = event;

        if (!this.duplicate) return;

        // Batch position updates with requestAnimationFrame for smooth 60fps movement
        if (!this.pendingPositionUpdate) {
            this.pendingPositionUpdate = true;
            requestAnimationFrame(() => {
                this.positionDuplicate(event);
                if (this.zoomFocus === 'cursor') {
                    this.updateBackgroundPosition(event);
                }
                this.pendingPositionUpdate = false;
            });
        }
    }

    private updateBackgroundPosition(event?: MouseEvent) {
        if (!this.duplicate) return;

        const img = this.elementRef.nativeElement as HTMLImageElement;
        const imgRect = img.getBoundingClientRect();

        const focus = this.getFocusPercent(event, imgRect);
        const hasRatio =
            (this.isMobile && this.magnifierRatioMobile && this.magnifierRatioMobile.trim() !== '') ||
            (this.magnifierRatio && this.magnifierRatio.trim() !== '');

        if (hasRatio || !(typeof this.zoom === 'number' && this.zoom > 0)) {
            this.duplicate.style.backgroundPosition = `${focus.x}% ${focus.y}%`;
            return;
        }

        const duplicateWidth = parseInt(this.duplicate.style.width, 10);
        const duplicateHeight = parseInt(this.duplicate.style.height, 10);
        const bgWidth = img.naturalWidth * this.zoom;
        const bgHeight = img.naturalHeight * this.zoom;

        const bgX = -(bgWidth * (focus.x / 100) - duplicateWidth / 2);
        const bgY = -(bgHeight * (focus.y / 100) - duplicateHeight / 2);

        this.duplicate.style.backgroundPosition = `${bgX}px ${bgY}px`;
    }

    private getFocusPercent(event: MouseEvent | undefined, imgRect: DOMRect): { x: number; y: number } {
        const clamp = (value: number) => Math.max(0, Math.min(100, value));

        if (this.zoomFocus === 'cursor' && event) {
            const x = ((event.clientX - imgRect.left) / imgRect.width) * 100;
            const y = ((event.clientY - imgRect.top) / imgRect.height) * 100;
            return { x: clamp(x), y: clamp(y) };
        }

        if (this.zoomFocus === 'custom') {
            const x = this.zoomFocusX ?? 50;
            const y = this.zoomFocusY ?? 50;
            return { x: clamp(x), y: clamp(y) };
        }

        switch (this.zoomFocus) {
            case 'top-left':
                return { x: 0, y: 0 };
            case 'top':
                return { x: 50, y: 0 };
            case 'top-right':
                return { x: 100, y: 0 };
            case 'left':
                return { x: 0, y: 50 };
            case 'right':
                return { x: 100, y: 50 };
            case 'bottom-left':
                return { x: 0, y: 100 };
            case 'bottom':
                return { x: 50, y: 100 };
            case 'bottom-right':
                return { x: 100, y: 100 };
            case 'center':
            default:
                return { x: 50, y: 50 };
        }
    }

    private positionDuplicate(event: MouseEvent) {
        if (!this.duplicate) return;

        const duplicateWidth = parseInt(this.duplicate.style.width, 10);
        const duplicateHeight = parseInt(this.duplicate.style.height, 10);
        const padding = this.padding !== null ? this.padding : Math.max(20, this.magnifierSize * 0.05);
        const imgRect = (this.elementRef.nativeElement as HTMLImageElement).getBoundingClientRect();

        const fitsViewport = (px: number, py: number) =>
            px >= padding &&
            py >= padding &&
            px + duplicateWidth <= window.innerWidth - padding &&
            py + duplicateHeight <= window.innerHeight - padding;

        const avoidsImage = (px: number, py: number) => {
            const right = px + duplicateWidth;
            const bottom = py + duplicateHeight;
            return right <= imgRect.left || px >= imgRect.right || bottom <= imgRect.top || py >= imgRect.bottom;
        };

        let x = 0;
        let y = 0;

        // Use mobile-specific position if on mobile and specified, otherwise use desktop position
        const activePosition = this.isMobile && this.positionMobile !== null ? this.positionMobile : this.position;
        const e = event;

        if (activePosition === 'auto' || !activePosition) {
            const spaceRight = window.innerWidth - e.clientX;
            const spaceLeft = e.clientX;
            const spaceBottom = window.innerHeight - e.clientY;
            const spaceTop = e.clientY;

            const verticalThreshold = duplicateHeight * 0.6 + padding;
            const needBelow = spaceTop < verticalThreshold && spaceBottom >= verticalThreshold;
            const needAbove = spaceBottom < verticalThreshold && spaceTop >= verticalThreshold;

            const candidates = [];
            if (needBelow) {
                candidates.push({ x: e.clientX - duplicateWidth / 2, y: e.clientY + padding });
            } else if (needAbove) {
                candidates.push({ x: e.clientX - duplicateWidth / 2, y: e.clientY - duplicateHeight - padding });
            } else if (spaceRight >= duplicateWidth + padding || spaceLeft >= duplicateWidth + padding) {
                const placeRight = spaceRight >= spaceLeft;
                candidates.push({ x: placeRight ? e.clientX + padding : e.clientX - duplicateWidth - padding, y: e.clientY - duplicateHeight / 2 });
            }
            // Add vertical alternatives
            candidates.push(
                { x: e.clientX - duplicateWidth / 2, y: e.clientY + padding },
                { x: e.clientX - duplicateWidth / 2, y: e.clientY - duplicateHeight - padding }
            );
            // Add horizontal alternatives
            candidates.push(
                { x: e.clientX + padding, y: e.clientY - duplicateHeight / 2 },
                { x: e.clientX - duplicateWidth - padding, y: e.clientY - duplicateHeight / 2 }
            );
            // Final fallback: center near cursor
            candidates.push({ x: e.clientX - duplicateWidth / 2, y: e.clientY - duplicateHeight / 2 });

            const pick = candidates.find(c => fitsViewport(c.x, c.y) && avoidsImage(c.x, c.y))
                || candidates.find(c => fitsViewport(c.x, c.y))
                || candidates[candidates.length - 1];

            x = Math.max(padding, Math.min(window.innerWidth - duplicateWidth - padding, pick.x));
            y = Math.max(padding, Math.min(window.innerHeight - duplicateHeight - padding, pick.y));
        } else if (activePosition === 'bottom-right') {
            x = e.clientX + padding;
            y = e.clientY + padding;
            x = Math.min(x, window.innerWidth - duplicateWidth - padding);
            y = Math.min(y, window.innerHeight - duplicateHeight - padding);
        } else if (activePosition === 'bottom-left') {
            x = e.clientX - duplicateWidth - padding;
            y = e.clientY + padding;
            x = Math.max(padding, x);
            y = Math.min(y, window.innerHeight - duplicateHeight - padding);
        } else if (activePosition === 'top-right') {
            x = e.clientX + padding;
            y = e.clientY - duplicateHeight - padding;
            x = Math.min(x, window.innerWidth - duplicateWidth - padding);
            y = Math.max(padding, y);
        } else if (activePosition === 'top-left') {
            x = e.clientX - duplicateWidth - padding;
            y = e.clientY - duplicateHeight - padding;
            x = Math.max(padding, x);
            y = Math.max(padding, y);
        } else if (activePosition === 'right') {
            x = e.clientX + padding;
            y = e.clientY - duplicateHeight / 2;
            x = Math.min(x, window.innerWidth - duplicateWidth - padding);
            y = Math.max(padding, Math.min(window.innerHeight - duplicateHeight - padding, y));
        } else if (activePosition === 'left') {
            x = e.clientX - duplicateWidth - padding;
            y = e.clientY - duplicateHeight / 2;
            x = Math.max(padding, x);
            y = Math.max(padding, Math.min(window.innerHeight - duplicateHeight - padding, y));
        } else if (activePosition === 'bottom') {
            x = e.clientX - duplicateWidth / 2;
            y = e.clientY + padding;
            x = Math.max(padding, Math.min(window.innerWidth - duplicateWidth - padding, x));
            y = Math.min(y, window.innerHeight - duplicateHeight - padding);
        } else if (activePosition === 'top') {
            x = e.clientX - duplicateWidth / 2;
            y = e.clientY - duplicateHeight - padding;
            x = Math.max(padding, Math.min(window.innerWidth - duplicateWidth - padding, x));
            y = Math.max(padding, y);
        } else {
            // Default fallback: right of cursor
            x = e.clientX + 24;
            y = e.clientY - duplicateHeight / 2;
            x = Math.max(padding, Math.min(window.innerWidth - duplicateWidth - padding, x));
            y = Math.max(padding, Math.min(window.innerHeight - duplicateHeight - padding, y));
        }

        // Actually position the magnifier
        this.duplicate.style.left = `${x}px`;
        this.duplicate.style.top = `${y}px`;
    }

    private removeDuplicate() {
        if (this.duplicate) {
            this.duplicate.remove();
            this.duplicate = null;
        }
    }

    private showHintTooltip() {
        // Don't create a new hint if one already exists
        if (this.hint) return;

        if (!isPlatformBrowser(this.platformId)) return;

        const img = this.elementRef.nativeElement as HTMLImageElement;
        const imgRect = img.getBoundingClientRect();

        // Determine hint text with smart defaults based on requireKeyModifier
        let displayHint: string;

        if (this.hintText) {
            // User provided custom hint
            displayHint = this.hintText;
        } else if (this.requireKeyModifier) {
            // Generate hint based on keyboard modifier requirement
            displayHint = `Press & hold ${this.requireKeyModifier} to magnify`;
        } else {
            // Default hint when no modifier required
            displayHint = 'Hover to magnify';
        }

        this.hint = document.createElement('div');
        this.hint.className = 'image-magnifier-hint';
        this.hint.textContent = displayHint;
        this.hint.style.position = 'fixed';
        this.hint.style.left = `${imgRect.left + imgRect.width / 2}px`;
        this.hint.style.top = `${imgRect.top + imgRect.height / 2}px`;
        this.hint.style.transform = 'translate(-50%, -50%)';
        this.hint.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.hint.style.color = '#fff';
        this.hint.style.padding = '8px 12px';
        this.hint.style.borderRadius = '6px';
        this.hint.style.fontSize = '12px';
        this.hint.style.fontWeight = '500';
        this.hint.style.pointerEvents = 'none';
        this.hint.style.zIndex = '999';
        this.hint.style.whiteSpace = 'nowrap';
        this.hint.style.opacity = '0';
        this.hint.style.transition = 'opacity 400ms ease-in-out';
        this.hint.style.backdropFilter = 'blur(4px)';

        document.body.appendChild(this.hint);

        // Trigger fade-in animation with small delay
        setTimeout(() => {
            if (this.hint) {
                this.hint.style.opacity = '1';
            }
        }, 50);

        // Fade out and remove after 3 seconds
        if (this.hintTimeout) clearTimeout(this.hintTimeout);
        this.hintTimeout = setTimeout(() => {
            if (this.hint) {
                this.hint.style.opacity = '0';
                this.hintFadeoutTimeout = setTimeout(() => {
                    this.removeHint();
                }, 300);
            }
            this.hintTimeout = null;
        }, 3000);
    }

    private removeHint() {
        // Clear all hint-related timeouts
        if (this.hintTimeout) {
            clearTimeout(this.hintTimeout);
            this.hintTimeout = null;
        }
        if (this.hintFadeoutTimeout) {
            clearTimeout(this.hintFadeoutTimeout);
            this.hintFadeoutTimeout = null;
        }
        if (this.hintRemovalTimeout) {
            clearTimeout(this.hintRemovalTimeout);
            this.hintRemovalTimeout = null;
        }

        if (this.hint) {
            this.hint.style.opacity = '0';
            const hintElement = this.hint;
            this.hintRemovalTimeout = setTimeout(() => {
                if (hintElement && hintElement.parentNode) {
                    hintElement.remove();
                }
                if (this.hint === hintElement) {
                    this.hint = null;
                }
                this.hintRemovalTimeout = null;
            }, 300);
        }
    }

    ngOnDestroy() {
        // Clean up all timeouts
        if (this.hintTimeout) clearTimeout(this.hintTimeout);
        if (this.hintFadeoutTimeout) clearTimeout(this.hintFadeoutTimeout);
        if (this.hintRemovalTimeout) clearTimeout(this.hintRemovalTimeout);

        // Clean up keyboard listeners if they were attached
        if (this.onKeyDownHandler) {
            window.removeEventListener('keydown', this.onKeyDownHandler);
        }
        if (this.onKeyUpHandler) {
            window.removeEventListener('keyup', this.onKeyUpHandler);
        }

        // Clean up mouse event listeners
        if (isPlatformBrowser(this.platformId)) {
            const img = this.elementRef.nativeElement as HTMLImageElement;
            if (this.onMouseMoveHandler) {
                img.removeEventListener('mousemove', this.onMouseMoveHandler);
            }
            if (this.onMouseEnterHandler) {
                img.removeEventListener('mouseenter', this.onMouseEnterHandler);
            }
            if (this.onMouseLeaveHandler) {
                img.removeEventListener('mouseleave', this.onMouseLeaveHandler);
            }

            // Clean up media query listener
            if (this.mediaQueryList && this.mediaQueryListener) {
                this.mediaQueryList.removeEventListener('change', this.mediaQueryListener);
            }
        }

        // Clean up DOM elements
        this.removeDuplicate();
        this.removeHint();

        // Nullify references for garbage collection
        this.lastMouseEvent = null;
        this.onKeyDownHandler = null;
        this.onKeyUpHandler = null;
        this.onMouseMoveHandler = null;
        this.onMouseEnterHandler = null;
        this.onMouseLeaveHandler = null;
        this.mediaQueryListener = null;
        this.mediaQueryList = null;
    }
}
