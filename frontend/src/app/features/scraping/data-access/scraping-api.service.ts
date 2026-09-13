import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '../../../core/models/api.models';
import {
  ManualSearchResult,
  ScrapingExecution,
  ScrapingLog,
  ScrapingStatusResponse,
} from '../../../core/models/domain.models';
import { apiUrl } from '../../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class ScrapingApiService {
  private readonly http = inject(HttpClient);

  status(): Observable<ScrapingStatusResponse> {
    return this.http.get<ScrapingStatusResponse>(apiUrl('/admin/scraping/status'));
  }
  execute(): Observable<{ mensagem: string }> {
    return this.http.post<{ mensagem: string }>(apiUrl('/admin/scraping/executar'), {});
  }
  executions(filters: {
    pagina: number;
    limite: number;
    fonte?: string;
    dataInicio?: string;
    dataFim?: string;
  }): Observable<PaginatedResponse<ScrapingExecution>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters))
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    return this.http.get<PaginatedResponse<ScrapingExecution>>(
      apiUrl('/admin/scraping/execucoes'),
      {
        params,
      },
    );
  }
  execution(id: string): Observable<ScrapingExecution> {
    return this.http
      .get<ApiResponse<ScrapingExecution>>(
        apiUrl(`/admin/scraping/execucoes/${encodeURIComponent(id)}`),
      )
      .pipe(map((r) => r.dados));
  }
  logs(id: string): Observable<ScrapingLog[]> {
    return this.http
      .get<ApiResponse<ScrapingLog[]>>(
        apiUrl(`/admin/scraping/execucoes/${encodeURIComponent(id)}/logs`),
      )
      .pipe(map((r) => r.dados));
  }
  manualSearch(fontes: string[], busca: string): Observable<ManualSearchResult> {
    return this.http
      .post<ApiResponse<ManualSearchResult>>(apiUrl('/admin/busca-manual'), { fontes, busca })
      .pipe(map((r) => r.dados));
  }
}
