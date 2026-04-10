import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppSettingsService } from '@zitro/services';

@Component({
  selector: 'app-cancel-order-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" *ngIf="isOpen" (click)="onOverlayClick($event)">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>Cancel Order</h3>
          <button class="close-btn" (click)="onClose()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
        
        <div class="dialog-body">
          <div class="warning-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#ff9800" stroke-width="2"/>
              <path d="M12 8v4M12 16h.01" stroke="#ff9800" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          
          <p class="dialog-message">
            {{ confirmationMessage }}
          </p>
          
          <div class="order-info">
            <strong>Order ID:</strong> {{ orderId }}<br>
            <strong>Time Remaining:</strong> {{ timeRemaining }} second{{ timeRemaining !== 1 ? 's' : '' }}
          </div>
          
          <p class="refund-info">
            <span *ngFor="let info of refundInfoMessages; let i = index">
              • {{ info }}<br *ngIf="i < refundInfoMessages.length - 1" />
            </span>
          </p>
        </div>
        
        <div class="dialog-actions">
          <button class="btn-secondary" (click)="onClose()">Keep Order</button>
          <button class="btn-danger" (click)="onConfirm()" [disabled]="isProcessing">
            {{ isProcessing ? 'Cancelling...' : 'Cancel Order' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 1rem;
    }
    
    .dialog-content {
      background: white;
      border-radius: 12px;
      max-width: 400px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 1.5rem 0;
      
      h3 {
        margin: 0;
        color: #333;
        font-size: 1.25rem;
        font-weight: 600;
      }
      
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
        color: #666;
        border-radius: 4px;
        transition: background-color 0.2s;
        
        &:hover {
          background: #f0f0f0;
        }
      }
    }
    
    .dialog-body {
      padding: 1.5rem;
      text-align: center;
      
      .warning-icon {
        margin-bottom: 1rem;
      }
      
      .dialog-message {
        font-size: 1.1rem;
        color: #333;
        margin-bottom: 1rem;
        font-weight: 500;
      }
      
      .order-info {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        text-align: left;
        font-size: 0.9rem;
        color: #555;
      }
      
      .refund-info {
        font-size: 0.85rem;
        color: #666;
        text-align: left;
        line-height: 1.5;
        margin: 0;
      }
    }
    
    .dialog-actions {
      display: flex;
      gap: 1rem;
      padding: 0 1.5rem 1.5rem;
      
      button {
        flex: 1;
        padding: 0.75rem 1rem;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        
        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
      
      .btn-secondary {
        background: #f0f0f0;
        color: #333;
        
        &:hover:not(:disabled) {
          background: #e0e0e0;
        }
      }
      
      .btn-danger {
        background: #f44336;
        color: white;
        
        &:hover:not(:disabled) {
          background: #d32f2f;
        }
      }
    }
    
    @media (max-width: 480px) {
      .dialog-overlay {
        padding: 0.5rem;
      }
      
      .dialog-actions {
        flex-direction: column;
        
        button {
          width: 100%;
        }
      }
    }
  `]
})
export class CancelOrderDialogComponent implements OnInit {
  @Input() isOpen = false;
  @Input() orderId = '';
  @Input() timeRemaining = 0;
  @Input() isProcessing = false;
  
  @Output() closeEvent = new EventEmitter<void>();
  @Output() confirmEvent = new EventEmitter<void>();

  confirmationMessage: string = 'Are you sure you want to cancel this order?';
  refundInfoMessages: string[] = [];

  constructor(private appSettingsService: AppSettingsService) {}

  async ngOnInit() {
    // Load messages from Firebase config
    await this.loadMessages();
  }

  async loadMessages() {
    try {
      // Get cancellation time limit for placeholder replacement
      const timeLimit = await this.appSettingsService.getOrderCancellationTimeLimit();
      
      // Load confirmation message
      this.confirmationMessage = await this.appSettingsService.getOrderCancellationMessage('confirmationPrompt');
      
      // Load refund info messages with time placeholder replaced
      this.refundInfoMessages = await this.appSettingsService.getRefundInfoMessages(timeLimit);
    } catch (error) {
      console.error('Error loading cancellation messages:', error);
      // Keep default messages if loading fails
      this.refundInfoMessages = [
        'Orders can only be cancelled within configured time of placing',
        'Your refund will be processed if payment was made online',
        'This action cannot be undone'
      ];
    }
  }

  onClose() {
    this.closeEvent.emit();
  }

  onConfirm() {
    this.confirmEvent.emit();
  }

  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
