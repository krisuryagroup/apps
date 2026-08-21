import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppSettingsService } from '@zitro/services';
import { CacheManagerService } from '@zitro/services';
import { CacheType } from '@zitro/models';

/**
 * Local, single-device cache/login debug actions. The global force-logout / cache-clear
 * admin triggers that used to live here moved to zitro-superadmin's Remote Settings screen
 * (real Admin JWT auth) — those affect every device, not just this one, so they don't belong
 * behind an unauthenticated customer-app route.
 */
@Component({
  selector: 'app-cache-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cache-management-container">
      <h3>🔧 Cache Management (Development Only)</h3>

      <!-- Quick Actions -->
      <div class="section">
        <h4>Quick Actions</h4>
        <div class="action-buttons">
          <button
            class="btn btn-warning"
            (click)="clearCache()"
            [disabled]="isProcessing"
          >
            {{ isProcessing ? 'Clearing...' : '🗑️ Clear Cache (Keep Login)' }}
          </button>

          <button
            class="btn btn-danger"
            (click)="forceLogout()"
            [disabled]="isProcessing"
          >
            {{
              isProcessing ? 'Logging out...' : '🚪 Force Logout (This Device)'
            }}
          </button>

          <button class="btn btn-info" (click)="refreshStats()">
            🔄 Refresh Stats
          </button>
        </div>
      </div>

      <!-- Cache Statistics -->
      <div class="section" *ngIf="cacheStats">
        <h4>📊 Cache Statistics</h4>
        <div
          class="timestamp-info"
          *ngIf="cacheStats.lastCacheRefreshTimestamp"
        >
          <strong>Last Firebase Refresh:</strong>
          {{ formatTimestamp(cacheStats.lastCacheRefreshTimestamp) }}
        </div>

        <div class="cache-grid">
          <div class="cache-card" *ngFor="let type of cacheTypes">
            <div class="cache-header">
              <span class="cache-name">{{ type }}</span>
              <span
                class="cache-status"
                [class.enabled]="getCacheInfo(type)?.enabled"
              >
                {{ getCacheInfo(type)?.enabled ? '✅' : '❌' }}
              </span>
            </div>
            <div class="cache-details">
              <div class="detail-row">
                <span>Duration:</span>
                <strong>{{ getCacheInfo(type)?.duration || 0 }}h</strong>
              </div>
              <div class="detail-row">
                <span>Force Refresh:</span>
                <strong>{{
                  getCacheInfo(type)?.forceRefresh ? 'Yes' : 'No'
                }}</strong>
              </div>
              <div
                class="detail-row"
                *ngIf="getCacheInfo(type)?.lastForceRefreshCheck"
              >
                <span>Last Check:</span>
                <strong>{{
                  formatDate(getCacheInfo(type)?.lastForceRefreshCheck)
                }}</strong>
              </div>
            </div>
            <button
              class="btn btn-sm btn-clear"
              (click)="clearSpecificCache(type)"
              [disabled]="isProcessing"
            >
              Clear {{ type }}
            </button>
          </div>
        </div>
      </div>

      <div class="section info-section">
        <h4>🔐 Force Logout / Cache Clear (All Devices)</h4>
        <p>
          Moved to <strong>zitro-superadmin → Remote Settings</strong> — those
          triggers affect every device, not just this one, and now require a
          real Admin JWT instead of an open, unauthenticated route.
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .cache-management-container {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      }

      h3 {
        color: #333;
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
      }

      h4 {
        color: #555;
        margin-bottom: 1rem;
        font-size: 1.2rem;
      }

      .section {
        margin-bottom: 2rem;
        padding-bottom: 2rem;
        border-bottom: 1px solid #eee;

        &:last-child {
          border-bottom: none;
        }
      }

      .action-buttons {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .btn {
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
        font-size: 0.95rem;

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .btn-sm {
        padding: 8px 16px;
        font-size: 0.85rem;
      }

      .btn-warning {
        background: #ff9800;
        color: white;

        &:hover:not(:disabled) {
          background: #f57c00;
        }
      }
      .btn-danger {
        background: #f44336;
        color: white;

        &:hover:not(:disabled) {
          background: #d32f2f;
        }
      }

      .btn-info {
        background: #2196f3;
        color: white;

        &:hover:not(:disabled) {
          background: #1976d2;
        }
      }

      .btn-clear {
        background: #9e9e9e;
        color: white;
        width: 100%;
        margin-top: 0.5rem;

        &:hover:not(:disabled) {
          background: #757575;
        }
      }

      .timestamp-info {
        background: #e3f2fd;
        padding: 0.75rem;
        border-radius: 4px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
      }

      .cache-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }

      .cache-card {
        background: #f9f9f9;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        padding: 1rem;
        transition: all 0.2s;

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      }

      .cache-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #e0e0e0;
      }

      .cache-name {
        font-weight: 600;
        color: #333;
        font-size: 0.95rem;
      }

      .cache-status {
        font-size: 1.2rem;

        &.enabled {
          color: #4caf50;
        }
      }

      .cache-details {
        margin-bottom: 0.5rem;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 0.25rem 0;
        font-size: 0.85rem;

        span {
          color: #666;
        }

        strong {
          color: #333;
        }
      }

      .info-section {
        background: #f5f5f5;
        padding: 1.5rem;
        border-radius: 6px;

        p {
          margin: 0;
          color: #555;
          line-height: 1.5;
        }
      }
    `,
  ],
})
export class CacheManagementComponent implements OnInit {
  private appSettingsService = inject(AppSettingsService);
  private cacheManager = inject(CacheManagerService);

  isProcessing = false;
  cacheStats: any = null;
  cacheTypes: string[] = Object.values(CacheType);

  ngOnInit() {
    this.refreshStats();
  }

  refreshStats() {
    this.cacheStats = this.cacheManager.getCacheStats();
  }

  getCacheInfo(cacheType: string) {
    return this.cacheStats?.caches?.[cacheType];
  }

  formatTimestamp(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const seconds = timestamp._seconds || timestamp.seconds;
    if (!seconds) return 'N/A';
    return new Date(seconds * 1000).toLocaleString();
  }

  formatDate(timestamp: number): string {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  }

  async clearSpecificCache(cacheType: string) {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      this.cacheManager.refreshCache(cacheType as CacheType);
      this.refreshStats();
      console.log(`✅ Cleared cache for: ${cacheType}`);
    } catch (error) {
      console.error('Error clearing specific cache:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async clearCache() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      await this.appSettingsService.manualCacheClear();
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async forceLogout() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      await this.appSettingsService.manualLogout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}
