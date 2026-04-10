import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZoomableImageComponent, ZoomableImageConfig } from '../zoomable-image/zoomable-image.component';

/**
 * Example component demonstrating various uses of ZoomableImageComponent
 * This is for demonstration/testing purposes only
 */
@Component({
  selector: 'app-zoomable-image-examples',
  standalone: true,
  imports: [CommonModule, ZoomableImageComponent],
  template: `
    <div class="examples-container">
      <h1>Zoomable Image Component Examples</h1>

      <!-- Example 1: Default Configuration -->
      <section class="example-section">
        <h2>1. Default Configuration</h2>
        <app-zoomable-image
          [src]="sampleImage"
          [alt]="'Sample Product'">
        </app-zoomable-image>
      </section>

      <!-- Example 2: Custom Size -->
      <section class="example-section">
        <h2>2. Custom Size (500x500px)</h2>
        <app-zoomable-image
          [src]="sampleImage"
          [config]="customSizeConfig"
          [alt]="'Custom Size'">
        </app-zoomable-image>
      </section>

      <!-- Example 3: No Controls -->
      <section class="example-section">
        <h2>3. No Controls (Click to Zoom Only)</h2>
        <app-zoomable-image
          [src]="sampleImage"
          [config]="noControlsConfig"
          [alt]="'No Controls'">
        </app-zoomable-image>
      </section>

      <!-- Example 4: High Zoom -->
      <section class="example-section">
        <h2>4. High Zoom (up to 5x)</h2>
        <app-zoomable-image
          [src]="sampleImage"
          [config]="highZoomConfig"
          [alt]="'High Zoom'">
        </app-zoomable-image>
      </section>

      <!-- Example 5: Contain Mode -->
      <section class="example-section">
        <h2>5. Contain Mode (Full Image Visible)</h2>
        <app-zoomable-image
          [src]="sampleImage"
          [config]="containConfig"
          [alt]="'Contain Mode'">
        </app-zoomable-image>
      </section>

      <!-- Example 6: Circular Avatar -->
      <section class="example-section">
        <h2>6. Circular Avatar (No Zoom)</h2>
        <app-zoomable-image
          [src]="avatarImage"
          [config]="avatarConfig"
          [alt]="'User Avatar'">
        </app-zoomable-image>
      </section>

      <!-- Example 7: Grid of Thumbnails -->
      <section class="example-section">
        <h2>7. Thumbnail Grid</h2>
        <div class="thumbnail-grid">
          <app-zoomable-image
            *ngFor="let img of thumbnails; let i = index"
            [src]="img"
            [config]="thumbnailConfig"
            [alt]="'Thumbnail ' + (i + 1)">
          </app-zoomable-image>
        </div>
      </section>

      <!-- Example 8: With Events -->
      <section class="example-section">
        <h2>8. With Load Events</h2>
        <app-zoomable-image
          [src]="sampleImage"
          [config]="customSizeConfig"
          (imageLoaded)="onImageLoaded()"
          (imageError)="onImageError($event)"
          [alt]="'With Events'">
        </app-zoomable-image>
        <p class="event-log" *ngIf="eventMessage">{{ eventMessage }}</p>
      </section>
    </div>
  `,
  styles: [`
    .examples-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    h1 {
      color: #333;
      margin-bottom: 40px;
    }

    .example-section {
      margin-bottom: 60px;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
    }

    .example-section h2 {
      color: #555;
      margin-bottom: 20px;
      font-size: 20px;
    }

    .thumbnail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .event-log {
      margin-top: 16px;
      padding: 12px;
      background: #e8f5e9;
      border-left: 4px solid #4caf50;
      border-radius: 4px;
      color: #2e7d32;
    }

    @media (max-width: 768px) {
      .thumbnail-grid {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      }
    }
  `]
})
export class ZoomableImageExamplesComponent {
  // Sample images
  sampleImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';
  avatarImage = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400';
  thumbnails = [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=300',
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300'
  ];

  eventMessage = '';

  // Configuration examples
  customSizeConfig: ZoomableImageConfig = {
    width: '500px',
    height: '500px',
    borderRadius: '12px'
  };

  noControlsConfig: ZoomableImageConfig = {
    showControls: false,
    height: '350px'
  };

  highZoomConfig: ZoomableImageConfig = {
    maxZoom: 5,
    zoomStep: 0.5,
    height: '400px'
  };

  containConfig: ZoomableImageConfig = {
    objectFit: 'contain',
    height: '400px',
    width: '100%'
  };

  avatarConfig: ZoomableImageConfig = {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    showControls: false,
    enableClickZoom: false,
    enablePinchZoom: false,
    objectFit: 'cover'
  };

  thumbnailConfig: ZoomableImageConfig = {
    height: '150px',
    maxZoom: 2,
    showControls: false
  };

  // Event handlers
  onImageLoaded() {
    this.eventMessage = `Image loaded successfully at ${new Date().toLocaleTimeString()}`;
    setTimeout(() => this.eventMessage = '', 3000);
  }

  onImageError(event: Event) {
    this.eventMessage = `Image failed to load: ${event}`;
  }
}
