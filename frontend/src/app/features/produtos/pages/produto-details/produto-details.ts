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
import { PriceInsightCardComponent } from '../../components/price-insight-card/price-insight-card';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button';
import { catchError, of } from 'rxjs';

type Period = '7days' | '15days' | '30days' | '90days';

@Component({
  selector: 'app-produto-details',
  imports: [RouterLink, CurrencyPipe, SourceIdentityComponent, LucideDynamicIcon, PriceInsightCardComponent, UiButtonComponent],
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
                [detail]="true"
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
            @if (item.url && isExternalUrl(item.url)) {
              <app-ui-button label="Ver na loja" icon="external-link" (click)="openStore(item.url)" />
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
                  @if ((offer.precoAntigo ?? 0) > (offer.preco ?? 0)) {
                    <span class="old-price">{{ offer.precoAntigo | currency: 'BRL' }}</span>
                  }
                  <strong class="offer-card-price">{{ offer.preco | currency: 'BRL' }}</strong>
                  @if (offer.url && isExternalUrl(offer.url)) {
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
          <div class="chart-header">
            <div>
              <h2>Gráfico de Evolução de Preço</h2>
              <p>Acompanhe a variação de preço deste produto nos últimos <strong>{{ periodLabel() }}</strong></p>
            </div>
            <label class="period-select">
              <span class="sr-only">Período do gráfico</span>
              <select [value]="period()" (change)="changePeriodFromEvent($event)" aria-label="Período do gráfico">
              @for (option of periods; track option.value) {
                <option [value]="option.value" [selected]="option.value === period()">{{ option.label }}</option>
              }
            </select>
            </label>
          </div>
          <app-price-insight-card
            [currentPrice]="item.preco"
            [history]="bestHistory()"
            [periodDays]="periodDays()"
          />
          @if (history().length) {
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
    .detail-source {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      gap: 8px;
      min-width: 0;
      color: #475569;
      font-size: 14px;
    }
    .detail-source app-source-identity { flex: 0 0 auto; }
    .detail-source > span { display: inline-flex; align-items: center; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .summary app-ui-button { margin-top: 4px; }
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
    .offer-card .old-price {
      display: block;
      margin: 0;
      color: #7b8494;
      font-size: 12px;
      line-height: 1.2;
      text-decoration: line-through;
      text-decoration-thickness: 1px;
    }
    .offer-card-price {
      display: block;
      color: #111;
      font-size: 21px;
    }
    .offer-card .store-link { width: fit-content; margin-top: 3px; }
    .store-link { display: inline-flex; align-items: center; gap: 8px; padding: 10px 17px; border-radius: 6px; background: var(--blue); color: #fff; font-size: 12px; }
    .history {
      padding: 0;
      margin-top: 54px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      background: #fff;
      box-shadow: none;
      color: #172033;
    }
    .chart-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      padding: 25px 30px;
      border-bottom: 1px solid #e5eaf1;
    }
    .chart-header h2 {
      margin: 0 0 5px;
      color: #172033;
      font-size: 20px;
    }
    .chart-header p {
      margin: 0;
      color: #64748b;
      font-size: 15px;
    }
    .chart-header p strong { color: #172033; font-weight: 600; }
    .period-select select {
      width: 200px;
      height: 46px;
      padding: 0 14px;
      border: 1px solid #d8dee9;
      border-radius: 10px;
      outline: 0;
      background: #fff;
      color: #172033;
      font: inherit;
      font-size: 15px;
    }
    .chart {
      height: 365px;
      padding: 10px 24px 25px;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
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
      .detail-source { flex-wrap: wrap; }
      .offers { grid-template-columns: 1fr; }
      .section-head {
        align-items: flex-start;
        flex-direction: column;
      }
      .chart-header { padding: 22px 20px; }
      .chart-header p { line-height: 1.4; }
      .period-select select { width: 145px; }
      .chart { height: 300px; padding: 8px 12px 18px; }
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
  protected readonly period = signal<Period>('30days');
  protected readonly periodDays = computed(() => ({ '7days': 7, '15days': 15, '30days': 30, '90days': 90 }[this.period()]));
  protected readonly periodLabel = computed(() => ({ '7days': '7 dias', '15days': '15 dias', '30days': '30 dias', '90days': '90 dias' }[this.period()]));
  protected readonly sourceMap = signal<Record<string, { nome: string; logo?: string }>>({});
  protected readonly bestHistory = computed(() => this.bestPrices(this.filteredHistory()));
  protected readonly discount = computed(() => {
    const item = this.product();
    const old = item?.precoAntigo ?? 0;
    const current = item?.preco ?? 0;
    return old > current && old > 0 ? Math.round(((old - current) / old) * 100) : 0;
  });
  protected readonly periods: { value: Period; label: string }[] = [
    { value: '7days', label: '7 dias' },
    { value: '15days', label: '15 dias' },
    { value: '30days', label: '30 dias' },
    { value: '90days', label: '90 dias' },
  ];
  constructor() {
    Chart.register(...registerables);
    // Logos are public catalog metadata; use the same public endpoint as the legacy frontend.
    this.sourceApi.publicList().pipe(catchError(() => of([]))).subscribe((sources) => {
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
  protected changePeriodFromEvent(event: Event): void {
    this.changePeriod((event.target as HTMLSelectElement).value as Period);
  }
  protected openStore(url: string): void {
    if (this.isExternalUrl(url)) window.open(url, '_blank', 'noopener,noreferrer');
  }
  protected isExternalUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    try {
      return ['http:', 'https:'].includes(new URL(url, window.location.origin).protocol);
    } catch {
      return false;
    }
  }
  private readonly filteredHistory = computed(() => {
    const cutoff = Date.now() - this.periodDays() * 86400000;
    return this.history().filter(
      (p) => new Date(p.coletadoEm ?? p.criadoEm ?? p.data ?? 0).getTime() >= cutoff,
    );
  });
  private points(): PriceHistoryEntry[] {
    const filtered = this.bestHistory();
    return filtered.length ? filtered : this.bestPrices(this.history().slice(-1));
  }
  private bestPrices(points: PriceHistoryEntry[]): PriceHistoryEntry[] {
    const byDate = new Map<string, PriceHistoryEntry>();
    for (const point of points) {
      const price = Number(point.preco);
      const dateValue = point.coletadoEm ?? point.criadoEm ?? point.data;
      const timestamp = dateValue ? new Date(dateValue).getTime() : Number.NaN;
      if (!Number.isFinite(price) || !Number.isFinite(timestamp)) continue;
      const date = new Date(timestamp);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const current = byDate.get(dateKey);
      if (!current || price < Number(current.preco)) {
        byDate.set(dateKey, point);
      }
    }
    return [...byDate.values()].sort(
      (left, right) => new Date(left.coletadoEm ?? left.criadoEm ?? left.data ?? 0).getTime() - new Date(right.coletadoEm ?? right.criadoEm ?? right.data ?? 0).getTime(),
    );
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
          new Date(p.coletadoEm ?? p.criadoEm ?? p.data ?? 0)
            .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
            .replace('.', ''),
        ),
        datasets: [
          {
            label: 'Preço',
            data: points.map((p) => p.preco ?? 0),
            borderColor: '#7c3aed',
            backgroundColor: (context) => {
              const { chart } = context;
              const area = chart.chartArea;
              if (!area) return 'rgba(124, 58, 237, 0.18)';
              const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
              gradient.addColorStop(0, 'rgba(124, 58, 237, 0.26)');
              gradient.addColorStop(1, 'rgba(124, 58, 237, 0.02)');
              return gradient;
            },
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5,
            pointBackgroundColor: '#a855f7',
            pointBorderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, easing: 'easeOutQuart' },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            backgroundColor: '#fff',
            borderColor: '#d8dee9',
            borderWidth: 1,
            padding: 12,
            titleColor: '#475569',
            bodyColor: '#172033',
            callbacks: {
              label: (context) => ` ${Number(context.parsed.y ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', maxTicksLimit: 8, padding: 8 },
            border: { display: false },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.22)' },
            border: { display: false },
            ticks: {
              color: '#64748b',
              padding: 10,
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
