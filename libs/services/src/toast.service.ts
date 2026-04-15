import { Injectable } from '@angular/core';

export type ToastColor = 'success' | 'warning' | 'danger' | 'medium';

export interface ToastOptions {
  message: string;
  duration?: number;
  color?: ToastColor;
}

/**
 * Minimal ToastService stub — concrete implementation wired up in T012/T020.
 * Apps can override this token with a platform-specific Ionic implementation.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  show(_options: ToastOptions): void {
    // No-op stub — replaced by app-level provider in T020
  }
}
