import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { BehaviorSubject, fromEvent, Observable } from 'rxjs';
import { debounceTime, map, startWith } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'large-desktop';

@Injectable({ providedIn: 'root' })
export class BreakpointService {
  private platformId = inject<object>(PLATFORM_ID);

  private breakpoint$: BehaviorSubject<Breakpoint>;
  private breakpoints = {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    largeDesktop: 1440,
  };

  constructor() {
    this.breakpoint$ = new BehaviorSubject<Breakpoint>(this.getBreakpoint());
    if (isPlatformBrowser(this.platformId)) {
      fromEvent(window, 'resize')
        .pipe(
          debounceTime(100),
          map(() => this.getBreakpoint()),
          startWith(this.getBreakpoint()),
        )
        .subscribe((bp) => this.breakpoint$.next(bp));
    }
  }

  getBreakpoint(): Breakpoint {
    if (!isPlatformBrowser(this.platformId)) return 'mobile';
    const width = window.innerWidth;
    if (width <= this.breakpoints.mobile) return 'mobile';
    if (width <= this.breakpoints.tablet) return 'tablet';
    if (width <= this.breakpoints.desktop) return 'desktop';
    return 'large-desktop';
  }

  breakpointChanges(): Observable<Breakpoint> {
    return this.breakpoint$.asObservable();
  }

  isMobile(): boolean {
    return this.getBreakpoint() === 'mobile';
  }
  isTablet(): boolean {
    return this.getBreakpoint() === 'tablet';
  }
  isDesktop(): boolean {
    return (
      this.getBreakpoint() === 'desktop' ||
      this.getBreakpoint() === 'large-desktop'
    );
  }
}
