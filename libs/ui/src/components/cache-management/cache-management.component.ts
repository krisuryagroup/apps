import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppSettingsService } from '@zitro/services';
import { CacheManagerService } from '@zitro/services';
import { CacheType } from '@zitro/models';

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
            [disabled]="isProcessing">
            {{ isProcessing ? 'Clearing...' : '🗑️ Clear Cache (Keep Login)' }}
          </button>
          
          <button 
            class="btn btn-danger" 
            (click)="forceLogout()"
            [disabled]="isProcessing">
            {{ isProcessing ? 'Logging out...' : '🚪 Force Logout (This Device)' }}
          </button>

          <button 
            class="btn btn-info" 
            (click)="refreshStats()">
            🔄 Refresh Stats
          </button>
        </div>
      </div>

      <!-- Admin Actions (Force Logout All Devices) -->
      <div class="section admin-section">
        <h4>🔐 Admin Actions - Force Logout All Devices</h4>
        <div class="warning-box">
          <p>⚠️ <strong>Warning:</strong> This will force logout ALL users on ALL devices on their next app launch.</p>
          <p>Each device will logout ONCE when they detect the new timestamp.</p>
        </div>
        <div class="admin-actions">
          <button 
            class="btn btn-critical" 
            (click)="triggerForceLogoutAllDevices()"
            [disabled]="isProcessing">
            {{ isProcessing ? 'Processing...' : '🚨 Trigger Force Logout (All Devices)' }}
          </button>
          <div class="action-info">
            <small>This updates Firebase to enable force logout and sets a new timestamp.</small>
          </div>
        </div>
      </div>

      <!-- Cache Statistics -->
      <div class="section" *ngIf="cacheStats">
        <h4>📊 Cache Statistics</h4>
        <div class="timestamp-info" *ngIf="cacheStats.lastCacheRefreshTimestamp">
          <strong>Last Firebase Refresh:</strong> 
          {{ formatTimestamp(cacheStats.lastCacheRefreshTimestamp) }}
        </div>
        
        <div class="cache-grid">
          <div class="cache-card" *ngFor="let type of cacheTypes">
            <div class="cache-header">
              <span class="cache-name">{{ type }}</span>
              <span class="cache-status" [class.enabled]="getCacheInfo(type)?.enabled">
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
                <strong>{{ getCacheInfo(type)?.forceRefresh ? 'Yes' : 'No' }}</strong>
              </div>
              <div class="detail-row" *ngIf="getCacheInfo(type)?.lastForceRefreshCheck">
                <span>Last Check:</span>
                <strong>{{ formatDate(getCacheInfo(type)?.lastForceRefreshCheck) }}</strong>
              </div>
            </div>
            <button 
              class="btn btn-sm btn-clear"
              (click)="clearSpecificCache(type)"
              [disabled]="isProcessing">
              Clear {{ type }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Firebase Configuration Guide -->
      <div class="section info-section">
        <h4>📝 Firebase Configuration Guide</h4>
        
        <div class="config-example">
          <h5>Structure:</h5>
          <pre>{{ firebaseConfigExample }}</pre>
        </div>

        <div class="how-it-works">
          <h5>How Force Refresh Works:</h5>
          <ol>
            <li>Set <code>forceRefresh.cacheType</code> to <code>true</code> in Firebase</li>
            <li>Update <code>lastCacheRefreshTimestamp</code> to current time</li>
            <li>Each device clears cache once when detecting new timestamp</li>
            <li>No need to reset flags - only triggers on timestamp update</li>
          </ol>
        </div>

        <div class="how-it-works">
          <h5>Global Clear Options:</h5>
          <ul>
            <li><code>enableCache.clearAll</code>: Clears ALL localStorage</li>
            <li><code>forceRefresh.clearAll</code>: Clears all cache types</li>
          </ul>
        </div>

        <div class="how-it-works">
          <h5>Force Logout All Devices:</h5>
          <ol>
            <li>Use the "Trigger Force Logout (All Devices)" button above</li>
            <li>This sets <code>isLoginClearCacheMandatoryForOnlineOrder</code> to <code>true</code></li>
            <li>Updates <code>lastUpdated</code> timestamp in Firebase</li>
            <li>Each device logs out ONCE when detecting the new timestamp</li>
            <li>Devices won't logout again unless timestamp is updated</li>
          </ol>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cache-management-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
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

    h5 {
      color: #666;
      margin: 1rem 0 0.5rem;
      font-size: 1rem;
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

    .admin-section {
      background: #fff3cd;
      padding: 1.5rem;
      border-radius: 8px;
      border: 2px solid #ffc107;
    }

    .warning-box {
      background: #fff3cd;
      border: 2px solid #ff9800;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;

      p {
        margin: 0.5rem 0;
        color: #856404;
      }

      strong {
        color: #d32f2f;
      }
    }

    .admin-actions {
      margin-top: 1rem;
    }

    .action-info {
      margin-top: 0.5rem;
      
      small {
        color: #666;
        font-style: italic;
      }
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
      background: #dc3545;
      color: white;
      
      &:hover:not(:disabled) {
        background: #c82333;
      }
    }

    .btn-critical {
      background: #d32f2f;
      color: white;
      font-weight: 600;
      font-size: 1rem;
      padding: 0.75rem 1.5rem;
      border: 2px solid #b71c1c;
      
      &:hover:not(:disabled) {
        background: #b71c1c;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(211, 47, 47, 0.3);
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
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
    }

    .config-example pre {
      background: #263238;
      color: #aed581;
      padding: 1rem;
      border-radius: 4px;
      font-size: 0.85rem;
      overflow-x: auto;
      line-height: 1.5;
    }

    .how-it-works {
      margin-top: 1rem;

      ol, ul {
        margin: 0.5rem 0 0 1.5rem;
        
        li {
          margin-bottom: 0.5rem;
          color: #555;
          line-height: 1.5;
        }
      }

      code {
        background: #e0e0e0;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        font-size: 0.9em;
        color: #d32f2f;
      }
    }
  `]
})
export class CacheManagementComponent implements OnInit {
  isProcessing = false;
  cacheStats: any = null;
  cacheTypes: string[] = Object.values(CacheType);

  firebaseConfigExample = `{
  "cacheManagement": {
    "cacheDurations": {
      "banners": 168,
      "products": 9000,
      "categories": 9000,
      "coupons": 24
    },
    "enableCache": {
      "banners": true,
      "products": true,
      "clearAll": false
    },
    "forceRefresh": {
      "banners": false,
      "products": false,
      "clearAll": false
    },
    "lastCacheRefreshTimestamp": {
      "_seconds": 1705395600,
      "_nanoseconds": 0
    }
  }
}`;

  constructor(
    private appSettingsService: AppSettingsService,
    private cacheManager: CacheManagerService
  ) {}

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

  async triggerForceLogoutAllDevices() {
    if (this.isProcessing) return;

    // Confirm action
    const confirmed = confirm(
      '⚠️ WARNING: This will force logout ALL users on ALL devices!\n\n' +
      'Each device will logout once on their next app launch.\n\n' +
      'Are you sure you want to proceed?'
    );

    if (!confirmed) {
      return;
    }

    this.isProcessing = true;
    try {
      await this.appSettingsService.triggerForceLogoutAllDevices();
      alert(
        '✅ Force logout triggered successfully!\n\n' +
        'All users will be logged out on their next app launch.\n' +
        'Each device will logout ONCE when they detect the new timestamp.'
      );
      console.log('✅ Force logout triggered for all devices');
    } catch (error) {
      console.error('❌ Error triggering force logout:', error);
      alert(
        '❌ Failed to trigger force logout.\n\n' +
        'Error: ' + (error as Error).message
      );
    } finally {
      this.isProcessing = false;
    }
  }
}
