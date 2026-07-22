import { Injectable, OnDestroy } from '@angular/core';

/** Fallback image paths — all resolved relative to the app root. */
const FALLBACK_AVATAR = 'assets/icons/default-avatar.png';
const FALLBACK_BANNER = 'assets/banners/1080_900_px.png';
const FALLBACK_FOOD = 'assets/foodCategories/default.png';
const FALLBACK_GENERIC = 'assets/img/unknown.png';

/**
 * Marker attribute set on an <img> after the first fallback is applied.
 * Prevents an infinite error loop when the fallback image itself fails to load.
 */
const FALLBACK_APPLIED_ATTR = 'data-img-fb';

/**
 * GlobalImageErrorService
 *
 * Listens for ALL image errors across the entire app via a single document-level
 * capture-phase listener. No per-component wiring is needed.
 *
 * Call `init()` once at app startup (AppComponent.ngOnInit).
 *
 * Per-image override: add `data-fallback="path/to/img.png"` to the <img> element.
 */
@Injectable({ providedIn: 'root' })
export class GlobalImageErrorService implements OnDestroy {
  private readonly handler = (event: Event): void => {
    const el = event.target as HTMLElement;
    if (el.tagName !== 'IMG') return;

    const img = el as HTMLImageElement;

    // Prevent infinite loop — stop after the first fallback attempt
    if (img.hasAttribute(FALLBACK_APPLIED_ATTR)) return;
    img.setAttribute(FALLBACK_APPLIED_ATTR, '1');
    img.classList.add('img-load-error');

    img.src = this.chooseFallback(img);
  };

  /** Register the global listener. Call once from AppComponent.ngOnInit. */
  init(): void {
    document.addEventListener('error', this.handler, /* capture */ true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('error', this.handler, true);
  }

  private chooseFallback(img: HTMLImageElement): string {
    // 1. Honour an explicit per-image override
    const custom = img.getAttribute('data-fallback');
    if (custom) return custom;

    const src = (img.getAttribute('src') || '').toLowerCase();
    const alt = (img.getAttribute('alt') || '').toLowerCase();
    const cls = img.className.toLowerCase();

    // 2. Avatar / profile images
    if (
      src.includes('avatar') ||
      alt.includes('avatar') ||
      alt.includes('profile') ||
      cls.includes('avatar') ||
      cls.includes('profile-img')
    ) {
      return FALLBACK_AVATAR;
    }

    // 3. Banner images
    if (src.includes('banner') || cls.includes('banner')) {
      return FALLBACK_BANNER;
    }

    // 4. Food / category images
    if (
      src.includes('categor') ||
      src.includes('food') ||
      src.includes('product') ||
      cls.includes('product-img') ||
      cls.includes('food')
    ) {
      return FALLBACK_FOOD;
    }

    // 5. Generic fallback
    return FALLBACK_GENERIC;
  }
}
