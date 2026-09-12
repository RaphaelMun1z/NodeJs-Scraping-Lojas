import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  message(error: unknown, fallback = 'Não foi possível concluir a operação.'): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorBody | string | null;
      if (typeof body === 'string' && body.trim()) return body;
      if (body && typeof body === 'object') return body.erro ?? body.mensagem ?? fallback;
      if (error.status === 0) return 'Não foi possível conectar ao servidor.';
    }
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
