import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Icon-only "go back" control — a plain left-arrow, no label text. Meant to sit to
 * the LEFT of a page's title (not in a right-aligned actions row) so the reading
 * order is "back arrow, then where you are", matching how back navigation reads in
 * most native and web apps.
 *
 * Two usage modes:
 * - Pass `to` (a routerLink target, string or array) for plain "go to this route".
 * - Omit `to` and listen on `(back)` for anything more custom (e.g. a multi-step
 *   form's "previous step" that isn't a route change at all).
 */
@Component({
  selector: 'lib-back-button',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (to(); as target) {
      <a
        class="back-button"
        [routerLink]="target"
        [attr.aria-label]="ariaLabel()"
        [title]="ariaLabel()"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </a>
    } @else {
      <button
        type="button"
        class="back-button"
        [attr.aria-label]="ariaLabel()"
        [title]="ariaLabel()"
        (click)="back.emit()"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    }
  `,
  styles: `
    .back-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--zitro-on-surface);
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;

      &:hover {
        background: var(--zitro-surface-variant);
      }

      svg {
        width: 20px;
        height: 20px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackButtonComponent {
  to = input<string | unknown[] | null>(null);
  ariaLabel = input('Back');
  back = output<void>();
}
