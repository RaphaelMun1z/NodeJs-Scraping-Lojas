import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { ApiResponse } from '../../../core/models/api.models';
import {
  ConfiguredSource,
  ScrapingConfig,
  SelectorAnalysis,
  SelectorTestResult,
  SourceIdentity,
} from '../../../core/models/domain.models';
import { apiUrl } from '../../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class FontesApiService {
  private readonly http = inject(HttpClient);
  private cachedConfig: ScrapingConfig | null = null;

  publicList(): Observable<SourceIdentity[]> {
    return this.http
      .get<ApiResponse<SourceIdentity[]>>(apiUrl('/fontes'))
      .pipe(map((r) => r.dados));
  }

  config(force = false): Observable<ScrapingConfig> {
    if (!force && this.cachedConfig)
      return new Observable((subscriber) => {
        subscriber.next(this.cachedConfig!);
        subscriber.complete();
      });
    return this.http.get<ApiResponse<ScrapingConfig>>(apiUrl('/admin/configuracoes/scraping')).pipe(
      map((r) => r.dados),
      tap((config) => (this.cachedConfig = config)),
    );
  }

  save(config: ScrapingConfig): Observable<ScrapingConfig> {
    return this.http
      .put<ApiResponse<ScrapingConfig>>(apiUrl('/admin/configuracoes/scraping'), config)
      .pipe(
        map((r) => r.dados),
        tap((saved) => (this.cachedConfig = saved)),
      );
  }

  add(source: Pick<ConfiguredSource, 'fonte' | 'nome' | 'logo'>): Observable<ScrapingConfig> {
    return this.http
      .post<ApiResponse<ScrapingConfig>>(apiUrl('/admin/configuracoes/scraping/fontes'), {
        ...source,
        ativa: false,
        categorias: [],
      })
      .pipe(
        map((r) => r.dados),
        tap((saved) => (this.cachedConfig = saved)),
      );
  }

  remove(source: string): Observable<ScrapingConfig> {
    return this.http
      .delete<ApiResponse<ScrapingConfig>>(
        apiUrl(`/admin/configuracoes/scraping/fontes/${encodeURIComponent(source)}`),
      )
      .pipe(
        map((r) => r.dados),
        tap((saved) => (this.cachedConfig = saved)),
      );
  }

  testSelectors(payload: {
    fonte: string;
    categoria: string;
    url: string;
    seletores: ConfiguredSource['categorias'][number]['seletores'];
  }): Observable<SelectorTestResult> {
    return this.http
      .post<ApiResponse<SelectorTestResult>>(
        apiUrl('/admin/configuracoes/scraping/testar-seletores'),
        payload,
      )
      .pipe(map((r) => r.dados));
  }

  analyzeHtml(html: string): Observable<SelectorAnalysis> {
    return this.http
      .post<ApiResponse<SelectorAnalysis>>(apiUrl('/admin/configuracoes/scraping/analisar-html'), {
        html,
      })
      .pipe(map((r) => r.dados));
  }
}
