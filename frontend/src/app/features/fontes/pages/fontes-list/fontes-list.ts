import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfiguredSource, ScrapingConfig } from '../../../../core/models/domain.models';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { FontesApiService } from '../../data-access/fontes-api.service';
import { SourceIdentityComponent } from '../../../../shared/components/source-identity/source-identity';

@Component({
  selector: 'app-fontes-list',
  imports: [ReactiveFormsModule, RouterLink, SourceIdentityComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-heading">
      <div>
        <span class="eyebrow">Coleta por loja</span>
        <h1>Fontes de produtos</h1>
        <p>Cadastre lojas e organize URLs e seletores por categoria.</p>
      </div>
      <button class="btn primary" (click)="showForm.set(!showForm())">＋ Nova fonte</button>
    </header>
    @if (feedback()) {
      <div class="feedback" [class.error]="failed()">{{ feedback() }}</div>
    }
    @if (showForm()) {
      <form class="panel add-form" [formGroup]="form" (ngSubmit)="add()">
        <h2>Adicionar fonte</h2>
        <div class="fields">
          <label>Identificador<input formControlName="fonte" placeholder="kabum" /></label
          ><label>Nome exibido<input formControlName="nome" placeholder="KaBuM!" /></label
          ><label>Logo<input type="file" accept="image/*" (change)="selectLogo($event)" /></label>
        </div>
        @if (logo()) {
          <img class="logo-preview" [src]="logo()" alt="Prévia do logo" />
        }
        <div class="actions">
          <button class="btn" type="button" (click)="showForm.set(false)">Cancelar</button
          ><button class="btn primary" [disabled]="form.invalid || saving()">Salvar fonte</button>
        </div>
      </form>
    }
    @if (loading()) {
      <div class="panel state">Carregando fontes…</div>
    } @else if (!config()?.fontes?.length) {
      <div class="panel onboarding">
        <div class="onboarding-icon">⌁</div>
        <h2>Cadastre sua primeira fonte</h2>
        <p>
          Depois você poderá adicionar notebooks, processadores, placas de vídeo e qualquer outra
          categoria de forma independente.
        </p>
        <button class="btn primary" (click)="showForm.set(true)">Adicionar fonte</button>
      </div>
    } @else {
      <div class="source-grid">
        @for (source of config()?.fontes; track source.fonte) {
          <article class="panel source-card">
            <div class="source-title">
              <app-source-identity [name]="source.nome" [logo]="source.logo ?? ''" /><span
                class="badge"
                [class.active]="source.ativa"
                >{{ source.ativa ? 'Ativa' : 'Inativa' }}</span
              >
            </div>
            <p>{{ source.categorias.length }} categoria(s) configurada(s)</p>
            <div class="source-actions">
              <label class="switch"
                ><input
                  type="checkbox"
                  [checked]="source.ativa"
                  (change)="toggle(source, $event)"
                />
                Coleta ativa</label
              ><a class="btn" [routerLink]="['/admin/fontes', source.fonte]">Configurar</a
              ><button class="btn danger" (click)="remove(source)">Excluir</button>
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .page-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .page-heading h1 {
      margin: 0.2rem 0;
    }
    .page-heading p,
    .source-card p,
    .onboarding p {
      color: var(--muted);
    }
    .add-form {
      padding: 1.4rem;
      margin-bottom: 1.2rem;
    }
    .add-form h2 {
      margin-top: 0;
    }
    .fields {
      display: grid;
      grid-template-columns: 1fr 1fr 1.2fr;
      gap: 1rem;
    }
    .fields label {
      display: grid;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 800;
    }
    .logo-preview {
      max-height: 55px;
      max-width: 150px;
      margin-top: 1rem;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      margin-top: 1rem;
    }
    .source-grid {
      display: grid;
      grid-template-columns: 1fr;
      max-width: 1050px;
      margin: 0 auto;
      padding: 0 30px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
    }
    .source-grid .source-card {
      min-height: 106px;
      padding: 22px 0;
      border: 0 !important;
      border-bottom: 1px solid var(--line) !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    .source-grid .source-card:last-child {
      border-bottom: 0 !important;
    }
    .source-title,
    .source-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.6rem;
    }
    .source-card > p {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
    }
    .source-actions {
      margin-top: -28px;
      justify-content: flex-end;
    }
    .switch {
      font-size: 12px;
      font-weight: 600;
    }
    .badge {
      padding: 0.25rem 0.55rem;
      border-radius: 5px;
      background: #fee2e2;
      color: #b91c1c;
      font-size: 11px;
      font-weight: 700;
    }
    .badge.active {
      background: #dcfce7;
      color: #15803d;
    }
    .onboarding {
      text-align: center;
      padding: 4rem max(1rem, 15%);
    }
    .onboarding-icon {
      font-size: 3rem;
      color: var(--primary);
    }
    @media (max-width: 850px) {
      .fields,
      .source-grid {
        grid-template-columns: 1fr;
      }
      .source-grid {
        padding: 0 18px;
      }
      .source-actions {
        flex-wrap: wrap;
      }
      .page-heading {
        align-items: flex-start;
        gap: 1rem;
      }
    }
  `,
})
export class FontesListPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FontesApiService);
  private readonly errors = inject(ApiErrorService);
  protected readonly config = signal<ScrapingConfig | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly logo = signal('');
  protected readonly feedback = signal('');
  protected readonly failed = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    fonte: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    nome: ['', Validators.required],
  });
  constructor() {
    this.reload();
  }
  private reload(): void {
    this.api.config(true).subscribe({
      next: (c) => {
        this.config.set(c);
        this.loading.set(false);
      },
      error: (e) => {
        this.fail(e);
        this.loading.set(false);
      },
    });
  }
  protected selectLogo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 700 * 1024) {
      this.feedback.set('O logo deve ter no máximo 700 KB.');
      this.failed.set(true);
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      this.feedback.set('Use uma logo PNG, JPEG, WebP ou SVG.');
      this.failed.set(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.logo.set(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  }
  protected add(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.api.add({ ...this.form.getRawValue(), logo: this.logo() }).subscribe({
      next: (c) => {
        this.config.set(c);
        this.form.reset();
        this.logo.set('');
        this.showForm.set(false);
        this.success('Fonte adicionada.');
      },
      error: (e) => this.fail(e),
    });
  }
  protected toggle(source: ConfiguredSource, event: Event): void {
    const config = this.config();
    if (!config) return;
    const changed = {
      ...config,
      fontes: config.fontes.map((item) =>
        item.fonte === source.fonte
          ? { ...item, ativa: (event.target as HTMLInputElement).checked }
          : item,
      ),
    };
    this.api.save(changed).subscribe({
      next: (c) => {
        this.config.set(c);
        this.success('Status atualizado.');
      },
      error: (e) => this.fail(e),
    });
  }
  protected remove(source: ConfiguredSource): void {
    if (!confirm(`Excluir a fonte ${source.nome} e suas categorias?`)) return;
    this.api.remove(source.fonte).subscribe({
      next: (c) => {
        this.config.set(c);
        this.success('Fonte excluída.');
      },
      error: (e) => this.fail(e),
    });
  }
  private success(message: string): void {
    this.feedback.set(message);
    this.failed.set(false);
    this.saving.set(false);
  }
  private fail(error: unknown): void {
    this.feedback.set(this.errors.message(error));
    this.failed.set(true);
    this.saving.set(false);
  }
}
