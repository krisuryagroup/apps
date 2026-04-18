import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nPipe } from '@zitro/i18n';
import { SearchBarComponent } from '@zitro/ui';
import { APP_SETTINGS_CACHE } from '../../core/constants/app.constants';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [I18nPipe, SearchBarComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly searchQuery = signal('');

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('search') ?? '';
    this.searchQuery.set(q);
  }

  onSearchChange(q: string): void {
    this.searchQuery.set(q);
    if (q.trim()) {
      const slug =
        this.route.snapshot.queryParamMap.get('businessSlug') ||
        localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) ||
        '';
      this.router.navigate(['/listing'], {
        queryParams: { search: q.trim(), ...(slug ? { businessSlug: slug } : {}) },
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
