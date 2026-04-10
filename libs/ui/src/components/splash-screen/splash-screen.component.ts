import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash-screen.component.html',
  styleUrls: ['./splash-screen.component.scss']
})
export class SplashScreenComponent implements OnInit {
  @Output() splashComplete = new EventEmitter<void>();
  
  showSplash = true;

  ngOnInit() {
    // Hide splash screen after 2.5 seconds
    setTimeout(() => {
      this.showSplash = false;
      // Wait for fade-out animation to complete
      setTimeout(() => {
        this.splashComplete.emit();
      }, 500);
    }, 2500);
  }
}
