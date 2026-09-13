import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ConfiguredSource,
  ScrapingConfig,
  SelectorAnalysis,
  SelectorTestResult,
  SourceCategory,
} from '../../../../core/models/domain.models';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { FontesApiService } from '../../data-access/fontes-api.service';
import { PopupService } from '../../../../core/services/popup.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-fonte-details',
  imports: [ReactiveFormsModule, RouterLink, MatDialogModule, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/admin/fontes" class="back"><svg lucideIcon="arrow-left" aria-hidden="true"></svg> Voltar para fontes</a>
    @if (loading()) {
      <div class="panel state">Carregando configuração…</div>
    } @else if (source()) {
      <header class="page-heading">
        <div>
          <span class="eyebrow">{{ source()?.nome }}</span>
          <h1>Categorias da fonte</h1>
          <p>Cada categoria tem sua própria URL e pode reutilizar ou não os mesmos seletores.</p>
        </div>
      </header>
      @if (feedback()) {
        <div class="feedback" [class.error]="failed()">{{ feedback() }}</div>
      }
      <form [formGroup]="form" (ngSubmit)="save()">
        <div formArrayName="categories" class="category-list">
          @for (
            category of categories.controls;
            track category.controls.id.value;
            let index = $index
          ) {
            <section class="panel category-card" [formGroupName]="index">
              <header>
                <div>
                  <span class="number">{{ index + 1 }}</span
                  ><strong>{{ category.controls.categoria.value || 'Nova categoria' }}</strong>
                </div>
                <div>
                  <label class="switch"
                    ><input type="checkbox" formControlName="ativa" /> Ativa</label
                  ><button
                    class="icon-danger"
                    type="button"
                    (click)="removeCategory(index)"
                    aria-label="Remover categoria"
                  >
                    ×
                  </button>
                </div>
              </header>
              <div class="basic-fields">
                <label>Categoria<input formControlName="categoria" placeholder="Notebooks" /></label
                ><label
                  >URL da página<input
                    type="url"
                    formControlName="url"
                    placeholder="https://loja.com/notebooks"
                /></label>
              </div>
              @if (category.touched && category.invalid) {
                <small class="field-error">{{ validationSummary(index) }}</small>
              }
              <details open>
                <summary>Seletores CSS</summary>
                <div formGroupName="seletores" class="selector-grid">
                  <label
                    >Card do produto<input
                      formControlName="item"
                      placeholder=".product-card" /></label
                  ><label
                    >Título<input formControlName="titulo" placeholder=".product-title" /></label
                  ><label>Preço<input formControlName="preco" placeholder=".price" /></label
                  ><label
                    >Preço antigo<input
                      formControlName="precoAntigo"
                      placeholder=".old-price" /></label
                  ><label>Imagem<input formControlName="imagem" placeholder="img" /></label
                  ><label>Link<input formControlName="url" placeholder="a" /></label
                  ><label class="check"
                    ><input type="checkbox" formControlName="paginaVirtualizada" /> Página
                    virtualizada</label
                  ><label
                    >Botão “carregar mais”<input
                      formControlName="carregarMais"
                      placeholder=".load-more"
                  /></label>
                </div>
              </details>
              <div class="category-actions">
                <button
                  class="btn secondary"
                  type="button"
                  [disabled]="testing() === index"
                  (click)="test(index)"
                >
                  {{ testing() === index ? 'Testando…' : 'Testar seletores' }}</button
                ><button class="btn secondary" type="button" (click)="openAnalyzer(index)">
                  <svg lucideIcon="scan-search" aria-hidden="true"></svg> Analisar HTML
                </button>
              </div>
              @if (testResults()[index]; as result) {
                <div class="test-result">
                  <strong>{{ result.quantidadeProdutos }} produto(s) encontrado(s)</strong>
                  @if (result.previewImagem) {
                    <img [src]="result.previewImagem" alt="Captura da página testada" />
                  }
                  <div class="preview-grid">
                    @for (product of result.produtos; track product.url) {
                      <article>
                        @if (product.imagemUrl) {
                          <img [src]="product.imagemUrl" [alt]="product.titulo" />
                        }
                        <span>{{ product.titulo }}</span
                        ><strong>{{ product.preco }}</strong>
                      </article>
                    }
                  </div>
                </div>
              }
            </section>
          }
        </div>
        @if (!categories.length) {
          <div class="panel state">
            <h2>Nenhuma categoria</h2>
            <p>Adicione a primeira URL de coleta desta loja.</p>
          </div>
        }
        <div class="save-bar">
          <span>{{ categories.length }} categoria(s)</span
          ><button class="btn primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Salvando…' : 'Salvar configurações' }}
          </button>
        </div>
      </form>
    }
    <ng-template #analyzerDialog>
      <section class="modal panel">
        <header>
          <div>
            <span class="eyebrow">Assistente de seletores</span>
            <h2>Analisar HTML de um card</h2>
          </div>
          <button class="icon-danger" (click)="closeAnalyzer()">×</button>
        </header>
        <p>Cole o HTML de um ou mais cards. A análise sugere seletores; revise antes de salvar.</p>
        <textarea
          [value]="html()"
          (input)="setHtml($event)"
          rows="14"
          placeholder="<article class='product-card'>…"
        ></textarea>
        @if (analysis()) {
          <div class="analysis-result">
            <strong>Confiança média: {{ analysisConfidence() }}%</strong>
            @for (note of analysis()?.observacoes ?? []; track note) {
              <p>{{ note }}</p>
            }
          </div>
        }
        @if (analyzerError()) {
          <div class="feedback error">{{ analyzerError() }}</div>
        }
        <footer>
          <button class="btn secondary" type="button" (click)="formatHtml()">Formatar HTML</button
          ><button
            class="btn primary"
            [disabled]="!html().trim() || analyzing()"
            (click)="analyze()"
          >
            {{ analyzing() ? 'Analisando…' : 'Analisar' }}
          </button>
          @if (analysis()) {
            <button class="btn primary" type="button" (click)="applyAnalysis()">
              Aplicar seletores
            </button>
          }
        </footer>
      </section>
    </ng-template>
  `,
  styles: `
    .back {
      display: inline-block;
      margin-bottom: 1rem;
      font-weight: 800;
    }
    .page-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .page-heading h1 {
      margin: 0.25rem 0;
    }
    .page-heading p,
    .modal > p {
      color: var(--muted);
    }
    .category-list {
      display: grid;
      gap: 1rem;
    }
    .category-card {
      padding: 0;
      overflow: hidden;
    }
    .category-card > header,
    .modal > header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.2rem;
      border-bottom: 1px solid var(--border);
    }
    .category-card > header > div {
      display: flex;
      gap: 0.7rem;
      align-items: center;
    }
    .number {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      background: #dbeafe;
      color: var(--primary);
      border-radius: 8px;
      font-weight: 900;
    }
    .switch {
      font-size: 0.8rem;
      font-weight: 800;
    }
    .icon-danger {
      border: 0;
      background: #fee2e2;
      color: #b91c1c;
      border-radius: 8px;
      font-size: 1.3rem;
      cursor: pointer;
    }
    .basic-fields,
    .selector-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 1rem;
      padding: 1.2rem;
    }
    .field-error {
      color: #a33;
      font-size: 11px;
    }
    .ng-invalid.ng-touched:not(form) {
      border-color: #a33;
      outline-color: #a33;
    }
    .selector-grid {
      grid-template-columns: repeat(3, 1fr);
      padding: 1rem 0;
    }
    .basic-fields label,
    .selector-grid label {
      display: grid;
      gap: 0.35rem;
      font-size: 0.78rem;
      font-weight: 800;
    }
    .check {
      display: flex !important;
      align-items: center;
    }
    details {
      border-top: 1px solid var(--border);
      padding: 1rem 1.2rem;
    }
    summary {
      cursor: pointer;
      font-weight: 900;
    }
    .category-actions {
      display: flex;
      gap: 0.6rem;
      padding: 0 1.2rem 1.2rem;
    }
    .test-result {
      margin: 0 1.2rem 1.2rem;
      padding: 1rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
    }
    .test-result > img {
      width: 100%;
      max-height: 320px;
      object-fit: contain;
      margin-top: 1rem;
    }
    .preview-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .preview-grid article {
      background: #fff;
      padding: 0.5rem;
      border-radius: 8px;
      font-size: 0.7rem;
    }
    .preview-grid img {
      width: 100%;
      height: 80px;
      object-fit: contain;
    }
    .preview-grid span {
      display: block;
    }
    .save-bar {
      position: sticky;
      bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      background: #111827;
      color: #fff;
      padding: 1rem 1.2rem;
      border-radius: 12px;
      box-shadow: var(--shadow);
    }
    .modal {
      width: min(850px, 100%);
      max-height: 95vh;
      overflow: auto;
      padding: 0;
    }
    .modal textarea {
      display: block;
      width: calc(100% - 2.4rem);
      margin: 1.2rem;
      font-family: monospace;
      resize: vertical;
    }
    .modal > p,
    .modal > footer,
    .analysis-result {
      margin: 1rem 1.2rem;
    }
    .modal > footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .analysis-result {
      background: #eff6ff;
      padding: 1rem;
      border-radius: 10px;
    }
    @media (max-width: 850px) {
      .page-heading {
        align-items: flex-start;
        gap: 1rem;
      }
      .basic-fields,
      .selector-grid {
        grid-template-columns: 1fr;
      }
      .preview-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `,
})
export class FonteDetailsPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FontesApiService);
  private readonly errors = inject(ApiErrorService);
  private readonly popup = inject(PopupService);
  private readonly dialogs = inject(DialogService);
  @ViewChild('analyzerDialog', { static: true })
  private readonly analyzerDialog!: TemplateRef<unknown>;
  private analyzerDialogRef?: MatDialogRef<unknown>;
  private config: ScrapingConfig | null = null;
  protected readonly source = signal<ConfiguredSource | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly feedback = signal('');
  protected readonly failed = signal(false);
  protected readonly testing = signal<number | null>(null);
  protected readonly testResults = signal<Record<number, SelectorTestResult>>({});
  protected readonly analyzerIndex = signal<number | null>(null);
  protected readonly html = signal('');
  protected readonly analysis = signal<SelectorAnalysis | null>(null);
  protected readonly analyzing = signal(false);
  protected readonly analyzerError = signal('');
  protected readonly form = this.fb.group({
    categories: this.fb.array<ReturnType<FonteDetailsPage['categoryGroup']>>([]),
  });
  protected get categories(): FormArray<ReturnType<FonteDetailsPage['categoryGroup']>> {
    return this.form.controls.categories;
  }
  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('fonte') ?? '';
    this.api.config(true).subscribe({
      next: (config) => {
        this.config = config;
        const source = config.fontes.find((item) => item.fonte === id) ?? null;
        this.source.set(source);
        source?.categorias.forEach((category) =>
          this.categories.push(this.categoryGroup(category)),
        );
        this.loading.set(false);
      },
      error: (e) => {
        this.feedback.set(this.errors.message(e));
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }
  private categoryGroup(value?: SourceCategory) {
    return this.fb.nonNullable.group({
      id: value?.id ?? crypto.randomUUID(),
      categoria: [value?.categoria ?? '', Validators.required],
      icone: value?.icone ?? 'tag',
      url: [value?.url ?? '', [Validators.required, Validators.pattern(/^https?:\/\//i)]],
      ativa: value?.ativa ?? true,
      seletores: this.fb.nonNullable.group({
        item: [value?.seletores.item ?? '', Validators.required],
        titulo: [value?.seletores.titulo ?? '', Validators.required],
        preco: [value?.seletores.preco ?? '', Validators.required],
        precoAntigo: value?.seletores.precoAntigo ?? '',
        imagem: [value?.seletores.imagem ?? '', Validators.required],
        url: value?.seletores.url ?? '',
        paginaVirtualizada: value?.seletores.paginaVirtualizada ?? false,
        carregarMais: value?.seletores.carregarMais ?? '',
      }),
    });
  }
  protected async removeCategory(index: number): Promise<void> {
    if (
      await this.popup.confirmDelete(
        'Remover esta categoria?',
        'A categoria será removida apenas ao salvar a fonte.',
      )
    )
      this.categories.removeAt(index);
  }
  protected save(): void {
    if (this.form.invalid || !this.config || !this.source()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const source = this.source()!;
    const changed = { ...source, categorias: this.form.getRawValue().categories };
    const config = {
      ...this.config,
      fontes: this.config.fontes.map((item) => (item.fonte === source.fonte ? changed : item)),
    };
    this.api.save(config).subscribe({
      next: (saved) => {
        this.config = saved;
        this.source.set(saved.fontes.find((item) => item.fonte === source.fonte) ?? null);
        this.success('Configurações salvas.');
      },
      error: (e) => this.fail(e),
    });
  }
  protected validationSummary(index: number): string {
    const category = this.categories.at(index);
    const errors: string[] = [];
    if (category.controls.categoria.hasError('required')) errors.push('Categoria é obrigatória.');
    if (category.controls.url.hasError('required')) errors.push('URL da página é obrigatória.');
    if (category.controls.url.hasError('pattern'))
      errors.push('URL deve começar com http:// ou https://.');
    const selectors = category.controls.seletores.controls;
    for (const [control, label] of [
      ['item', 'Card do produto'],
      ['titulo', 'Título'],
      ['preco', 'Preço'],
      ['imagem', 'Imagem'],
    ] as const) {
      if (selectors[control].hasError('required')) errors.push(`${label} é obrigatório.`);
    }
    return errors.join(' ');
  }
  protected test(index: number): void {
    const source = this.source(),
      category = this.categories.at(index);
    if (!source || category.invalid) {
      category.markAllAsTouched();
      return;
    }
    this.testing.set(index);
    const value = category.getRawValue();
    this.api
      .testSelectors({
        fonte: source.fonte,
        categoria: value.categoria,
        url: value.url,
        seletores: value.seletores,
      })
      .subscribe({
        next: (result) => {
          this.testResults.update((all) => ({ ...all, [index]: result }));
          this.testing.set(null);
        },
        error: (e) => {
          this.fail(e);
          this.testing.set(null);
        },
      });
  }
  protected openAnalyzer(index: number): void {
    this.analyzerIndex.set(index);
    this.html.set('');
    this.analysis.set(null);
    this.analyzerError.set('');
    this.analyzerDialogRef = this.dialogs.open(this.analyzerDialog, {
      width: 'min(850px, calc(100vw - 32px))',
      ariaLabel: 'Analisar HTML de um card',
    });
  }
  protected closeAnalyzer(): void {
    this.analyzerIndex.set(null);
    this.analyzerDialogRef?.close();
  }
  protected setHtml(event: Event): void {
    this.html.set((event.target as HTMLTextAreaElement).value);
  }
  protected formatHtml(): void {
    this.html.update((value) => value.replace(/>\s*</g, '>\n<').replace(/^\s+/gm, ''));
  }
  protected analyze(): void {
    this.analyzing.set(true);
    this.analyzerError.set('');
    this.api.analyzeHtml(this.html()).subscribe({
      next: (result) => {
        this.analysis.set(result);
        this.analyzing.set(false);
      },
      error: (e) => {
        this.analyzerError.set(this.errors.message(e));
        this.analyzing.set(false);
      },
    });
  }
  protected applyAnalysis(): void {
    const index = this.analyzerIndex(),
      analysis = this.analysis();
    if (index === null || !analysis) return;
    this.categories.at(index).controls.seletores.patchValue(analysis.seletores);
    this.closeAnalyzer();
    this.success('Seletores sugeridos aplicados. Revise e salve.');
  }
  protected analysisConfidence(): number {
    const values = Object.values(this.analysis()?.confianca ?? {}).filter(Number.isFinite);
    if (!values.length) return 0;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100);
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
