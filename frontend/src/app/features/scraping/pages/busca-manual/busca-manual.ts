import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../../core/models/domain.models';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { FontesApiService } from '../../../fontes/data-access/fontes-api.service';
import { ScrapingApiService } from '../../data-access/scraping-api.service';

@Component({
  selector: 'app-busca-manual',
  imports: [FormsModule, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-heading">
      <span class="eyebrow">Consulta sem persistência</span>
      <h1>Busca manual</h1>
      <p>Faça uma coleta pontual nas fontes selecionadas e exporte os resultados.</p>
    </header>
    <section class="panel controls">
      <h2>Fontes da busca</h2>
      <div class="source-options">
        @for (source of sources(); track source.fonte) {
          <label
            ><input
              type="checkbox"
              [checked]="selected().has(source.fonte)"
              (change)="toggle(source.fonte, $event)"
            />{{ source.nome }}</label
          >
        }
      </div>
      <button
        class="btn primary"
        [disabled]="searching() || selected().size === 0"
        (click)="search()"
      >
        {{ searching() ? 'Buscando…' : '⌕ Iniciar busca' }}
      </button>
    </section>
    @if (error()) {
      <div class="feedback error">{{ error() }}</div>
    }
    @if (sourceErrors().length) {
      <div class="feedback error">
        @for (item of sourceErrors(); track item.fonte) {
          <p>
            <strong>{{ item.fonte }}:</strong> {{ item.mensagem }}
          </p>
        }
      </div>
    }
    @if (hasResult()) {
      <section class="panel results">
        <header>
          <div>
            <h2>Resultados</h2>
            <span>{{ filtered().length }} de {{ products().length }} produtos</span>
          </div>
          <div>
            <button class="btn" (click)="exportCsv()">Baixar CSV</button
            ><button class="btn" (click)="print()">Imprimir / PDF</button>
          </div>
        </header>
        <div class="result-filters">
          <input
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            placeholder="Filtrar pelo título"
          /><label class="multiple-filter"
            ><input
              type="checkbox"
              [ngModel]="multipleStores()"
              (ngModelChange)="multipleStores.set($event)"
            />
            Presente em mais de uma loja</label
          ><select [ngModel]="storeFilter()" (ngModelChange)="storeFilter.set($event)">
            <option value="">Todas as lojas</option>
            @for (source of resultSources(); track source) {
              <option [value]="source">{{ source }}</option>
            }
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Fonte</th>
                <th>Preço atual</th>
                <th>Preço anterior</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filtered(); track item.url) {
                <tr>
                  <td>
                    <strong>{{ item.titulo }}</strong>
                  </td>
                  <td>{{ item.categoria }}</td>
                  <td>{{ item.fonte }}</td>
                  <td>{{ item.preco | currency: 'BRL' }}</td>
                  <td>{{ item.precoAntigo | currency: 'BRL' }}</td>
                  <td>
                    @if (item.url) {
                      <a [href]="item.url" target="_blank" rel="noopener noreferrer">Abrir ↗</a>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
  styles: `
    .page-heading {
      margin-bottom: 1.5rem;
    }
    .page-heading h1 {
      margin: 0.2rem 0;
    }
    .page-heading p {
      color: var(--muted);
    }
    .controls,
    .results {
      padding: 1.2rem;
    }
    .controls h2 {
      margin-top: 0;
    }
    .source-options {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin: 1rem 0;
    }
    .source-options label {
      border: 1px solid var(--border);
      border-radius: 9px;
      padding: 0.65rem 0.8rem;
      font-weight: 700;
    }
    .results {
      margin-top: 1rem;
    }
    .results > header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .results h2 {
      margin: 0.2rem 0;
    }
    .results header span {
      color: var(--muted);
    }
    .results header div:last-child {
      display: flex;
      gap: 0.5rem;
    }
    .result-filters {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) auto 220px;
      gap: 0.7rem;
      margin: 1rem 0;
    }
    .multiple-filter {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      white-space: nowrap;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .table-wrap {
      overflow: auto;
    }
    td:first-child {
      min-width: 320px;
    }
    @media print {
      app-header,
      .controls,
      .result-filters,
      .results button {
        display: none !important;
      }
      .results {
        border: 0;
        box-shadow: none;
      }
    }
    @media (max-width: 700px) {
      .results > header {
        align-items: flex-start;
        flex-direction: column;
        gap: 1rem;
      }
      .result-filters {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class BuscaManualPage {
  private readonly api = inject(ScrapingApiService);
  private readonly sourceApi = inject(FontesApiService);
  private readonly errors = inject(ApiErrorService);
  protected readonly sources = signal<{ fonte: string; nome: string }[]>([]);
  protected readonly selected = signal(new Set<string>());
  protected readonly products = signal<Product[]>([]);
  protected readonly sourceErrors = signal<{ fonte: string; mensagem: string }[]>([]);
  protected readonly searching = signal(false);
  protected readonly error = signal('');
  protected readonly hasResult = signal(false);
  protected readonly query = signal('');
  protected readonly storeFilter = signal('');
  protected readonly multipleStores = signal(false);
  private readonly normalizedTitle = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .replace(/\s+/g, ' ')
      .trim();
  private readonly titleStoreCount = computed(() => {
    const counts = new Map<string, Set<string>>();
    for (const item of this.products()) {
      const stores = counts.get(this.normalizedTitle(item.titulo)) ?? new Set<string>();
      stores.add(item.fonte);
      counts.set(this.normalizedTitle(item.titulo), stores);
    }
    return counts;
  });
  protected readonly resultSources = computed(() =>
    [...new Set(this.products().map((item) => item.fonte))].sort(),
  );
  protected readonly filtered = computed(() => {
    const query = this.query().toLocaleLowerCase('pt-BR');
    return this.products().filter(
      (item) =>
        (!query || item.titulo.toLocaleLowerCase('pt-BR').includes(query)) &&
        (!this.storeFilter() || item.fonte === this.storeFilter()) &&
        (!this.multipleStores() ||
          (this.titleStoreCount().get(this.normalizedTitle(item.titulo))?.size ?? 0) > 1),
    );
  });
  constructor() {
    this.sourceApi.config().subscribe((config) => {
      const sources = config.fontes
        .filter((f) => f.ativa)
        .map((f) => ({ fonte: f.fonte, nome: f.nome }));
      this.sources.set(sources);
      this.selected.set(new Set(sources.map((f) => f.fonte)));
    });
  }
  protected toggle(source: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selected.update((current) => {
      const next = new Set(current);
      if (checked) next.add(source);
      else next.delete(source);
      return next;
    });
  }
  protected search(): void {
    if (this.selected().size === 0) {
      this.error.set('Selecione ao menos uma fonte para iniciar a busca.');
      return;
    }
    this.searching.set(true);
    this.error.set('');
    this.api.manualSearch([...this.selected()]).subscribe({
      next: (r) => {
        this.products.set(r.itens);
        this.sourceErrors.set(r.erros);
        this.hasResult.set(true);
        this.searching.set(false);
      },
      error: (e) => {
        this.error.set(this.errors.message(e));
        this.searching.set(false);
      },
    });
  }
  protected exportCsv(): void {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [
      ['Produto', 'Categoria', 'Fonte', 'Preço atual', 'Preço anterior', 'URL'],
      ...this.filtered().map((i) => [
        i.titulo,
        i.categoria,
        i.fonte,
        i.preco,
        i.precoAntigo,
        i.url,
      ]),
    ];
    const blob = new Blob(['\ufeff' + rows.map((r) => r.map(quote).join(';')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `busca-manual-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  protected print(): void {
    window.print();
  }
}
