import { LucideDynamicIcon } from '@lucide/angular';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  TemplateRef,
  ViewChild,
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
  SourceIdentity,
} from '../../../../core/models/domain.models';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { SourceIdentityComponent } from '../../../../shared/components/source-identity/source-identity';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button';
import { FontesApiService } from '../../../fontes/data-access/fontes-api.service';
import { LogsStreamService } from '../../data-access/logs-stream.service';
import { ScrapingApiService } from '../../data-access/scraping-api.service';

@Component({
  selector: 'app-scraping-dashboard',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    DurationPipe,
    PaginationComponent,
    SourceIdentityComponent,
    UiButtonComponent,
    MatDialogModule,
    LucideDynamicIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="admin-header monitor-header">
      <div><h1>Auditoria</h1></div>
      <div class="monitor-header-actions">
        <div class="monitor-next-search">
          <svg lucideIcon="clock-3" aria-hidden="true"></svg>
          <div>
            <small>Próxima busca</small><strong>{{ nextSearchLabel() }}</strong>
          </div>
        </div>
        <app-ui-button
          class="monitor-run-button"
          label="Iniciar busca"
          icon="search"
          type="button"
          [disabled]="executing()"
          [loading]="executing()"
          loadingLabel="Iniciando..."
          (click)="execute()"
        >
          <svg lucideIcon="search" aria-hidden="true"></svg
          ><span class="monitor-run-label">{{ executing() ? 'Iniciando…' : 'Iniciar busca' }}</span>
        </app-ui-button>
      </div>
    </header>
    @if (error()) {
      <div class="feedback error">{{ error() }}</div>
    }
    @if (summary(); as item) {
      <section class="monitor-summary">
        <article class="monitor-stat">
          <svg lucideIcon="clock-3" aria-hidden="true"></svg
          ><span>{{
            item.ultimaAtualizacao ? (item.ultimaAtualizacao | date: 'dd/MM/yyyy HH:mm') : '—'
          }}</span
          ><span>Última atualização</span>
        </article>
        <article class="monitor-stat">
          <svg lucideIcon="check" aria-hidden="true"></svg><strong>{{ item.produtosAtivos }}</strong
          ><span>Produtos listados atualmente</span>
        </article>
        <article class="monitor-stat">
          <svg lucideIcon="package" aria-hidden="true"></svg
          ><strong>{{ item.produtosSalvos }}</strong
          ><span>Produtos salvos</span>
        </article>
        <article class="monitor-stat">
          <svg lucideIcon="timer" aria-hidden="true"></svg
          ><strong>{{ item.duracaoMediaMs | duration }}</strong
          ><span>Tempo médio por rodada</span>
        </article>
      </section>
    }
    <div class="monitor-layout">
      <div class="monitor-main">
        <section class="monitor-panel">
          <div class="monitor-panel-heading"><h2>Histórico recente</h2></div>
          <form class="monitor-history-filters" [formGroup]="filters" (ngSubmit)="loadHistory(1)">
            <fieldset class="monitor-history-sources">
              <legend>Fonte</legend>
              <label><input type="radio" formControlName="fonte" value="" /> Todas</label>
              @for (source of sourceIdentities(); track source.fonte) {
                <label
                  ><input
                    type="radio"
                    formControlName="fonte"
                    [value]="source.fonte" /><app-source-identity
                    [name]="source.nome"
                    [logo]="source.logo ?? ''"
                /></label>
              }
            </fieldset>
            <div class="monitor-history-date-filters">
              <label>De <input type="date" formControlName="dataInicio" /></label>
              <label>Até <input type="date" formControlName="dataFim" /></label>
              <app-ui-button label="Filtrar" icon="filter" type="submit" variant="primary" />
            </div>
          </form>
          <div class="monitor-history-wrap">
            <table class="monitor-history">
              <thead>
                <tr>
                  <th>Início</th>
                  <th>Fonte</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Duração</th>
                  <th>Produtos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (item of executions(); track item._id) {
                  <tr class="history-row" [class]="'status-' + item.status">
                    <td class="history-date">
                      {{ item.iniciadoEm | date: 'dd/MM/yyyy HH:mm:ss' }}
                    </td>
                    <td>
                      <app-source-identity
                        [name]="sourceName(item.fonte)"
                        [logo]="sourceLogo(item.fonte)"
                      />
                    </td>
                    <td>
                      {{ item.categoria || '—' }}
                    </td>
                    <td>
                      <span class="history-status" [class]="statusClass(item)"
                        ><span class="status-icon"
                          ><svg [lucideIcon]="statusIcon(item)" aria-hidden="true"></svg></span
                        >{{ statusLabel(item) }}</span
                      >
                    </td>
                    <td>{{ item.duracaoMs | duration }}</td>
                    <td class="history-products">
                      <strong>{{ item.produtosPersistidos ?? 0 }}</strong>
                    </td>
                    <td>
                      <button
                        class="history-details-button"
                        type="button"
                        (click)="openLogs(item)"
                        aria-label="Ver detalhes da execução"
                      >
                        <svg lucideIcon="list" aria-hidden="true"></svg> Detalhes
                      </button>
                    </td>
                  </tr>
                }
                @if (!executions().length) {
                  <tr>
                    <td class="empty-history" colspan="6">Nenhuma execução registrada.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination [page]="page()" [totalPages]="pages()" (changed)="loadHistory($event)" />
        </section>
      </div>
      <aside class="monitor-aside">
        @if (failedStatuses().length) {
          <section class="monitor-panel monitor-errors-panel">
            <div class="monitor-panel-heading">
              <h2>Fontes com problemas</h2>
              <svg lucideIcon="triangle-alert" aria-label="Atenção necessária"></svg>
            </div>
            <div class="monitor-status-grid">
              @for (item of failedStatuses(); track item._id) {
                <article class="monitor-source-card monitor-source-error">
                  <div class="monitor-card-title">
                    <app-source-identity
                      [name]="sourceName(item.fonte)"
                      [logo]="sourceLogo(item.fonte)"
                    /><span class="monitor-status-badge erro">Erro</span>
                  </div>
                  @if (item.categoria) {
                    <span>Categoria: {{ item.categoria }}</span>
                  }
                  <span>Início: {{ item.iniciadoEm | date: 'HH:mm:ss' }}</span
                  ><span>Resumo: {{ failureMessage(item) }}</span
                  ><span>Produtos encontrados: {{ item.produtosEncontrados ?? 0 }}</span>
                </article>
              }
            </div>
          </section>
        }
        <section class="monitor-panel monitor-status-panel">
          <div class="monitor-panel-heading">
            <h2>Status por fonte</h2>
            <div class="status-navigation">
              <span class="monitor-live">● Ao vivo</span>
              @if (statusPageCount() > 1) {
                <button
                  type="button"
                  class="status-nav-button"
                  aria-label="Status anteriores"
                  [disabled]="statusPage() === 0"
                  (click)="previousStatusPage()"
                >
                  <svg lucideIcon="chevron-left" aria-hidden="true"></svg></button
                ><span class="status-page-indicator"
                  >{{ statusPage() + 1 }}/{{ statusPageCount() }}</span
                ><button
                  type="button"
                  class="status-nav-button"
                  aria-label="Próximos status"
                  [disabled]="statusPage() >= statusPageCount() - 1"
                  (click)="nextStatusPage()"
                >
                  <svg lucideIcon="chevron-right" aria-hidden="true"></svg>
                </button>
              }
            </div>
          </div>
          @if (!statuses().length) {
            <div class="empty-state">Nenhuma fonte em execução.</div>
          } @else {
            <div class="monitor-status-grid">
              @for (item of statusPageItems(); track item._id) {
                <article class="monitor-source-card">
                  <div class="monitor-card-title">
                    <app-source-identity
                      [name]="sourceName(item.fonte)"
                      [logo]="sourceLogo(item.fonte)"
                    /><span
                      class="monitor-status-badge"
                      [class]="item.status"
                      >{{ statusLabel(item) }}</span
                    >
                  </div>
                  @if (item.categoria) {
                    <span>Categoria: {{ item.categoria }}</span>
                  }
                  <span>Início: {{ item.iniciadoEm | date: 'HH:mm:ss' }}</span
                  ><span>Produtos encontrados: {{ item.produtosEncontrados ?? 0 }}</span
                  ><span>Última mensagem: {{ item.ultimaMensagem || 'Aguardando...' }}</span
                  ><button class="history-details-button" type="button" (click)="openLogs(item)">
                    <svg lucideIcon="list" aria-hidden="true"></svg> Detalhes
                  </button>
                </article>
              }
            </div>
          }
        </section>
      </aside>
    </div>
    <ng-template #logsDialog>
      @if (selected(); as item) {
        <div class="monitor-modal-content">
          <div class="monitor-panel-heading">
            <h2 id="monitor-logs-title">Console de logs</h2>
            <button
              class="icon-button"
              type="button"
              aria-label="Fechar console"
              (click)="closeLogs()"
            >
              <svg lucideIcon="x" aria-hidden="true"></svg>
            </button>
          </div>
          <div class="monitor-execution-progress">
            <div class="progress-item">
              <div class="progress-label progress-label-general">
                <span
                  ><small>SEU PROGRESSO</small
                  ><strong>{{ item.progresso?.geral ?? 0 }}% <em>concluído</em></strong></span
                ><span class="progress-remaining">{{ progressLabel(item) }}</span>
              </div>
              <div class="progress-track">
                <span
                  [class.is-complete]="(item.progresso?.geral ?? 0) >= 100"
                  [style.width.%]="item.progresso?.geral ?? 0"
                ></span>
              </div>
              <span class="progress-stage">Acompanhando o processo de busca de produtos</span>
            </div>
            <div class="progress-stages">
              <span
                >Coleta <strong>{{ item.progresso?.coleta ?? 0 }}%</strong></span
              ><span
                >Embeddings <strong>{{ item.progresso?.embeddings ?? 0 }}%</strong></span
              ><span
                >Indexação <strong>{{ item.progresso?.indexacao ?? 0 }}%</strong></span
              >
            </div>
          </div>
          <fieldset class="monitor-log-levels">
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
          <div class="monitor-logs">
            @for (log of visibleLogs(); track log._id) {
              <div class="monitor-log" [class]="log.nivel">
                <time>{{ log.criadoEm | date: 'HH:mm:ss' }}</time
                ><app-source-identity
                  [name]="sourceName(log.fonte)"
                  [logo]="sourceLogo(log.fonte)"
                /><span>{{ log.mensagem }}</span>
              </div>
            }
            @if (!visibleLogs().length) {
              <div class="empty-state">Nenhuma mensagem registrada para esta execução.</div>
            }
          </div>
        </div>
      }
    </ng-template>
  `,
  styles: `
    .admin-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      max-width: var(--admin-container-width);
      margin: 0 auto 24px;
    }
    .admin-header h1 {
      margin: 0;
      color: #151515;
      font-size: 22px;
      letter-spacing: -0.5px;
    }
    .monitor-next-search {
      display: flex;
      align-items: center;
      gap: 9px;
      color: #727272;
    }
    .monitor-next-search > i {
      width: 27px;
      height: 27px;
      color: #2456df;
    }
    .monitor-next-search > div {
      display: grid;
      gap: 2px;
    }
    .monitor-next-search small {
      font-size: 11px;
    }
    .monitor-next-search strong {
      color: #2456df;
      font:
        15px Consolas,
        'Courier New',
        monospace;
    }
    .monitor-header-actions {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: flex-end;
      gap: 18px;
    }
    .monitor-summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      max-width: var(--admin-container-width);
      margin: 0 auto 18px;
    }
    .monitor-stat {
      position: relative;
      display: grid;
      gap: 5px;
      padding: 17px;
      border: 1px solid #e5e5e5;
      border-radius: 10px;
      background: #fff;
    }
    .monitor-stat > i {
      position: absolute;
      top: 15px;
      right: 16px;
      width: 19px;
      height: 19px;
      color: #2456df;
    }
    .monitor-stat strong {
      color: #111;
      font-size: 22px;
    }
    .monitor-stat > span {
      color: #727272;
      font-size: 12px;
    }
    .monitor-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: start;
      gap: 18px;
      max-width: var(--admin-container-width);
      margin: 0 auto;
    }
    .monitor-panel {
      margin: 0 0 18px;
      padding: 22px;
      border: 1px solid #e5e5e5;
      border-radius: 10px;
      background: #fff;
    }
    .monitor-panel-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 16px;
    }
    .monitor-panel-heading h2 {
      margin: 0;
      color: #151515;
      font-size: 17px;
    }
    .monitor-live {
      color: #18743c;
      font-size: 12px;
      font-weight: 700;
    }
    .monitor-status-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .status-navigation {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-nav-button {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 1px solid #d7ddea;
      border-radius: 7px;
      background: #fff;
      color: #52627f;
      cursor: pointer;
    }
    .status-nav-button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
    .status-nav-button svg {
      width: 16px;
      height: 16px;
    }
    .source-filter-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .monitor-source-card {
      display: grid;
      gap: 8px;
      padding: 15px;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
    }
    .monitor-card-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .monitor-source-card > span {
      color: #727272;
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .monitor-source-error {
      border-color: #efb2ad;
    }
    .monitor-errors-panel {
      border-color: #efb2ad;
      background: #fffafa;
    }
    .monitor-errors-panel .monitor-panel-heading > i {
      width: 20px;
      height: 20px;
      color: #a33;
    }
    .monitor-status-badge {
      display: inline-flex;
      width: fit-content;
      padding: 4px 7px;
      border-radius: 4px;
      background: #edf0f5;
      color: #596273;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .monitor-status-badge.executando {
      background: #fff4d8;
      color: #996b00;
    }
    .monitor-status-badge.concluido {
      background: #e8f6ed;
      color: #18743c;
    }
    .monitor-status-badge.erro {
      background: #fde9e7;
      color: #a33;
    }
    .monitor-category {
      display: block;
      margin-top: 4px;
      color: #727272;
      font-size: 10px;
    }
    .monitor-history-filters {
      display: grid;
      gap: 12px;
      align-items: start;
      margin-bottom: 14px;
    }
    .monitor-history-filters label {
      display: grid;
      gap: 5px;
      color: #727272;
      font-size: 11px;
    }
    .monitor-history-sources label {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin: 0 14px 8px 0;
      color: #505866;
      cursor: pointer;
    }
    .monitor-history-sources input[type='radio'] {
      width: 15px;
      height: 15px;
      margin: 0;
      accent-color: #2456df;
    }
    .monitor-history-sources app-source-identity {
      display: inline-flex;
      align-items: center;
    }
    .monitor-history-filters input:not([type='radio']),
    .monitor-history-filters select {
      height: 34px;
      padding: 0 9px;
      border: 1px solid #d6d6d6;
      border-radius: 6px;
      background: #fff;
      color: #444;
    }
    .monitor-history-filters select {
      min-width: 130px;
    }
    .monitor-history-wrap {
      overflow-x: auto;
    }
    .monitor-history {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .monitor-history th,
    .monitor-history td {
      padding: 11px 8px;
      border-bottom: 1px solid #e5e5e5;
      text-align: left;
      white-space: nowrap;
      vertical-align: middle;
    }
    .monitor-history th {
      color: #727272;
      font-weight: 600;
    }
    .monitor-history tbody tr:hover {
      background: #f7f9fd;
    }
    .history-row.status-erro {
      border-left: 4px solid #d94b43;
      background: #ffe5e2;
    }
    .history-row.status-concluido {
      border-left: 4px solid #58ad76;
      background: #f1fbf3;
    }
    .history-row.status-executando {
      border-left: 4px solid #d49b16;
      background: #fff4d0;
    }
    .history-date {
      color: #505866;
    }
    .history-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
    }
    .status-success {
      color: #126b35;
    }
    .status-error {
      color: #a32d26;
    }
    .status-running {
      color: #8a5d00;
    }
    .status-icon {
      display: inline-grid;
      width: 22px;
      height: 22px;
      place-items: center;
      border-radius: 50%;
      background: #d5f2dc;
    }
    .status-error .status-icon {
      background: #f5b9b4;
    }
    .status-running .status-icon {
      background: #f8dc83;
    }
    .history-details-button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 9px;
      border: 1px solid #d8deeb;
      border-radius: 6px;
      background: #fff;
      color: #2456df;
      font-size: 11px;
    }
    .history-details-button:hover {
      border-color: #2456df;
    }
    .empty-history {
      padding: 28px !important;
      color: #727272;
      text-align: center !important;
    }
    .monitor-modal-content {
      width: 100%;
      padding: 22px;
      border: 1px solid #e5e5e5;
      border-radius: 10px;
      background: #fff;
    }
    .icon-button {
      border: 0;
      background: transparent;
      color: #333;
      cursor: pointer;
    }
    .monitor-execution-progress {
      display: grid;
      gap: 12px;
      margin-bottom: 16px;
      padding: 14px;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      background: #fafbfc;
    }
    .progress-item {
      display: grid;
      gap: 8px;
    }
    .progress-label-general {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 8px;
      min-height: 51px;
      color: #727272;
      font-size: 11px;
    }
    .progress-label-general > span:first-child {
      display: grid;
      gap: 7px;
    }
    .progress-label-general small {
      color: #7d8490;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.11em;
    }
    .progress-label-general strong {
      color: #151922;
      font-size: 27px;
      line-height: 1;
    }
    .progress-label-general em {
      color: #20242c;
      font-size: 18px;
      font-style: normal;
      font-weight: 600;
    }
    .progress-remaining,
    .progress-stage {
      color: #737b88;
      font-size: 11px;
    }
    .progress-track {
      height: 9px;
      overflow: hidden;
      border: 1px solid #e7edf5;
      border-radius: 99px;
      background: #eef3f9;
    }
    .progress-track span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #416bc1, #d96be4);
    }
    .progress-track span.is-complete {
      background: linear-gradient(90deg, #2b9a61, #55c77f);
    }
    .progress-stages {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      color: #727272;
      font-size: 11px;
    }
    .progress-stages strong {
      color: #333;
    }
    .monitor-log-levels {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 9px;
      margin: 0 0 14px;
      padding: 0;
      border: 0;
    }
    .monitor-log-levels legend {
      margin-right: 2px;
      color: #727272;
      font-size: 11px;
    }
    .monitor-log-levels label {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #4d4d4d;
      font-size: 11px;
    }
    .monitor-log-levels input {
      accent-color: #2456df;
    }
    .monitor-logs {
      display: grid;
      max-height: 330px;
      overflow-y: auto;
      padding: 10px;
      border: 1px solid #202632;
      border-radius: 7px;
      background: #151922;
      font:
        12px Consolas,
        monospace;
    }
    .monitor-log {
      display: grid;
      grid-template-columns: 78px 105px 1fr;
      gap: 10px;
      padding: 6px 4px;
      color: #d9deea;
    }
    .monitor-log time {
      color: #8993a8;
    }
    .monitor-log strong {
      color: #9db7ff;
    }
    .monitor-log.sucesso strong {
      color: #75d49a;
    }
    .monitor-log.aviso strong {
      color: #f1c86b;
    }
    .monitor-log.erro strong {
      color: #ff8f8f;
    }
    .monitor-logs .empty-state {
      color: #8993a8;
    }
    @media (max-width: 800px) {
      .admin-header {
        flex-direction: column;
        gap: 12px;
      }
      .monitor-header-actions {
        flex: none;
        width: 100%;
        justify-content: space-between;
      }
      .monitor-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .monitor-layout {
        grid-template-columns: 1fr;
      }
      .monitor-panel {
        padding: 17px;
      }
      .monitor-status-grid {
        grid-template-columns: 1fr;
      }
      .monitor-history-filters {
        align-items: stretch;
        flex-direction: column;
      }
      .monitor-history-filters label,
      .monitor-history-filters input:not([type='radio']),
      .monitor-history-filters select,
      .monitor-history-filters button {
        width: 100%;
      }
      .monitor-history-filters .monitor-history-sources label {
        display: inline-flex;
        width: auto;
      }
      .monitor-log {
        grid-template-columns: 62px 85px 1fr;
        gap: 6px;
        font-size: 11px;
      }
    }
    @media (max-width: 480px) {
      .monitor-summary {
        grid-template-columns: 1fr;
      }
      .monitor-modal-content {
        padding: 17px;
      }
      .progress-label-general {
        align-items: flex-start;
        flex-direction: column;
        gap: 10px;
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
  private readonly dialogs = inject(DialogService);
  @ViewChild('logsDialog', { static: true }) private readonly logsDialog!: TemplateRef<unknown>;
  private logsDialogRef?: MatDialogRef<unknown>;
  protected readonly summary = signal<ScrapingSummary | null>(null);
  protected readonly statuses = signal<ScrapingExecution[]>([]);
  protected readonly executions = signal<ScrapingExecution[]>([]);
  protected readonly sources = signal<string[]>([]);
  protected readonly sourceIdentities = signal<SourceIdentity[]>([]);
  protected readonly statusPage = signal(0);
  protected readonly page = signal(1);
  protected readonly pages = signal(0);
  protected readonly error = signal('');
  protected readonly selected = signal<ScrapingExecution | null>(null);
  protected readonly logs = signal<ScrapingLog[]>([]);
  protected readonly now = signal(Date.now());
  protected readonly executing = signal(false);
  protected readonly selectedLevels = signal(
    new Set<ScrapingLog['nivel']>(['info', 'sucesso', 'aviso', 'erro']),
  );
  protected readonly logLevels = [
    { value: 'info', label: 'Informação' },
    { value: 'sucesso', label: 'Sucesso' },
    { value: 'aviso', label: 'Aviso' },
    { value: 'erro', label: 'Erro' },
  ] as const;
  protected readonly visibleLogs = computed(() =>
    this.logs().filter((log) => this.selectedLevels().has(log.nivel)),
  );
  protected readonly failedStatuses = computed(() =>
    this.statuses().filter((item) => item.status === 'erro' || !!item.erro),
  );
  protected readonly statusPageItems = computed(() =>
    this.statuses().slice(this.statusPage() * 3, this.statusPage() * 3 + 3),
  );
  protected readonly statusPageCount = computed(() =>
    Math.max(1, Math.ceil(this.statuses().length / 3)),
  );
  protected readonly filters = this.fb.nonNullable.group({
    fonte: '',
    dataInicio: '',
    dataFim: '',
  });
  protected readonly nextSearchLabel = computed(() => {
    const value = this.summary()?.proximaBusca;
    if (!value) return '—';
    const remaining = new Date(value).getTime() - this.now();
    if (remaining <= 0) return 'agora';
    const seconds = Math.floor(remaining / 1000),
      minutes = Math.floor(seconds / 60),
      hours = Math.floor(minutes / 60);
    return hours
      ? `em ${hours}h ${minutes % 60}min`
      : minutes
        ? `em ${minutes}min`
        : `em ${Math.max(1, seconds)}s`;
  });
  constructor() {
    const destroy = inject(DestroyRef);
    const clock = window.setInterval(() => this.now.set(Date.now()), 1000);
    destroy.onDestroy(() => window.clearInterval(clock));
    const refresh = window.setInterval(() => {
      this.loadStatus();
      this.loadHistory(this.page());
    }, 10_000);
    destroy.onDestroy(() => window.clearInterval(refresh));
    this.loadStatus();
    this.loadHistory(1);
    this.sourceApi.config().subscribe((config) => {
      this.sources.set(config.fontes.map((source) => source.fonte));
      this.sourceIdentities.set(config.fontes);
    });
    this.streams
      .connect()
      .pipe(retry({ delay: 3000 }), takeUntilDestroyed(destroy))
      .subscribe((event) => {
        if (event.type === 'execution') {
          const executionAlreadyListed = this.executions().some(
            (item) => item._id === event.data._id,
          );
          this.statuses.update((items) => [
            event.data,
            ...items.filter((item) => item._id !== event.data._id),
          ]);
          this.executions.update((items) =>
            items.map((item) => (item._id === event.data._id ? event.data : item)),
          );
          if (this.selected()?._id === event.data._id) this.selected.set(event.data);
          if (!executionAlreadyListed) this.loadHistory(this.page());
          if (event.data.status === 'concluido' || event.data.status === 'erro')
            this.loadStatus();
        }
        if (event.type === 'log' && this.selected()?._id === event.data.execucaoId)
          this.logs.update((items) => [...items, event.data]);
      });
  }
  private loadStatus(): void {
    this.api.status().subscribe({
      next: (result) => {
        this.statuses.set(result.dados);
        this.statusPage.set(0);
        this.summary.set(result.resumo);
      },
      error: (error) => this.error.set(this.errors.message(error)),
    });
  }
  protected loadHistory(page: number): void {
    this.page.set(page);
    // A API agrupa as execuções pelo rodadaId. Uma página representa uma
    // rodada completa, portanto todas as fontes executadas naquela rodada
    // permanecem juntas na tabela.
    this.api.executions({ pagina: page, limite: 1, ...this.filters.getRawValue() }).subscribe({
      next: (result) => {
        this.executions.set(result.dados);
        this.pages.set(result.paginacao.totalPaginas);
      },
      error: (error) => this.error.set(this.errors.message(error)),
    });
  }
  protected sourceName(source: string): string {
    return this.findSourceIdentity(source)?.nome ?? source;
  }
  protected sourceLogo(source: string): string {
    return this.findSourceIdentity(source)?.logo ?? '';
  }
  private findSourceIdentity(source: string): SourceIdentity | undefined {
    const chave = source.trim().toLocaleLowerCase();
    return this.sourceIdentities().find((item) =>
      item.fonte.trim().toLocaleLowerCase() === chave ||
      item.nome.trim().toLocaleLowerCase() === chave,
    );
  }
  protected previousStatusPage(): void {
    this.statusPage.update((page) => Math.max(0, page - 1));
  }
  protected nextStatusPage(): void {
    this.statusPage.update((page) => Math.min(this.statusPageCount() - 1, page + 1));
  }
  protected execute(): void {
    if (this.executing()) return;
    this.executing.set(true);
    this.api.execute().subscribe({
      next: (result) => {
        this.error.set(result.mensagem);
        this.executing.set(false);
        setTimeout(() => this.loadStatus(), 800);
      },
      error: (error) => {
        this.error.set(this.errors.message(error));
        this.executing.set(false);
      },
    });
  }
  protected openLogs(item: ScrapingExecution): void {
    this.selected.set(item);
    this.logsDialogRef = this.dialogs.open(this.logsDialog, {
      width: 'min(900px, calc(100vw - 32px))',
      ariaLabel: 'Console de logs',
    });
    this.api.logs(item._id).subscribe({
      next: (logs) => this.logs.set(logs),
      error: (error) => this.error.set(this.errors.message(error)),
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
    this.logsDialogRef?.close();
  }
  protected statusLabel(item: ScrapingExecution): string {
    return item.status === 'executando'
      ? 'Executando'
      : item.status === 'erro' || item.erro
        ? 'Erro'
        : 'Concluído';
  }
  protected statusClass(item: ScrapingExecution): string {
    return item.status === 'executando'
      ? 'status-running'
      : item.status === 'erro' || item.erro
        ? 'status-error'
        : 'status-success';
  }
  protected statusIcon(item: ScrapingExecution): string {
    return item.status === 'executando'
      ? 'clock-3'
      : item.status === 'erro' || item.erro
        ? 'x'
        : 'check';
  }
  protected failureMessage(item: ScrapingExecution): string {
    const detalhe = `${item.erro ?? ''} ${item.ultimaMensagem ?? ''}`.toLocaleLowerCase();
    const produtos = item.produtosEncontrados ?? 0;
    const motivo = item.erro?.trim();

    if (/elasticsearch|indexa|matching/.test(detalhe)) {
      return produtos > 0
        ? `A coleta encontrou ${produtos} produto(s), mas a indexação não foi concluída. Os detalhes estão nos logs.`
        : 'Não foi possível concluir o processamento dos produtos. Consulte os logs para mais detalhes.';
    }
    if (/timeout|timed[ _-]?out|err_connection|tempo limite|navigation/.test(detalhe)) {
      return 'A loja demorou para responder. Tente novamente ou revise a URL da fonte.';
    }
    if (/bloqueio|verifica|cloudflare|security verification|human/.test(detalhe)) {
      return 'A loja solicitou uma verificação e a coleta não pôde ser concluída.';
    }
    if (produtos > 0) {
      return motivo
        ? `A coleta encontrou ${produtos} produto(s), mas houve uma falha ao finalizar o processamento. Motivo registrado: ${motivo}`
        : `A coleta encontrou ${produtos} produto(s), mas houve uma falha ao finalizar o processamento.`;
    }
    return motivo
      ? `A coleta não foi concluída. Motivo registrado: ${motivo}`
      : 'Não foi possível concluir a coleta desta fonte. Consulte os detalhes nos logs.';
  }
  protected progressLabel(item: ScrapingExecution): string {
    const progress = item.progresso?.geral ?? 0;
    return progress >= 100 ? 'Concluída' : progress > 0 ? 'Em andamento' : 'Calculando…';
  }
}
