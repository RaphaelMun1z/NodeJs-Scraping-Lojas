import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';
import { AuthApiService } from './auth-api.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthApiService);
  const router = inject(Router);
  if (auth.checked())
    return auth.authenticated()
      ? true
      : router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
  return (auth.checked() ? of(auth.administrator()) : auth.session()).pipe(
    map((admin) =>
      admin
        ? true
        : router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } }),
    ),
  );
};
