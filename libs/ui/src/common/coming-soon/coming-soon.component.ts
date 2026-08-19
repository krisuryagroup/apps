import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/**
 * Temporary placeholder for routes not yet implemented — reads a `title` from route
 * data. Used across zitro-restaurant/zitro-admin/zitro-superadmin's *-000 scaffolds;
 * delete each route's placeholder entry as the real page lands.
 */
@Component({
  selector: 'lib-coming-soon',
  standalone: true,
  template: `
    <div class="coming-soon">
      <h1>{{ title() }}</h1>
      <p>This page is not built yet.</p>
    </div>
  `,
  styles: `
    .coming-soon {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      gap: var(--zitro-spacing-sm);
      color: var(--zitro-on-surface-variant);
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoonComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly title = toSignal(
    this.route.data.pipe(
      map((data) => (data['title'] as string) ?? 'Coming soon'),
    ),
    { initialValue: 'Coming soon' },
  );
}
