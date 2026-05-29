import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const cloned = req.clone({ withCredentials: true });
  return next(cloned).pipe(
    catchError((err) => {
      if (err?.status === 401 && req.url.startsWith('/api/')) {
        const here = window.location.pathname + window.location.search;
        window.location.href = `/auth/login?returnTo=${encodeURIComponent(here)}`;
      }
      return throwError(() => err);
    }),
  );
};
