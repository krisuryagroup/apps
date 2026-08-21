import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18nPipe } from '@zitro/i18n';
import {
  AppSettingsService,
  DeviceTokenService,
  Game2048Service,
  GameApiService,
  UserManagementService,
  UserApiService,
} from '@zitro/services';
import type { GameState, Tile } from '@zitro/services';

@Component({
  selector: 'app-game-2048-page',
  standalone: true,
  imports: [I18nPipe, NgStyle],
  templateUrl: './game-2048.page.html',
  styleUrl: './game-2048.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Game2048Page implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly gameService = inject(Game2048Service);
  private readonly gameApi = inject(GameApiService);
  private readonly deviceTokenService = inject(DeviceTokenService);
  private readonly userMgmt = inject(UserManagementService);
  private readonly userApi = inject(UserApiService);
  private readonly appSettings = inject(AppSettingsService);

  readonly isAuthenticated = signal(false);
  readonly isTestUser = signal(false);
  readonly gameState = signal<GameState | null>(null);
  readonly isPlaying = signal(false);
  readonly isEligible = signal(false);
  readonly canEarnRewards = signal(false);
  readonly nextEligibleDate = signal<Date | null>(null);
  readonly eligibilityMessage = signal('');
  readonly showRewardModal = signal(false);
  readonly rewardCouponCode = signal('');
  readonly rewardCouponType = signal('');
  readonly rewardTileValue = signal(0);
  readonly showConfetti = signal(false);

  private currentUserUid: string | null = null;
  private currentUserPhone: string | null = null;
  private deviceToken: string | null = null;

  private touchStartX = 0;
  private touchStartY = 0;
  private readonly MIN_SWIPE_DISTANCE = 30;
  private readonly GAME_STATE_KEY = 'game2048_state';

  async ngOnInit(): Promise<void> {
    await this.checkAuthentication();
    if (this.isAuthenticated()) {
      await this.checkEligibilityStatus();
      this.restoreSavedGame();
    }
  }

  ngOnDestroy(): void {
    this.saveGameState();
  }

  private async checkAuthentication(): Promise<void> {
    try {
      const auth = await this.userMgmt.isLoggedIn();
      this.isAuthenticated.set(auth);

      if (auth) {
        this.currentUserPhone = await this.userMgmt.getCurrentUserPhone();
        if (this.currentUserPhone) {
          try {
            const user = await firstValueFrom(this.userApi.getProfile());
            this.currentUserUid = user.id;
          } catch {
            /* ignore — game works without profile */
          }
          const testPhoneNumbers = await this.appSettings.getTestPhoneNumbers();
          const phoneWithout = this.currentUserPhone.replace('+91', '');
          this.isTestUser.set(testPhoneNumbers.includes(phoneWithout));
        }
      }
    } catch {
      this.isAuthenticated.set(false);
    }
  }

  /** Probes reward eligibility with a no-op score (0 never crosses a reward threshold). */
  private async checkEligibilityStatus(): Promise<void> {
    try {
      this.deviceToken = await this.deviceTokenService.getDeviceToken();
      const result = await firstValueFrom(
        this.gameApi.submitScore(this.deviceToken, 0, 0),
      );
      this.isEligible.set(true);
      const nextEligible = result.nextEligibleAt
        ? new Date(result.nextEligibleAt)
        : null;
      const isLocked = !!nextEligible && nextEligible > new Date();
      this.canEarnRewards.set(!isLocked);
      this.nextEligibleDate.set(isLocked ? nextEligible : null);
      if (isLocked && nextEligible) {
        this.eligibilityMessage.set(
          `Play for fun! Next reward available on ${this.formatDate(nextEligible)}`,
        );
      }
    } catch {
      this.isEligible.set(true);
      this.canEarnRewards.set(false);
    }
  }

  startGame(): void {
    if (!this.isAuthenticated() || !this.isEligible()) return;
    this.gameState.set(this.gameService.initializeGame());
    this.isPlaying.set(true);
    this.saveGameState();
  }

  restartGame(): void {
    this.gameState.set(this.gameService.initializeGame());
    this.isPlaying.set(true);
    this.saveGameState();
  }

  continueGame(): void {
    const gs = this.gameState();
    if (gs) {
      this.gameState.set({ ...gs, hasWon: false, canContinue: true });
      this.saveGameState();
      this.closeRewardModal();
    }
  }

  closeRewardModal(): void {
    this.showRewardModal.set(false);
    this.showConfetti.set(false);
    const gs = this.gameState();
    if (gs) {
      this.gameState.set({ ...gs, canContinue: true });
      this.saveGameState();
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth/signin']);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    if (!this.isPlaying() || !this.gameState()) return;
    const dirs: Record<string, 'up' | 'down' | 'left' | 'right'> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };
    const dir = dirs[event.key];
    if (dir) void this.makeMove(dir);
  }

  @HostListener('touchstart', ['$event'])
  handleTouchStart(event: TouchEvent): void {
    if (!this.isPlaying() || !this.gameState()) return;
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
  }

  @HostListener('touchend', ['$event'])
  handleTouchEnd(event: TouchEvent): void {
    if (!this.isPlaying() || !this.gameState()) return;
    const dx = event.changedTouches[0].clientX - this.touchStartX;
    const dy = event.changedTouches[0].clientY - this.touchStartY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < this.MIN_SWIPE_DISTANCE) return;
    const dir: 'up' | 'down' | 'left' | 'right' =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? 'right'
          : 'left'
        : dy > 0
          ? 'down'
          : 'up';
    void this.makeMove(dir);
  }

  private async makeMove(dir: 'up' | 'down' | 'left' | 'right'): Promise<void> {
    const gs = this.gameState();
    if (!gs || gs.isGameOver) return;
    const moved = this.gameService.move(gs, dir);
    if (moved) {
      this.gameState.set({ ...gs });
      this.saveGameState();
      await this.checkRewardTiers();
    }
  }

  /**
   * Submits the running score/tile to the backend on every move. The backend is
   * authoritative on reward thresholds (score-based) and the 7-day cooldown —
   * this just reflects whatever it decides back into the UI.
   */
  private async checkRewardTiers(): Promise<void> {
    const gs = this.gameState();
    if (!gs || !this.deviceToken || !this.canEarnRewards()) return;
    try {
      const result = await firstValueFrom(
        this.gameApi.submitScore(this.deviceToken, gs.score, gs.highestTile),
      );
      if (result.rewardEarned && result.couponCode) {
        this.canEarnRewards.set(false);
        const nextEligible = result.nextEligibleAt
          ? new Date(result.nextEligibleAt)
          : null;
        this.nextEligibleDate.set(nextEligible);
        if (nextEligible) {
          this.eligibilityMessage.set(
            `Play for fun! Next reward available on ${this.formatDate(nextEligible)}`,
          );
        }
        // Backend enum serializes as PascalCase (e.g. "CouponTypePizza"); the
        // template compares against the app's existing camelCase convention.
        const couponType =
          result.couponType === 'CouponTypePizza'
            ? 'couponTypePizza'
            : 'couponTypeBurger';
        this.rewardCouponCode.set(result.couponCode);
        this.rewardCouponType.set(couponType);
        this.rewardTileValue.set(result.highestTile);
        this.showRewardModal.set(true);
        this.showConfetti.set(true);
        setTimeout(() => this.showConfetti.set(false), 3000);
      }
    } catch {
      /* ignore */
    }
  }

  copyCouponCode(): void {
    const code = this.rewardCouponCode();
    if (navigator.clipboard && code) {
      navigator.clipboard.writeText(code).catch(() => this.fallbackCopy(code));
    } else {
      this.fallbackCopy(code);
    }
  }

  private fallbackCopy(text: string): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  private saveGameState(): void {
    const gs = this.gameState();
    if (gs && this.isPlaying()) {
      try {
        localStorage.setItem(
          this.GAME_STATE_KEY,
          JSON.stringify({
            gameState: gs,
            isPlaying: true,
            timestamp: Date.now(),
          }),
        );
      } catch {
        /* ignore */
      }
    }
  }

  private restoreSavedGame(): void {
    try {
      const saved = localStorage.getItem(this.GAME_STATE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as {
          gameState: GameState;
          isPlaying: boolean;
          timestamp: number;
        };
        if (data.timestamp && data.timestamp > Date.now() - 86400000) {
          this.gameState.set(data.gameState);
          this.isPlaying.set(data.isPlaying);
        } else {
          localStorage.removeItem(this.GAME_STATE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(this.GAME_STATE_KEY);
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatScore(score: number): string {
    return score.toLocaleString();
  }

  getTileClass(value: number): string {
    return `tile-${value}`;
  }

  shouldShowImage(value: number): boolean {
    return value === 2048 || value === 32768;
  }

  getTileImage(value: number): string {
    if (value === 2048) return 'assets/game/burger.svg';
    if (value === 32768) return 'assets/game/pizza.svg';
    return '';
  }

  getTilePosition(tile: Tile): Record<string, string> {
    const step = 80;
    return { top: `${tile.row * step}px`, left: `${tile.col * step}px` };
  }

  get tiles(): Tile[] {
    const gs = this.gameState();
    return gs ? this.gameService.getAllTiles(gs) : [];
  }

  trackByTileId(_index: number, tile: Tile): number {
    return tile.id;
  }
}
