import { LucideDynamicIcon } from '@lucide/angular';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Product, SourceIdentity } from '../../../../core/models/domain.models';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { FontesApiService } from '../../../fontes/data-access/fontes-api.service';
import { ProductQuery, ProdutosApiService } from '../../data-access/produtos-api.service';
import { ProductCardComponent } from '../../components/product-card/product-card';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-produtos-list',
  imports: [ReactiveFormsModule, ProductCardComponent, PaginationComponent, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="content-layout">
      <aside class="filters-panel">
        <div class="filters-heading">
          <h1>Filtros</h1>
          <button class="text-button" type="button" (click)="clear()">
            Limpar <svg lucideIcon="rotate-ccw" aria-hidden="true"></svg>
          </button>
        </div>
        <form [formGroup]="form">
          <section class="filter-section">
            <h2>Categoria</h2>
            <div class="radio-list">
              <label class="radio-row"
                ><input type="radio" formControlName="categoria" value="" /> Todas as
                categorias</label
              >
              @for (group of categoryGroups(); track group.name) {
                <div class="category-filter-group">
                  <label class="radio-row category-filter-heading"
                    ><input type="radio" formControlName="categoria" [value]="group.name" />
                    <strong>{{ group.name }}</strong></label
                  >
                  @if (group.children.length) {
                    <div class="category-subcategories">
                      @for (child of group.children; track child) {
                        <label class="radio-row"
                          ><input
                            type="radio"
                            formControlName="categoria"
                            [value]="group.name + ' > ' + child"
                          />
                          <span>{{ child }}</span></label
                        >
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </section>
          <section class="filter-section">
            <h2>Fonte</h2>
            <div class="radio-list">
              <label class="radio-row"
                ><input type="radio" formControlName="fonte" value="" /> Todas as fontes</label
              >
              @for (source of sources(); track source.fonte) {
                <label class="radio-row"
                  ><input type="radio" formControlName="fonte" [value]="source.fonte" />
                  @if (source.logo) {
                    <img [src]="source.logo" [alt]="source.nome" />
                  } @else {
                    <svg class="source-filter-fallback" lucideIcon="store" aria-hidden="true"></svg>
                  }
                  <span>{{ sourceLabel(source.nome) }}</span></label
                >
              }
            </div>
          </section>
          <section class="filter-section">
            <h2>Preço</h2>
            <div class="price-slider">
              <div class="range-values">
                <span>R$ {{ minPriceLabel() }}</span
                ><span>{{ maxPriceLabel() }}</span>
              </div>
              <div class="dual-range" aria-label="Faixa de preço">
                <div class="dual-range-track"></div>
                <input
                  id="min-price"
                  type="range"
                  min="0"
                  max="20000"
                  step="50"
                  formControlName="precoMin"
                  aria-label="Preço mínimo"
                  (input)="normalizePriceRange()"
                />
                <input
                  id="max-price"
                  type="range"
                  min="0"
                  max="20000"
                  step="50"
                  formControlName="precoMax"
                  aria-label="Preço máximo"
                  (input)="normalizePriceRange()"
                />
              </div>
            </div>
          </section>
          <section class="filter-section">
            <h2>Status</h2>
            <label class="check-row"
              ><input type="checkbox" formControlName="ativo" /> Somente ativos</label
            >
          </section>
        </form>
      </aside>
      <section class="products-area">
        @if (newest().length) {
          <section class="new-products panel">
            <div class="section-heading">
              <div>
                <h2>Novidades</h2>
              </div>
              <span>{{ newest().length }} produto(s)</span>
            </div>
            <div class="new-products-carousel" role="region" aria-label="Novidades">
              <button
                class="carousel-control"
                type="button"
                aria-label="Novidades anteriores"
                (click)="previousNewest()"
                [disabled]="newestPage() === 1"
              >
                <svg lucideIcon="chevron-left" aria-hidden="true"></svg>
              </button>
              <div class="new-products-viewport" aria-live="polite">
                <div class="new-products-grid">
                  @for (product of newestVisible(); track product._id ?? product.id) {
                    <app-product-card [product]="product" [sources]="sourceMap()" [compact]="true" />
                  }
                </div>
              </div>
              <button
                class="carousel-control"
                type="button"
                aria-label="Próximas novidades"
                (click)="nextNewest()"
                [disabled]="newestPage() === newestPageCount()"
              >
                <svg lucideIcon="chevron-right" aria-hidden="true"></svg>
              </button>
            </div>
            @if (newestPageCount() > 1) {
              <div class="carousel-indicators" aria-label="Páginas de novidades">
                @for (page of newestPageNumbers(); track page) {
                  <button
                    type="button"
                    [class.active]="newestPage() === page"
                    [attr.aria-label]="'Ir para novidades ' + page"
                    [attr.aria-current]="newestPage() === page ? 'page' : null"
                    (click)="goToNewest(page)"
                  ></button>
                }
              </div>
            }
          </section>
        }
        <div class="toolbar">
          <div class="toolbar-summary">
            <span class="result-status">{{ total() }} produto(s)</span>
            @if (form.value.ativo) {
              <button class="filter-chip" type="button" (click)="clearActiveStatus()">
                Status: Somente ativos <svg lucideIcon="x" aria-hidden="true"></svg>
              </button>
            }
          </div>
          <label class="sort-control"
            ><span>Ordenar por</span
            ><select [formControl]="sort">
              <option value="desconto">Maior desconto</option>
              <option value="recente">Mais recentes</option>
              <option value="preco-asc">Menor preço</option>
              <option value="preco-desc">Maior preço</option>
            </select></label
          >
        </div>
        @if (error()) {
          <div class="state">
            {{ error() }}
            <button class="btn primary" type="button" (click)="load()">
              Tentar novamente <svg lucideIcon="rotate-ccw" aria-hidden="true"></svg>
            </button>
          </div>
        } @else if (loading()) {
          <div class="products-grid">
            @for (item of skeletons; track $index) {
              <article class="product-card skeleton-card">
                <div class="skeleton skeleton-image"></div>
                <div class="product-card-body">
                  <span class="skeleton skeleton-line short"></span>
                  <span class="skeleton skeleton-line title"></span>
                  <span class="skeleton skeleton-line price"></span>
                  <span class="skeleton skeleton-line footer"></span>
                </div>
              </article>
            }
          </div>
        } @else if (!products().length) {
          <div class="state">Nenhum produto encontrado com esses filtros.</div>
        } @else {
          <div class="products-grid">
            @for (product of products(); track product._id) {
              <app-product-card [product]="product" [sources]="sourceMap()" />
            }
          </div>
        }
        <app-pagination
          [page]="page()"
          [totalPages]="totalPages()"
          (changed)="changePage($event)"
        />
      </section>
    </main>
  `,
  styles: `
    .content-layout {
      display: grid;
      grid-template-columns: 302px minmax(0, 1fr);
      min-height: calc(100vh - 73px);
      align-items: start;
    }
    .filters-panel {
      padding: 40px 36px;
      border-right: 1px solid var(--line);
    }
    .filters-heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }
    h1 {
      margin: 0;
      font-size: 22px;
      letter-spacing: -0.5px;
    }
    .text-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--blue);
      font-size: 12px;
    }
    .text-button .lucide {
      width: 16px;
      height: 16px;
      stroke-width: 2;
    }
    .filters form {
      display: grid;
    }
    .filter-section {
      padding: 25px 0;
      border-bottom: 1px solid var(--line);
    }
    .filter-section h2 {
      margin: 0 0 18px;
      font-size: 18px;
    }
    .radio-list {
      display: grid;
      gap: 14px;
    }
    .radio-row,
    .check-row {
      display: flex;
      align-items: center;
      gap: 9px;
      color: #4d4d4d;
      font-size: 15px;
    }
    .radio-row input,
    .check-row input {
      accent-color: var(--blue);
    }
    .radio-row strong {
      color: #222;
      font-weight: 600;
    }
    .price-fields {
      display: grid;
      gap: 10px;
    }
    .price-fields label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
    }
    .price-fields input {
      height: 37px;
      padding: 0 10px;
      border: 1px solid #d6d6d6;
      border-radius: 6px;
    }
    .products-area {
      min-width: 0;
      padding: 32px 36px 42px;
    }
    .new-products {
      margin-bottom: 30px;
      padding: 20px;
      border: 0;
      box-shadow: none;
    }
    .section-heading {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }
    .section-heading h2 {
      margin: 3px 0 0;
      font-size: 22px;
    }
    .section-heading > span {
      color: var(--muted);
      font-size: 12px;
    }
    .new-products-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
    }
    .new-products-carousel {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) 34px;
      align-items: center;
      gap: 10px;
    }
    .new-products-viewport {
      min-width: 0;
      overflow: hidden;
    }
    .carousel-control {
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      padding: 0;
      border: 1px solid #d9dfe8;
      border-radius: 50%;
      background: #fff;
      color: #17233b;
      cursor: pointer;
      transition: background 160ms ease, color 160ms ease, opacity 160ms ease;
    }
    .carousel-control:hover:not(:disabled) {
      background: var(--blue);
      color: #fff;
    }
    .carousel-control:disabled {
      cursor: default;
      opacity: 0.35;
    }
    .carousel-control .lucide {
      width: 18px;
      height: 18px;
    }
    .carousel-indicators {
      display: flex;
      justify-content: center;
      gap: 6px;
      margin-top: 14px;
    }
    .carousel-indicators button {
      width: 7px;
      height: 7px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: #cfd5df;
      cursor: pointer;
    }
    .carousel-indicators button.active {
      width: 20px;
      border-radius: 5px;
      background: var(--blue);
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 39px;
      margin-bottom: 28px;
      gap: 15px;
    }
    .toolbar-summary {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }
    .result-status {
      color: var(--muted);
      font-size: 14px;
    }
    .filter-chip {
      padding: 10px 14px;
      border: 1px solid #ddd;
      border-radius: 19px;
      background: #fff;
      color: #555;
      font-size: 12px;
    }
    .filter-chip b {
      margin-left: 8px;
      color: #222;
      font-size: 18px;
      font-weight: 400;
    }
    .sort-control {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #555;
      font-size: 14px;
      white-space: nowrap;
    }
    .sort-control select {
      height: 43px;
      padding: 0 28px 0 12px;
      border: 1px solid #d9d9d9;
      border-radius: 6px;
      background: #fff;
      color: #333;
    }
    .products-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 22px;
    }
    .skeleton-card {
      height: 525px;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      background: #f0f2f3;
    }
    .skeleton {
      position: relative;
      overflow: hidden;
      background: #e8ebf1;
    }
    .skeleton::after {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgb(255 255 255 / 62%), transparent);
      content: '';
      transform: translateX(-100%);
      animation: skeleton-shimmer 1.25s ease-in-out infinite;
    }
    .skeleton-image {
      height: 190px;
    }
    .skeleton-line {
      display: block;
      height: 11px;
      margin: 0 0 11px;
      border-radius: 5px;
    }
    .skeleton-line.short {
      width: 32%;
    }
    .skeleton-line.title {
      width: 88%;
      height: 16px;
      margin-top: 16px;
    }
    .skeleton-line.price {
      width: 45%;
      height: 22px;
      margin-top: 18px;
    }
    .skeleton-line.footer {
      width: 70%;
      margin-top: 20px;
    }
    @keyframes skeleton-shimmer {
      100% {
        transform: translateX(100%);
      }
    }
    /* Filtro alinhado aos tokens visuais compartilhados. */
    .content-layout {
      grid-template-columns: 244px minmax(0, 1fr);
      min-height: calc(100vh - 116px);
    }
    .filters-panel {
      padding: 30px;
    }
    .filter-section {
      padding: 25px 0;
      border-bottom: 1px solid var(--line);
    }
    .filter-section h2 {
      margin: 0 0 16px;
      font-size: 15px;
    }
    .radio-list {
      gap: 11px;
    }
    .radio-row,
    .check-row {
      gap: 8px;
      color: #4d4d4d;
      font-size: 12px;
    }
    .radio-row strong {
      color: #333;
      font-weight: 600;
    }
    .category-filter-group {
      display: grid;
      gap: 7px;
    }
    .category-filter-heading {
      min-width: 0;
    }
    .category-filter-heading strong,
    .category-subcategories .radio-row span {
      overflow: visible;
      text-overflow: clip;
      white-space: nowrap;
    }
    .category-subcategories {
      display: grid;
      gap: 8px;
      margin-left: 25px;
      padding-left: 10px;
      border-left: 1px solid #e1e5ef;
    }
    .price-slider > label {
      display: none;
    }
    .price-slider {
      display: grid;
      gap: 8px;
    }
    .range-values {
      display: flex;
      justify-content: space-between;
      color: #333;
      font-size: 12px;
      font-weight: 600;
    }
    .dual-range {
      position: relative;
      height: 28px;
      margin: 2px 7px 0;
    }
    .dual-range-track {
      position: absolute;
      top: 12px;
      right: 0;
      left: 0;
      height: 4px;
      border-radius: 4px;
      background: #dfe3eb;
    }
    .dual-range input[type='range'] {
      position: absolute;
      top: 0;
      left: -7px;
      width: calc(100% + 14px);
      height: 28px;
      margin: 0;
      pointer-events: none;
      appearance: none;
      background: transparent;
      accent-color: var(--blue);
    }
    .dual-range input[type='range']::-webkit-slider-runnable-track {
      height: 4px;
      background: transparent;
    }
    .dual-range input[type='range']::-moz-range-track {
      height: 4px;
      background: transparent;
    }
    .dual-range input[type='range']::-webkit-slider-thumb {
      width: 16px;
      height: 16px;
      margin-top: -6px;
      border: 2px solid #fff;
      border-radius: 50%;
      background: var(--blue);
      box-shadow: 0 0 0 1px var(--blue);
      cursor: pointer;
      pointer-events: auto;
      appearance: none;
    }
    .dual-range input[type='range']::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border: 2px solid #fff;
      border-radius: 50%;
      background: var(--blue);
      box-shadow: 0 0 0 1px var(--blue);
      cursor: pointer;
      pointer-events: auto;
    }
    #min-price {
      z-index: 2;
    }
    #max-price {
      z-index: 3;
    }
    .radio-row img {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }
    .source-filter-fallback {
      display: inline-grid;
      width: 30px;
      height: 30px;
      flex: 0 0 30px;
      place-items: center;
      border-radius: 8px;
      background: #eef2ff;
      color: var(--blue);
    }
    .products-area {
      padding: 22px 28px 42px;
    }
    .new-products {
      margin-bottom: 28px;
      padding: 24px 0 0;
    }
    .new-products-grid,
    .products-grid {
      gap: 18px;
    }
    .toolbar {
      margin-bottom: 20px;
    }
    .result-status {
      font-size: 12px;
    }
    .toolbar-summary {
      gap: 10px;
    }
    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 11px;
      border: 1px solid #ddd;
      border-radius: 17px;
      background: #fff;
      color: #555;
      font: inherit;
      font-size: 11px;
      cursor: pointer;
    }
    .filter-chip .lucide {
      width: 15px;
      height: 15px;
      color: #222;
      stroke-width: 2;
    }
    .sort-control {
      gap: 9px;
      font-size: 12px;
    }
    .sort-control select {
      height: auto;
      padding: 8px 28px 8px 10px;
    }
  `,
})
export class ProdutosListPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProdutosApiService);
  private readonly sourceApi = inject(FontesApiService);
  private readonly errors = inject(ApiErrorService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly form = this.fb.nonNullable.group({
    categoria: '',
    fonte: '',
    precoMin: 0,
    precoMax: 20000,
    ativo: true,
  });
  protected readonly sort = this.fb.nonNullable.control<ProductQuery['ordenacao']>('desconto');
  protected readonly products = signal<Product[]>([]);
  protected readonly newest = signal<Product[]>([]);
  protected readonly newestPage = signal(1);
  protected readonly newestPageCount = computed(() => Math.max(1, Math.ceil(this.newest().length / 4)));
  protected readonly newestPageNumbers = computed(() =>
    Array.from({ length: this.newestPageCount() }, (_, index) => index + 1),
  );
  protected readonly newestVisible = computed(() =>
    this.newest().slice((this.newestPage() - 1) * 4, this.newestPage() * 4),
  );
  protected readonly sources = signal<SourceIdentity[]>([]);
  protected readonly sourceMap = signal<Record<string, SourceIdentity>>({});
  protected readonly categories = signal<string[]>([]);
  protected readonly categoryGroups = computed(() => {
    const groups = new Map<string, string[]>();
    for (const category of this.categories()) {
      const [name = '', child] = category.split(' > ');
      if (!groups.has(name)) groups.set(name, []);
      if (child && !groups.get(name)!.includes(child)) groups.get(name)!.push(child);
    }
    return [...groups.entries()]
      .sort(([a], [b]) =>
        a === 'Outros'
          ? 1
          : b === 'Outros'
            ? -1
            : a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
      )
      .map(([name, children]) => ({
        name,
        children: children.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })),
      }));
  });
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly page = signal(1);
  protected readonly totalPages = signal(0);
  protected readonly total = signal(0);
  protected readonly skeletons = Array.from({ length: 8 });
  protected minPriceLabel(): string {
    return String(this.form.controls.precoMin.value ?? 0);
  }
  protected maxPriceLabel(): string {
    const value = this.form.controls.precoMax.value;
    return value == null || value >= 20000 ? 'Sem limite' : `R$ ${value}`;
  }
  protected sourceLabel(name: string): string {
    const value = String(name ?? '').trim();
    return value ? value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1) : value;
  }
  protected clearActiveStatus(): void {
    this.form.controls.ativo.setValue(false);
  }
  protected normalizePriceRange(): void {
    const min = this.form.controls.precoMin.value ?? 0;
    const max = this.form.controls.precoMax.value ?? 20000;
    if (min > max) {
      if (document.activeElement === document.getElementById('min-price'))
        this.form.controls.precoMax.setValue(min);
      else this.form.controls.precoMin.setValue(max);
    }
  }
  constructor() {
    const destroyRef = inject(DestroyRef);
    const busca = this.route.snapshot.queryParamMap.get('busca') ?? '';
    forkJoin({
      sources: this.sourceApi.publicList(),
      categories: this.api.categories(),
      newest: this.api.newest(30).pipe(catchError(() => of([] as Product[]))),
    }).subscribe({
      next: ({ sources, categories, newest }) => {
        this.sources.set(sources);
        this.sourceMap.set(Object.fromEntries(sources.map((s) => [s.fonte, s])));
        this.categories.set(categories);
        this.newest.set(newest);
        this.newestPage.set(1);
      },
    });
    this.form.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => {
      this.page.set(1);
      this.load(busca);
    });
    this.sort.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => {
      this.page.set(1);
      this.load(busca);
    });
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((params) => this.load(params.get('busca') ?? ''));
  }
  protected load(search = this.route.snapshot.queryParamMap.get('busca') ?? ''): void {
    this.loading.set(true);
    this.error.set('');
    const raw = this.form.getRawValue();
    this.api
      .list({
        pagina: this.page(),
        limite: 20,
        ordenacao: this.sort.value,
        busca: search || undefined,
        categoria: raw.categoria || undefined,
        fonte: raw.fonte || undefined,
        precoMin: raw.precoMin && raw.precoMin > 0 ? raw.precoMin : undefined,
        precoMax: raw.precoMax && raw.precoMax < 20000 ? raw.precoMax : undefined,
        ativo: raw.ativo ? true : undefined,
      })
      .subscribe({
        next: (result) => {
          this.products.set(result.dados);
          this.totalPages.set(result.paginacao.totalPaginas);
          this.total.set(result.paginacao.totalItens);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(this.errors.message(error, 'Não foi possível carregar os produtos.'));
          this.loading.set(false);
        },
      });
  }
  protected clear(): void {
    this.form.reset({ categoria: '', fonte: '', precoMin: 0, precoMax: 20000, ativo: true });
    this.sort.setValue('desconto');
    void this.router.navigate(['/produtos']);
  }
  protected changePage(page: number): void {
    this.page.set(page);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  protected previousNewest(): void {
    this.newestPage.update((page) => Math.max(1, page - 1));
  }
  protected nextNewest(): void {
    this.newestPage.update((page) => Math.min(this.newestPageCount(), page + 1));
  }
  protected goToNewest(page: number): void {
    this.newestPage.set(Math.min(this.newestPageCount(), Math.max(1, page)));
  }
}
