import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CachedImageDirective } from '../../directives/cached-image.directive';

export interface ZoomableImageConfig {
  width?: string;
  height?: string;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  showControls?: boolean;
  enablePinchZoom?: boolean;
  enableClickZoom?: boolean;
  borderRadius?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

@Component({
  selector: 'app-zoomable-image',
  standalone: true,
  imports: [CommonModule, CachedImageDirective],
  templateUrl: './zoomable-image.component.html',
  styleUrls: ['./zoomable-image.component.scss'],
})
export class ZoomableImageComponent implements OnChanges {
  @Input() src = '';
  @Input() fallbackSrc = 'assets/foodCategories/default.png';
  @Input() alt = 'Image';
  @Input() config: ZoomableImageConfig = {};
  @Output() imageLoaded = new EventEmitter<void>();
  @Output() imageError = new EventEmitter<Event>();

  // Image state
  imageLoading = true;

  // Zoom properties
  imageZoomed = false;
  zoomLevel = 1;
  minZoom = 1;
  maxZoom = 3;
  zoomStep = 0.3;
  imageTransform = { x: 0, y: 0 };

  // Pan properties
  private isPanning = false;
  private startPan = { x: 0, y: 0 };
  private lastPinchDistance = 0;
  private containerElement: HTMLElement | null = null;
  private imageElement: HTMLImageElement | null = null;

  // Default config values
  private defaultConfig: Required<ZoomableImageConfig> = {
    width: '100%',
    height: '300px',
    minZoom: 1,
    maxZoom: 3,
    zoomStep: 0.3,
    showControls: true,
    enablePinchZoom: true,
    enableClickZoom: true,
    borderRadius: '8px',
    objectFit: 'cover',
  };

  get mergedConfig(): Required<ZoomableImageConfig> {
    return { ...this.defaultConfig, ...this.config };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['src']) {
      this.imageLoading = true;
      this.resetZoom();
    }

    if (changes['config']) {
      this.applyConfig();
    }
  }

  private applyConfig() {
    const cfg = this.mergedConfig;
    this.minZoom = cfg.minZoom;
    this.maxZoom = cfg.maxZoom;
    this.zoomStep = cfg.zoomStep;
  }

  // Zoom methods
  toggleImageZoom() {
    if (!this.mergedConfig.enableClickZoom) return;

    this.imageZoomed = !this.imageZoomed;
    if (this.imageZoomed) {
      this.zoomLevel = 2;
    } else {
      this.resetZoom();
    }
  }

  zoomIn() {
    if (this.zoomLevel < this.maxZoom) {
      this.zoomLevel = Math.min(this.zoomLevel + this.zoomStep, this.maxZoom);
      this.imageZoomed = this.zoomLevel > 1;
    }
  }

  zoomOut() {
    if (this.zoomLevel > this.minZoom) {
      this.zoomLevel = Math.max(this.zoomLevel - this.zoomStep, this.minZoom);
      if (this.zoomLevel === this.minZoom) {
        this.resetZoom();
      }
    }
  }

  resetZoom() {
    this.zoomLevel = this.minZoom;
    this.imageZoomed = this.zoomLevel > 1;
    this.imageTransform = { x: 0, y: 0 };
    this.isPanning = false;
  }

  getImageTransform(): string {
    return `translate(${this.imageTransform.x}px, ${this.imageTransform.y}px) scale(${this.zoomLevel})`;
  }

  private constrainPan(x: number, y: number): { x: number; y: number } {
    if (!this.imageZoomed || this.zoomLevel <= 1) {
      return { x: 0, y: 0 };
    }

    // Get container dimensions
    const container = document.querySelector(
      '.zoomable-image-container',
    ) as HTMLElement;
    const image = container?.querySelector('img') as HTMLImageElement;

    if (!container || !image) {
      return { x, y };
    }

    const containerRect = container.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();

    // Calculate the scaled image dimensions
    const scaledWidth = imageRect.width * this.zoomLevel;
    const scaledHeight = imageRect.height * this.zoomLevel;

    // Calculate maximum allowed translation
    // The image should not be dragged so far that it leaves the container completely
    const maxX = (scaledWidth - containerRect.width) / 2;
    const maxY = (scaledHeight - containerRect.height) / 2;

    // Constrain the values
    const constrainedX = Math.max(-maxX, Math.min(maxX, x));
    const constrainedY = Math.max(-maxY, Math.min(maxY, y));

    return { x: constrainedX, y: constrainedY };
  }

  getContainerStyle(): { [key: string]: string } {
    const cfg = this.mergedConfig;
    return {
      width: cfg.width,
      height: cfg.height,
      'border-radius': cfg.borderRadius,
    };
  }

  getImageStyle(): { [key: string]: string } {
    return {
      'object-fit': this.mergedConfig.objectFit,
    };
  }

  // Pan methods - Mouse
  onImageMouseDown(event: MouseEvent) {
    if (this.imageZoomed) {
      this.isPanning = true;
      this.startPan = {
        x: event.clientX - this.imageTransform.x,
        y: event.clientY - this.imageTransform.y,
      };
      event.preventDefault();
    }
  }

  onImageMouseMove(event: MouseEvent) {
    if (this.isPanning && this.imageZoomed) {
      this.imageTransform = {
        x: event.clientX - this.startPan.x,
        y: event.clientY - this.startPan.y,
      };
      event.preventDefault();
    }
  }

  onImageMouseUp() {
    this.isPanning = false;
  }

  // Touch events for mobile
  onImageTouchStart(event: TouchEvent) {
    if (!this.mergedConfig.enablePinchZoom) return;

    if (event.touches.length === 2) {
      const distance = this.getTouchDistance(event.touches);
      this.lastPinchDistance = distance;
      event.preventDefault();
    } else if (event.touches.length === 1 && this.imageZoomed) {
      this.isPanning = true;
      this.startPan = {
        x: event.touches[0].clientX - this.imageTransform.x,
        y: event.touches[0].clientY - this.imageTransform.y,
      };
    }
  }

  onImageTouchMove(event: TouchEvent) {
    if (!this.mergedConfig.enablePinchZoom) return;

    if (event.touches.length === 2) {
      const distance = this.getTouchDistance(event.touches);
      if (this.lastPinchDistance > 0) {
        const delta = distance - this.lastPinchDistance;
        const zoomChange = delta * 0.01;
        this.zoomLevel = Math.max(
          this.minZoom,
          Math.min(this.maxZoom, this.zoomLevel + zoomChange),
        );
        this.imageZoomed = this.zoomLevel > 1;
      }
      this.lastPinchDistance = distance;
      event.preventDefault();
    } else if (
      event.touches.length === 1 &&
      this.isPanning &&
      this.imageZoomed
    ) {
      const newX = event.touches[0].clientX - this.startPan.x;
      const newY = event.touches[0].clientY - this.startPan.y;
      this.imageTransform = this.constrainPan(newX, newY);
      event.preventDefault();
    }
  }

  onImageTouchEnd() {
    this.isPanning = false;
    this.lastPinchDistance = 0;
    if (this.zoomLevel <= this.minZoom) {
      this.resetZoom();
    }
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Image load handlers
  onImageLoad(): void {
    this.imageLoading = false;
    this.imageLoaded.emit();
  }

  onImageError(event: Event): void {
    this.imageLoading = false;
    this.imageError.emit(event);
  }

  getCursor(): string {
    if (this.imageLoading) return 'default';
    if (this.imageZoomed) return 'move';
    return this.mergedConfig.enableClickZoom ? 'zoom-in' : 'default';
  }
}
