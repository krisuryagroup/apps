import { TestBed } from '@angular/core/testing';
import { provideI18nForTests } from '@zitro/i18n';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({
      imports: [StatCardComponent],
      providers: [...provideI18nForTests()],
    });
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('labelKey', 'dashboard.todayOrders');
    fixture.componentRef.setInput('value', 42);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('42');
  });
});
