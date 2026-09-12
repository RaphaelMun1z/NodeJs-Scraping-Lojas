import { AfterViewInit, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { createIcons, Info, Search, Trash2, TriangleAlert } from 'lucide';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { SistemaApiService } from '../../data-access/sistema-api.service';
import { ScrapingApiService } from '../../../scraping/data-access/scraping-api.service';

@Component({
  selector: 'app-sistema',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="system-heading">
      <h1>Sistema</h1>
    </header>
    @if (feedback()) {
      <div class="feedback" [class.error]="failed()">{{ feedback() }}</div>
    }

    <section class="system-card system-search-card">
      <div>
        <div class="system-title-row">
          <h2>Busca manual</h2>
          <button class="info-help" type="button" aria-label="Sobre a busca manual">
            <i data-lucide="info" aria-hidden="true"></i>
            <span class="info-popup" role="tooltip">Inicia uma coleta imediatamente, sem esperar o próximo horário agendado.</span>
          </button>
        </div>
      </div>
      <button class="btn primary system-button" [disabled]="busy()" (click)="runScraping()">
        Iniciar busca <i data-lucide="search" aria-hidden="true"></i>
      </button>
    </section>

    <div class="system-alert-divider"><span>Zona de alerta</span></div>

    <section class="system-card system-danger-card">
      <div>
        <div class="system-title-row">
          <h2>Limpeza dos produtos</h2>
          <button class="info-help" type="button" aria-label="Sobre a limpeza dos produtos">
            <i data-lucide="info" aria-hidden="true"></i>
            <span class="info-popup" role="tooltip">Remove os produtos, o histórico de preços e os documentos indexados no Elasticsearch.</span>
          </button>
        </div>
      </div>
      <button class="btn danger-outline system-button" [disabled]="busy()" (click)="clearProducts()">
        Limpar produtos <i data-lucide="trash-2" aria-hidden="true"></i>
      </button>
    </section>

    <section class="system-card system-danger-card system-critical-card">
      <div>
        <div class="system-title-row">
          <h2>Reset total do sistema</h2>
          <button class="info-help" type="button" aria-label="Sobre o reset total do sistema">
            <i data-lucide="info" aria-hidden="true"></i>
            <span class="info-popup" role="tooltip">Remove todos os dados operacionais e mantém somente o usuário administrador.</span>
          </button>
        </div>
      </div>
      <button class="btn system-reset-button system-button" [disabled]="busy()" (click)="openResetDialog()">
        Resetar sistema <i data-lucide="triangle-alert" aria-hidden="true"></i>
      </button>
    </section>
    @if (resetDialogOpen()) {
      <div class="reset-modal-backdrop" (click)="closeResetDialog()" (keydown.escape)="closeResetDialog()">
        <section class="reset-modal" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title" (click)="$event.stopPropagation()">
          <header class="reset-modal-header">
            <div><span class="reset-modal-eyebrow">Etapa {{ resetStep() }} de 2</span><h2 id="reset-dialog-title">Reset total do sistema</h2></div>
            <button class="reset-modal-close" type="button" aria-label="Fechar confirmação" (click)="closeResetDialog()">×</button>
          </header>
          @if (resetStep() === 1) {
            <p class="reset-modal-description">Esta ação removerá todos os dados operacionais e não pode ser desfeita.</p>
            <label class="reset-field">Digite <strong>RESETAR SISTEMA</strong> para continuar
              <input type="text" autocomplete="off" [value]="resetConfirmation()" (input)="setResetConfirmation($event)" />
            </label>
          } @else {
            <p class="reset-modal-description">Digite a senha do administrador para autorizar o reset definitivo.</p>
            <label class="reset-field">Senha do administrador
              <input type="password" autocomplete="current-password" [value]="resetPassword()" (input)="setResetPassword($event)" />
            </label>
          }
          <div class="reset-modal-actions">
            @if (resetStep() === 1) {
              <button class="btn" type="button" (click)="closeResetDialog()">Cancelar</button>
              <button class="btn system-reset-button" type="button" [disabled]="!canAdvanceReset()" (click)="advanceReset()">Continuar</button>
            } @else {
              <button class="btn" type="button" (click)="backToResetConfirmation()">Voltar</button>
              <button class="btn system-reset-button" type="button" [disabled]="!canConfirmReset() || busy()" (click)="confirmReset()">Confirmar reset</button>
            }
          </div>
        </section>
      </div>
    }
  `,
  styles: `
    .system-heading { margin: 0 0 62px !important; }
    .system-heading h1 { margin: 0 0 4px !important; color: #111827 !important; font-size: 28px !important; line-height: 1.2; letter-spacing: -.7px; }
    .system-heading p, .system-card p { margin: 0 !important; color: #697386 !important; font-size: 15px !important; line-height: 1.5; }
    .system-card {
      display: flex !important; width: 100%; height: 116px; min-height: 116px; align-items: center; justify-content: space-between; gap: 32px;
      margin: 0 0 32px !important; padding: 28px 38px !important; border: 1px solid #dfe3e8 !important; border-radius: 12px !important;
      background: #fff !important; box-shadow: none !important;
    }
    .system-title-row { display: flex; align-items: baseline; gap: 9px; }
    .system-card h2 { margin: 0 !important; color: #111827 !important; font-size: 20px !important; line-height: 1.2; }
    .info-help { position: relative; display: inline-grid; width: 22px; height: 22px; place-items: center; align-self: center; padding: 0; transform: translateY(1px); border: 0; border-radius: 50%; background: transparent; color: #8290a8; cursor: help; }
    .info-help:hover, .info-help:focus-visible { background: #eef2ff; color: var(--blue); outline: none; }
    .info-help .lucide { width: 16px; height: 16px; }
    .info-popup { position: absolute; z-index: 5; bottom: calc(100% + 9px); left: 50%; display: block; width: 270px; padding: 10px 12px; transform: translateX(-50%) scale(.96); transform-origin: bottom center; border-radius: 7px; background: #26344f; color: #fff; font-size: 12px; font-weight: 400; line-height: 1.45; opacity: 0; pointer-events: none; transition: opacity .15s ease, transform .15s ease; }
    .info-popup::after { position: absolute; bottom: -5px; left: 50%; width: 10px; height: 10px; transform: translateX(-50%) rotate(45deg); background: #26344f; content: ''; }
    .info-help:hover .info-popup, .info-help:focus-visible .info-popup { transform: translateX(-50%) scale(1); opacity: 1; }
    .system-button { width: 202px !important; min-width: 202px !important; height: 54px !important; min-height: 54px !important; justify-content: center !important; gap: 10px; padding: 0 18px !important; border-radius: 9px !important; box-shadow: none !important; font-size: 14px; font-weight: 700; }
    .system-button .lucide { width: 19px; height: 19px; }
    .system-alert-divider { display: flex; align-items: center; gap: 16px; margin: 38px 0 !important; color: #c44343 !important; font-size: 12px !important; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .system-alert-divider::before, .system-alert-divider::after { flex: 1; height: 1px; background: #efb2b2; content: ''; }
    .system-danger-card { border-color: #ffb8b8 !important; background: #fffafa !important; }
    .danger-outline { border-color: #df4b4b; background: #fff; color: #c62828; box-shadow: none; }
    .danger-outline:hover:not(:disabled) { border-color: #c62828; background: #fff1f1; }
    .system-reset-button { border-color: #cf252a !important; background: #cf252a !important; color: #fff !important; box-shadow: none !important; }
    .system-reset-button:hover:not(:disabled) { border-color: #ad1e23 !important; background: #ad1e23 !important; }
    .system-critical-card { margin-bottom: 0; }
    .reset-modal-backdrop { position: fixed; z-index: 1000; inset: 0; display: grid; place-items: center; padding: 24px; background: rgb(15 23 42 / 52%); }
    .reset-modal { width: min(520px, 100%); padding: 26px; border: 1px solid #fecaca; border-radius: 12px; background: #fff; box-shadow: 0 24px 70px rgb(15 23 42 / 24%); }
    .reset-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
    .reset-modal-eyebrow { color: #c62828; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .reset-modal h2 { margin: 6px 0 0; color: #111827; font-size: 21px; }
    .reset-modal-close { width: 32px; height: 32px; border: 0; border-radius: 7px; background: transparent; color: #697386; font-size: 25px; line-height: 1; cursor: pointer; }
    .reset-modal-close:hover { background: #fff1f1; color: #c62828; }
    .reset-modal-description { margin: 20px 0; color: #697386; font-size: 13px; line-height: 1.5; }
    .reset-field { display: grid; gap: 7px; margin-top: 16px; color: #334155; font-size: 13px; font-weight: 600; }
    .reset-field strong { color: #c62828; }
    .reset-field input { width: 100%; height: 42px; padding: 0 11px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #111827; }
    .reset-field input:focus { border-color: #c62828; outline: 2px solid rgb(198 40 40 / 14%); }
    .reset-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
    .reset-modal-actions .system-reset-button { width: auto !important; min-width: 150px !important; }
    @media (max-width: 700px) {
      .system-heading { margin-bottom: 32px; }
      .system-card { align-items: flex-start; flex-direction: column; padding: 24px 20px; }
      .system-button { width: 100%; }
      .system-alert-divider { margin: 30px 0; }
    }
  `,
})
export class SistemaPage implements AfterViewInit {
  private readonly api = inject(SistemaApiService);
  private readonly errors = inject(ApiErrorService);
  private readonly scraping = inject(ScrapingApiService);
  protected readonly busy = signal(false);
  protected readonly feedback = signal('');
  protected readonly failed = signal(false);
  protected readonly resetDialogOpen = signal(false);
  protected readonly resetStep = signal<1 | 2>(1);
  protected readonly resetConfirmation = signal('');
  protected readonly resetPassword = signal('');

  ngAfterViewInit(): void {
    createIcons({ icons: { Info, Search, Trash2, TriangleAlert } });
  }

  protected runScraping(): void {
    this.busy.set(true);
    this.scraping.execute().subscribe({
      next: (result) => this.show(result.mensagem || 'Busca iniciada.'),
      error: (error: unknown) => this.show(this.errors.message(error), true),
    });
  }
  protected openResetDialog(): void {
    this.resetStep.set(1);
    this.resetConfirmation.set('');
    this.resetPassword.set('');
    this.resetDialogOpen.set(true);
  }
  protected closeResetDialog(): void {
    if (!this.busy()) this.resetDialogOpen.set(false);
  }
  protected setResetConfirmation(event: Event): void {
    this.resetConfirmation.set((event.target as HTMLInputElement).value);
  }
  protected setResetPassword(event: Event): void {
    this.resetPassword.set((event.target as HTMLInputElement).value);
  }
  protected canConfirmReset(): boolean {
    return this.resetConfirmation() === 'RESETAR SISTEMA' && this.resetPassword().length > 0;
  }
  protected canAdvanceReset(): boolean {
    return this.resetConfirmation() === 'RESETAR SISTEMA';
  }
  protected advanceReset(): void {
    if (this.canAdvanceReset()) this.resetStep.set(2);
  }
  protected backToResetConfirmation(): void {
    if (!this.busy()) this.resetStep.set(1);
  }
  protected confirmReset(): void {
    if (!this.canConfirmReset()) return;
    const password = this.resetPassword();
    this.busy.set(true);
    this.api.validatePassword(password).subscribe({
      next: () => this.api.reset(password).subscribe({
        next: () => { this.resetDialogOpen.set(false); this.show('Sistema resetado com sucesso.'); },
        error: (error: unknown) => this.show(this.errors.message(error), true),
      }),
      error: (error: unknown) => this.show(this.errors.message(error, 'Senha inválida.'), true),
    });
  }
  protected clearProducts(): void {
    if (!confirm('Esta ação removerá todos os produtos e históricos. Deseja continuar?')) return;
    const confirmation = prompt('Digite reset para confirmar:');
    if (confirmation !== 'reset') { this.show('Confirmação inválida.', true); return; }
    this.busy.set(true);
    this.api.cleanProducts().subscribe({
      next: () => this.show('Produtos removidos com sucesso.'),
      error: (error: unknown) => this.show(this.errors.message(error), true),
    });
  }
  protected resetAll(): void {
    if (!confirm('O reset total removerá os dados do sistema. Deseja continuar?')) return;
    const password = prompt('Informe sua senha de administrador:');
    if (!password) return;
    this.busy.set(true);
    this.api.validatePassword(password).subscribe({
      next: () => {
        const confirmation = prompt('Digite RESETAR SISTEMA para confirmar:');
        if (confirmation !== 'RESETAR SISTEMA') { this.show('Confirmação inválida.', true); return; }
        this.api.reset(password).subscribe({
          next: () => this.show('Sistema resetado com sucesso.'),
          error: (error: unknown) => this.show(this.errors.message(error), true),
        });
      },
      error: (error: unknown) => this.show(this.errors.message(error, 'Senha inválida.'), true),
    });
  }
  private show(message: string, failed = false): void {
    this.feedback.set(message);
    this.failed.set(failed);
    this.busy.set(false);
  }
}
