import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { retry } from 'rxjs';

const MAX_RETRIES = 2;

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (_error: HttpErrorResponse, retryCount: number) => {
        const isNetworkError = _error instanceof HttpErrorResponse && _error.status === 0;
        if (!isNetworkError) {
          throw _error;
        }
        // Exponential back-off: 500 ms, 1000 ms
        return new Promise<void>((resolve) => setTimeout(resolve, retryCount * 500));
      },
    })
  );
};
