export interface ApiResponse<T> {
  dados: T;
  mensagem?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  paginacao: Pagination;
}

export interface Pagination {
  pagina: number;
  limite: number;
  totalItens: number;
  totalPaginas: number;
}

export interface ApiErrorBody {
  erro?: string;
  mensagem?: string;
}
