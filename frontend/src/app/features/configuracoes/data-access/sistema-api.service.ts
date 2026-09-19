import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiResponse } from '../../../core/models/api.models';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../core/config/api.config';
import { ScrapingSchedule } from '../../../core/models/domain.models';

export interface TelegramConfig {
  habilitado: boolean;
  chatId: string;
  percentualAbaixoMedia: number;
}

@Injectable({ providedIn: 'root' })
export class SistemaApiService {
  private readonly http = inject(HttpClient);
  schedule(): Observable<ApiResponse<ScrapingSchedule>> {
    return this.http.get<ApiResponse<ScrapingSchedule>>(
      apiUrl('/admin/configuracoes/scraping/agendamento'),
    );
  }
  saveSchedule(schedule: ScrapingSchedule): Observable<ApiResponse<ScrapingSchedule>> {
    return this.http.put<ApiResponse<ScrapingSchedule>>(
      apiUrl('/admin/configuracoes/scraping/agendamento'),
      schedule,
    );
  }
  telegram(): Observable<ApiResponse<TelegramConfig>> {
    return this.http.get<ApiResponse<TelegramConfig>>(apiUrl('/admin/configuracoes/scraping/telegram'));
  }
  saveTelegram(config: TelegramConfig): Observable<ApiResponse<TelegramConfig>> {
    return this.http.put<ApiResponse<TelegramConfig>>(apiUrl('/admin/configuracoes/scraping/telegram'), config);
  }
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
