import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { AuthApiService } from '../../core/auth/auth-api.service';
@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="admin-layout">
    <aside>
      <div class="admin-sidebar-heading"><strong>Administração</strong></div>
      <nav>
        <a routerLink="/admin/fontes" routerLinkActive="active"
          ><i data-lucide="settings"></i> Configurações</a
        ><a routerLink="/admin/scraping" routerLinkActive="active"
          ><i data-lucide="monitor"></i> Monitoramento</a
        ><a routerLink="/admin/busca" routerLinkActive="active"
          ><i data-lucide="search"></i> Busca manual</a
        ><a routerLink="/admin/autenticacao" routerLinkActive="active"
          ><i data-lucide="shield-check"></i> Autenticação</a
        ><a routerLink="/admin/sistema" routerLinkActive="active"
          ><i data-lucide="settings"></i> Sistema</a
        >
      </nav>
      <a class="admin-sidebar-back" routerLink="/produtos"><i data-lucide="arrow-left"></i> Voltar aos produtos</a>
      <button class="admin-sidebar-logout" type="button" (click)="logout()"><i data-lucide="log-out"></i> Sair</button>
    </aside>
    <main><router-outlet /></main>
  </div>`,
  styles: `
    aside nav a .lucide {
      width: 17px;
      height: 17px;
      flex: 0 0 17px;
    }
    .admin-sidebar-heading { display: grid; gap: 4px; padding: 0 12px 28px; }
    .admin-sidebar-heading strong { color: #111; font-size: 16px; }
    .admin-sidebar-back { display: flex; align-items: center; gap: 9px; margin-top: 28px; padding: 18px 12px 0; border-top: 1px solid var(--line); color: #596273; font-size: 12px; }
    .admin-sidebar-back .lucide, .admin-sidebar-logout .lucide { width: 17px; height: 17px; }
    .admin-sidebar-logout { display: flex; align-items: center; gap: 9px; margin-top: 5px; padding: 10px 12px; border: 0; border-top: 1px solid var(--line); background: transparent; color: #596273; font-size: 12px; text-align: left; }
  `,
})
export class AdminShellComponent {
  private readonly auth = inject(AuthApiService);
  private readonly router = inject(Router);
  protected logout(): void { this.auth.logout().subscribe(() => void this.router.navigateByUrl('/produtos')); }
}
