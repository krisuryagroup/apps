import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-truncated-text',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="truncated-text">
      {{ displayText }}
      <span
        *ngIf="shouldTruncate && !showFullText"
        class="read-more-btn"
        (click)="onReadMore()"
      >
        ... read more
      </span>
      <span
        *ngIf="shouldTruncate && showFullText && !showInDialog"
        class="read-less-btn"
        (click)="showLess()"
      >
        read less
      </span>
    </span>
  `,
  styles: [
    `
      .truncated-text {
        line-height: 1.4;
        color: #666;
        font-size: 0.9rem;
      }

      .read-more-btn,
      .read-less-btn {
        color: #009688;
        font-weight: 600;
        cursor: pointer;
        transition: color 0.2s ease;
        margin-left: 2px;

        &:hover {
          color: #00695c;
          text-decoration: underline;
        }
      }
    `,
  ],
})
export class TruncatedTextComponent {
  @Input() text = '';
  @Input() maxLength = 100;
  @Input() showInDialog = true; // Default to dialog mode
  @Output() showDialogEvent = new EventEmitter<{
    text: string;
    productName?: string;
  }>();

  showFullText = false;

  get shouldTruncate(): boolean {
    return this.text.length > this.maxLength;
  }

  get displayText(): string {
    if (!this.shouldTruncate || this.showFullText) {
      return this.text;
    }
    return this.text.substring(0, this.maxLength);
  }

  onReadMore(): void {
    if (this.showInDialog) {
      this.showDialogEvent.emit({ text: this.text });
    } else {
      this.showFullText = true;
    }
  }

  showLess(): void {
    this.showFullText = false;
  }
}
