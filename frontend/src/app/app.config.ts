import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { provideRouter } from '@angular/router';
import { LOCALE_ID } from '@angular/core';
import { routes } from './app.routes';
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([csrfInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
