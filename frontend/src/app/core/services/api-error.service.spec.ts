import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorService } from './api-error.service';

describe('ApiErrorService', () => {
  const service = new ApiErrorService();

  it('uses the backend error message', () => {
    const error = new HttpErrorResponse({ status: 422, error: { erro: 'Seletores inválidos' } });
    expect(service.message(error)).toBe('Seletores inválidos');
  });

  it('explains connection failures', () => {
    const error = new HttpErrorResponse({ status: 0 });
    expect(service.message(error)).toBe('Não foi possível conectar ao servidor.');
  });
});
