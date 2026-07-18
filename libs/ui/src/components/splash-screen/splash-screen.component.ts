import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash-screen.component.html',
  styleUrls: ['./splash-screen.component.scss'],
})
export class SplashScreenComponent implements OnInit {
  @Output() splashComplete = new EventEmitter<void>();

  showSplash = true;

  ngOnInit() {
    const t0 = performance.now();
    console.log('[STARTUP] SplashScreen shown at', t0.toFixed(0), 'ms');
    // Hide splash screen after 500ms (reduced from 2500ms)
    setTimeout(() => {
      this.showSplash = false;
      console.log(
        '[STARTUP] SplashScreen hidden at',
        performance.now().toFixed(0),
        'ms (visible for',
        (performance.now() - t0).toFixed(0),
        'ms)',
      );
      // Wait for fade-out animation to complete
      setTimeout(() => {
        console.log(
          '[STARTUP] SplashScreen fully dismissed at',
          performance.now().toFixed(0),
          'ms',
        );
        this.splashComplete.emit();
      }, 500);
    }, 500);
  }
}
