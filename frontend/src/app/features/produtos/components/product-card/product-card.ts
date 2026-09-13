import { LucideDynamicIcon } from '@lucide/angular';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product, SourceIdentity } from '../../../../core/models/domain.models';
import { SourceIdentityComponent } from '../../../../shared/components/source-identity/source-identity';
import { SelectorSlotComponent } from '../../../../shared/components/selector-slot/selector-slot';
import { Selectors } from '../../../../core/models/domain.models';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, CurrencyPipe, SourceIdentityComponent, LucideDynamicIcon, SelectorSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<article
    class="product-card"
    [class.compact]="compact()"
    [class.highlight-item]="highlight() === 'item'"
    [class.highlight-image]="highlight() === 'imagem'"
    [class.highlight-title]="highlight() === 'titulo'"
    [class.highlight-old-price]="highlight() === 'precoAntigo'"
    [class.highlight-current-price]="highlight() === 'preco'"
    [class.highlight-url]="highlight() === 'url'"
    [class.is-historical-price]="historical()"
    [class.is-inactive]="product().ativo === false"
  >
    @if (preview()) {
      <app-selector-slot class="preview-image-slot" label="Imagem" icon="image" [configured]="!!selectors().imagem" [active]="highlight() === 'imagem'" ariaLabel="Configurar imagem" [showLabel]="!previewData()?.imagemUrl" (activated)="slotSelected.emit('imagem')">@if (previewData()?.imagemUrl) { <img [src]="previewData()!.imagemUrl" [alt]="previewData()!.titulo" /> }</app-selector-slot>
      <div class="preview-card-body">
        <app-selector-slot class="preview-title-slot" label="Título" icon="type" [configured]="!!selectors().titulo" [active]="highlight() === 'titulo'" ariaLabel="Configurar título" [showLabel]="!previewData()?.titulo" (activated)="slotSelected.emit('titulo')">@if (previewData()?.titulo) { <span class="preview-value">{{ previewData()!.titulo }}</span> }</app-selector-slot>
        <div class="preview-prices"><app-selector-slot class="preview-old-price-slot" label="Preço anterior" icon="badge-minus" [configured]="!!selectors().precoAntigo" [active]="highlight() === 'precoAntigo'" ariaLabel="Configurar preço anterior" [showLabel]="!previewData()?.precoAntigo" (activated)="slotSelected.emit('precoAntigo')">@if (previewData()?.precoAntigo) { <span class="preview-value">{{ previewData()!.precoAntigo | currency:'BRL' }}</span> }</app-selector-slot><app-selector-slot class="preview-current-price-slot" label="Novo preço" icon="badge-dollar-sign" [configured]="!!selectors().preco" [active]="highlight() === 'preco'" ariaLabel="Configurar novo preço" [showLabel]="!previewData()?.preco" (activated)="slotSelected.emit('preco')">@if (previewData()?.preco) { <span class="preview-value">{{ previewData()!.preco | currency:'BRL' }}</span> }</app-selector-slot></div>
      </div>
    } @else {
    @if (product().precoHistorico) {
      <span class="historical-price-badge"><svg lucideIcon="tag" aria-hidden="true"></svg>Preço histórico</span>
    }
    <a class="product-image" [routerLink]="['/produtos', id()]">
      @if (imageUrl()) {
        <img [src]="imageUrl()" [alt]="product().titulo" loading="lazy" />
      } @else {
        <span>Sem imagem</span>
      }
    </a>
    <div class="product-card-body">
      <div class="product-meta">
        <app-source-identity [name]="sourceLabel()" [logo]="source().logo ?? ''" /><span>•</span
        >@if (isNew()) { <span class="listing-age is-new"><svg lucideIcon="sparkles" aria-hidden="true"></svg>Novo</span> } @else { <span class="listing-age">{{ ageLabel() }}</span> }
      </div>
      <h2>
        <a [routerLink]="['/produtos', id()]">{{ product().titulo }}</a>
      </h2>
      <div class="product-prices">
        @if (hasOldPrice()) {
          <span class="old-price">{{ product().precoAntigo | currency: 'BRL' }}</span>
        }
        <div class="current-price-row">
          <strong class="product-price">{{ product().preco | currency: 'BRL' }}</strong>
          @if (discount()) {
            <span class="discount-badge">-{{ discount() }}%</span>
          }
        </div>
      </div>
    </div>
    }
  </article>`,
  styles: `
    :host { display: contents; }
    .product-card {
      min-width: 0;
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      background: #fff;
      transition:
        border-color 0.2s,
        transform 0.2s;
    }
    .preview-image-slot { height: 190px; border-radius: 8px 8px 0 0; }
    .preview-image-slot img { max-width:100%; max-height:100%; padding:12px; object-fit:contain; mix-blend-mode:multiply; }
    .preview-card-body { display: flex; flex: 1; flex-direction: column; padding: 13px; gap: 11px; }
    .preview-title-slot { height: 56px; }
    .preview-prices { display: grid; gap: 8px; margin-top: auto; }
    .preview-old-price-slot { height: 27px; width: 54%; }
    .preview-current-price-slot { height: 40px; }
    .preview-value { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .product-card.is-historical-price {
      border-color: #d8a900;
    }
    .product-card:hover {
      border-color: #aebde8;
      transform: translateY(-2px);
    }
    .product-card.is-inactive {
      opacity: 0.52;
      filter: grayscale(0.35);
    }
    .product-card.highlight-item,
    .product-card.highlight-image .product-image,
    .product-card.highlight-title h2,
    .product-card.highlight-old-price .old-price,
    .product-card.highlight-current-price .current-price-row,
    .product-card.highlight-url .product-image,
    .product-card.highlight-url h2 {
      position: relative;
      z-index: 1;
      outline: 2px solid var(--primary);
      outline-offset: -2px;
      background-color: #eef3ff;
      box-shadow: 0 0 0 4px rgb(36 86 223 / 12%);
    }
    .product-card.compact {
      border-radius: 6px;
      height: auto;
    }
    .product-card.compact .product-image {
      height: 150px;
    }
    .product-card.compact h2 {
      min-height: 48px;
      font-size: 13px;
    }
    .product-card.compact .product-price {
      font-size: 18px;
    }
    .product-image {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 190px;
      overflow: hidden;
      background: #f0f2f3;
      color: #999;
      font-size: 12px;
    }
    .product-image img {
      display: block;
      width: auto;
      height: auto;
      max-width: 100%;
      max-height: 100%;
      padding: 12px;
      object-fit: contain;
      mix-blend-mode: multiply;
    }
    .product-card-body {
      display: flex;
      flex: 1;
      flex-direction: column;
      padding: 13px;
    }
    .product-meta {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 8px;
      color: var(--blue);
      font-size: 10px;
      font-weight: 600;
    }
    .product-meta > span:nth-last-child(2) {
      color: #d6d6d6;
      font-size: 8px;
    }
    .listing-age {
      color: var(--muted);
      font-size: 10px;
      white-space: nowrap;
    }
    h2 {
      min-height: 38px;
      overflow: hidden;
      margin: 0 0 11px;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.45;
    }
    h2 a {
      color: #242424;
    }
    .historical-price-badge {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      width: calc(100% + 2px);
      gap: 4px;
      margin: -1px -1px 0;
      overflow: hidden;
      border-radius: 8px 8px 0 0;
      background: linear-gradient(100deg, #c99600 0%, #e5b51b 55%, #f1cb55 100%);
      color: #fff;
      min-height: 36px;
      padding: 7px 13px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.01em;
      box-shadow: 0 2px 8px rgb(151 108 0 / 20%);
    }
    .historical-price-badge::after {
      position: absolute;
      top: 0;
      bottom: 0;
      left: -70%;
      width: 62%;
      background: linear-gradient(105deg, transparent 10%, rgb(255 255 255 / 10%) 38%, rgb(255 255 255 / 34%) 50%, rgb(255 255 255 / 10%) 62%, transparent 90%);
      content: '';
      opacity: 0.9;
      transform: skewX(-12deg);
      animation: historical-shimmer 2.8s cubic-bezier(.45, .05, .55, .95) infinite;
    }
    .historical-price-badge > * { position: relative; z-index: 1; }
    .historical-price-badge svg, .historical-price-badge .lucide { display: inline-block !important; width: 18px; height: 18px; flex: 0 0 18px; color: #fff8d6; stroke-width: 2.4; }
    @keyframes historical-shimmer { 0%, 18% { transform: translateX(0) skewX(-12deg); } 72%, 100% { transform: translateX(310%) skewX(-12deg); } }
    @media (prefers-reduced-motion: reduce) { .historical-price-badge::after { animation: none; } }
    .product-prices {
      min-height: 48px;
      margin-top: auto;
      margin-bottom: 10px;
    }
    .old-price {
      display: block;
      color: #999;
      font-size: 11px;
      text-decoration: line-through;
    }
    .current-price-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 30px;
    }
    .product-price {
      display: block;
      color: #111;
      font-size: 20px;
      line-height: 1.15;
      letter-spacing: -0.6px;
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
    .product-footer { display: flex; align-items: center; justify-content: flex-end; gap: 6px; color: #8a8a8a; font-size: 10px; }
    .product-footer > span:first-child, .product-footer .external-link { display: none; }
  `,
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  readonly sources = input<Record<string, SourceIdentity>>({});
  readonly compact = input(false);
  readonly preview = input(false);
  readonly selectors = input<Partial<Selectors>>({});
  readonly previewData = input<Product | null>(null);
  readonly highlight = input<'item' | 'imagem' | 'titulo' | 'precoAntigo' | 'preco' | 'url' | ''>('');
  readonly slotSelected = output<'imagem' | 'titulo' | 'precoAntigo' | 'preco'>();
  protected readonly id = computed(() => this.product()._id ?? this.product().id ?? '');
  protected readonly imageUrl = computed(() => {
    const value = this.product().imagemUrl?.trim() ?? '';
    return /^(https?:|data:image\/)/i.test(value) ? value : '';
  });
  protected readonly source = computed(
    () =>
      this.sources()[this.product().fonte] ?? {
        fonte: this.product().fonte,
        nome: this.product().fonte,
      },
  );
  protected readonly historical = computed(
    () => this.product().precoHistorico === true,
  );
  protected readonly hasOldPrice = computed(() => (this.product().precoAntigo ?? 0) > (this.product().preco ?? 0));
  protected readonly discount = computed(() => {
    const old = this.product().precoAntigo ?? 0,
      current = this.product().preco ?? 0;
    return old > current && old > 0 ? Math.round(((old - current) / old) * 100) : 0;
  });
  protected readonly ageLabel = computed(() => {
    const value = this.product().ultimaColetaEm ?? this.product().primeiraColetaEm;
    if (!value) return 'Recentemente';
    const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
    return days === 0 ? 'Hoje' : days === 1 ? 'Há 1 dia' : `Há ${days} dias`;
  });
  protected readonly isNew = computed(() => {
    const value = this.product().primeiraColetaEm;
    return !!value && Math.floor((Date.now() - new Date(value).getTime()) / 86400000) < 1;
  });
  protected sourceLabel(): string {
    const value = this.source().nome.trim();
    return value ? value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1) : value;
  }
}
