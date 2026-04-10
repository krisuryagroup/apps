import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-no-internet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './no-internet.component.html',
  styleUrls: ['./no-internet.component.scss']
})
export class NoInternetComponent {
  @Output() retry = new EventEmitter<void>();

  onRetry() {
    this.retry.emit();
  }
}
