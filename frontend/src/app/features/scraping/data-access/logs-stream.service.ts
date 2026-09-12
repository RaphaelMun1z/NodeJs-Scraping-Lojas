import { Injectable, NgZone, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ScrapingExecution, ScrapingLog } from '../../../core/models/domain.models';
import { apiUrl } from '../../../core/config/api.config';

export type ScrapingStreamEvent =
  | { type: 'connected'; data: { criadoEm: string } }
  | { type: 'execution'; data: ScrapingExecution }
  | { type: 'log'; data: ScrapingLog };

@Injectable({ providedIn: 'root' })
export class LogsStreamService {
  private readonly zone = inject(NgZone);

  connect(): Observable<ScrapingStreamEvent> {
    return new Observable((subscriber) => {
      const source = new EventSource(apiUrl('/admin/scraping/eventos'));
      const bind = (name: string, type: ScrapingStreamEvent['type']): void => {
        source.addEventListener(name, (event) => {
          this.zone.run(() =>
            subscriber.next({
              type,
              data: JSON.parse((event as MessageEvent<string>).data),
            } as ScrapingStreamEvent),
          );
        });
      };
      bind('conectado', 'connected');
      bind('execucao', 'execution');
      bind('log', 'log');
      source.onerror = () =>
        this.zone.run(() => subscriber.error(new Error('Conexão de eventos interrompida')));
      return () => source.close();
    });
  }
}
