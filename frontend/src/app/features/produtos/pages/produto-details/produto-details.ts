import { LucideDynamicIcon } from '@lucide/angular';
import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { Product, PriceHistoryEntry } from '../../../../core/models/domain.models';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ProdutosApiService } from '../../data-access/produtos-api.service';
import { FontesApiService } from '../../../fontes/data-access/fontes-api.service';
import { SourceIdentityComponent } from '../../../../shared/components/source-identity/source-identity';

type Period = 'day' | 'week' | 'month' | '3months' | '6months' | 'year';

@Component({
  selector: 'app-produto-details',
  imports: [RouterLink, CurrencyPipe, SourceIdentityComponent, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page-wrap detail-page">
      <a routerLink="/produtos" class="back"><svg lucideIcon="arrow-left" aria-hidden="true"></svg> Voltar para produtos</a>
      @if (error()) {
        <div class="state error">{{ error() }}</div>
      } @else if (loading()) {
        <div class="detail-skeleton shimmer"></div>
      } @else if (product(); as item) {
        <section class="detail-header panel">
          <div class="detail-image">
            @if (item.imagemUrl) {
              <img [src]="item.imagemUrl" [alt]="item.titulo" />
            } @else {
              <span>Sem imagem</span>
            }
          </div>
          <div class="summary">
            <div class="detail-source">
              <app-source-identity
                [name]="sourceMap()[item.fonte]?.nome ?? item.fonte"
                [logo]="sourceMap()[item.fonte]?.logo ?? ''"
              /><span>· {{ item.categoria || 'Produto' }}</span>
            </div>
            <h1>{{ item.titulo }}</h1>
            @if ((item.precoAntigo ?? 0) > (item.preco ?? 0)) {
              <span class="old">{{ item.precoAntigo | currency: 'BRL' }}</span>
            }
            <div class="detail-current-price">
              <strong class="current">{{ item.preco | currency: 'BRL' }}</strong>
              @if (discount()) {
                <span class="discount-badge">-{{ discount() }}% de desconto</span>
              }
            </div>
            @if (item.url) {
              <a class="btn primary" [href]="item.url" target="_blank" rel="noreferrer"
                >Ver na loja <svg lucideIcon="external-link" aria-hidden="true"></svg></a
              >
            }
          </div>
        </section>
        @if (offers().length) {
          <section class="section offers-section panel">
            <div class="section-head">
              <h2>Ofertas nas lojas</h2>
              <span>{{ offers().length }} oferta(s) ativa(s)</span>
            </div>
            <div class="offers">
              @for (offer of offers(); track offer._id) {
                <article class="offer-card panel">
                  <div class="offer-image">
                    @if (offer.imagemUrl) {
                      <img [src]="offer.imagemUrl" [alt]="offer.titulo" />
                    } @else {
                      <span>Sem imagem</span>
                    }
                  </div>
                  <div class="offer-card-source">
                    <app-source-identity
                      [name]="sourceMap()[offer.fonte]?.nome ?? offer.fonte"
                      [logo]="sourceMap()[offer.fonte]?.logo ?? ''"
                    />
                  </div>
                  <div class="offer-card-title-wrap">
                    <h3 class="offer-card-title">{{ offer.titulo }}</h3>
                  </div>
                  <strong class="offer-card-price">{{ offer.preco | currency: 'BRL' }}</strong>
                  @if ((offer.precoAntigo ?? 0) > (offer.preco ?? 0)) {
                    <span class="old-price">{{ offer.precoAntigo | currency: 'BRL' }}</span>
                  }
                  @if (offer.url) {
                    <a class="store-link" [href]="offer.url" target="_blank" rel="noopener noreferrer"
                      >Ver oferta <svg lucideIcon="external-link" aria-hidden="true"></svg></a
                    >
                  }
                </article>
              }
            </div>
          </section>
        }
        <section class="section panel history">
          <div class="section-head">
            <div>
              <h2>Histórico de preço</h2>
              <span>{{ history().length }} registro(s)</span>
            </div>
            <div class="periods">
              @for (option of periods; track option.value) {
                <button
                  type="button"
                  [class.active]="period() === option.value"
                  (click)="changePeriod(option.value)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
          </div>
          @if (history().length) {
            <div class="range">
              <span
                >Maior: <strong>{{ maxPrice() | currency: 'BRL' }}</strong></span
              ><span
                >Atual: <strong>{{ item.preco | currency: 'BRL' }}</strong></span
              ><span
                >Menor: <strong>{{ minPrice() | currency: 'BRL' }}</strong></span
              >
            </div>
            <div class="chart"><canvas #chartCanvas></canvas></div>
          } @else {
            <div class="state">Ainda não há histórico suficiente.</div>
          }
        </section>
      }
    </main>
  `,
  styles: `
    .detail-page {
      padding: 34px 7vw 70px;
    }
    .back {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 28px;
      color: var(--muted);
      font-size: 13px;
    }
    .detail-header {
      display: grid;
      grid-template-columns: minmax(260px, 390px) 1fr;
      gap: 48px;
      align-items: center;
      max-width: 1050px;
      margin: 0;
      border: 0;
      border-radius: 0;
      box-shadow: none;
      background: transparent;
    }
    .detail-image {
      height: 360px;
      display: grid;
      place-items: center;
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--soft);
      color: var(--muted);
    }
    .detail-image img {
      width: auto;
      height: auto;
      max-height: 100%;
      max-width: 100%;
      padding: 25px;
      object-fit: contain;
      mix-blend-mode: multiply;
    }
    .summary {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
    }
    .summary h1 {
      max-width: 720px;
      margin: 12px 0 24px;
      font-size: clamp(24px, 3vw, 38px);
      line-height: 1.15;
    }
    .old {
      text-decoration: line-through;
      color: var(--muted);
    }
    .current {
      font-size: 30px;
      color: #111;
      margin: 0;
    }
    .detail-current-price {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin: 0 0 25px;
    }
    .discount-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 7px;
      border-radius: 4px;
      background: #e8f6ed;
      color: #18743c;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .section {
      max-width: 1050px;
      margin: 54px 0 0;
    }
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .offers-section {
      max-width: none;
      margin-top: 24px;
      padding: 24px;
    }
    .offers-section > .section-head {
      display: block;
    }
    .offers-section > .section-head h2 {
      font-size: 20px;
    }
    .offers-section > .section-head span {
      display: block;
      margin-top: 5px;
      font-size: 12px;
    }
    .section-head h2 {
      margin: 0.2rem 0;
    }
    .section-head span {
      color: var(--muted);
    }
    .offers {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-top: 15px;
    }
    .offer-card {
      display: grid;
      gap: 10px;
      min-width: 0;
      padding: 16px;
      border: 1px solid #e1e4ea;
      border-radius: 10px;
      background: #fff;
      box-shadow: none;
    }
    .offer-image { display: flex; align-items: center; justify-content: center; height: 150px; overflow: hidden; border-radius: 7px; background: #f5f6f7; color: var(--muted); font-size: 11px; }
    .offer-image img { width: 100%; height: 100%; max-width: 100%; max-height: 100%; padding: 10px; object-fit: contain; }
    .offer-card-source { min-width: 0; }
    .offer-card-title-wrap { min-width: 0; }
    .offer-card-title { display: -webkit-box; max-height: calc(1.45em * 3); margin: 0; overflow: hidden; color: #333; font-size: 12px; font-weight: 500; line-height: 1.45; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 3;
    }
    .offer-card-price { color: #111; font-size: 21px;
    }
    .offer-card .old-price { font-size: 12px; }
    .offer-card .store-link { width: fit-content; margin-top: 3px; }
    .store-link { display: inline-flex; align-items: center; gap: 8px; padding: 10px 17px; border-radius: 6px; background: var(--blue); color: #fff; font-size: 12px; }
    .history {
      padding: 1.3rem;
      margin-top: 54px;
      border-top: 1px solid var(--line);
    }
    .periods {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }
    .periods button {
      border: 1px solid var(--border);
      background: #fff;
      border-radius: 8px;
      padding: 0.45rem 0.65rem;
      cursor: pointer;
    }
    .periods button.active {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .range {
      display: flex;
      justify-content: space-around;
      background: var(--surface-2);
      padding: 0.8rem;
      border-radius: 10px;
      margin: 1.2rem 0;
    }
    .chart {
      height: 330px;
    }
    .detail-skeleton {
      height: 600px;
      border-radius: 16px;
      background: #e2e8f0;
    }
    @media (max-width: 720px) {
      .detail-header {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      .detail-image {
        height: 260px;
      }
      .offers { grid-template-columns: 1fr; }
      .section-head {
        align-items: flex-start;
        flex-direction: column;
      }
      .range {
        font-size: 0.75rem;
        gap: 0.5rem;
      }
    }
  `,
})
export class ProdutoDetailsPage implements OnDestroy {
  private readonly api = inject(ProdutosApiService);
  private readonly sourceApi = inject(FontesApiService);
  private readonly errors = inject(ApiErrorService);
  private chart?: Chart;
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  protected readonly product = signal<Product | null>(null);
  protected readonly offers = signal<Product[]>([]);
  protected readonly history = signal<PriceHistoryEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly period = signal<Period>('month');
  protected readonly minPrice = signal(0);
  protected readonly maxPrice = signal(0);
  protected readonly sourceMap = signal<Record<string, { nome: string; logo?: string }>>({});
  protected readonly discount = computed(() => {
    const item = this.product();
    const old = item?.precoAntigo ?? 0;
    const current = item?.preco ?? 0;
    return old > current && old > 0 ? Math.round(((old - current) / old) * 100) : 0;
  });
  protected readonly periods: { value: Period; label: string }[] = [
    { value: 'day', label: 'Dia' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
    { value: '3months', label: '3 meses' },
    { value: '6months', label: '6 meses' },
    { value: 'year', label: 'Ano' },
  ];
  constructor() {
    Chart.register(...registerables);
    // Logos are public catalog metadata; use the same public endpoint as the legacy frontend.
    this.sourceApi.publicList().subscribe((sources) => {
      this.sourceMap.set(
        Object.fromEntries(sources.map((source) => [source.fonte, { nome: source.nome, logo: source.logo }])),
      );
    });
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    this.api.history(id).subscribe({
      next: (r) => {
        const product = r.produto ?? r.item ?? r.dados ?? null;
        this.product.set(product);
        this.offers.set((r.ofertas ?? (product ? [product] : [])).filter((o) => o.ativo !== false));
        this.history.set(r.historico ?? []);
        this.setRange();
        this.loading.set(false);
        setTimeout(() => this.renderChart());
      },
      error: (e) => {
        this.error.set(this.errors.message(e, 'Não foi possível carregar o produto.'));
        this.loading.set(false);
      },
    });
  }
  protected changePeriod(period: Period): void {
    this.period.set(period);
    this.renderChart();
  }
  private points(): PriceHistoryEntry[] {
    const days: Record<Period, number> = {
      day: 1,
      week: 7,
      month: 30,
      '3months': 90,
      '6months': 180,
      year: 365,
    };
    const cutoff = Date.now() - days[this.period()] * 86400000;
    const filtered = this.history().filter(
      (p) => new Date(p.coletadoEm ?? p.criadoEm ?? p.data ?? 0).getTime() >= cutoff,
    );
    return filtered.length ? filtered : this.history().slice(-1);
  }
  private setRange(): void {
    const values = this.history()
      .map((p) => Number(p.preco))
      .filter(Number.isFinite);
    if (values.length) {
      this.minPrice.set(Math.min(...values));
      this.maxPrice.set(Math.max(...values));
    }
  }
  private renderChart(): void {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) return;
    const points = this.points();
    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: points.map((p) =>
          new Date(p.coletadoEm ?? p.criadoEm ?? p.data ?? 0).toLocaleDateString('pt-BR'),
        ),
        datasets: [
          {
            data: points.map((p) => p.preco ?? 0),
            borderColor: '#2456df',
            backgroundColor: '#2456df16',
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            ticks: {
              callback: (value) =>
                Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            },
          },
        },
      },
    });
  }
  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}


