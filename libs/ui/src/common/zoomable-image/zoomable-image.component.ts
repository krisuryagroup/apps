import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { I18nPipe } from '@zitro/i18n';
import { CachedImageDirective } from '../../directives/cached-image.directive';

export interface ZoomableImageConfig {
  width: string;
  height: string;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  showControls: boolean;
  enablePinchZoom: boolean;
  enableClickZoom: boolean;
  borderRadius: string;
  objectFit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export const ZOOMABLE_IMAGE_DEFAULT_CONFIG: ZoomableImageConfig = {
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

@Component({
  selector: 'lib-zoomable-image',
  standalone: true,
  imports: [NgStyle, I18nPipe, CachedImageDirective],
  templateUrl: './zoomable-image.component.html',
  styleUrl: './zoomable-image.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZoomableImageComponent {
  src = input<string>('');
  fallbackSrc = input<string>('assets/foodCategories/default.png');
  alt = input<string>('Image');
  config = input<ZoomableImageConfig>(ZOOMABLE_IMAGE_DEFAULT_CONFIG);

  imageLoaded = output<void>();
  imageError = output<Event>();

  readonly imageLoading = signal(true);
  readonly imageZoomed = signal(false);
  readonly zoomLevel = signal(1);
  readonly imageTransform = signal({ x: 0, y: 0 });

  private isPanning = false;
  private startPan = { x: 0, y: 0 };
  private lastPinchDistance = 0;

  readonly containerStyle = computed(() => ({
    width: this.config().width,
    height: this.config().height,
    'border-radius': this.config().borderRadius,
  }));

  readonly imageStyle = computed(() => ({
    'object-fit': this.config().objectFit,
  }));

  readonly transform = computed(() => {
    const t = this.imageTransform();
    return `translate(${t.x}px, ${t.y}px) scale(${this.zoomLevel()})`;
  });

  readonly cursor = computed(() => {
    if (this.imageLoading()) return 'default';
    if (this.imageZoomed()) return 'move';
    return this.config().enableClickZoom ? 'zoom-in' : 'default';
  });

  constructor() {
    effect(() => {
      const _ = this.src();
      untracked(() => {
        this.imageLoading.set(true);
        this.resetZoom();
      });
    });
  }

  toggleZoom(): void {
    if (!this.config().enableClickZoom) return;
    if (this.imageZoomed()) {
      this.resetZoom();
    } else {
      this.zoomLevel.set(2);
      this.imageZoomed.set(true);
    }
  }

  zoomIn(): void {
    const cfg = this.config();
    const next = Math.min(this.zoomLevel() + cfg.zoomStep, cfg.maxZoom);
    this.zoomLevel.set(next);
    this.imageZoomed.set(next > cfg.minZoom);
  }

  zoomOut(): void {
    const cfg = this.config();
    const next = Math.max(this.zoomLevel() - cfg.zoomStep, cfg.minZoom);
    this.zoomLevel.set(next);
    if (next <= cfg.minZoom) {
      this.resetZoom();
    } else {
      this.imageZoomed.set(true);
    }
  }

  resetZoom(): void {
    this.zoomLevel.set(this.config().minZoom);
    this.imageZoomed.set(false);
    this.imageTransform.set({ x: 0, y: 0 });
    this.isPanning = false;
  }

  onImageLoad(): void {
    this.imageLoading.set(false);
    this.imageLoaded.emit();
  }

  onImageError(event: Event): void {
    this.imageLoading.set(false);
    this.imageError.emit(event);
  }

  onMouseDown(event: MouseEvent): void {
    if (this.imageZoomed()) {
      this.isPanning = true;
      const t = this.imageTransform();
      this.startPan = { x: event.clientX - t.x, y: event.clientY - t.y };
      event.preventDefault();
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (this.isPanning && this.imageZoomed()) {
      this.imageTransform.set({
        x: event.clientX - this.startPan.x,
        y: event.clientY - this.startPan.y,
      });
      event.preventDefault();
    }
  }

  onMouseUp(): void {
    this.isPanning = false;
  }

  onTouchStart(event: TouchEvent): void {
    if (!this.config().enablePinchZoom) return;
    if (event.touches.length === 2) {
      this.lastPinchDistance = this.getTouchDistance(event.touches);
      event.preventDefault();
    } else if (event.touches.length === 1 && this.imageZoomed()) {
      this.isPanning = true;
      const t = this.imageTransform();
      this.startPan = {
        x: event.touches[0].clientX - t.x,
        y: event.touches[0].clientY - t.y,
      };
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.config().enablePinchZoom) return;
    const cfg = this.config();
    if (event.touches.length === 2) {
      const distance = this.getTouchDistance(event.touches);
      if (this.lastPinchDistance > 0) {
        const delta = (distance - this.lastPinchDistance) * 0.01;
        const next = Math.max(cfg.minZoom, Math.min(cfg.maxZoom, this.zoomLevel() + delta));
        this.zoomLevel.set(next);
        this.imageZoomed.set(next > cfg.minZoom);
      }
      this.lastPinchDistance = distance;
      event.preventDefault();
    } else if (event.touches.length === 1 && this.isPanning && this.imageZoomed()) {
      this.imageTransform.set({
        x: event.touches[0].clientX - this.startPan.x,
        y: event.touches[0].clientY - this.startPan.y,
      });
      event.preventDefault();
    }
  }

  onTouchEnd(): void {
    this.isPanning = false;
    this.lastPinchDistance = 0;
    if (this.zoomLevel() <= this.config().minZoom) {
      this.resetZoom();
    }
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
