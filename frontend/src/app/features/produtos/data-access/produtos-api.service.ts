import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '../../../core/models/api.models';
import { Product, ProductHistoryResponse } from '../../../core/models/domain.models';
import { apiUrl } from '../../../core/config/api.config';

export interface ProductQuery {
  pagina: number;
  limite: number;
  busca?: string;
  categoria?: string;
  fonte?: string;
  precoMin?: number;
  precoMax?: number;
  ativo?: boolean;
  ordenacao: 'desconto' | 'recente' | 'preco-asc' | 'preco-desc';
}

@Injectable({ providedIn: 'root' })
export class ProdutosApiService {
  private readonly http = inject(HttpClient);

  list(query: ProductQuery): Observable<PaginatedResponse<Product>> {
    let params = new HttpParams()
      .set('pagina', query.pagina)
      .set('limite', query.limite)
      .set('ordenacao', query.ordenacao);
    for (const [key, value] of Object.entries(query)) {
      if (!['pagina', 'limite', 'ordenacao'].includes(key) && value !== undefined && value !== '')
        params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<Product>>(apiUrl('/itens'), { params });
  }

  suggestions(query: string): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(apiUrl('/itens/sugestoes'), { params: { q: query } })
      .pipe(map((r) => r.dados));
  }

  categories(): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(apiUrl('/itens/categorias'))
      .pipe(map((r) => r.dados));
  }

  newest(limit = 30): Observable<Product[]> {
    return this.http
      .get<ApiResponse<Product[]>>(apiUrl('/itens/novidades'), { params: { limite: limit } })
      .pipe(map((r) => r.dados));
  }

  history(id: string): Observable<ProductHistoryResponse> {
    return this.http.get<ProductHistoryResponse>(
      apiUrl(`/itens/${encodeURIComponent(id)}/historico`),
    );
  }
}
