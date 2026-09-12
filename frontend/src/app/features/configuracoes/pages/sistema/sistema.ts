import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { SistemaApiService } from '../../data-access/sistema-api.service';
import { ScrapingApiService } from '../../../scraping/data-access/scraping-api.service';

@Component({
  selector: 'app-sistema',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-heading">
      <span class="eyebrow">Manutenção</span>
      <h1>Sistema</h1>
      <p>Operações administrativas com impacto sobre os dados coletados.</p>
    </header>
    @if (feedback()) {
      <div class="feedback" [class.error]="failed()">{{ feedback() }}</div>
    }
    <div class="settings">
      <section class="panel setting">
        <div>
          <h2>Limpar produtos</h2>
          <p>
            Remove os produtos, histórico e índice de busca. As fontes e credenciais são mantidas.
          </p>
        </div>
        <button class="btn danger" [disabled]="busy()" (click)="clearProducts()">
          Limpar produtos
        </button>
      </section>
      <section class="panel setting">
        <div>
          <h2>Busca manual</h2>
          <p>Inicie uma coleta agora sem aguardar o próximo horário agendado.</p>
        </div>
        <button class="btn primary" [disabled]="busy()" (click)="runScraping()">
          Iniciar busca
        </button>
      </section>
      <section class="panel setting critical">
        <div>
          <span class="eyebrow">Zona crítica</span>
          <h2>Reset total</h2>
          <p>
            Remove dados operacionais e configurações. Exige a senha do administrador e confirmação
            explícita.
          </p>
        </div>
        <button class="btn danger" [disabled]="busy()" (click)="resetAll()">Resetar sistema</button>
      </section>
    </div>
  `,
  styles: `
    .page-heading {
      margin-bottom: 1.5rem;
    }
    .page-heading h1 {
      margin: 0.2rem 0;
    }
    .page-heading p,
    .setting p {
      color: var(--muted);
    }
    .settings {
      display: grid;
      gap: 1rem;
    }
    .setting {
      padding: 1.3rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
    }
    .setting h2 {
      margin: 0.25rem 0;
    }
    .critical {
      border-color: #fecaca;
      background: #fffafa;
    }
    @media (max-width: 700px) {
      .setting {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
})
export class SistemaPage {
  private readonly api = inject(SistemaApiService);
  private readonly errors = inject(ApiErrorService);
  private readonly scraping = inject(ScrapingApiService);
  protected readonly busy = signal(false);
  protected readonly feedback = signal('');
  protected readonly failed = signal(false);
  protected runScraping(): void {
    this.busy.set(true);
    this.scraping.execute().subscribe({
      next: (result) => this.show(result.mensagem || 'Busca iniciada.'),
      error: (error: unknown) => this.show(this.errors.message(error), true),
    });
  }
  protected clearProducts(): void {
    if (!confirm('Esta ação removerá todos os produtos e históricos. Deseja continuar?')) return;
    const confirmation = prompt('Digite reset para confirmar:');
    if (confirmation !== 'reset') {
      this.show('Confirmação inválida.', true);
      return;
    }
    this.busy.set(true);
    this.api.cleanProducts().subscribe({
      next: () => this.show('Produtos removidos com sucesso.'),
      error: (error: unknown) => this.show(this.errors.message(error), true),
    });
  }
  protected resetAll(): void {
    if (!confirm('O reset total removerá os dados do sistema. Deseja continuar?')) return;
    const password = prompt('Informe sua senha de administrador:');
    if (!password) return;
    this.busy.set(true);
    this.api.validatePassword(password).subscribe({
      next: () => {
        const confirmation = prompt('Digite RESETAR SISTEMA para confirmar:');
        if (confirmation !== 'RESETAR SISTEMA') {
          this.show('Confirmação inválida.', true);
          return;
        }
        this.api.reset(password).subscribe({
          next: () => this.show('Sistema resetado com sucesso.'),
          error: (error: unknown) => this.show(this.errors.message(error), true),
        });
      },
      error: (error: unknown) => this.show(this.errors.message(error, 'Senha inválida.'), true),
    });
  }
  private show(message: string, failed = false): void {
    this.feedback.set(message);
    this.failed.set(failed);
    this.busy.set(false);
  }
}
