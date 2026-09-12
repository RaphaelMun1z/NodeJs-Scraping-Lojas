import { HttpInterceptorFn } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const csrfInterceptor: HttpInterceptorFn = (request, next) => {
  if (SAFE_METHODS.has(request.method) || !request.url.startsWith(`${API_BASE_URL}/`))
    return next(request);
  const token = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrf-token='))
    ?.slice('csrf-token='.length);

  return next(
    token ? request.clone({ setHeaders: { 'X-CSRF-Token': decodeURIComponent(token) } }) : request,
  );
};
