import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  RemoteSettingsApiService,
  RemoteSettingsResponse,
} from '@zitro/services';
import { I18nPipe, I18nService } from '@zitro/i18n';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogConfig,
} from '@zitro/ui';

type PendingAction = 'logout' | 'cache' | null;

/**
 * Force-logout / cache-clear remote triggers — global, device-wide, not scoped to any
 * particular user. Every app instance polls GET /api/app-config/remote-settings at boot;
 * the two POST triggers here bump a shared timestamp each device compares against its own
 * last-handled value, acting once when it sees a newer one. Moved here from zitro-customer's
 * "Development Only" cache-management page, where it originally lived as an ungated dev tool —
 * this is the first time it's behind real admin auth (Admin JWT + app-config:write).
 *
 * Uses the in-app ConfirmationDialogComponent rather than window.confirm() — a native dialog
 * is unreliable (some browsers/extensions suppress it outright) and untestable by automation,
 * which is exactly what surfaced this during verification.
 */
@Component({
  selector: 'app-remote-settings',
  standalone: true,
  imports: [I18nPipe, ConfirmationDialogComponent],
  templateUrl: './remote-settings.component.html',
  styleUrl: './remote-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemoteSettingsComponent implements OnInit {
  private readonly remoteSettingsApi = inject(RemoteSettingsApiService);
  private readonly i18n = inject(I18nService);

  protected readonly settings = signal<RemoteSettingsResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly processing = signal<'logout' | 'cache' | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly actionSuccess = signal<string | null>(null);

  protected readonly pendingAction = signal<PendingAction>(null);
  protected readonly dialogConfig = computed<ConfirmationDialogConfig>(() => {
    const isLogout = this.pendingAction() === 'logout';
    return {
      title: this.i18n.translate(
        isLogout
          ? 'remoteSettings.confirmLogoutTitle'
          : 'remoteSettings.confirmCacheTitle',
      ),
      message: this.i18n.translate(
        isLogout
          ? 'remoteSettings.confirmLogoutMessage'
          : 'remoteSettings.confirmCacheMessage',
      ),
      confirmLabel: this.i18n.translate('remoteSettings.confirmProceed'),
      cancelLabel: this.i18n.translate('common.cancel'),
      destructive: true,
      closeOnBackdropClick: true,
    };
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.remoteSettingsApi.getRemoteSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('remoteSettings.loadError');
        this.loading.set(false);
      },
    });
  }

  protected requestForceLogout(): void {
    if (this.processing()) return;
    this.pendingAction.set('logout');
  }

  protected requestCacheClear(): void {
    if (this.processing()) return;
    this.pendingAction.set('cache');
  }

  protected onDialogCancelled(): void {
    this.pendingAction.set(null);
  }

  protected onDialogConfirmed(): void {
    const action = this.pendingAction();
    this.pendingAction.set(null);
    if (action === 'logout') {
      this.doForceLogout();
    } else if (action === 'cache') {
      this.doCacheClear();
    }
  }

  private doForceLogout(): void {
    this.processing.set('logout');
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.remoteSettingsApi.triggerForceLogout().subscribe({
      next: () => {
        this.processing.set(null);
        this.actionSuccess.set('remoteSettings.forceLogoutSuccess');
        this.load();
      },
      error: () => {
        this.processing.set(null);
        this.actionError.set('remoteSettings.forceLogoutError');
      },
    });
  }

  private doCacheClear(): void {
    this.processing.set('cache');
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.remoteSettingsApi.triggerCacheClear().subscribe({
      next: () => {
        this.processing.set(null);
        this.actionSuccess.set('remoteSettings.cacheClearSuccess');
        this.load();
      },
      error: () => {
        this.processing.set(null);
        this.actionError.set('remoteSettings.cacheClearError');
      },
    });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
