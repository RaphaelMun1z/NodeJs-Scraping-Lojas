import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { BackendStatusService } from '../services/backend-status.service';

export const backendStatusInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(`${API_BASE_URL}/`)) return next(request);
  const status = inject(BackendStatusService);
  return next(request).pipe(
    tap(() => status.markOnline()),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500)) {
        status.markUnavailable();
      }
      return throwError(() => error);
    }),
  );
};
