import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nPipe } from '@zitro/i18n';

export interface SidebarNavItem {
  labelKey: string;
  icon: string;
  route: string;
  /** Omit to always show; set to require this permission claim to render the item. */
  permission?: string;
}

/**
 * App-shell sidebar navigation — desktop fixed sidebar, collapses to an off-canvas
 * drawer with a hamburger toggle below the tablet breakpoint. Used by zitro-admin
 * and zitro-superadmin (AD-000/SA-000).
 *
 * Permission filtering: pass only the items the current user can see — this
 * component does not know about auth, the caller filters `items` by whatever
 * permission claims are on the current Admin JWT.
 */
@Component({
  selector: 'lib-sidebar-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, I18nPipe],
  templateUrl: './sidebar-nav.component.html',
  styleUrl: './sidebar-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarNavComponent {
  items = input.required<SidebarNavItem[]>();
  /** i18n key shown at the top of the sidebar, e.g. app name. */
  titleKey = input<string | null>(null);

  logoutClicked = output<void>();

  protected readonly mobileOpen = signal(false);

  toggleMobile(): void {
    this.mobileOpen.update((open) => !open);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
