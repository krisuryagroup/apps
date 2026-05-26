import {
  Component,
  HostListener,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Game2048Service, GameState, Tile } from '@zitro/services';
import {
  GameRewardService,
  EligibilityStatus,
  CouponReward,
} from '@zitro/services';
import { UserManagementService } from '@zitro/services';
import { AppSettingsService } from '@zitro/services';

@Component({
  selector: 'app-game-2048',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-2048.component.html',
  styleUrls: ['./game-2048.component.scss'],
})
export class Game2048Component implements OnInit, OnDestroy {
  private gameService = inject(Game2048Service);
  private rewardService = inject(GameRewardService);
  private userManagementService = inject(UserManagementService);
  private appSettingsService = inject(AppSettingsService);
  private router = inject(Router);

  // Authentication state
  isAuthenticated = false;
  isTestUser = false;
  currentUserUid: string | null = null;
  currentUserPhone: string | null = null;
  displayName = 'User';
  email = '';
  phoneNumber = '';

  // Game state
  gameState: GameState | null = null;
  isPlaying = false;

  // Eligibility state
  isEligible = false; // Can start a new game
  canEarnRewards = false; // Can earn rewards in current/next game
  nextEligibleDate: Date | null = null;
  eligibilityMessage = '';

  // Reward state
  showRewardModal = false;
  rewardCouponCode = '';
  rewardCouponType = '';
  rewardTileValue = 0;
  showConfetti = false;

  // Track rewards awarded in current session to prevent duplicates
  private awardedRewards = new Set<number>();

  // Touch handling for mobile swipe
  private touchStartX = 0;
  private touchStartY = 0;
  private readonly MIN_SWIPE_DISTANCE = 30;

  // LocalStorage key for game state
  private readonly GAME_STATE_KEY = 'game2048_state';

  async ngOnInit() {
    await this.checkAuthentication();

    if (this.isAuthenticated) {
      // TODO remove below commented checkEligibilityStatus
      await this.checkEligibilityStatus();
      // Try to restore saved game
      this.restoreSavedGame();
    }
  }

  ngOnDestroy() {
    // Save game state when component is destroyed
    this.saveGameState();
  }

  /**
   * Check if user is authenticated and is a test user
   */
  private async checkAuthentication(): Promise<void> {
    try {
      // Use UserManagementService to check authentication
      this.isAuthenticated = await this.userManagementService.isLoggedIn();

      if (this.isAuthenticated) {
        // Get user phone number
        this.currentUserPhone =
          await this.userManagementService.getCurrentUserPhone();

        if (this.currentUserPhone) {
          // Get user profile data
          const userData = await this.userManagementService.getUserData(
            this.currentUserPhone,
          );

          if (userData) {
            this.currentUserUid = userData.uid;
            this.displayName = userData.name || 'User';
            this.email = userData.email || '';
            this.phoneNumber = userData.phoneNumber || '';
          }

          // Check if user is a test user
          const testPhoneNumbers =
            await this.appSettingsService.getTestPhoneNumbers();
          const phoneWithoutPrefix = this.currentUserPhone.replace('+91', '');
          this.isTestUser = testPhoneNumbers.includes(phoneWithoutPrefix);

          console.log('🎮 Test User Check:', {
            phone: phoneWithoutPrefix,
            isTestUser: this.isTestUser,
            testNumbers: testPhoneNumbers,
          });
        }
      }

      console.log('🎮 Game Auth Check:', {
        isAuthenticated: this.isAuthenticated,
        isTestUser: this.isTestUser,
        phone: this.currentUserPhone,
        uid: this.currentUserUid,
      });
    } catch (error) {
      console.error('Error checking authentication:', error);
      this.isAuthenticated = false;
    }
  }

