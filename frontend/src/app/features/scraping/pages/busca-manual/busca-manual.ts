import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../../core/models/domain.models';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { FontesApiService } from '../../../fontes/data-access/fontes-api.service';
import { ScrapingApiService } from '../../data-access/scraping-api.service';
import { SourceIdentityComponent } from '../../../../shared/components/source-identity/source-identity';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-busca-manual',
  imports: [FormsModule, CurrencyPipe, SourceIdentityComponent, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="admin-header">
      <div>
        <h1>Busca manual</h1>
        <p>Execute uma busca sem salvar os resultados no banco de dados.</p>
      </div>
    </header>
    <section class="panel manual-search-page controls">
      <div class="manual-search-toolbar">
        <fieldset class="manual-search-sources source-options">
          <legend>Fontes</legend>
          @for (source of sources(); track source.fonte) {
            <label>
              <input
                type="checkbox"
                [checked]="selected().has(source.fonte)"
                (change)="toggle(source.fonte, $event)"
              />
              <app-source-identity [name]="source.nome" />
            </label>
          }
        </fieldset>
        <label class="manual-search-multiple-filter">
          <input
            type="checkbox"
            [ngModel]="multipleStores()"
            (ngModelChange)="multipleStores.set($event)"
          />
          Presente em mais de uma loja
        </label>
        <button
          class="btn primary"
          type="button"
          [disabled]="searching() || selected().size === 0"
          (click)="search()"
        >
          {{ searching() ? 'Buscando…' : 'Executar busca' }}
          <svg lucideIcon="search" aria-hidden="true"></svg>
        </button>
      </div>
      @if (error()) {
        <div class="feedback error">{{ error() }}</div>
      }
      <div class="manual-search-actions">
        <label class="manual-search-text-filter">
          <span>Buscar no resultado</span>
          <input
            type="search"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            placeholder="Nome do produto"
          />
        </label>
        <select
          class="manual-search-store-filter"
          [ngModel]="storeFilter()"
          (ngModelChange)="storeFilter.set($event)"
        >
          <option value="">Todas as lojas</option>
          @for (source of resultSources(); track source) {
            <option [value]="source">{{ source }}</option>
          }
        </select>
        <strong>{{ filtered().length }} produto(s)</strong>
        <button
          class="btn secondary"
          type="button"
          [disabled]="!hasResult() || !filtered().length"
          (click)="exportCsv()"
        >
          Exportar CSV <svg lucideIcon="download" aria-hidden="true"></svg>
        </button>
        <button
          class="btn secondary"
          type="button"
          [disabled]="!hasResult() || !filtered().length"
          (click)="print()"
        >
          Exportar PDF <svg lucideIcon="printer" aria-hidden="true"></svg>
        </button>
      </div>
      @if (sourceErrors().length) {
        <div class="manual-search-errors">
          @for (item of sourceErrors(); track item.fonte) {
            <div class="feedback error">
              <strong>{{ item.fonte }}:</strong> {{ item.mensagem }}
            </div>
          }
        </div>
      }
      <div class="manual-search-table-wrap">
        <table class="manual-search-table">
          <thead>
            <tr>
              <th>Fonte</th>
              <th>Produto</th>
              <th>Preço</th>
              <th>Preço antigo</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            @for (item of filtered(); track item.url) {
              <tr>
                <td><app-source-identity [name]="item.fonte" /></td>
                <td>{{ item.titulo }}</td>
                <td>{{ item.preco | currency: 'BRL' }}</td>
                <td>{{ item.precoAntigo ? (item.precoAntigo | currency: 'BRL') : '—' }}</td>
                <td>
                  @if (item.url) {
                    <a [href]="item.url" target="_blank" rel="noopener noreferrer">Abrir</a>
                  }
                </td>
              </tr>
            }
            @if (!filtered().length) {
              <tr>
                <td colspan="5" class="manual-search-empty">
                  {{
                    hasResult()
                      ? 'Nenhum produto encontrado com esses filtros.'
                      : 'Execute uma busca para visualizar os produtos.'
                  }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    .admin-header {
      margin: 0 auto 24px;
    }
    .admin-header h1 {
      margin: 0 0 8px;
      color: #151515;
      font-size: 22px;
      letter-spacing: -0.5px;
    }
    .admin-header p {
      margin: 0;
      color: #727272;
      font-size: 13px;
      line-height: 1.5;
    }
    .manual-search-page {
      padding: 28px 30px 30px;
      overflow: hidden;
    }
    .manual-search-toolbar,
    .manual-search-actions {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .manual-search-toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
    }
    .manual-search-toolbar .btn.primary {
      grid-column: 1 / -1;
      justify-self: end;
      padding: 0 18px;
    }
    .manual-search-sources {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin: 0;
      padding: 0;
      border: 0;
    }
    .manual-search-sources legend {
      margin-right: 2px;
      color: var(--muted);
      font-size: 12px;
    }
    .manual-search-sources label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      border: 1px solid #e0e3ea;
      border-radius: 7px;
      background: #fff;
      color: #4d4d4d;
      font-size: 12px;
    }
    .manual-search-sources .source-identity {
      color: #4d4d4d;
    }
    .manual-search-sources .source-fallback {
      width: 22px;
      height: 22px;
    }
    .manual-search-sources input {
      accent-color: var(--blue);
    }
    .manual-search-multiple-filter {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 36px;
      padding: 0 11px;
      border: 1px solid #d6d6d6;
      border-radius: 7px;
      background: #fff;
      color: #4d4d4d;
      font-size: 12px;
      cursor: pointer;
    }
    .manual-search-multiple-filter:has(input:checked) {
      border-color: #b9c9ff;
      background: #f1f4ff;
      color: var(--blue);
    }
    .manual-search-actions {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto auto auto;
      align-items: end;
      gap: 10px 14px;
      margin: 14px 0 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--line);
    }
    .manual-search-actions strong {
      align-self: center;
      color: #111;
      font-size: 13px;
    }
    .manual-search-text-filter {
      display: grid;
      gap: 5px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 500;
    }
    .manual-search-text-filter input {
      width: 360px;
      height: 36px;
      padding: 0 11px;
      border: 1px solid #d6d6d6;
      border-radius: 7px;
      background: #fff;
      color: #333;
      font-size: 12px;
      outline: none;
    }
    .manual-search-text-filter input:focus {
      border-color: var(--blue);
      outline: 2px solid rgb(36 86 223 / 12%);
    }
    .manual-search-store-filter {
      height: 36px;
      padding: 0 9px;
      border: 1px solid #d6d6d6;
      border-radius: 7px;
      background: #fff;
      color: #333;
      font-size: 12px;
    }
    .manual-search-actions .btn {
      min-width: 112px;
    }
    .manual-search-errors {
      display: grid;
      gap: 8px;
      margin: 10px 0;
    }
    .manual-search-errors .feedback {
      margin: 0;
    }
    .manual-search-table-wrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .manual-search-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .manual-search-table th,
    .manual-search-table td {
      padding: 11px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: middle;
    }
    .manual-search-table th {
      background: #f8f9fb;
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    .manual-search-table tr:last-child td {
      border-bottom: 0;
    }
    .manual-search-table td:nth-child(2) {
      min-width: 280px;
      color: #222;
    }
    .manual-search-table a {
      color: var(--blue);
      text-decoration: none;
    }
    .manual-search-empty {
      padding: 28px !important;
      color: var(--muted);
      text-align: center !important;
    }
    @media print {
      .manual-search-toolbar,
      .manual-search-actions,
      .manual-search-page .feedback,
      .manual-search-errors {
        display: none !important;
      }
      .manual-search-page {
        border: 0;
        box-shadow: none;
      }
    }
    @media (max-width: 650px) {
      .manual-search-page {
        padding: 22px 18px;
      }
      .manual-search-toolbar,
      .manual-search-actions {
        grid-template-columns: 1fr;
      }
      .manual-search-toolbar .btn.primary {
        grid-row: 3;
        justify-self: stretch;
      }
      .manual-search-text-filter input,
      .manual-search-store-filter {
        width: 100%;
      }
      .manual-search-actions .btn {
        width: 100%;
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
      ['Fonte', 'Produto', 'Preço', 'Preço antigo', 'URL'],
      ...this.filtered().map((i) => [i.fonte, i.titulo, i.preco, i.precoAntigo, i.url]),
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
