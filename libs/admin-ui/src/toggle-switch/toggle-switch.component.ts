import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

/**
 * One-click on/off switch for a boolean flag (active/inactive, enabled/disabled) —
 * replaces the older pattern of a ✓/✗ column plus a separate "Activate"/"Deactivate"
 * text button with a single control that both shows and flips the state.
 */
@Component({
  selector: 'lib-toggle-switch',
  standalone: true,
  template: `
    <button
      type="button"
      class="toggle-switch"
      [class.toggle-switch--on]="checked()"
      [disabled]="disabled()"
      [attr.aria-pressed]="checked()"
      [attr.aria-label]="ariaLabel()"
      [title]="ariaLabel()"
      [attr.data-testid]="testId() || null"
      (click)="toggled.emit()"
    >
      <span class="toggle-switch__knob"></span>
    </button>
  `,
  styles: `
    .toggle-switch {
      position: relative;
      width: 38px;
      height: 22px;
      border-radius: 999px;
      border: none;
      background: var(--zitro-divider);
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      transition: background 0.15s ease;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &--on {
        background: var(--zitro-primary);
      }
    }

    .toggle-switch__knob {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
      transition: transform 0.15s ease;

      .toggle-switch--on & {
        transform: translateX(16px);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleSwitchComponent {
  checked = input.required<boolean>();
  disabled = input(false);
  ariaLabel = input('');
  testId = input('');

  toggled = output<void>();
}
