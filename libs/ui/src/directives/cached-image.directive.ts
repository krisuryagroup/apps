import { Directive, ElementRef, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, inject } from '@angular/core';
import { ImageCacheService } from '@zitro/services';

@Directive({
  selector: '[cachedSrc]',
  standalone: true
})
export class CachedImageDirective implements OnInit, OnChanges, OnDestroy {
  @Input() cachedSrc: string = '';
  @Input() fallbackSrc: string = 'assets/foodCategories/default.png';
  @Input() loadingClass: string = 'image-loading';
  
  private currentBlobUrl: string | null = null;
  private el = inject(ElementRef<HTMLImageElement>);
  private imageCacheService = inject(ImageCacheService);

  constructor() {}

  async ngOnInit() {
    await this.loadImage();
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['cachedSrc'] && !changes['cachedSrc'].firstChange) {
      // Clean up previous blob URL
      if (this.currentBlobUrl) {
        URL.revokeObjectURL(this.currentBlobUrl);
        this.currentBlobUrl = null;
      }
      await this.loadImage();
    }
  }

  private async loadImage() {
    if (!this.cachedSrc) {
      this.setFallbackImage();
      return;
    }

    this.el.nativeElement.classList.add(this.loadingClass);

    try {
      const blobUrl = await this.imageCacheService.getImage(this.cachedSrc);
      this.currentBlobUrl = blobUrl;
      
      this.el.nativeElement.src = blobUrl;
      
      this.el.nativeElement.onload = () => {
        this.el.nativeElement.classList.remove(this.loadingClass);
      };

      this.el.nativeElement.onerror = () => {
        console.error('Failed to load cached image:', this.cachedSrc);
        this.setFallbackImage();
      };

    } catch (error) {
      console.error('Error loading image:', error);
      this.setFallbackImage();
    }
  }

  ngOnDestroy() {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
    }
  }

  private setFallbackImage() {
    this.el.nativeElement.onload = null;
    this.el.nativeElement.onerror = null;
    this.el.nativeElement.src = this.fallbackSrc;
    this.el.nativeElement.classList.remove(this.loadingClass);
  }
}