import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { BackendStatusService } from '../../../core/services/backend-status.service';

@Component({
  selector: 'app-backend-status',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status.unavailable()) {
      <aside class="backend-status" role="status" aria-live="polite">
        <svg lucideIcon="triangle-alert" aria-hidden="true"></svg>
        <div>
          <strong>Estamos com uma instabilidade</strong>
          <p>O catálogo continua disponível, mas algumas informações podem não carregar agora. Tente novamente em instantes.</p>
        </div>
        <button type="button" (click)="reload()">Tentar novamente</button>
      </aside>
    }
  `,
  styles: `
    :host { display: block; }
    .backend-status { display: flex; align-items: center; gap: 12px; padding: 10px 24px; border-bottom: 1px solid #f0d28c; background: #fff8e7; color: #684d12; font-size: 13px; }
    .backend-status > .lucide { width: 20px; height: 20px; flex: 0 0 20px; }
    .backend-status div { min-width: 0; flex: 1; }
    .backend-status strong { display: block; font-size: 13px; }
    .backend-status p { margin: 2px 0 0; line-height: 1.35; }
    .backend-status button { flex: 0 0 auto; padding: 7px 11px; border: 1px solid #c79a38; border-radius: 6px; background: #fff; color: #684d12; cursor: pointer; }
    .backend-status button:hover { background: #fff1c8; }
    @media (max-width: 600px) { .backend-status { align-items: flex-start; padding: 10px 16px; } .backend-status button { align-self: center; } }
  `,
})
export class BackendStatusComponent {
  protected readonly status = inject(BackendStatusService);
  protected reload(): void { window.location.reload(); }
}
