import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CachedImageDirective } from '@zitro/ui';
import { LoaderComponent } from '@zitro/ui';

@Component({
  selector: 'app-banner-carousel',
  standalone: true,
  imports: [CommonModule, CachedImageDirective, LoaderComponent],
  templateUrl: './banner-carousel.component.html',
  styleUrls: ['./banner-carousel.component.scss'],
})
export class BannerCarouselComponent implements OnInit, OnDestroy {
  @Input() banners: any[] = [];
  currentBanner = 0;
  bannerInterval: any;
  isImageLoading = true;

  ngOnInit() {
    this.isImageLoading = true;
    this.startBannerAutoScroll();
  }
  ngOnDestroy() {
    if (this.bannerInterval) clearInterval(this.bannerInterval);
  }
  startBannerAutoScroll() {
    this.bannerInterval = setInterval(() => {
      this.nextBanner();
    }, 3500);
  }
  nextBanner() {
    this.isImageLoading = true;
    this.currentBanner = (this.currentBanner + 1) % this.banners.length;
  }
  prevBanner() {
    this.isImageLoading = true;
    this.currentBanner =
      (this.currentBanner - 1 + this.banners.length) % this.banners.length;
  }
  goToBanner(idx: number) {
    this.isImageLoading = true;
    this.currentBanner = idx;
  }

  onImageLoad(): void {
    setTimeout(() => {
      this.isImageLoading = false;
    }, 300);
  }

  onImageError(): void {
    setTimeout(() => {
      this.isImageLoading = false;
    }, 300);
  }
}
