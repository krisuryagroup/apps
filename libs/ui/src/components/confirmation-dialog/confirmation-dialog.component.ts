import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="confirmation-overlay" [class.show]="isVisible" (click)="onOverlayClick($event)">
      <div class="confirmation-dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>{{ title }}</h3>
        </div>
        <div class="dialog-body">
          <p>{{ message }}</p>
        </div>
        <div class="dialog-actions">
          <button class="cancel-btn" (click)="onCancel()">
            {{ cancelText }}
          </button>
          <button class="confirm-btn" (click)="onConfirm()">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  @Input() isVisible = false;
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';

  @Output() confirmed = new EventEmitter<boolean>();

  onConfirm() {
    this.confirmed.emit(true);
    this.isVisible = false;
  }

  onCancel() {
    this.confirmed.emit(false);
    this.isVisible = false;
  }

  onOverlayClick(event: Event) {
    // Close dialog when clicking outside
    this.onCancel();
  }
}
