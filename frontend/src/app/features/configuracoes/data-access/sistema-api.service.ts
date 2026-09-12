import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiResponse } from '../../../core/models/api.models';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class SistemaApiService {
  private readonly http = inject(HttpClient);
  cleanProducts(): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(
      apiUrl('/admin/configuracoes/scraping/limpar-produtos'),
      { confirmacao: 'reset' },
    );
  }
  validatePassword(senha: string): Observable<void> {
    return this.http.post<void>(apiUrl('/admin/configuracoes/scraping/reset-total/validar-senha'), {
      senha,
    });
  }
  reset(senha: string): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(
      apiUrl('/admin/configuracoes/scraping/reset-total'),
      {
        senha,
        confirmacao: 'RESETAR SISTEMA',
      },
    );
  }
}
