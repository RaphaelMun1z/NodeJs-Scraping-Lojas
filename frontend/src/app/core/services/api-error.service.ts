import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  message(error: unknown, fallback = 'Não foi possível concluir a operação.'): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorBody | string | null;
      if (typeof body === 'string' && body.trim()) {
        const message = body.trim();
        if (!/^<!doctype\s+html|^<html[\s>]/i.test(message)) return message;
      }
      if (error.status === 0) return 'O serviço está temporariamente indisponível. Tente novamente em instantes.';
      if (error.status >= 500) return 'O serviço está passando por uma instabilidade. Tente novamente em instantes.';
      if (error.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
      if (error.status === 403) return 'Você não tem permissão para realizar esta ação.';
      if (error.status === 404) return 'Não encontramos o que você tentou acessar.';
      if (error.status === 408 || error.status === 504) return 'A resposta demorou mais que o esperado. Tente novamente.';
      if (error.status === 429) return 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.';
      if (body && typeof body === 'object') return body.erro ?? body.mensagem ?? fallback;
    }
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
