import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-description-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" *ngIf="isOpen" (click)="onOverlayClick($event)">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3 class="dialog-title">{{ productName }}</h3>
          <button class="dialog-close-btn" (click)="closeDialog()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="dialog-body">
          <p class="description-text">{{ description }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
        animation: fadeIn 0.3s ease;
      }

      .dialog-content {
        background: white;
        border-radius: 16px;
        max-width: 90%;
        width: 400px;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease;
      }

      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem 1.5rem 1rem 1.5rem;
        border-bottom: 1px solid #f0f0f0;
      }

      .dialog-title {
        font-size: 1.2rem;
        font-weight: 700;
        color: #333;
        margin: 0;
        flex: 1;
        margin-right: 1rem;
      }

      .dialog-close-btn {
        background: #f5f5f5;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;

        .material-icons {
          font-size: 1.2rem;
          color: #666;
        }

        &:hover {
          background: #e0e0e0;
        }
      }

      .dialog-body {
        padding: 1rem 1.5rem 1.5rem 1.5rem;
        overflow-y: auto;
        max-height: calc(80vh - 100px);
      }

      .description-text {
        line-height: 1.6;
        color: #555;
        font-size: 1rem;
        margin: 0;
        white-space: pre-line;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (max-width: 480px) {
        .dialog-content {
          width: 95%;
          max-height: 85vh;
        }

        .dialog-header {
          padding: 1rem;
        }

        .dialog-body {
          padding: 1rem;
        }

        .dialog-title {
          font-size: 1.1rem;
        }
      }
    `,
  ],
})
export class DescriptionDialogComponent {
  @Input() isOpen = false;
  @Input() productName = '';
  @Input() description = '';
  @Output() closeEvent = new EventEmitter<void>();

  closeDialog(): void {
    this.closeEvent.emit();
  }

  onOverlayClick(event: Event): void {
    this.closeDialog();
  }
}