  /**
   * Check eligibility to play and win rewards
   */
  private async checkEligibilityStatus(): Promise<void> {
    if (!this.currentUserUid) return;

    try {
      const status: EligibilityStatus =
        await this.rewardService.checkEligibility(this.currentUserUid);

      // Always allow gameplay for fun
      this.isEligible = true;

      // Check if user can earn rewards
      this.canEarnRewards = status.isEligible;
      this.nextEligibleDate = status.nextEligibleDate;

      if (!status.isEligible && status.nextEligibleDate) {
        this.eligibilityMessage = `Play for fun! Next reward available on ${this.formatDate(status.nextEligibleDate)}`;
      } else {
        this.eligibilityMessage = '';
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      this.isEligible = true; // Allow play on error
      this.canEarnRewards = false; // Don't allow rewards on error
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Navigate to login
   */
  goToLogin(): void {
    this.router.navigate(['/auth/signin']);
  }

  /**
   * Start a new game
   */
  startGame(): void {
    if (!this.isAuthenticated || !this.isEligible) return;

    this.gameState = this.gameService.initializeGame();
    this.isPlaying = true;
    this.awardedRewards.clear(); // Reset awarded rewards for new game
    this.saveGameState();
  }

  /**
   * Restart the game
   */
  restartGame(): void {
    this.gameState = this.gameService.initializeGame();
    this.isPlaying = true;

    // Only clear awarded rewards if user can still earn rewards
    // This prevents exploiting restart to get multiple coupons in one session
    if (this.canEarnRewards) {
      this.awardedRewards.clear();
    }

    this.saveGameState();
  }

  /**
   * Continue playing after winning
   */
  continueGame(): void {
    if (this.gameState) {
      this.gameState.hasWon = false;
      this.gameState.canContinue = true;
      this.saveGameState();
      this.closeRewardModal();
    }
  }

  /**
   * Save game state to localStorage
   */
  private saveGameState(): void {
    if (this.gameState && this.isPlaying) {
      try {
        localStorage.setItem(
          this.GAME_STATE_KEY,
          JSON.stringify({
            gameState: this.gameState,
            isPlaying: this.isPlaying,
            timestamp: Date.now(),
          }),
        );
      } catch (error) {
        console.error('Failed to save game state:', error);
      }
    }
  }

  /**
   * Restore saved game from localStorage
   */
  private restoreSavedGame(): void {
    try {
      const saved = localStorage.getItem(this.GAME_STATE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        // Only restore if saved within last 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (data.timestamp && data.timestamp > oneDayAgo) {
          this.gameState = data.gameState;
          this.isPlaying = data.isPlaying;
          console.log('✅ Restored saved game from', new Date(data.timestamp));
        } else {
          // Clear old saved game
          localStorage.removeItem(this.GAME_STATE_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to restore game state:', error);
      localStorage.removeItem(this.GAME_STATE_KEY);
    }
  }

  /**
   * Clear saved game state
   */
  private clearSavedGame(): void {
    localStorage.removeItem(this.GAME_STATE_KEY);
  }

  /**
   * Handle keyboard input
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    if (!this.isPlaying || !this.gameState) return;

    let direction: 'up' | 'down' | 'left' | 'right' | null = null;

    switch (event.key) {
      case 'ArrowUp':
        direction = 'up';
        break;
      case 'ArrowDown':
        direction = 'down';
        break;
      case 'ArrowLeft':
        direction = 'left';
        break;
      case 'ArrowRight':
        direction = 'right';
        break;
    }

    if (direction) {
      //event.preventDefault();
      this.makeMove(direction);
    }
  }

  /**
   * Handle touch start for mobile swipe
   */
  @HostListener('touchstart', ['$event'])
  handleTouchStart(event: TouchEvent): void {
    if (!this.isPlaying || !this.gameState) return;

    //event.preventDefault(); // Prevent page scrolling
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
  }

  /**
   * Handle touch end for mobile swipe
   */
  @HostListener('touchend', ['$event'])
  handleTouchEnd(event: TouchEvent): void {
    if (!this.isPlaying || !this.gameState) return;

    //event.preventDefault(); // Prevent page scrolling
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (Math.max(absDeltaX, absDeltaY) < this.MIN_SWIPE_DISTANCE) {
      return; // Not a swipe
    }

    let direction: 'up' | 'down' | 'left' | 'right';

    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      // Vertical swipe
      direction = deltaY > 0 ? 'down' : 'up';
    }

    this.makeMove(direction);
  }

  /**
   * Make a move in the specified direction
   */
  private async makeMove(
    direction: 'up' | 'down' | 'left' | 'right',
  ): Promise<void> {
    if (!this.gameState || this.gameState.isGameOver) return;

    const moved = this.gameService.move(this.gameState, direction);

    if (moved) {
      // Save game state after each move
      this.saveGameState();

      // TODO uncomment checkRewardTiers
      // Check for reward tiers
      await this.checkRewardTiers();

      // Trigger change detection
      this.gameState = { ...this.gameState };
    }
  }

  /**
   * Check if player achieved reward tier
   */
  private async checkRewardTiers(): Promise<void> {
    if (!this.gameState || !this.currentUserUid) return;

    const highestTile = this.gameState.highestTile;

    // Check if reached reward tier 2 (32768 - Pizza) and not yet awarded
    if (highestTile >= 32768 && !this.awardedRewards.has(32768)) {
      // TODO
      await this.awardReward('couponTypePizza', 32768);
    }
    // Check if reached reward tier 1 (2048 - Burger) and not yet awarded
    else if (highestTile >= 2048 && !this.awardedRewards.has(2048)) {
      // TODO
      await this.awardReward('couponTypeBurger', 2048);
    }
  }

  /**
   * Award reward to player
   */
  private async awardReward(
    couponType: 'couponTypeBurger' | 'couponTypePizza',
    tileValue: number,
  ): Promise<void> {
    if (!this.currentUserUid || !this.gameState) return;

    // Skip if already awarded in this session
    if (this.awardedRewards.has(tileValue)) {
      return;
    }

    // Check if user can earn rewards (both rewards not given in last week)
    if (!this.canEarnRewards) {
      console.log(
        '🎮 Cannot earn rewards - both rewards already given in last week',
      );
      return;
    }

    try {
      const reward: CouponReward = await this.rewardService.awardCoupon(
        this.currentUserUid,
        this.displayName,
        this.email,
        this.phoneNumber,
        this.gameState.highestTile,
        this.gameState.score,
        couponType,
      );

      // Mark this reward tier as awarded in current session
      this.awardedRewards.add(tileValue);

      // Mark as cannot earn more rewards (but current game can continue)
      this.canEarnRewards = false;

      // Update next eligible date for future games
      this.nextEligibleDate = reward.nextEligibleAt;

      // Update eligibility message but DON'T clear the saved game or stop playing
      // This allows the player to continue playing in the current session towards next tier
      this.eligibilityMessage = `Play for fun! Next reward available on ${this.formatDate(reward.nextEligibleAt)}`;

      // Show reward modal
      this.rewardCouponCode = reward.couponCode;
      this.rewardCouponType = couponType;
      this.rewardTileValue = tileValue;
      this.showRewardModal = true;
      this.showConfetti = true;

      // Hide confetti after 3 seconds
      setTimeout(() => {
        this.showConfetti = false;
      }, 3000);
    } catch (error) {
      console.error('Error awarding reward:', error);
    }
  }

  /**
   * Close reward modal and allow game to continue
   */
  closeRewardModal(): void {
    this.showRewardModal = false;
    this.showConfetti = false;

    // Allow game to continue after dismissing reward modal
    if (this.gameState) {
      this.gameState.canContinue = true;
      this.saveGameState();
    }
  }

  /**
   * Copy coupon code to clipboard
   */
  copyCouponCode(): void {
    if (navigator.clipboard && this.rewardCouponCode) {
      navigator.clipboard
        .writeText(this.rewardCouponCode)
        .then(() => {
          alert('Coupon code copied to clipboard!');
        })
        .catch((err) => {
          console.error('Failed to copy:', err);
        });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = this.rewardCouponCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Coupon code copied!');
    }
  }

  /**
   * Get tile color class based on value
   */
  getTileClass(value: number): string {
    return `tile-${value}`;
  }

  /**
   * Check if tile should show image instead of number
   */
  shouldShowImage(value: number): boolean {
    return value === 2048 || value === 32768;
  }

  /**
   * Get image for tile
   */
  getTileImage(value: number): string {
    if (value === 2048) {
      return 'assets/game/burger.svg';
    } else if (value === 32768) {
      return 'assets/game/pizza.svg';
    }
    return '';
  }

  /**
   * Get position style for tile
   */
  getTilePosition(tile: Tile): any {
    // Each position = (cellSize + gap) * position
    // Using 70px cells + 10px gap = 80px per step
    const step = 80;

    return {
      top: `${tile.row * step}px`,
      left: `${tile.col * step}px`,
    };
  }

  /**
   * Get all tiles for rendering
   */
  get tiles(): Tile[] {
    if (!this.gameState) return [];
    return this.gameService.getAllTiles(this.gameState);
  }

  /**
   * Format score with commas
   */
  formatScore(score: number): string {
    return score.toLocaleString();
  }

  /**
   * TrackBy function for tile rendering
   */
  trackByTileId(index: number, tile: Tile): number {
    return tile.id;
  }
}
