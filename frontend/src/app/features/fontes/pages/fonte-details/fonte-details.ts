import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import {
  ConfiguredSource,
  Product,
  ScrapingConfig,
  Selectors,
  SelectorTestResult,
  SourceCategory,
} from '../../../../core/models/domain.models';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { FontesApiService } from '../../data-access/fontes-api.service';
import { ProductCardComponent } from '../../../produtos/components/product-card/product-card';
import { SourceIdentityComponent } from '../../../../shared/components/source-identity/source-identity';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button';
import { NotificationService } from '../../../../shared/notifications/notification.service';

type SelectorKey = keyof Pick<
  Selectors,
  'item' | 'imagem' | 'titulo' | 'precoAntigo' | 'preco' | 'url' | 'carregarMais'
>;
type PaginationType = Selectors['tipoPaginacao'];
interface SelectorItem {
  key: SelectorKey;
  label: string;
  icon: string;
  hint: string;
  placeholder: string;
  visual?: boolean;
  required?: boolean;
}
interface ProgressoTeste {
  execucaoId: string;
  etapa: string;
  mensagem: string;
  paginaAtual?: number;
  maxPaginas?: number;
  produtosTotal?: number;
  tempoDecorridoMs: number;
}

@Component({
  selector: 'app-fonte-details',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideDynamicIcon,
    ProductCardComponent,
    SourceIdentityComponent,
    UiButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/admin/fontes" class="back"
      ><svg lucideIcon="arrow-left" aria-hidden="true"></svg> Voltar para fontes</a
    >
    @if (loading()) {
      <div class="panel state">Carregando configuração…</div>
    } @else if (source(); as currentSource) {
      <form id="source-config-form" [formGroup]="form" (ngSubmit)="save()">
        <header class="page-heading">
          <div class="heading-title">
            <h1>Configuração da fonte</h1>
            <app-source-identity
              [name]="currentSource.nome"
              [logo]="currentSource.logo ?? ''"
              [large]="true"
            />
          </div>
          <div class="heading-actions">
            <app-ui-button label="Cancelar" variant="secondary" (click)="cancel()" /><app-ui-button
              label="Salvar configurações"
              icon="save"
              type="submit"
              [loading]="saving()"
              loadingLabel="Salvando…"
            />
          </div>
        </header>
        <div class="config-layout">
          <section class="preview-panel">
            <div class="preview-stage">
              <app-product-card
                [product]="previewProduct()"
                [sources]="previewSources()"
                [highlight]="previewHighlight()"
              />
            </div>
          </section>
          <section class="selectors-panel panel">
            <div class="collection-section">
              <div class="collection-heading">
                <span class="collection-icon"
                  ><svg lucideIcon="globe-2" aria-hidden="true"></svg
                ></span>
                <div>
                  <span class="eyebrow">Fonte de coleta</span>
                  <h2>URL para teste</h2>
                </div>
              </div>
              <label class="url-label"
                ><input
                  formControlName="urlColeta"
                  type="url"
                  placeholder="https://loja.com/produtos"
                  (blur)="form.controls.urlColeta.markAsTouched()"
                />
                @if (form.controls.urlColeta.touched && form.controls.urlColeta.invalid) {
                  <small class="field-error">Informe uma URL HTTP ou HTTPS válida.</small>
                }</label
              ><label class="checkbox-option"
                ><input type="checkbox" formControlName="paginaVirtualizada" /> Página
                virtualizada</label
              >
              <fieldset class="pagination-config">
                <legend>Paginação</legend>
                <label
                  ><input type="radio" formControlName="tipoPaginacao" value="nenhuma" /> Sem
                  paginação</label
                ><label
                  ><input type="radio" formControlName="tipoPaginacao" value="proximaPagina" />
                  Próxima página</label
                ><label
                  ><input type="radio" formControlName="tipoPaginacao" value="url" /> Por URL</label
                >
                @if (form.controls.tipoPaginacao.value === 'proximaPagina') {
                  <label class="url-label"
                    >Seletor da próxima página<input
                      formControlName="seletorProximaPagina"
                      placeholder="#listingPagination a.nextLink"
                  /></label>
                }
                @if (form.controls.tipoPaginacao.value === 'url') {
                  <div class="pagination-url-fields">
                    <label class="url-label"
                      >Parâmetro da página<input
                        formControlName="parametroPagina"
                        placeholder="page" /></label
                    ><label class="url-label"
                      >Template de URL (opcional)<input
                        formControlName="urlPaginacaoTemplate"
                        placeholder="https://loja.com/lista?page={pagina}"
                    /></label>
                  </div>
                }
                @if (form.controls.tipoPaginacao.value !== 'nenhuma') {
                  <label class="url-label pagination-max"
                    >Máximo de páginas<input
                      formControlName="maxPaginas"
                      type="number"
                      min="1"
                      max="100"
                  /></label>
                }
              </fieldset>
              <div class="test-actions">
                <app-ui-button
                  label="Abrir navegador"
                  [icon]="navegadorVisivel() ? 'eye' : 'eye-off'"
                  variant="secondary"
                  [state]="navegadorVisivel() ? 'active' : 'inactive'"
                  [disabled]="testing()"
                  [title]="'Quando ativo, abre o navegador usado no teste para acompanhar a coleta visualmente.'"
                  (click)="toggleNavegadorVisivel()"
                />
                <app-ui-button
                  label="Testar seletores"
                  icon="search-check"
                  variant="primary"
                  [loading]="testing()"
                  loadingLabel="Testando…"
                  [disabled]="!category() || form.invalid || !paginationValid()"
                  (click)="testSelectors()"
                />
                @if (testResult()) {
                  <span class="test-status success"
                    ><svg lucideIcon="check" aria-hidden="true"></svg
                    >{{ testResult()!.quantidadeProdutos }} produto(s) encontrado(s)</span
                  ><span class="test-status"
                    ><svg lucideIcon="list" aria-hidden="true"></svg
                    >{{ testResult()!.paginacao.paginasProcessadas }} página(s):
                    {{ testResult()!.paginacao.motivoParada }}</span
                  >
                }
              </div>
              @if (testing() && progressoTeste(); as progresso) {
                <div class="test-progress" role="status" aria-live="polite">
                  <div class="test-progress-heading">
                    <span class="progress-spinner" aria-hidden="true"></span
                    ><strong>Testando seletores</strong><time>{{ tempoTeste() }}</time>
                  </div>
                  <div class="test-progress-meta">
                    {{ progresso.mensagem }}
                    @if (progresso.paginaAtual) {
                      <span>
                        · Página {{ progresso.paginaAtual }}
                        @if (progresso.maxPaginas) {
                          / {{ progresso.maxPaginas }}
                        }
                      </span>
                    }
                    @if (progresso.produtosTotal !== undefined) {
                      <span> · {{ progresso.produtosTotal }} produto(s)</span>
                    }
                  </div>
                  @if (semAtualizacao()) {
                    <div class="test-progress-waiting">
                      Sem novas atualizações há mais de 15s. Aguardando resposta da página...
                    </div>
                  }
                  <div class="test-progress-log">
                    @for (mensagem of progressoMensagens(); track $index) {
                      <span>{{ mensagem }}</span>
                    }
                  </div>
                </div>
              }
            </div>
            <div class="section-heading selectors-heading"><h2>Seletores</h2></div>
            <div class="selector-list">
              @for (item of selectorItems; track item.key) {
                <div
                  class="selector-row"
                  [class.is-active]="activeSelector() === item.key"
                  [class.is-hovered]="previewHighlight() === item.key"
                  [class.is-configured]="isConfigured(item.key)"
                  (mouseenter)="setHover(item.key)"
                  (mouseleave)="clearHover()"
                  (focusin)="setHover(item.key)"
                  (focusout)="clearHover()"
                >
                  <div class="selector-row-heading">
                    <span class="selector-icon"
                      ><svg [lucideIcon]="item.icon" aria-hidden="true"></svg></span
                    ><strong>{{ item.label }}</strong>
                    @if (isConfigured(item.key)) {
                      <span class="status-badge configured"
                        ><svg lucideIcon="check" aria-hidden="true"></svg>Configurado</span
                      >
                    } @else {
                      <span class="status-badge">Não configurado</span>
                    }
                    @if (activeSelector() !== item.key) {
                      <app-ui-button
                        [icon]="isConfigured(item.key) ? 'pencil' : 'plus'"
                        [iconOnly]="true"
                        height="30px"
                        iconSize="30px"
                        [ariaLabel]="
                          (isConfigured(item.key) ? 'Editar' : 'Adicionar') +
                          ' seletor de ' +
                          item.label.toLocaleLowerCase('pt-BR')
                        "
                        [title]="
                          (isConfigured(item.key) ? 'Editar' : 'Adicionar') +
                          ' seletor de ' +
                          item.label.toLocaleLowerCase('pt-BR')
                        "
                        variant="secondary"
                        type="button"
                        (click)="startEdit(item.key)"
                      />
                    }
                  </div>
                  @if (activeSelector() === item.key) {
                    <div class="selector-editor">
                      <input
                        [id]="'selector-' + item.key"
                        [formControlName]="item.key"
                        [placeholder]="item.placeholder"
                        autocomplete="off"
                      />
                      <div class="edit-actions">
                        <app-ui-button
                          icon="check"
                          [iconOnly]="true"
                          height="30px"
                          iconSize="30px"
                          ariaLabel="Confirmar edição do seletor"
                          title="Confirmar"
                          variant="primary"
                          (click)="confirmEdit()"
                        /><app-ui-button
                          icon="x"
                          [iconOnly]="true"
                          height="30px"
                          iconSize="30px"
                          ariaLabel="Cancelar edição do seletor"
                          title="Cancelar"
                          variant="secondary"
                          (click)="cancelEdit(item.key)"
                        />
                      </div>
                      @if (activeControl().touched && activeControl().hasError('required')) {
                        <small class="field-error">Informe um seletor.</small>
                      }
                    </div>
                  } @else {
                    <span class="readonly-selector">{{
                      form.controls[item.key].value || '—'
                    }}</span>
                  }
                </div>
              }
            </div>
            @if (!category()) {
              <p class="empty-state">Esta fonte ainda não possui uma configuração de coleta.</p>
            }
          </section>
        </div>
      </form>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 1rem;
      font-weight: 800;
    }
    .back svg {
      width: 16px;
      height: 16px;
    }
    .page-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.35rem;
    }
    .heading-title,
    .heading-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    h1 {
      margin: 0;
      font-size: clamp(1.35rem, 2vw, 1.8rem);
    }
    .heading-title app-source-identity {
      padding-left: 1rem;
      border-left: 1px solid var(--border);
    }
    .heading-actions {
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .config-layout {
      display: grid;
      grid-template-columns: minmax(300px, 0.62fr) minmax(390px, 1.08fr);
      align-items: start;
      gap: 2rem;
    }
    .panel {
      min-width: 0;
    }
    .selectors-panel {
      padding: 1.35rem 1.5rem;
      border: 1px solid #e8ebf0;
      border-radius: 14px;
      background: #fff;
      box-shadow: 0 8px 24px rgb(16 24 40 / 4%);
    }
    .section-heading {
      margin-bottom: 1.15rem;
    }
    h2 {
      margin: 0;
      font-size: 1.1rem;
      letter-spacing: -0.01em;
    }
    .preview-panel {
      position: sticky;
      top: 84px;
      align-self: start;
    }
    .preview-stage {
      display: grid;
      place-items: center;
      padding: 1.25rem 0;
    }
    .preview-stage app-product-card {
      display: block;
      width: min(100%, 310px);
      height: 440px;
    }
    .collection-section {
      display: grid;
      gap: 0.8rem;
      padding: 1.1rem;
      border: 1px solid #e4e8ef;
      border-radius: 12px;
      background: #fafbfc;
    }
    .collection-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.7rem;
    }
    .selectors-heading {
      margin-top: 1.4rem;
    }
    .selector-list {
      display: grid;
      gap: 0.45rem;
      min-width: 0;
    }
    .selector-row {
      min-width: 0;
      padding: 0.85rem 0.2rem;
      border-bottom: 1px solid #f0f2f5;
    }
    .selector-row:last-child {
      border-bottom: 0;
    }
    .selector-row.is-active {
      margin: 0 -0.75rem;
      padding: 0.85rem 0.75rem;
      border-radius: 9px;
      background: #f7f9ff;
      box-shadow: inset 3px 0 var(--primary);
    }
    .selector-row-heading {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
      min-height: 30px;
    }
    .selector-row-heading strong {
      min-width: 0;
      font-size: 0.82rem;
      font-weight: 750;
    }
    .selector-icon {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      flex: 0 0 30px;
      border: 1px solid #e3e8f2;
      border-radius: 8px;
      background: #f8faff;
      color: #6177b5;
    }
    .selector-icon svg {
      width: 15px;
      height: 15px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      margin-left: auto;
      color: #98a2b3;
      font-size: 0.66rem;
    }
    .status-badge.configured {
      color: #21824b;
    }
    .status-badge svg {
      width: 13px;
      height: 13px;
    }
    .readonly-selector {
      display: block;
      width: calc(100% - 2.45rem);
      max-width: 100%;
      min-width: 0;
      margin: 5px 0 0 2.45rem;
      overflow: hidden;
      color: #667085;
      font: inherit;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.73rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .direct-edit {
      padding: 0;
      border: 0;
      background: transparent;
      text-align: left;
      cursor: pointer;
    }
    .direct-edit:hover {
      color: var(--primary);
    }
    .direct-edit:focus-visible {
      outline: 3px solid rgb(36 86 223 / 20%);
      outline-offset: 3px;
      border-radius: 3px;
    }
    .selector-editor {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
      gap: 0.7rem;
      min-width: 0;
      margin: 7px 0 0 2.45rem;
    }
    .selector-editor input {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .edit-actions {
      display: flex;
      align-items: center;
      flex: 0 0 auto;
      gap: 0.35rem;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      min-height: 38px;
      padding: 0 0.7rem;
      border: 1px solid #d5dce8;
      border-radius: 8px;
      background: #fff;
      color: #222;
      font: inherit;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.73rem;
    }
    input:focus {
      border-color: var(--primary);
      outline: 3px solid rgb(36 86 223 / 12%);
    }
    .url-label {
      display: grid;
      gap: 0.4rem;
      color: #35435e;
      font-size: 0.72rem;
      font-weight: 800;
    }
    .checkbox-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #667085;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .checkbox-option input {
      width: 16px;
      height: 16px;
      min-height: 0;
      padding: 0;
      border: 0;
    }
    .test-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 0.2rem;
    }
    .test-status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #168348;
      font-size: 0.72rem;
    }
    .test-status svg {
      width: 15px;
      height: 15px;
    }
    .test-progress {
      margin-top: 0.7rem;
      padding: 0.7rem 0.8rem;
      border: 1px solid #d8e0f0;
      border-radius: 8px;
      background: #f8faff;
      color: #35435e;
      font-size: 0.72rem;
    }
    .test-progress-heading {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .test-progress-heading time {
      margin-left: auto;
      color: #667085;
      font-variant-numeric: tabular-nums;
    }
    .progress-spinner {
      display: inline-block;
      width: 13px;
      height: 13px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: progress-spin 700ms linear infinite;
    }
    .test-progress-meta {
      margin-top: 0.35rem;
      color: #52627e;
    }
    .test-progress-log {
      display: grid;
      gap: 0.18rem;
      margin-top: 0.45rem;
      color: #71809b;
    }
    .test-progress-waiting {
      margin-top: 0.45rem;
      color: #946c16;
    }
    @keyframes progress-spin {
      to {
        transform: rotate(360deg);
      }
    }
    .field-error {
      grid-column: 1/-1;
      color: #b42318;
      font-size: 0.7rem;
    }
    .empty-state {
      margin: 1rem 0 0;
      padding: 0.8rem;
      border-radius: 8px;
      background: #fff8e7;
      color: #7a5a13;
      font-size: 0.75rem;
      line-height: 1.45;
    }
    .pagination-config {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.7rem 0.8rem;
      min-width: 0;
      margin: 0;
      padding: 0.9rem;
      border: 1px solid #e1e6ef;
      border-radius: 9px;
    }
    .pagination-config legend {
      grid-column: 1/-1;
      padding: 0 0.25rem;
      color: #35435e;
      font-size: 0.72rem;
      font-weight: 800;
    }
    .pagination-config > label:not(.url-label) {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      min-width: 0;
      padding: 0.55rem 0.65rem;
      border: 1px solid #e1e6ef;
      border-radius: 7px;
      color: #667085;
      font-size: 0.72rem;
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        background-color 0.15s ease,
        color 0.15s ease;
    }
    .pagination-config > label:not(.url-label):has(input:checked) {
      border-color: #8298d8;
      background: #f2f5ff;
      color: #263d91;
    }
    .pagination-config > label:not(.url-label) input {
      flex: 0 0 auto;
      width: 15px;
      min-height: 15px;
      padding: 0;
    }
    .pagination-config .url-label {
      min-width: 0;
    }
    .pagination-config > .url-label {
      grid-column: 1/-1;
    }
    .pagination-config > .url-label input,
    .pagination-url-fields input {
      width: 100%;
      min-width: 0;
    }
    .pagination-url-fields {
      display: contents;
    }
    .pagination-url-fields label:has(input[formControlName='urlPaginacaoTemplate']) {
      grid-column: 1/-1;
      grid-row: 3;
    }
    .pagination-url-fields label:has(input[formControlName='parametroPagina']) {
      grid-column: 1;
      grid-row: 4;
    }
    .pagination-config > .pagination-max {
      grid-column: 2;
      grid-row: 4;
      max-width: 180px;
    }
    .pagination-config > label:has(input[formControlName='seletorProximaPagina']) {
      grid-row: 3;
    }
    .pagination-config
      > label:has(input[formControlName='seletorProximaPagina'])
      + .pagination-max {
      grid-column: 1;
      grid-row: 4;
    }
    .pagination-max input {
      min-width: 120px;
    }
    .test-status:not(.success) {
      color: #667085;
    }
    @media (max-width: 850px) {
      .config-layout {
        grid-template-columns: 1fr;
      }
      .preview-panel {
        position: static;
      }
      .preview-stage {
        min-height: 0;
      }
      .preview-stage app-product-card {
        height: auto;
      }
    }
    @media (max-width: 620px) {
      .page-heading,
      .heading-title {
        align-items: flex-start;
        flex-direction: column;
      }
      .heading-title app-source-identity {
        padding: 0;
        border: 0;
      }
      .heading-actions {
        width: 100%;
        justify-content: flex-start;
      }
      .preview-panel,
      .selectors-panel {
        padding: 1rem;
      }
      .pagination-config {
        grid-template-columns: 1fr;
      }
      .pagination-mode,
      .pagination-next-field,
      .pagination-template-field,
      .pagination-url-fields {
        grid-column: 1/-1;
      }
      .pagination-url-fields {
        grid-template-columns: 1fr;
      }
      .pagination-url-fields label:has(input),
      .pagination-config > .pagination-max,
      .pagination-config > label:has(input[formControlName='seletorProximaPagina']) {
        grid-row: auto;
      }
      .pagination-url-fields .pagination-max,
      .pagination-config > .pagination-max {
        max-width: none;
        grid-column: 1;
      }
    }
  `,
})
export class FonteDetailsPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FontesApiService);
  private readonly errors = inject(ApiErrorService);
  private readonly notifications = inject(NotificationService);
  private loadedConfig: ScrapingConfig | null = null;
  protected readonly source = signal<ConfiguredSource | null>(null);
  protected readonly category = signal<SourceCategory | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly testing = signal(false);
  protected readonly progressoTeste = signal<ProgressoTeste | null>(null);
  protected readonly progressoMensagens = signal<string[]>([]);
  protected readonly tempoTeste = signal('00:00');
  protected readonly semAtualizacao = signal(false);
  private progressoStream?: EventSource;
  private progressoTimer?: number;
  private ultimoEventoProgresso = 0;
  protected readonly navegadorVisivel = signal(false);
  protected readonly testResult = signal<SelectorTestResult | null>(null);
  protected readonly activeSelector = signal<SelectorKey | ''>('');
  protected readonly form = this.fb.nonNullable.group({
    item: ['', Validators.required],
    imagem: ['', Validators.required],
    titulo: ['', Validators.required],
    precoAntigo: [''],
    preco: ['', Validators.required],
    url: [''],
    carregarMais: [''],
    paginaVirtualizada: false,
    tipoPaginacao: this.fb.nonNullable.control<PaginationType>('nenhuma'),
    seletorProximaPagina: [''],
    maxPaginas: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
    parametroPagina: ['page'],
    urlPaginacaoTemplate: [''],
    urlColeta: ['', [Validators.required, Validators.pattern(/^https?:\/\//i)]],
  });
  protected readonly selectorItems: SelectorItem[] = [
    {
      key: 'item',
      label: 'Card do produto',
      icon: 'package',
      hint: 'Seletor CSS do card',
      placeholder: '.product-card',
    },
    {
      key: 'imagem',
      label: 'Imagem',
      icon: 'image',
      hint: 'Seletor CSS da imagem',
      placeholder: '.product-card img',
      visual: true,
      required: true,
    },
    {
      key: 'titulo',
      label: 'Título',
      icon: 'type',
      hint: 'Seletor CSS do título',
      placeholder: '.product-title',
      visual: true,
      required: true,
    },
    {
      key: 'precoAntigo',
      label: 'Preço anterior',
      icon: 'badge-minus',
      hint: 'Seletor CSS do preço anterior',
      placeholder: '.old-price',
      visual: true,
    },
    {
      key: 'preco',
      label: 'Novo preço',
      icon: 'badge-dollar-sign',
      hint: 'Seletor CSS do preço atual',
      placeholder: '.price',
      visual: true,
      required: true,
    },
    {
      key: 'url',
      label: 'Link do produto',
      icon: 'external-link',
      hint: 'Seletor CSS do link',
      placeholder: 'a.product-link',
    },
    {
      key: 'carregarMais',
      label: 'Carregar mais',
      icon: 'download',
      hint: 'Seletor CSS do botão',
      placeholder: '.load-more',
    },
  ];
  protected readonly previewProduct = computed<Product>(() => ({
    id: 'preview',
    fonte: this.source()?.fonte ?? '',
    titulo: 'Oferta especial para sua próxima compra',
    preco: 3299.9,
    precoAntigo: 3799.9,
    ativo: true,
  }));
  protected readonly previewSources = computed(() => {
    const item = this.source();
    return item ? { [item.fonte]: item } : {};
  });
  protected readonly activeItem = computed<SelectorItem>(
    () =>
      this.selectorItems.find((item) => item.key === this.activeSelector()) ??
      this.selectorItems[0]!,
  );
  protected readonly activeControl = computed(() => this.form.controls[this.activeItem().key]);
  protected readonly hoverSelector = signal<SelectorKey | ''>('');
  protected readonly previewHighlight = computed(() =>
    ['item', 'imagem', 'titulo', 'precoAntigo', 'preco', 'url'].includes(this.hoverSelector())
      ? (this.hoverSelector() as 'item' | 'imagem' | 'titulo' | 'precoAntigo' | 'preco' | 'url')
      : '',
  );
  protected readonly testedProduct = computed(() => this.testResult()?.produtos[0] ?? null);
  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('fonte') ?? '';
    this.form.valueChanges.subscribe(() => this.testResult.set(null));
    this.api.config(true).subscribe({
      next: (config) => {
        this.loadedConfig = config;
        const found = config.fontes.find((item) => item.fonte === id) ?? null;
        this.source.set(found);
        this.aplicarCategoria(found?.categorias[0] ?? null);
        this.loading.set(false);
      },
      error: (error) => {
        this.fail(error);
        this.loading.set(false);
      },
    });
  }
  private aplicarCategoria(category: SourceCategory | null): void {
    this.category.set(category);
    if (!category) return;
    const seletoresDaFonte = this.source()?.categorias[0]?.seletores ?? category.seletores;
    const pagination = category.seletores;
    this.form.patchValue(
      {
        item: seletoresDaFonte.item,
        imagem: seletoresDaFonte.imagem,
        titulo: seletoresDaFonte.titulo,
        precoAntigo: seletoresDaFonte.precoAntigo,
        preco: seletoresDaFonte.preco,
        url: seletoresDaFonte.url,
        carregarMais: seletoresDaFonte.carregarMais,
        paginaVirtualizada: seletoresDaFonte.paginaVirtualizada,
        tipoPaginacao: seletoresDaFonte.tipoPaginacao ?? 'nenhuma',
        seletorProximaPagina: seletoresDaFonte.seletorProximaPagina ?? '',
        maxPaginas: pagination.maxPaginas ?? 10,
        parametroPagina: seletoresDaFonte.parametroPagina ?? 'page',
        urlPaginacaoTemplate: seletoresDaFonte.urlPaginacaoTemplate ?? '',
        urlColeta: category.url,
      },
      { emitEvent: false },
    );
  }
  protected toggleSelector(key: SelectorKey): void {
    this.activeSelector.set(key);
  }
  protected selectSelector(key: SelectorKey): void {
    this.activeSelector.set(key);
  }
  protected startEdit(key: SelectorKey): void {
    this.activeSelector.set(key);
  }
  protected setHover(key: SelectorKey): void {
    this.hoverSelector.set(key);
  }
  protected clearHover(): void {
    this.hoverSelector.set('');
  }
  protected confirmEdit(): void {
    this.activeSelector.set('');
  }
  protected cancelEdit(key: SelectorKey): void {
    const original = this.category()?.seletores[key];
    this.form.controls[key].setValue(original ?? '');
    this.form.controls[key].markAsPristine();
    this.form.controls[key].markAsUntouched();
    this.activeSelector.set('');
  }
  protected isConfigured(key: SelectorKey): boolean {
    return !!this.form.controls[key].value.trim();
  }
  protected cancel(): void {
    window.history.back();
  }
  protected toggleVirtualized(): void {
    this.form.controls.paginaVirtualizada.setValue(!this.form.controls.paginaVirtualizada.value);
  }
  protected toggleNavegadorVisivel(): void {
    this.navegadorVisivel.update((ativo) => !ativo);
  }
  protected paginationValid(): boolean {
    const value = this.form.getRawValue();
    return (
      value.tipoPaginacao === 'nenhuma' ||
      (value.tipoPaginacao === 'proximaPagina'
        ? !!value.seletorProximaPagina.trim()
        : !!value.parametroPagina.trim() || !!value.urlPaginacaoTemplate.trim())
    );
  }
  protected testSelectors(): void {
    const current = this.source(),
      category = this.category();
    if (!current || !category || this.form.invalid || !this.paginationValid()) return;
    this.testing.set(true);
    this.testResult.set(null);
    const execucaoId = crypto.randomUUID();
    const inicio = Date.now();
    this.ultimoEventoProgresso = inicio;
    this.progressoTeste.set({
      execucaoId,
      etapa: 'iniciando',
      mensagem: 'Iniciando teste de seletores',
      tempoDecorridoMs: 0,
    });
    this.progressoMensagens.set([]);
    this.progressoStream = new EventSource(this.api.testProgressUrl(execucaoId));
    this.progressoStream.addEventListener('progresso', (event) =>
      this.receberProgresso(JSON.parse((event as MessageEvent).data) as ProgressoTeste),
    );
    this.progressoStream.addEventListener('finalizado', (event) => {
      this.receberProgresso(JSON.parse((event as MessageEvent).data) as ProgressoTeste);
      this.encerrarProgresso();
    });
    this.progressoTimer = window.setInterval(() => {
      const agora = Date.now();
      this.tempoTeste.set(this.formatarTempo(agora - inicio));
      this.semAtualizacao.set(agora - this.ultimoEventoProgresso >= 15_000);
    }, 1000);
    const value = this.form.getRawValue();
    this.api
      .testSelectors({
        fonte: current.fonte,
        categoria: category.categoria,
        url: value.urlColeta,
        navegadorVisivel: this.navegadorVisivel(),
        execucaoId,
        seletores: {
          item: value.item,
          titulo: value.titulo,
          preco: value.preco,
          precoAntigo: value.precoAntigo,
          imagem: value.imagem,
          url: value.url,
          paginaVirtualizada: value.paginaVirtualizada,
          carregarMais: value.carregarMais,
          tipoPaginacao: value.tipoPaginacao,
          seletorProximaPagina: value.seletorProximaPagina,
          maxPaginas: value.maxPaginas,
          parametroPagina: value.parametroPagina,
          urlPaginacaoTemplate: value.urlPaginacaoTemplate,
        },
      })
      .subscribe({
        next: (result) => {
          this.testResult.set(result);
          this.testing.set(false);
          this.encerrarProgresso();
          this.notifications.success('Teste concluído com sucesso.');
        },
        error: (error) => {
          this.testing.set(false);
          this.encerrarProgresso();
          this.fail(error);
        },
      });
  }
  private receberProgresso(progresso: ProgressoTeste): void {
    this.ultimoEventoProgresso = Date.now();
    this.semAtualizacao.set(false);
    this.progressoTeste.set(progresso);
    this.progressoMensagens.update((mensagens) => [...mensagens, progresso.mensagem].slice(-5));
    this.tempoTeste.set(this.formatarTempo(progresso.tempoDecorridoMs));
  }
  private encerrarProgresso(): void {
    this.progressoStream?.close();
    this.progressoStream = undefined;
    if (this.progressoTimer !== undefined) window.clearInterval(this.progressoTimer);
    this.progressoTimer = undefined;
  }
  private formatarTempo(milisegundos: number): string {
    const totalSegundos = Math.floor(milisegundos / 1000);
    return `${String(Math.floor(totalSegundos / 60)).padStart(2, '0')}:${String(totalSegundos % 60).padStart(2, '0')}`;
  }
  protected save(): void {
    const current = this.source(),
      category = this.category(),
      config = this.loadedConfig;
    if (!current || !category || !config) return;
    if (this.form.invalid || !this.paginationValid()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const selectors: Selectors = {
      ...category.seletores,
      item: value.item,
      imagem: value.imagem,
      titulo: value.titulo,
      precoAntigo: value.precoAntigo,
      preco: value.preco,
      url: value.url,
      carregarMais: value.carregarMais,
      paginaVirtualizada: value.paginaVirtualizada,
      tipoPaginacao: value.tipoPaginacao,
      seletorProximaPagina: value.seletorProximaPagina,
      maxPaginas: value.maxPaginas,
      parametroPagina: value.parametroPagina,
      urlPaginacaoTemplate: value.urlPaginacaoTemplate,
    };
    const changed = {
      ...current,
      categorias: current.categorias.map((item) =>
        item.id === category.id
          ? { ...item, seletores: selectors }
          : { ...item, seletores: { ...selectors, maxPaginas: item.seletores.maxPaginas } },
      ),
    };
    this.api
      .save({
        ...config,
        fontes: config.fontes.map((item) => (item.fonte === current.fonte ? changed : item)),
      })
      .subscribe({
        next: (saved) => {
          this.loadedConfig = saved;
          const savedSource = saved.fontes.find((item) => item.fonte === current.fonte) ?? null;
          this.source.set(savedSource);
          this.aplicarCategoria(
            savedSource?.categorias.find((item) => item.id === category.id) ?? null,
          );
          this.success('Configurações salvas.');
        },
        error: (error) => this.fail(error),
      });
  }
  private success(message: string): void {
    this.notifications.success(message);
    this.saving.set(false);
  }
  private fail(error: unknown): void {
    this.notifications.error(this.errors.message(error));
    this.saving.set(false);
  }
}
