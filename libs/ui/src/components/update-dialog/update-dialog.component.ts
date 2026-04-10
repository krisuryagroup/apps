import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Update Dialog Component
 * Displays a blocking dialog for mandatory updates or dismissible dialog for optional updates
 * Only shown on Android app, never on web/browser
 */
@Component({
  selector: 'app-update-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './update-dialog.component.html',
  styleUrls: ['./update-dialog.component.scss']
})
export class UpdateDialogComponent {
  @Input() message: string = '';
  @Input() isMandatory: boolean = false;
  @Input() updateButtonText: string = 'Update Now';
  @Input() laterButtonText: string = 'Later';
  
  @Output() update = new EventEmitter<void>();
  @Output() later = new EventEmitter<void>();

  onUpdate() {
    this.update.emit();
  }

  onLater() {
    if (!this.isMandatory) {
      this.later.emit();
    }
  }
}
