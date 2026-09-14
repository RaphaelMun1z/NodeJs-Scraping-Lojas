import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { PriceHistoryEntry } from '../../../../core/models/domain.models';

const WITHIN_AVERAGE_TOLERANCE_PERCENT = 5;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type PricePosition = 'below' | 'within' | 'above';

@Component({
  selector: 'app-price-insight-card',
  imports: [CurrencyPipe, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="insight-card" aria-labelledby="price-insight-title">
      @if (hasEnoughHistory()) {
        <div class="insight-content">
          <div class="insight-heading">
            <span class="insight-icon"><svg lucideIcon="activity" aria-hidden="true"></svg></span>
            <div>
              <h2 id="price-insight-title">
                O preço atual está <strong [class]="positionClass()">{{ positionLabel() }}</strong>.
              </h2>
              <p>
                Com base no preço dos últimos <strong>{{ periodDays() }} dias</strong>,
                o preço atual está
                @if (variationPercent() === 0) {
                  <strong class="within">dentro da média esperada</strong>.
                } @else {
                  <strong [class]="positionClass()">{{ absoluteVariationPercent() }}% {{ variationDirection() }} da média</strong>.
                }
              </p>
            </div>
          </div>

          <div class="scale-wrap" [attr.title]="tooltip()">
            <div class="scale" aria-hidden="true">
              <span class="marker-label" [class.below]="position() === 'below'" [class.within]="position() === 'within'" [class.above]="position() === 'above'" [style.left.%]="positionPercent()">Preço atual</span>
              <span class="marker-arrow" [class.below]="position() === 'below'" [class.within]="position() === 'within'" [class.above]="position() === 'above'" [style.left.%]="positionPercent()"></span>
              <span class="marker" [class.below]="position() === 'below'" [class.within]="position() === 'within'" [class.above]="position() === 'above'" [style.left.%]="positionPercent()"></span>
            </div>
            <div class="scale-labels">
              <span>Melhor oportunidade</span>
              <span>Mais caro</span>
            </div>
          </div>

        </div>
      } @else {
        <div class="insight-empty">
          <span class="insight-icon"><svg lucideIcon="activity" aria-hidden="true"></svg></span>
          <div>
            <h2 id="price-insight-title">Análise de preço</h2>
            <p>Ainda não há histórico suficiente para analisar a média deste produto.</p>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .insight-card { padding: 26px 30px 24px; border-bottom: 1px solid #e5eaf1; background: #fff; color: #172033; }
    .insight-content { max-width: 920px; margin: 0 auto; }
    .insight-heading, .insight-empty { display: flex; align-items: flex-start; gap: 13px; }
    .insight-icon { display: grid; flex: 0 0 24px; place-items: center; margin-top: 2px; color: #e5a900; }
    .insight-icon svg { width: 22px; height: 22px; stroke-width: 2.3; }
    h2 { margin: 0; color: #172033; font-size: 18px; line-height: 1.35; }
    p { margin: 5px 0 0; color: #64748b; font-size: 15px; line-height: 1.5; }
    h2 strong, p strong { font-weight: 700; }
    .below { color: #169447; }
    .within { color: #d18a00; }
    .above { color: #dc3c3c; }
    .scale-wrap { margin: 55px 10px 0; }
    .scale { position: relative; height: 8px; border-radius: 99px; background: linear-gradient(90deg, #21bd62 0%, #bed438 35%, #ffc629 62%, #ed3b3b 100%); }
    .marker { position: absolute; top: 50%; width: 15px; height: 15px; border: 2px solid #fff; border-radius: 50%; background: #fff; box-shadow: 0 0 0 2px #172033, 0 2px 7px rgba(15, 23, 42, .2); transform: translate(-50%, -50%); }
    .marker-label { position: absolute; bottom: 30px; margin-bottom: 3px; color: #172033; font-size: 13px; font-weight: 700; white-space: nowrap; transform: translateX(-50%); }
    .marker-arrow { position: absolute; top: -24px; width: 0; height: 0; border-right: 6px solid transparent; border-left: 6px solid transparent; border-bottom: 9px solid currentColor; transform: translateX(-50%); }
    .scale-labels { display: flex; justify-content: space-between; gap: 12px; margin-top: 13px; color: #94a3b8; font-size: 11px; }
    .insight-empty { align-items: center; min-height: 86px; }
    .insight-empty p { margin-top: 4px; }
    @media (max-width: 720px) {
      .insight-card { padding: 22px 20px; }
      .scale-wrap { margin-right: 4px; margin-left: 4px; }
      .scale-labels { font-size: 10px; }
    }
  `,
})
export class PriceInsightCardComponent {
  readonly currentPrice = input<number | undefined>(undefined);
  readonly history = input<PriceHistoryEntry[]>([]);
  readonly periodDays = input(30);

  private readonly periodPoints = computed(() => {
    const cutoff = Date.now() - this.periodDays() * DAY_IN_MS;
    return this.history()
      .filter((point) => new Date(point.coletadoEm ?? point.criadoEm ?? point.data ?? 0).getTime() >= cutoff)
      .map((point) => Number(point.preco))
      .filter((price) => Number.isFinite(price) && price >= 0);
  });
  readonly hasEnoughHistory = computed(() => this.periodPoints().length >= 2 && Number.isFinite(this.currentPrice()));
  readonly averagePrice = computed(() => this.average(this.periodPoints()));
  readonly minimumPrice = computed(() => {
    const values = this.periodPoints();
    return values.length ? Math.min(...values) : 0;
  });
  readonly maximumPrice = computed(() => {
    const values = this.periodPoints();
    return values.length ? Math.max(...values) : 0;
  });
  readonly variationPercent = computed(() => {
    const average = this.averagePrice();
    const current = this.currentPrice() ?? 0;
    return average > 0 ? ((current - average) / average) * 100 : 0;
  });
  readonly absoluteVariationPercent = computed(() => Math.round(Math.abs(this.variationPercent())));
  readonly position = computed<PricePosition>(() => {
    const variation = this.variationPercent();
    if (variation < -WITHIN_AVERAGE_TOLERANCE_PERCENT) return 'below';
    if (variation > WITHIN_AVERAGE_TOLERANCE_PERCENT) return 'above';
    return 'within';
  });
  readonly positionPercent = computed(() => {
    const minimum = this.minimumPrice();
    const maximum = this.maximumPrice();
    const current = this.currentPrice() ?? minimum;
    if (maximum <= minimum) return 50;
    return Math.max(4, Math.min(96, ((current - minimum) / (maximum - minimum)) * 100));
  });

  positionClass(): PricePosition { return this.position(); }
  positionLabel(): string { return { below: 'abaixo da média', within: 'dentro da média', above: 'acima da média' }[this.position()]; }
  variationDirection(): string { return this.variationPercent() < 0 ? 'abaixo' : 'acima'; }
  tooltip(): string { return `Atual: ${this.currentPrice()} | Média: ${this.averagePrice()} | Menor: ${this.minimumPrice()} | Maior: ${this.maximumPrice()}`; }

  private average(values: number[]): number { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
}
