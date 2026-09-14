import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { provideRouter, TitleStrategy } from '@angular/router';
import { LOCALE_ID } from '@angular/core';
import { routes } from './app.routes';
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { APP_ICON_PROVIDERS } from './app-icons';
import { AppTitleStrategy } from './core/seo/app-title.strategy';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideHttpClient(withInterceptors([authTokenInterceptor, csrfInterceptor])),
    ...APP_ICON_PROVIDERS,
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
