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
        <h1>Configurações do scraping</h1>
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
          <article class="source-card">
            <div class="source-main">
              <label class="switch" [class.is-active]="source.ativa" [class.is-inactive]="!source.ativa" [attr.aria-label]="'Alterar status da coleta de ' + source.nome">
                <input type="checkbox" [checked]="source.ativa" (change)="toggle(source, $event)" />
                <span class="switch-track"><span></span></span>
                <span class="switch-status">{{ source.ativa ? 'Ativo' : 'Inativo' }}</span>
              </label>
              <app-source-identity [name]="source.nome" [logo]="source.logo ?? ''" [large]="true" />
            </div>
            <span class="source-count">{{ source.categorias.length }} categoria(s) configurada(s)</span>
            <div class="source-actions">
              <a class="icon-action configure" [routerLink]="['/admin/fontes', source.fonte]" aria-label="Configurar fonte"><i data-lucide="pencil" aria-hidden="true"></i></a>
              <button class="icon-action remove" type="button" (click)="remove(source)" aria-label="Excluir fonte"><i data-lucide="trash-2" aria-hidden="true"></i></button>
            </div>
            @if (source.categorias.length) {
              <div class="category-list" aria-label="Categorias da fonte">
                @for (category of source.categorias; track category.id) {
                  <div class="category-row">
                    <div class="category-name">
                      <i data-lucide="tag" aria-hidden="true"></i>
                      <span>{{ category.categoria || 'Categoria sem nome' }}</span>
                    </div>
                    <span class="category-status" [class.is-active]="category.ativa" [class.is-inactive]="!category.ativa">
                      {{ category.ativa ? 'Ativa' : 'Inativa' }}
                    </span>
                    <a class="category-action" [routerLink]="['/admin/fontes', source.fonte]" [queryParams]="{ categoria: category.id }" aria-label="Configurar categoria">
                      <i data-lucide="settings-2" aria-hidden="true"></i><span>Configurar</span>
                    </a>
                    <button class="category-action category-delete" type="button" (click)="removeCategory(source, category)" aria-label="Excluir categoria">
                      <i data-lucide="trash-2" aria-hidden="true"></i><span>Excluir</span>
                    </button>
                  </div>
                }
              </div>
            }
          </article>
        }
        <button class="btn add-source-button" type="button" (click)="showForm.set(true)">
          Adicionar fonte <span aria-hidden="true">+</span>
        </button>
      </div>
    }
  `,
  styles: `
    .page-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .page-heading h1 {
      margin: 0;
      color: #111827;
      font-size: 28px;
      letter-spacing: -0.7px;
    }
    .page-heading > .btn { display: none; }
    .page-heading h1 { font-size: 0; }
    .page-heading h1::after { content: 'Configuração de Fontes'; font-size: 28px; }
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
      padding: 0 38px;
      border: 1px solid #dfe3e8;
      border-radius: 12px;
      background: #fff;
    }
    .source-card {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto 40px 40px;
      min-height: 88px;
      align-items: center;
      gap: 10px;
      padding: 22px 0;
      border-bottom: 1px solid #dfe3e8;
    }
    .source-card:last-child { border-bottom: 0; }
    .add-source-button { grid-column: 1 / -1; justify-self: start; margin: 22px 0 60px; background: #fff; color: #26354e; }
    .add-source-button span { margin-left: 10px; font-size: 21px; line-height: 0; }
    .source-main {
      display: flex;
      align-items: center;
      gap: 18px;
      min-width: 0;
    }
    .source-count {
      padding-top: 0;
      color: #697386;
      font-size: 14px;
    }
    .source-actions {
      display: contents;
    }
    .switch {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      font-weight: 600;
      font-size: 14px;
      white-space: nowrap;
    }
    .switch.is-active { color: #168253; }
    .switch.is-inactive { color: #c44343; }
    .switch input { position: absolute; opacity: 0; pointer-events: none; }
    .switch-track {
      display: inline-flex;
      width: 47px;
      height: 28px;
      align-items: center;
      padding: 3px;
      border-radius: 20px;
      background: #e7b4b4;
      transition: background .18s ease;
    }
    .switch-track span { width: 22px; height: 22px; border-radius: 50%; background: #fff; transition: transform .18s ease; }
    .switch.is-active .switch-track { background: #22a06b; }
    .switch.is-inactive .switch-track { background: #d95454; }
    .switch input:checked + .switch-track span { transform: translateX(19px); }
    .icon-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
    }
    .icon-action .lucide { width: 18px; height: 18px; }
    .icon-action.configure { position: static; grid-column: 3; color: var(--blue); }
    .icon-action.remove { position: static; grid-column: 4; color: #c44343; }
    .icon-action:hover { opacity: .7; }
    .source-card app-source-identity { display: inline-flex; align-items: center; }
    .source-card .source-actions + * { display: none; }
    .source-card .btn { display: none; }
    .source-card .badge { display: none; }
    .source-card > p { display: none;
    }
    .category-list {
      grid-column: 1 / -1;
      display: grid;
      gap: 1px;
      margin: 6px 0 0 38px;
      padding: 4px 0 4px 20px;
      border-left: 1px solid #d5ddeb;
      background: #fbfcff;
    }
    .category-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto auto;
      align-items: center;
      gap: 14px;
      min-height: 42px;
      padding: 0 12px;
      border-bottom: 1px solid #edf0f5;
      color: #596273;
      font-size: 13px;
    }
    .category-row:last-child { border-bottom: 0; }
    .category-name { display: flex; align-items: center; gap: 9px; min-width: 0; }
    .category-name .lucide { width: 16px; height: 16px; color: #7b8aa5; }
    .category-status { font-size: 12px; font-weight: 600; }
    .category-status.is-active { color: #168253; }
    .category-status.is-inactive { color: #c44343; }
    .category-action {
      display: inline-flex !important; align-items: center; justify-content: flex-start !important; gap: 6px;
      min-height: 30px; padding: 0 7px; border: 0; border-radius: 5px; background: transparent;
      color: var(--blue); font: inherit; font-size: 12px; text-decoration: none; cursor: pointer;
    }
    .category-action:hover { background: #eef2ff; }
    .category-action .lucide { width: 15px; height: 15px; }
    .category-delete { color: #c44343; }
    .category-delete:hover { background: #fff1f1; }
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
      .source-actions { display: flex; }
      .icon-action.configure { left: auto; right: 44px; top: 40px; }
      .icon-action.remove { right: 0; }
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
    const previousValue = source.ativa;
    const nextValue = (event.target as HTMLInputElement).checked;
    const changed = {
      ...config,
      fontes: config.fontes.map((item) =>
        item.fonte === source.fonte
          ? { ...item, ativa: nextValue }
          : item,
      ),
    };
    this.config.set(changed);
    this.api.save(changed).subscribe({
      next: (c) => {
        this.config.set(c);
        this.success('Status atualizado.');
      },
      error: (e) => {
        this.config.update((current) => current ? {
          ...current,
          fontes: current.fontes.map((item) => item.fonte === source.fonte ? { ...item, ativa: previousValue } : item),
        } : current);
        this.fail(e);
      },
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
  protected removeCategory(source: ConfiguredSource, category: ConfiguredSource['categorias'][number]): void {
    if (!confirm(`Excluir a categoria ${category.categoria || 'sem nome'} da fonte ${source.nome}?`)) return;
    const config = this.config();
    if (!config) return;
    const changed = {
      ...config,
      fontes: config.fontes.map((item) => item.fonte === source.fonte
        ? { ...item, categorias: item.categorias.filter((itemCategory) => itemCategory.id !== category.id) }
        : item),
    };
    this.config.set(changed);
    this.api.save(changed).subscribe({
      next: (saved) => { this.config.set(saved); this.success('Categoria excluída.'); },
      error: (error) => { this.config.set(config); this.fail(error); },
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
