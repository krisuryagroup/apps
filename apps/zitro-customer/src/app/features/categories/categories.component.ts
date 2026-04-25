import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nPipe } from '@zitro/i18n';
import { CatalogApiService } from '@zitro/services';
import { Category } from '@zitro/models';
import {
  EvolvedLoaderComponent as LoaderComponent,
  EmptyStateComponent,
  ErrorStateComponent,
} from '@zitro/ui';
import { CachedImageDirective } from '@zitro/ui';
import { APP_SETTINGS_CACHE } from '../../core/constants/app.constants';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    LoaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    CachedImageDirective,
  ],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogApi = inject(CatalogApiService);
  private destroyRef = inject(DestroyRef);

  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly categories = signal<Category[]>([]);

  private businessSlug = '';

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.businessSlug =
      params.get('businessSlug') ||
      localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) ||
      '';
    this.loadCategories();
  }

  private loadCategories(): void {
    if (!this.businessSlug) return;
    this.isLoading.set(true);
    this.hasError.set(false);

    this.catalogApi
      .getCategories(this.businessSlug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cats => {
          this.categories.set(cats);
          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  navigateToListing(category: Category): void {
    this.router.navigate(['/listing'], {
      queryParams: {
        category: category.id,
        businessSlug: this.businessSlug,
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  retry(): void {
    this.loadCategories();
  }
}
