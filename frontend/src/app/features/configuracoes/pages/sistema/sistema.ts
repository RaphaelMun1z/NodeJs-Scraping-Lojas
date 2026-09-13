import { LucideDynamicIcon } from '@lucide/angular';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { SistemaApiService } from '../../data-access/sistema-api.service';
import { ScrapingApiService } from '../../../scraping/data-access/scraping-api.service';
import { PopupService } from '../../../../core/services/popup.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button';

@Component({
  selector: 'app-sistema',
  imports: [MatDialogModule, MatStepperModule, LucideDynamicIcon, UiButtonComponent],
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
            <svg lucideIcon="info" aria-hidden="true"></svg>
            <span class="info-popup" role="tooltip"
              >Inicia uma coleta imediatamente, sem esperar o próximo horário agendado.</span
            >
          </button>
        </div>
      </div>
      <app-ui-button
        class="system-button"
        label="Iniciar busca"
        icon="search"
        [disabled]="busy()"
        (click)="runScraping()"
      />
    </section>

    <div class="system-alert-divider"><span>Zona de alerta</span></div>

    <section class="system-card system-danger-card">
      <div>
        <div class="system-title-row">
          <h2>Limpeza dos produtos</h2>
          <button class="info-help" type="button" aria-label="Sobre a limpeza dos produtos">
            <svg lucideIcon="info" aria-hidden="true"></svg>
            <span class="info-popup" role="tooltip"
              >Remove os produtos, o histórico de preços e os documentos indexados no
              Elasticsearch.</span
            >
          </button>
        </div>
      </div>
      <app-ui-button
        class="system-button"
        label="Limpar produtos"
        icon="trash-2"
        variant="danger"
        [disabled]="busy()"
        (click)="clearProducts()"
      />
    </section>

    <section class="system-card system-danger-card system-critical-card">
      <div>
        <div class="system-title-row">
          <h2>Reset total do sistema</h2>
          <button class="info-help" type="button" aria-label="Sobre o reset total do sistema">
            <svg lucideIcon="info" aria-hidden="true"></svg>
            <span class="info-popup" role="tooltip"
              >Remove todos os dados operacionais e mantém somente o usuário administrador.</span
            >
          </button>
        </div>
      </div>
      <app-ui-button
        class="system-reset-button system-button"
        label="Resetar sistema"
        icon="triangle-alert"
        variant="danger"
        [disabled]="busy()"
        (click)="openResetDialog()"
      />
    </section>
    <ng-template #resetDialog>
      <section class="reset-modal" aria-labelledby="reset-dialog-title">
        <header class="reset-modal-header">
          <div>
            <span class="reset-modal-eyebrow">RESET EM DUAS ETAPAS</span>
            <h2 id="reset-dialog-title">Reset total do sistema</h2>
          </div>
          <button
            class="reset-modal-close"
            type="button"
            aria-label="Fechar confirmação"
            (click)="closeResetDialog()"
          >
            <svg lucideIcon="x" aria-hidden="true"></svg>
          </button>
        </header>
        <mat-stepper class="reset-dialog-stepper" linear>
          <mat-step [completed]="canAdvanceReset()" label="Confirmação">
            <div class="reset-warning" role="alert">
              <svg lucideIcon="triangle-alert" aria-hidden="true"></svg>
              <span>Esta ação removerá todos os dados operacionais e não pode ser desfeita.</span>
            </div>
            <label class="reset-field"
              >Digite <code>RESETAR SISTEMA</code> para continuar
              <input
                type="text"
                autocomplete="off"
                [value]="resetConfirmation()"
                (input)="setResetConfirmation($event)"
              />
            </label>
            <div class="reset-modal-actions">
              <button class="btn" type="button" (click)="closeResetDialog()">Cancelar</button>
              <button
                class="btn danger system-reset-button"
                type="button"
                matStepperNext
                [disabled]="!canAdvanceReset()"
              >
                Continuar
              </button>
            </div>
          </mat-step>
          <mat-step [completed]="canConfirmReset()" label="Autorização">
            <div class="reset-warning reset-auth-hint">
              <svg lucideIcon="shield-check" aria-hidden="true"></svg>
              <span>Digite a senha do administrador para autorizar o reset definitivo.</span>
            </div>
            <label class="reset-field"
              >Senha do administrador
              <input
                type="password"
                autocomplete="current-password"
                [value]="resetPassword()"
                (input)="setResetPassword($event)"
              />
            </label>
            <div class="reset-modal-actions">
              <button class="btn" type="button" matStepperPrevious>Voltar</button>
              <button
                class="btn danger system-reset-button"
                type="button"
                [disabled]="!canConfirmReset() || busy()"
                (click)="confirmReset()"
              >
                Confirmar reset
              </button>
            </div>
          </mat-step>
        </mat-stepper>
      </section>
    </ng-template>
  `,
  styles: `
    .system-heading {
      margin: 0 0 24px !important;
    }
    .system-heading h1 {
      margin: 0 0 8px !important;
      color: #151515 !important;
      font-size: 22px !important;
      line-height: 1.2;
      letter-spacing: -0.5px;
    }
    .system-heading p,
    .system-card p {
      margin: 0 !important;
      color: #727272 !important;
      font-size: 12px !important;
      line-height: 1.5;
    }
    .system-card {
      display: flex !important;
      width: 100%;
      min-height: 92px;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin: 0 0 24px !important;
      padding: 24px 30px !important;
      border: 1px solid #e5e5e5 !important;
      border-radius: 10px !important;
      background: #fff !important;
      box-shadow: none !important;
    }
    .system-title-row {
      display: flex;
      align-items: baseline;
      gap: 9px;
    }
    .system-card h2 {
      margin: 0 !important;
      color: #151515 !important;
      font-size: 16px !important;
      line-height: 1.2;
    }
    .info-help {
      position: relative;
      display: inline-grid;
      width: 22px;
      height: 22px;
      place-items: center;
      align-self: center;
      padding: 0;
      transform: translateY(1px);
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: #8290a8;
      cursor: help;
    }
    .info-help:hover,
    .info-help:focus-visible {
      background: #eef2ff;
      color: var(--blue);
      outline: none;
    }
    .info-help .lucide {
      width: 16px;
      height: 16px;
    }
    .info-popup {
      position: absolute;
      z-index: 5;
      bottom: calc(100% + 9px);
      left: 50%;
      display: block;
      width: 270px;
      padding: 10px 12px;
      transform: translateX(-50%) scale(0.96);
      transform-origin: bottom center;
      border-radius: 7px;
      background: #26344f;
      color: #fff;
      font-size: 12px;
      font-weight: 400;
      line-height: 1.45;
      opacity: 0;
      pointer-events: none;
      transition:
        opacity 0.15s ease,
        transform 0.15s ease;
    }
    .info-popup::after {
      position: absolute;
      bottom: -5px;
      left: 50%;
      width: 10px;
      height: 10px;
      transform: translateX(-50%) rotate(45deg);
      background: #26344f;
      content: '';
    }
    .info-help:hover .info-popup,
    .info-help:focus-visible .info-popup {
      transform: translateX(-50%) scale(1);
      opacity: 1;
    }
    .system-button {
      width: 162px !important;
      min-width: 162px !important;
      height: 44px !important;
      min-height: 44px !important;
      justify-content: center !important;
      gap: 9px;
      padding: 0 18px !important;
      border-radius: 7px !important;
      box-shadow: none !important;
      font-size: 12px;
      font-weight: 600;
    }
    .system-button .lucide {
      width: 19px;
      height: 19px;
    }
    .system-alert-divider {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 30px 0 !important;
      color: #b23a35 !important;
      font-size: 11px !important;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .system-alert-divider::before,
    .system-alert-divider::after {
      flex: 1;
      height: 1px;
      background: #efb2b2;
      content: '';
    }
    .system-danger-card {
      border-color: #ffb8b8 !important;
      background: #fffafa !important;
    }
    .danger-outline {
      border-color: #df4b4b;
      background: #fff;
      color: #c62828;
      box-shadow: none;
    }
    .danger-outline:hover:not(:disabled) {
      border-color: #c62828;
      background: #fff1f1;
    }
    .system-reset-button {
      border-color: #cf252a !important;
      background: #cf252a !important;
      color: #fff !important;
      box-shadow: none !important;
    }
    .system-reset-button:hover:not(:disabled) {
      border-color: #ad1e23 !important;
      background: #ad1e23 !important;
    }
    .system-critical-card {
      margin-bottom: 0;
    }
    .reset-modal {
      width: 100%;
      padding: 24px;
      border: 1px solid #fecaca;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 24px 70px rgb(15 23 42 / 24%);
    }
    .reset-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .reset-modal-eyebrow {
      color: #c62828;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .reset-modal h2 {
      margin: 4px 0 0;
      color: #111827;
      font-size: 20px;
      line-height: 1.2;
    }
    .reset-modal-close {
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: #697386;
      display: inline-grid;
      place-items: center;
      flex: 0 0 32px;
      font-size: 0;
      line-height: 1;
      cursor: pointer;
    }
    .reset-modal-close .lucide {
      width: 18px;
      height: 18px;
    }
    .reset-modal-close:hover {
      background: #fff1f1;
      color: #c62828;
    }
    .reset-warning {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 0 0 18px;
      padding: 12px 13px;
      border: 1px solid #f3c3c3;
      border-radius: 8px;
      background: #fff7f7;
      color: #7f1d1d;
      font-size: 13px;
      line-height: 1.45;
    }
    .reset-warning .lucide {
      flex: 0 0 17px;
      width: 17px;
      height: 17px;
      margin-top: 1px;
      color: #c62828;
    }
    .reset-auth-hint {
      border-color: #dbe5f0;
      background: #f8fafc;
      color: #475569;
    }
    .reset-auth-hint .lucide {
      color: #2563eb;
    }
    .reset-field {
      display: grid;
      gap: 7px;
      margin-top: 0;
      color: #334155;
      font-size: 13px;
      font-weight: 600;
    }
    .reset-field code {
      padding: 2px 5px;
      border-radius: 4px;
      background: #fff1f1;
      color: #c62828;
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
    }
    .reset-field input {
      width: 100%;
      box-sizing: border-box;
      height: 40px;
      padding: 0 11px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      background: #fff;
      color: #111827;
    }
    .reset-field input:focus {
      border-color: #c62828;
      outline: 2px solid rgb(198 40 40 / 14%);
    }
    .reset-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
    .reset-modal-actions .system-reset-button {
      width: auto !important;
      min-width: 150px !important;
    }
    .reset-modal-actions .system-reset-button:disabled {
      opacity: 0.55;
    }
    @media (max-width: 700px) {
      .system-heading {
        margin-bottom: 32px;
      }
      .system-card {
        align-items: flex-start;
        flex-direction: column;
        padding: 24px 20px;
      }
      .system-button {
        width: 100%;
      }
      .system-alert-divider {
        margin: 30px 0;
      }
      .reset-modal {
        padding: 20px 18px;
      }
      .reset-modal-actions {
        flex-wrap: wrap;
      }
      .reset-modal-actions .btn {
        flex: 1 1 130px;
      }
    }
  `,
})
export class SistemaPage {
  private readonly api = inject(SistemaApiService);
  private readonly errors = inject(ApiErrorService);
  private readonly scraping = inject(ScrapingApiService);
  private readonly popup = inject(PopupService);
  private readonly dialogs = inject(DialogService);
  @ViewChild('resetDialog', { static: true }) private readonly resetDialog!: TemplateRef<unknown>;
  private resetDialogRef?: MatDialogRef<unknown>;
  protected readonly busy = signal(false);
  protected readonly feedback = signal('');
  protected readonly failed = signal(false);
  protected readonly resetConfirmation = signal('');
  protected readonly resetPassword = signal('');

  protected runScraping(): void {
    this.busy.set(true);
    this.scraping.execute().subscribe({
      next: (result) => this.show(result.mensagem || 'Busca iniciada.'),
      error: (error: unknown) => this.show(this.errors.message(error), true),
    });
  }
  protected openResetDialog(): void {
    this.resetConfirmation.set('');
    this.resetPassword.set('');
    this.resetDialogRef = this.dialogs.open(this.resetDialog, {
      ariaLabelledBy: 'reset-dialog-title',
      width: 'min(620px, calc(100vw - 32px))',
      maxHeight: 'calc(100vh - 32px)',
    });
  }
  protected closeResetDialog(): void {
    if (!this.busy()) this.resetDialogRef?.close();
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
  protected confirmReset(): void {
    if (!this.canConfirmReset()) return;
    const password = this.resetPassword();
    this.busy.set(true);
    this.api.validatePassword(password).subscribe({
      next: () =>
        this.api.reset(password).subscribe({
          next: () => {
            this.resetDialogRef?.close();
            this.show('Sistema resetado com sucesso.');
          },
          error: (error: unknown) => this.show(this.errors.message(error), true),
        }),
      error: (error: unknown) => this.show(this.errors.message(error, 'Senha inválida.'), true),
    });
  }
  protected async clearProducts(): Promise<void> {
    if (
      !(await this.popup.confirm({
        title: 'Limpar produtos e históricos?',
        text: 'Esta ação removerá todos os produtos, históricos e documentos indexados. Não pode ser desfeita.',
        confirmButtonText: 'Continuar',
        destructive: true,
      }))
    )
      return;
    const confirmation = await this.popup.input({
      title: 'Confirme a limpeza dos produtos',
      text: 'Digite reset para continuar.',
      inputPlaceholder: 'reset',
      confirmButtonText: 'Limpar produtos',
    });
    if (confirmation === null) return;
    if (confirmation !== 'reset') {
      await this.popup.error('Confirmação inválida.');
      return;
    }
    this.busy.set(true);
    this.api.cleanProducts().subscribe({
      next: () => this.show('Produtos removidos com sucesso.'),
      error: (error: unknown) => this.show(this.errors.message(error), true),
    });
  }
  protected async resetAll(): Promise<void> {
    if (
      !(await this.popup.confirm({
        title: 'Resetar todo o sistema?',
        text: 'O reset total removerá os dados operacionais e não pode ser desfeito.',
        confirmButtonText: 'Continuar',
        destructive: true,
      }))
    )
      return;
    const password = await this.popup.input({
      title: 'Senha do administrador',
      text: 'Informe sua senha para autorizar o reset definitivo.',
      inputType: 'password',
      confirmButtonText: 'Continuar',
    });
    if (!password) return;
    this.busy.set(true);
    this.api.validatePassword(password).subscribe({
      next: () => {
        void this.popup
          .input({
            title: 'Confirme o reset total',
            text: 'Digite RESETAR SISTEMA para continuar.',
            inputPlaceholder: 'RESETAR SISTEMA',
            confirmButtonText: 'Resetar sistema',
          })
          .then((confirmation) => {
            if (confirmation === null) {
              this.busy.set(false);
              return;
            }
            if (confirmation !== 'RESETAR SISTEMA') {
              void this.popup.error('Confirmação inválida.');
              this.busy.set(false);
              return;
            }
            this.api.reset(password).subscribe({
              next: () => this.show('Sistema resetado com sucesso.'),
              error: (error: unknown) => this.show(this.errors.message(error), true),
            });
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
