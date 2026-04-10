import { Directive, ElementRef, HostListener } from '@angular/core';
import { Location } from '@angular/common';

@Directive({
  selector: '[appSwipeBack]'
})
export class SwipeBackDirective {
  private startX = 0;

  constructor(private el: ElementRef, private location: Location) {}

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.startX = event.touches[0].clientX;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    const endX = event.changedTouches[0].clientX;
    if (this.startX < 50 && endX - this.startX > 100) {
      // Swipe from left edge detected
      this.location.back();
    }
  }
}
