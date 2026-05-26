import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Category } from '@zitro/services';
import { ViewAllCardComponent } from '@zitro/ui';
import { LoaderComponent } from '@zitro/ui';
import { CachedImageDirective } from '@zitro/ui';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    CommonModule,
    ViewAllCardComponent,
    LoaderComponent,
    CachedImageDirective,
  ],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
})
export class CategoriesComponent implements AfterViewInit, OnChanges {
  private router = inject(Router);

  @ViewChild('categoryScrollWrapper') categoryScrollWrapper!: ElementRef;

  @Input() categories: Category[] = [];
  @Input() isLoading = false;
  @Output() categoryClick = new EventEmitter<string | undefined>();

  // Image loading states
  imageLoading: { [key: number]: boolean } = {};

  // Category scroll state
  isAtCategoryStart = true;
  isAtCategoryEnd = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['categories'] && this.categories) {
      // Initialize image loading states when categories change
      this.categories.slice(0, 7).forEach((category, index) => {
        this.imageLoading[index] = true;
      });
      console.log('Categories loaded, imageLoading states:', this.imageLoading);
    }
  }

  ngAfterViewInit() {
    // Listen to scroll events to update navigation button states
    if (this.categoryScrollWrapper) {
      const wrapper = this.categoryScrollWrapper.nativeElement;
      wrapper.addEventListener('scroll', () => {
        this.updateCategoryScrollState();
      });

      // Initial state checks with delays to handle content loading
      setTimeout(() => this.updateCategoryScrollState(), 100);
      setTimeout(() => this.updateCategoryScrollState(), 500);
    }
  }

  updateCategoryScrollState() {
    if (!this.categoryScrollWrapper) return;

    const wrapper = this.categoryScrollWrapper.nativeElement;
    const scrollLeft = wrapper.scrollLeft;
    const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;

    this.isAtCategoryStart = scrollLeft <= 1;
    this.isAtCategoryEnd = scrollLeft >= maxScroll - 1;
  }

  scrollCategoriesLeft() {
    if (!this.categoryScrollWrapper) return;

    const wrapper = this.categoryScrollWrapper.nativeElement;
    const scrollAmount = 400;

    wrapper.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth',
    });

    // Update state after scroll animation completes
    setTimeout(() => {
      this.updateCategoryScrollState();
    }, 350);
  }

  scrollCategoriesRight() {
    if (!this.categoryScrollWrapper) return;

    const wrapper = this.categoryScrollWrapper.nativeElement;
    const scrollAmount = 400;

    wrapper.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });

    // Update state after scroll animation completes
    setTimeout(() => {
      this.updateCategoryScrollState();
    }, 350);
  }

  navigateToCategory(categoryName?: string) {
    this.categoryClick.emit(categoryName);
  }
}
