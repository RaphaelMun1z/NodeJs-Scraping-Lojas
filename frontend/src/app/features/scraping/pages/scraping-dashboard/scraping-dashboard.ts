import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { retry } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ScrapingExecution,
  ScrapingLog,
  ScrapingSummary,
} from '../../../../core/models/domain.models';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { FontesApiService } from '../../../fontes/data-access/fontes-api.service';
import { LogsStreamService } from '../../data-access/logs-stream.service';
import { ScrapingApiService } from '../../data-access/scraping-api.service';

@Component({
  selector: 'app-scraping-dashboard',
  imports: [ReactiveFormsModule, DatePipe, DurationPipe, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-heading">
      <div>
        <span class="eyebrow">Operação em tempo real</span>
        <h1>Monitoramento</h1>
        <p>Acompanhe coletas por fonte e categoria.</p>
      </div>
      <button class="btn primary" [disabled]="executing()" (click)="execute()">
        {{ executing() ? 'Iniciando…' : '▶ Iniciar coleta' }}
      </button>
    </header>
    @if (error()) {
      <div class="feedback error">{{ error() }}</div>
    }
    @if (summary(); as item) {
      <section class="summary-grid">
        <article class="panel">
          <span>Produtos salvos</span><strong>{{ item.produtosSalvos }}</strong>
        </article>
        <article class="panel">
          <span>Produtos ativos</span><strong>{{ item.produtosAtivos }}</strong>
        </article>
        <article class="panel">
          <span>Última atualização</span
          ><strong>{{
            item.ultimaAtualizacao ? (item.ultimaAtualizacao | date: 'dd/MM HH:mm') : '—'
          }}</strong>
        </article>
        <article class="panel">
          <span>Próxima coleta</span
          ><strong>{{
            item.proximaBusca ? (item.proximaBusca | date: 'dd/MM HH:mm') : '—'
          }}</strong>
        </article>
      </section>
    }
    <section class="panel status-section">
      <div class="section-head">
        <div>
          <h2>Status das fontes</h2>
          <span>Atualização automática por eventos do servidor</span>
        </div>
        <span class="live">● Ao vivo</span>
      </div>
      @if (!statuses().length) {
        <div class="state">Nenhuma execução registrada.</div>
      } @else {
        @if (failedStatuses().length) {
          <div class="error-sources">
            <strong>Fontes com problemas</strong>
            <div>
              @for (item of failedStatuses(); track item._id) {
                <span>{{ item.fonte }}{{ item.categoria ? ' · ' + item.categoria : '' }}</span>
              }
            </div>
          </div>
        }
        <div class="status-grid">
          @for (item of statuses(); track item._id) {
            <article>
              <div class="status-title">
                <div>
                  <strong>{{ item.fonte }}</strong>
                  @if (item.categoria) {
                    <small>{{ item.categoria }}</small>
                  }
                </div>
                <span class="status" [class]="item.status">{{ item.status }}</span>
              </div>
              <div class="progress"><i [style.width.%]="item.progresso?.geral ?? 0"></i></div>
              <p>{{ item.ultimaMensagem || item.erro || 'Aguardando atualização' }}</p>
              <button class="link" (click)="openLogs(item)">Ver detalhes e logs</button>
            </article>
          }
        </div>
      }
    </section>
    <section class="panel history">
      <div class="section-head"><h2>Histórico de execuções</h2></div>
      <form [formGroup]="filters" (ngSubmit)="loadHistory(1)">
        <select formControlName="fonte">
          <option value="">Todas as fontes</option>
          @for (source of sources(); track source) {
            <option [value]="source">{{ source }}</option>
          }</select
        ><input type="date" formControlName="dataInicio" /><input
          type="date"
          formControlName="dataFim"
        /><button class="btn">Filtrar</button>
      </form>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fonte / categoria</th>
              <th>Início</th>
              <th>Status</th>
              <th>Encontrados</th>
              <th>Duração</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (item of executions(); track item._id) {
              <tr>
                <td>
                  <strong>{{ item.fonte }}</strong
                  ><small>{{ item.categoria }}</small>
                </td>
                <td>{{ item.iniciadoEm | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                <td>
                  <span class="status" [class]="item.status">{{ item.status }}</span>
                </td>
                <td>{{ item.produtosEncontrados ?? 0 }}</td>
                <td>{{ item.duracaoMs | duration }}</td>
                <td><button class="link" (click)="openLogs(item)">Logs</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="page()" [totalPages]="pages()" (changed)="loadHistory($event)" />
    </section>
    @if (selected()) {
      <div
        class="modal-backdrop"
        tabindex="-1"
        (click)="closeLogsFromBackdrop($event)"
        (keydown.escape)="closeLogs()"
      >
        <section class="modal panel">
          <header>
            <div>
              <span class="eyebrow">{{ selected()?.fonte }} · {{ selected()?.categoria }}</span>
              <h2>Detalhes da execução</h2>
            </div>
            <button class="close" (click)="closeLogs()">×</button>
          </header>
          <div class="metrics">
            <span
              >Coleta <strong>{{ selected()?.progresso?.coleta ?? 0 }}%</strong></span
            ><span
              >Matching <strong>{{ selected()?.progresso?.embeddings ?? 0 }}%</strong></span
            ><span
              >Índice <strong>{{ selected()?.progresso?.indexacao ?? 0 }}%</strong></span
            >
          </div>
          <fieldset class="log-levels">
            <legend>Níveis</legend>
            @for (level of logLevels; track level.value) {
              <label
                ><input
                  type="checkbox"
                  [checked]="selectedLevels().has(level.value)"
                  (change)="toggleLogLevel(level.value, $event)"
                />
                {{ level.label }}</label
              >
            }
          </fieldset>
          <div class="console">
            @for (log of visibleLogs(); track log._id) {
              <p [class]="log.nivel">
                <time>{{ log.criadoEm | date: 'HH:mm:ss' }}</time> <b>[{{ log.nivel }}]</b>
                {{ log.mensagem }}
              </p>
            }
            @if (!visibleLogs().length) {
              <p>Nenhum log registrado.</p>
            }
          </div>
        </section>
      </div>
    }
  `,
  styles: `
    .page-heading,
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .page-heading {
      margin-bottom: 1.5rem;
    }
    .page-heading h1 {
      margin: 0.2rem 0;
    }
    .page-heading p,
    .section-head span,
    .status-grid p {
      color: var(--muted);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    .summary-grid article {
      padding: 1rem;
    }
    .summary-grid span {
      display: block;
      color: var(--muted);
      font-size: 0.75rem;
    }
    .summary-grid strong {
      font-size: 1.35rem;
    }
    .status-section,
    .history {
      padding: 1.2rem;
      margin-top: 1rem;
    }
    .live {
      color: #16a34a !important;
      font-weight: 800;
    }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.8rem;
      margin-top: 1rem;
    }
    .error-sources {
      margin: 1rem 0;
      padding: 0.8rem 1rem;
      border: 1px solid #fecaca;
      border-radius: 8px;
      background: #fff7f7;
      color: #991b1b;
      font-size: 0.8rem;
    }
    .error-sources div {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .error-sources span {
      padding: 0.25rem 0.5rem;
      border-radius: 99px;
      background: #fee2e2;
    }
    .status-grid article {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem;
    }
    .status-title {
      display: flex;
      justify-content: space-between;
    }
    .status-title small,
    td small {
      display: block;
      color: var(--muted);
    }
    .status {
      padding: 0.2rem 0.5rem;
      border-radius: 99px;
      background: #e2e8f0;
      font-size: 0.7rem;
      font-weight: 900;
    }
    .status.executando {
      background: #dbeafe;
      color: #1d4ed8;
    }
    .status.concluido {
      background: #dcfce7;
      color: #15803d;
    }
    .status.erro {
      background: #fee2e2;
      color: #b91c1c;
    }
    .progress {
      height: 7px;
      background: #e2e8f0;
      border-radius: 9px;
      overflow: hidden;
      margin: 1rem 0;
    }
    .progress i {
      display: block;
      height: 100%;
      background: var(--primary);
    }
    .link {
      border: 0;
      background: none;
      color: var(--primary);
      font-weight: 800;
      cursor: pointer;
      padding: 0;
    }
    .history form {
      display: flex;
      gap: 0.6rem;
      margin: 1rem 0;
    }
    .table-wrap {
      overflow: auto;
    }
    td small {
      max-width: 170px;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: #0f172abf;
      display: grid;
      place-items: center;
      padding: 1rem;
      z-index: 80;
    }
    .modal {
      width: min(900px, 100%);
      max-height: 90vh;
      overflow: auto;
      padding: 1.2rem;
    }
    .modal header {
      display: flex;
      justify-content: space-between;
    }
    .close {
      border: 0;
      background: none;
      font-size: 2rem;
    }
    .metrics {
      display: flex;
      gap: 1rem;
      background: var(--surface-2);
      padding: 1rem;
      border-radius: 8px;
    }
    .console {
      background: #0f172a;
      color: #cbd5e1;
      border-radius: 10px;
      padding: 1rem;
      height: 360px;
      overflow: auto;
      font: 12px monospace;
    }
    .console p {
      margin: 0.35rem 0;
    }
    .log-levels {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
      margin: 1rem 0;
      padding: 0.6rem 0.8rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.8rem;
    }
    .log-levels legend {
      padding: 0 0.3rem;
      color: var(--muted);
    }
    .console .erro {
      color: #fca5a5;
    }
    .console .sucesso {
      color: #86efac;
    }
    .console .aviso {
      color: #fde68a;
    }
    @media (max-width: 900px) {
      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .status-grid {
        grid-template-columns: 1fr;
      }
      .history form {
        flex-wrap: wrap;
      }
    }
  `,
})
export class ScrapingDashboardPage {
  private readonly api = inject(ScrapingApiService);
  private readonly streams = inject(LogsStreamService);
  private readonly sourceApi = inject(FontesApiService);
  private readonly errors = inject(ApiErrorService);
  private readonly fb = inject(FormBuilder);
  protected readonly summary = signal<ScrapingSummary | null>(null);
  protected readonly statuses = signal<ScrapingExecution[]>([]);
  protected readonly executions = signal<ScrapingExecution[]>([]);
  protected readonly sources = signal<string[]>([]);
  protected readonly page = signal(1);
  protected readonly pages = signal(0);
  protected readonly executing = signal(false);
  protected readonly error = signal('');
  protected readonly selected = signal<ScrapingExecution | null>(null);
  protected readonly logs = signal<ScrapingLog[]>([]);
  protected readonly selectedLevels = signal(
    new Set<ScrapingLog['nivel']>(['info', 'sucesso', 'aviso', 'erro']),
  );
  protected readonly logLevels: { value: ScrapingLog['nivel']; label: string }[] = [
    { value: 'info', label: 'Informação' },
    { value: 'sucesso', label: 'Sucesso' },
    { value: 'aviso', label: 'Aviso' },
    { value: 'erro', label: 'Erro' },
  ];
  protected readonly visibleLogs = computed(() =>
    this.logs().filter((log) => this.selectedLevels().has(log.nivel)),
  );
  protected readonly failedStatuses = computed(() =>
    this.statuses().filter((item) => item.status === 'erro' || !!item.erro),
  );
  protected readonly filters = this.fb.nonNullable.group({
    fonte: '',
    dataInicio: '',
    dataFim: '',
  });
  constructor() {
    const destroy = inject(DestroyRef);
    this.loadStatus();
    this.loadHistory(1);
    this.sourceApi.config().subscribe((c) => this.sources.set(c.fontes.map((f) => f.fonte)));
    this.streams
      .connect()
      .pipe(retry({ delay: 3000 }), takeUntilDestroyed(destroy))
      .subscribe((event) => {
        if (event.type === 'execution') {
          this.statuses.update((items) => [
            event.data,
            ...items.filter((i) => i._id !== event.data._id),
          ]);
          this.executions.update((items) =>
            items.map((i) => (i._id === event.data._id ? event.data : i)),
          );
          if (this.selected()?._id === event.data._id) this.selected.set(event.data);
        }
        if (event.type === 'log' && this.selected()?._id === event.data.execucaoId)
          this.logs.update((items) => [...items, event.data]);
      });
  }
  private loadStatus(): void {
    this.api.status().subscribe({
      next: (r) => {
        this.statuses.set(r.dados);
        this.summary.set(r.resumo);
      },
      error: (e) => this.error.set(this.errors.message(e)),
    });
  }
  protected loadHistory(page: number): void {
    this.page.set(page);
    this.api.executions({ pagina: page, limite: 20, ...this.filters.getRawValue() }).subscribe({
      next: (r) => {
        this.executions.set(r.dados);
        this.pages.set(r.paginacao.totalPaginas);
      },
      error: (e) => this.error.set(this.errors.message(e)),
    });
  }
  protected execute(): void {
    this.executing.set(true);
    this.api.execute().subscribe({
      next: (r) => {
        this.error.set(r.mensagem);
        this.executing.set(false);
        setTimeout(() => this.loadStatus(), 800);
      },
      error: (e) => {
        this.error.set(this.errors.message(e));
        this.executing.set(false);
      },
    });
  }
  protected openLogs(item: ScrapingExecution): void {
    this.selected.set(item);
    this.api.logs(item._id).subscribe({
      next: (logs) => this.logs.set(logs),
      error: (e) => this.error.set(this.errors.message(e)),
    });
  }
  protected toggleLogLevel(level: ScrapingLog['nivel'], event: Event): void {
    const next = new Set(this.selectedLevels());
    if ((event.target as HTMLInputElement).checked) next.add(level);
    else next.delete(level);
    this.selectedLevels.set(next);
  }
  protected closeLogs(): void {
    this.selected.set(null);
    this.logs.set([]);
  }
  protected closeLogsFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeLogs();
  }
}
