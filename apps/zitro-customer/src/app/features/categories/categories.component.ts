import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CategoriesService, Category } from '@zitro/services';
import { CachedImageDirective } from '@zitro/ui';
import { LoaderComponent } from '@zitro/ui';
import { APP_CONSTANTS } from '../../core/constants/app.constants';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, CachedImageDirective, LoaderComponent],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];
  isLoading = true;
  imageLoading: { [key: string]: boolean } = {};

  constructor(
    private router: Router,
    private categoriesService: CategoriesService
  ) {}

  async ngOnInit() {
    await this.loadCategories();
  }

  async loadCategories() {
    try {
      this.isLoading = true;
      this.categories = await this.categoriesService.getCategories();
      
      // Initialize image loading states for all categories
      this.categories.forEach(category => {
        this.imageLoading[category.id] = true;
      });
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      this.isLoading = false;
    }
  }

  navigateToListing(category: Category) {
    // Navigate to listing page with category filter using category name
    this.router.navigate(['/listing'], { 
      queryParams: { category: category.name } 
    });
  }

  onImageLoad(categoryId: string): void {
    setTimeout(() => {
      this.imageLoading[categoryId] = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }

  onImageError(categoryId: string): void {
    setTimeout(() => {
      this.imageLoading[categoryId] = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
