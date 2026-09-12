import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthApiService } from '../../../../core/auth/auth-api.service';
import { MfaSetup } from '../../../../core/models/domain.models';
import { ApiErrorService } from '../../../../core/services/api-error.service';

@Component({
  selector: 'app-autenticacao',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-heading">
      <span class="eyebrow">Segurança</span>
      <h1>Autenticação em duas etapas</h1>
      <p>Proteja o painel com códigos temporários do seu aplicativo autenticador.</p>
    </section>
    <section class="panel content">
      <h2>Aplicativo autenticador</h2>
      @if (!setup()) {
        <p>
          Gere um QR Code, leia com Google Authenticator, Authy ou equivalente e confirme um código.
        </p>
        <button class="btn primary" [disabled]="loading()" (click)="start()">Gerar QR Code</button>
      } @else {
        <div class="setup">
          @if (qr()) {
            <img [src]="qr()" alt="QR Code de configuração MFA" />
          }
          <div>
            <p>Depois de ler o QR Code, informe o código de seis dígitos.</p>
            @if (setup()?.segredo) {
              <code>{{ setup()?.segredo }}</code>
            }
            <label>Código<input [formControl]="code" inputmode="numeric" maxlength="6" /></label
            ><button
              class="btn primary"
              [disabled]="code.invalid || loading()"
              (click)="activate()"
            >
              Ativar autenticação
            </button>
          </div>
        </div>
      }
      @if (feedback()) {
        <div class="feedback" [class.error]="failed()">{{ feedback() }}</div>
      }
    </section>
  `,
  styles: `
    .page-heading {
      margin-bottom: 1.5rem;
    }
    .page-heading h1 {
      margin: 0.3rem 0;
    }
    .page-heading p,
    .content > p {
      color: var(--muted);
    }
    .content {
      padding: 1.5rem;
    }
    .content h2 {
      margin-top: 0;
    }
    .setup {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 2rem;
      align-items: center;
    }
    .setup img {
      width: 220px;
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    label {
      display: grid;
      gap: 0.4rem;
      margin: 1rem 0;
      font-weight: 800;
    }
    code {
      display: block;
      padding: 0.7rem;
      background: var(--surface-2);
      word-break: break-all;
    }
    @media (max-width: 650px) {
      .setup {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AutenticacaoPage {
  private readonly auth = inject(AuthApiService);
  private readonly errors = inject(ApiErrorService);
  protected readonly setup = signal<MfaSetup | null>(null);
  protected readonly code = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });
  protected readonly loading = signal(false);
  protected readonly feedback = signal('');
  protected readonly failed = signal(false);
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
        this.feedback.set(this.errors.message(e));
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }
  protected activate(): void {
    if (this.code.invalid) return;
    this.loading.set(true);
    this.auth.activateMfa(this.code.value).subscribe({
      next: () => {
        this.feedback.set('Autenticação em duas etapas ativada com sucesso.');
        this.failed.set(false);
        this.loading.set(false);
      },
      error: (e) => {
        this.feedback.set(this.errors.message(e));
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }
}
