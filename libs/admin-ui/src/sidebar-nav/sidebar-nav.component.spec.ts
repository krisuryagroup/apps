import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideI18nForTests } from '@zitro/i18n';
import { SidebarNavComponent } from './sidebar-nav.component';

describe('SidebarNavComponent', () => {
  it('should create and render nav items', () => {
    TestBed.configureTestingModule({
      imports: [SidebarNavComponent],
      providers: [provideRouter([]), ...provideI18nForTests()],
    });
    const fixture = TestBed.createComponent(SidebarNavComponent);
    fixture.componentRef.setInput('items', [
      { labelKey: 'nav.dashboard', icon: '📊', route: '/dashboard' },
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="sidebar-link-/dashboard"]',
      ),
    ).toBeTruthy();
  });

  it('emits logoutClicked when the logout button is clicked', () => {
    TestBed.configureTestingModule({
      imports: [SidebarNavComponent],
      providers: [provideRouter([]), ...provideI18nForTests()],
    });
    const fixture = TestBed.createComponent(SidebarNavComponent);
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.logoutClicked.subscribe(() => (emitted = true));
    fixture.nativeElement
      .querySelector('[data-testid="sidebar-logout-btn"]')
      .click();

    expect(emitted).toBe(true);
  });
});
