import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-view-all-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-all-card.component.html',
  styleUrls: ['./view-all-card.component.scss'],
})
export class ViewAllCardComponent {
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() variant: 'circular' | 'rounded' | 'card' = 'rounded';
  @Input() icon = 'apps';
  @Input() label = 'View All';
  @Input() description?: string;
  @Input() showLabel = true;

  @Output() clicked = new EventEmitter<void>();

  onClick(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.clicked.emit();
  }
}
