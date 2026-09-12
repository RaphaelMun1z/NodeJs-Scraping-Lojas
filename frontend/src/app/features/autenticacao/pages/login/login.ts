import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApiService } from '../../../../core/auth/auth-api.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { AuthButtonComponent } from '../../../../shared/components/auth-button/auth-button';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, AuthButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-page">
      <section class="auth-card">
        <h1>Entre e encontre as melhores ofertas.</h1>
        <div class="social-actions">
          <app-auth-button
            label="Entrar com Google"
            width="100%"
            height="52px"
            borderRadius="10px"
            brandIcon="google"
            baseColor="#292d30"
            hoverColor="#202326"
            layerColor="transparent"
            layerBorderColor="#292d30"
            textColor="#fff"
          />
          <app-auth-button
            label="Entrar com GitHub"
            width="100%"
            height="52px"
            borderRadius="10px"
            brandIcon="github"
            baseColor="#fff"
            hoverColor="#f5f5f5"
            layerColor="#aeb2b7"
            textColor="#292929"
          />
        </div>
        <div class="or-divider"><span>- OU -</span></div>
        @if (error()) {
          <div class="admin-error">{{ error() }}</div>
        }
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label><span class="field-label"><i data-lucide="mail" aria-hidden="true"></i>Endereço de e-mail</span><input type="email" formControlName="email" autocomplete="username" /></label>
          <label class="password-label"><span class="field-label"><i data-lucide="lock-keyhole" aria-hidden="true"></i>Senha</span>
            <input [type]="showPassword() ? 'text' : 'password'" formControlName="senha" autocomplete="current-password" />
            <button type="button" class="password-toggle" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Ocultar senha' : 'Mostrar senha'">{{ showPassword() ? '◉' : '◌' }}</button>
          </label>
          @if (mfaRequired()) {
            <label>Código de verificação<input type="text" formControlName="codigoTotp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" /></label>
            <p class="admin-description">Informe o código do seu aplicativo autenticador.</p>
          }
          <div class="form-options">
            <label class="remember-option"><input type="checkbox" /> <span>Lembrar-me</span></label>
            <button type="button" class="forgot-button">Esqueci minha senha</button>
          </div>
          <app-auth-button
            [label]="loading() ? 'Entrando...' : 'Entrar na minha conta'"
            width="260px"
            type="submit"
            [disabled]="loading()"
          />
        </form>
        <p class="signup-prompt">Não tem uma conta? <span>Cadastre-se</span></p>
      </section>
    </main>
  `,
  styles: `
    .auth-page {
      min-height: calc(100vh - 64px);
      display: grid;
      place-items: start center;
      padding: 48px 24px 70px;
      background: #fff;
    }
    .auth-card {
      width: min(440px, 100%);
      max-width: 440px;
      background: #fff;
    }
    .auth-card h1 {
      margin: 0 0 32px;
      color: #272727;
      font-size: 36px;
      line-height: 1.15;
      letter-spacing: -0.8px;
      text-align: center;
    }
    .social-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .social-actions app-auth-button {
      min-width: 0;
    }
    .or-divider {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 27px 0 20px;
      color: #68717d;
      font-size: 13px;
      font-weight: 700;
    }
    .or-divider::before,
    .or-divider::after {
      content: '';
      height: 1px;
      flex: 1;
      background: #fff;
    }
    .admin-description {
      margin: 0 0 24px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }
    form {
      display: grid;
      gap: 16px;
      width: 100%;
    }
    label {
      display: grid;
      gap: 5px;
      width: 100%;
      color: #68717d;
      font-size: 14px;
      font-weight: 500;
    }
    input {
      width: 100%;
      height: 42px;
      padding: 0;
      border: 0;
      border-bottom: 1px solid #555;
      border-radius: 0;
      outline: 0;
      color: #292929;
      background: #fff;
      font-family: inherit;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.2;
    }
    input:focus {
      border-bottom: 2px solid #292929;
    }
    .field-label {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .field-label svg {
      width: 16px;
      height: 16px;
      stroke-width: 2;
    }
    .password-label {
      position: relative;
    }
    .password-toggle {
      position: absolute;
      right: 0;
      bottom: 7px;
      border: 0;
      background: transparent;
      color: #292929;
      width: 22px;
      height: 20px;
      padding: 0;
      font-size: 0;
      cursor: pointer;
    }
    .password-toggle::before {
      content: '';
      position: absolute;
      top: 4px;
      left: 2px;
      width: 16px;
      height: 10px;
      border: 1.5px solid #292929;
      border-radius: 80% 15%;
      transform: rotate(-45deg);
    }
    .password-toggle::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 10px;
      width: 1.5px;
      height: 20px;
      background: #292929;
      transform: rotate(45deg);
    }
    .form-options {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 3px;
    }
    .remember-option {
      display: flex;
      align-items: center;
      gap: 5px;
      width: auto;
      color: #68717d;
      font-size: 11px;
    }
    .remember-option input {
      width: 18px;
      height: 18px;
      border: 1px solid #68717d;
      border-radius: 50%;
      accent-color: #292929;
    }
    .forgot-button {
      padding: 0;
      border: 0;
      background: transparent;
      color: #68717d;
      font-size: 11px;
      cursor: pointer;
    }
    .admin-error {
      margin-bottom: 18px;
      color: #a33;
      font-size: 12px;
    }
    .signup-prompt {
      margin: 25px 0 0;
      color: #68717d;
      font-size: 12px;
      text-align: left;
    }
    .signup-prompt span {
      color: #292929;
      font-weight: 700;
      text-decoration: none;
    }
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  private readonly errors = inject(ApiErrorService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
    codigoTotp: '',
  });
  protected readonly mfaRequired = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly pressed = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { email, senha, codigoTotp } = this.form.getRawValue();
    if (this.mfaRequired()) {
      this.login(email, senha, codigoTotp);
      return;
    }
    this.auth.checkMfa(email, senha).subscribe({
      next: (required) => {
        if (required) {
          this.mfaRequired.set(true);
          this.loading.set(false);
        } else this.login(email, senha);
      },
      error: (e) => {
        this.error.set(this.errors.message(e, 'Credenciais inválidas.'));
        this.loading.set(false);
      },
    });
  }
  private login(email: string, senha: string, codigoTotp?: string): void {
    this.auth.login(email, senha, codigoTotp).subscribe({
      next: () =>
        void this.router.navigateByUrl(
          this.route.snapshot.queryParamMap.get('returnUrl') ?? '/admin/fontes',
        ),
      error: (e) => {
        this.error.set(this.errors.message(e, 'Não foi possível entrar.'));
        this.loading.set(false);
      },
    });
  }
}
