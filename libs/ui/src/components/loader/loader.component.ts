import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader-wrapper" *ngIf="isLoading" [ngStyle]="getWrapperStyles()">
      <ng-container [ngSwitch]="type">
        <!-- Spinner Loader -->
        <svg *ngSwitchCase="'spinner'" [attr.width]="size" [attr.height]="size" viewBox="0 0 50 50" class="spinner">
          <circle 
            class="spinner-path" 
            cx="25" 
            cy="25" 
            r="20" 
            fill="none" 
            stroke-width="4" 
            [attr.stroke]="color"
          />
        </svg>
        
        <!-- Skeleton Loader -->
        <div *ngSwitchCase="'skeleton'" class="skeleton" [ngStyle]="getSkeletonStyles()"></div>
        
        <!-- Dots Loader -->
        <div *ngSwitchCase="'dots'" class="dots-loader">
          <div class="dot" [ngStyle]="{'background': color}"></div>
          <div class="dot" [ngStyle]="{'background': color}"></div>
          <div class="dot" [ngStyle]="{'background': color}"></div>
        </div>
        
        <!-- Pulse Loader -->
        <div *ngSwitchCase="'pulse'" class="pulse-loader" [ngStyle]="getPulseStyles()"></div>
        
        <!-- Custom Content -->
        <ng-content *ngSwitchDefault></ng-content>
      </ng-container>
    </div>
  `,
  styles: [`
    .loader-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10;
      background: rgba(255, 255, 255, 0.9);
    }

    .loader-wrapper.overlay {
      background: rgba(255, 255, 255, 0.8);
    }

    /* Spinner Animation */
    .spinner {
      animation: rotate 1s linear infinite;
    }

    .spinner-path {
      stroke-linecap: round;
      stroke-dasharray: 90, 150;
      stroke-dashoffset: 0;
      animation: dash 1.5s ease-in-out infinite;
    }

    @keyframes rotate {
      100% { transform: rotate(360deg); }
    }

    @keyframes dash {
      0% {
        stroke-dasharray: 1, 150;
        stroke-dashoffset: 0;
      }
      50% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -35;
      }
      100% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -124;
      }
    }

    /* Skeleton Animation */
    .skeleton {
      width: 100%;
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* Dots Loader */
    .dots-loader {
      display: flex;
      gap: 8px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }

    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    /* Pulse Loader */
    .pulse-loader {
      border-radius: 50%;
      animation: pulse 1.2s ease-in-out infinite;
    }

    @keyframes pulse {
      0% {
        transform: scale(0.8);
        opacity: 1;
      }
      50% {
        transform: scale(1);
        opacity: 0.5;
      }
      100% {
        transform: scale(0.8);
        opacity: 1;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent {
  @Input() size: number = 40;
  @Input() type: 'spinner' | 'skeleton' | 'dots' | 'pulse' = 'spinner';
  @Input() color: string = '#1976d2';
  @Input() isLoading: boolean = true;
  @Input() overlay: boolean = false;

  getWrapperStyles() {
    return this.overlay ? { background: 'rgba(255, 255, 255, 0.8)' } : {};
  }

  getSkeletonStyles() {
    return {
      width: this.size + 'px',
      height: this.size + 'px'
    };
  }

  getPulseStyles() {
    return {
      width: this.size + 'px',
      height: this.size + 'px',
      background: this.color
    };
  }
}
