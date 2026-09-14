import { LucideDynamicIcon } from '@lucide/angular';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthApiService } from '../../../../core/auth/auth-api.service';
import { MfaSetup } from '../../../../core/models/domain.models';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { NotificationService } from '../../../../shared/notifications/notification.service';

@Component({
  selector: 'app-autenticacao',
  imports: [ReactiveFormsModule, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="admin-header">
      <h1>Segurança</h1>
    </header>
    <section class="admin-mfa">
      <h2>Autenticação em dois fatores</h2>
      @if (!setup()) {
        <p class="admin-description">Proteja sua conta usando um aplicativo autenticador.</p>
        <button class="btn primary" [disabled]="loading()" (click)="start()">
          Configurar MFA <svg lucideIcon="shield-check" aria-hidden="true"></svg>
        </button>
      } @else {
        <div class="mfa-setup">
          @if (qr()) {
            <img [src]="qr()" alt="QR Code de configuração MFA" />
          }
          <div>
            <p>Escaneie o QR Code no aplicativo autenticador e informe o código gerado.</p>
            @if (setup()?.segredo) {
              <div class="manual-secret">
                Chave manual <code>{{ setup()?.segredo }}</code>
              </div>
            }
            <label class="mfa-code-field"
              >Código de verificação<input
                [formControl]="code"
                inputmode="numeric"
                maxlength="6"
                placeholder="Código de 6 dígitos"
                aria-describedby="mfa-code-error"
                [attr.aria-invalid]="code.invalid && code.touched"
            /></label>
            @if (code.invalid && code.touched) {
              <small id="mfa-code-error" class="field-error">{{
                code.hasError('required')
                  ? 'Código de verificação é obrigatório.'
                  : 'Informe exatamente 6 dígitos.'
              }}</small>
            }
            <button class="btn primary" [disabled]="code.invalid || loading()" (click)="activate()">
              Ativar MFA <svg lucideIcon="shield-check" aria-hidden="true"></svg>
            </button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .admin-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      max-width: var(--admin-container-width);
      margin: 0 auto 24px;
    }
    .admin-header h1 {
      margin: 0;
      color: #151515;
      font-size: 22px;
      letter-spacing: -0.5px;
    }
    .admin-mfa {
      max-width: var(--admin-container-width);
      margin: 24px auto 0;
      padding: 24px 30px;
      border: 1px solid #e5e5e5;
      border-radius: 10px;
      background: #fff;
    }
    .admin-mfa h2 {
      margin: 0 0 12px;
      color: #151515;
      font-size: 16px;
    }
    .admin-description {
      margin: 0 0 24px;
      color: #727272;
      font-size: 13px;
      line-height: 1.5;
    }
    .mfa-setup {
      display: grid;
      justify-items: start;
      gap: 12px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
    }
    .mfa-setup img {
      width: 240px;
      height: 240px;
      border: 1px solid #e5e5e5;
    }
    .mfa-setup p {
      margin: 0 0 12px;
      color: #727272;
      font-size: 12px;
      line-height: 1.5;
    }
    .mfa-code-field,
    .manual-secret {
      display: grid;
      gap: 6px;
      margin: 12px 0;
      color: #444;
      font-size: 12px;
    }
    .mfa-code-field input {
      width: 260px;
      height: 40px;
      padding: 0 10px;
      border: 1px solid #d6d6d6;
      border-radius: 6px;
      background: #fff;
      color: #333;
    }
    .mfa-code-field input:focus {
      border-color: #2456df;
      outline: 2px solid rgb(36 86 223 / 12%);
    }
    .manual-secret code {
      display: block;
      padding: 8px 10px;
      border-radius: 6px;
      background: #f5f6f7;
      color: #333;
      font-family: Consolas, monospace;
      font-weight: 400;
      overflow-wrap: anywhere;
    }
    .field-error {
      color: #a33;
      font-size: 11px;
    }
    .mfa-code-field input.ng-invalid.ng-touched {
      border-color: #a33;
    }
    .admin-feedback {
      min-height: 18px;
      margin-top: 18px;
      color: #18743c;
      font-size: 12px;
    }
    .admin-feedback.error {
      color: #a33;
    }
    @media (max-width: 650px) {
      .admin-mfa {
        padding: 22px 18px;
      }
      .mfa-code-field input {
        width: min(260px, 100%);
      }
    }
  `,
})
export class AutenticacaoPage {
  private readonly auth = inject(AuthApiService);
  private readonly errors = inject(ApiErrorService);
  private readonly notifications = inject(NotificationService);
  protected readonly setup = signal<MfaSetup | null>(null);
  protected readonly code = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });
  protected readonly loading = signal(false);
  protected readonly qr = signal('');
  protected start(): void {
    this.loading.set(true);
    this.auth.startMfa().subscribe({
      next: (s) => {
        this.setup.set(s);
        this.qr.set(s.qrCodeDataUrl ?? s.qrCode ?? '');
        this.loading.set(false);
      },
      error: (e) => {
        this.notifications.error(this.errors.message(e));
        this.loading.set(false);
      },
    });
  }
  protected activate(): void {
    if (this.code.invalid) {
      this.code.markAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.activateMfa(this.code.value).subscribe({
      next: () => {
        this.notifications.success('Autenticação em duas etapas ativada com sucesso.');
        this.loading.set(false);
      },
      error: (e) => {
        this.notifications.error(this.errors.message(e));
        this.loading.set(false);
      },
    });
  }
}

