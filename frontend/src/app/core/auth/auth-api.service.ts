import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, map, Observable, of, retry, shareReplay, tap } from 'rxjs';
import { ApiResponse } from '../models/api.models';
import { Administrator, MfaSetup } from '../models/domain.models';
import { apiUrl } from '../config/api.config';
import { AUTH_TOKEN_STORAGE_KEY } from '../interceptors/auth-token.interceptor';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly administratorState = signal<Administrator | null>(null);
  private readonly checkedState = signal(false);
  private sessionRequest$?: Observable<Administrator | null>;

  readonly administrator = this.administratorState.asReadonly();
  readonly checked = this.checkedState.asReadonly();
  readonly authenticated = computed(() => this.administratorState() !== null);

  session(): Observable<Administrator | null> {
    this.sessionRequest$ ??= this.http
      .get<ApiResponse<Administrator>>(apiUrl('/autenticacao/sessao'), { withCredentials: true })
      .pipe(
      // Evita que App e authGuard façam duas validações simultâneas e trata
      // indisponibilidade momentânea antes de considerar a sessão perdida.
      retry({ count: 2, delay: 500 }),
      map((response) => response.dados),
      tap((admin) => {
        this.administratorState.set(admin);
        this.checkedState.set(true);
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.administratorState.set(null);
          localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          this.checkedState.set(true);
          return of(null);
        }
        return of(this.administratorState());
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.sessionRequest$;
  }

  checkMfa(email: string, senha: string): Observable<boolean> {
    return this.http
      .post<ApiResponse<{ mfaNecessario: boolean }>>(apiUrl('/autenticacao/login/verificar-mfa'), {
        email,
        senha,
      }, { withCredentials: true })
      .pipe(map((response) => response.dados.mfaNecessario));
  }

  login(email: string, senha: string, codigoTotp?: string): Observable<Administrator> {
    return this.http
      .post<ApiResponse<Administrator> & { token: string }>(apiUrl('/autenticacao/login'), {
        email,
        senha,
        ...(codigoTotp ? { codigoTotp } : {}),
      }, { withCredentials: true })
      .pipe(
        tap((response) => {
          if (response.token) localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.token);
        }),
        map((response) => response.dados),
        tap((admin) => {
          this.administratorState.set(admin);
          this.checkedState.set(true);
        }),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(apiUrl('/autenticacao/logout'), {}, { withCredentials: true })
      .pipe(
        tap(() => {
          localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
          this.administratorState.set(null);
          this.checkedState.set(true);
        }),
      );
  }

  startMfa(): Observable<MfaSetup> {
    return this.http
      .post<ApiResponse<MfaSetup>>(apiUrl('/autenticacao/mfa/iniciar'), {})
      .pipe(map((response) => response.dados));
  }

  activateMfa(codigo: string): Observable<void> {
    return this.http
      .post<void>(apiUrl('/autenticacao/mfa/ativar'), { codigo })
      .pipe(
        tap(() =>
          this.administratorState.update((admin) => (admin ? { ...admin, mfaAtivo: true } : admin)),
        ),
      );
  }
}
