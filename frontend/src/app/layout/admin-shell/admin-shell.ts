import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-layout">
      <aside class="admin-sidebar" aria-label="Navegação administrativa">
        <a class="admin-sidebar-back" routerLink="/produtos"
          ><svg lucideIcon="arrow-left" aria-hidden="true"></svg><span>Voltar aos produtos</span></a
        >
        <div class="admin-sidebar-heading"><strong>Administração</strong></div>
        <nav class="admin-sidebar-nav">
          <div class="admin-nav-section" [class.is-expanded]="settingsExpanded()">
            <button
              class="admin-section-button"
              type="button"
              [attr.aria-expanded]="settingsExpanded()"
              aria-controls="admin-settings-submenu"
              (click)="toggleSettings()"
            >
              <svg lucideIcon="settings" aria-hidden="true"></svg><span>Configurações</span
              ><svg class="admin-section-chevron" lucideIcon="chevron-down" aria-hidden="true"></svg>
            </button>
            @if (settingsExpanded()) {
              <div id="admin-settings-submenu" class="admin-nav-submenu">
                <a class="admin-nav-sublink" routerLink="/admin/fontes" routerLinkActive="active"
                  ><svg lucideIcon="store" aria-hidden="true"></svg><span>Fontes</span></a
                >
                <a
                  class="admin-nav-sublink"
                  routerLink="/admin/autenticacao"
                  routerLinkActive="active"
                  ><svg lucideIcon="shield-check" aria-hidden="true"></svg><span>Segurança</span></a
                >
                <a class="admin-nav-sublink" routerLink="/admin/sistema" routerLinkActive="active"
                  ><svg lucideIcon="server-cog" aria-hidden="true"></svg><span>Sistema</span></a
                >
              </div>
            }
          </div>

          <a
            class="admin-nav-link admin-nav-standalone"
            routerLink="/admin/scraping"
            routerLinkActive="active"
          >
            <svg lucideIcon="activity" aria-hidden="true"></svg><span>Auditoria</span>
          </a>

          <div class="admin-nav-section" [class.is-expanded]="consultationExpanded()">
            <button
              class="admin-section-button"
              type="button"
              [attr.aria-expanded]="consultationExpanded()"
              aria-controls="admin-consultation-submenu"
              (click)="toggleConsultation()"
            >
              <svg lucideIcon="search" aria-hidden="true"></svg><span>Consulta</span
              ><svg class="admin-section-chevron" lucideIcon="chevron-down" aria-hidden="true"></svg>
            </button>
            @if (consultationExpanded()) {
              <div id="admin-consultation-submenu" class="admin-nav-submenu">
                <a class="admin-nav-sublink" routerLink="/admin/busca" routerLinkActive="active"
                  ><svg lucideIcon="scan-search" aria-hidden="true"></svg><span>Busca manual</span></a
                >
              </div>
            }
          </div>
        </nav>

        <div class="admin-sidebar-footer">
          <button
            class="admin-sidebar-action admin-sidebar-logout"
            type="button"
            (click)="logout()"
          >
        <svg lucideIcon="log-out" aria-hidden="true"></svg><span>Sair</span>
          </button>
        </div>
      </aside>
      <main><div class="admin-page-container"><router-outlet /></div></main>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    :host .admin-sidebar {
      top: 64px !important;
      height: calc(100vh - 64px) !important;
      min-height: calc(100vh - 64px) !important;
    }
    .admin-sidebar-heading {
      padding: 0 12px 28px;
    }
    .admin-sidebar-heading strong {
      color: #111;
      font-size: 16px;
      line-height: 1.2;
    }
    .admin-sidebar-back {
      display: flex;
      min-height: 28px;
      align-items: center;
      gap: 9px;
      margin: 0 12px 28px;
      padding: 0;
      border: 0;
      background: transparent;
      color: #596273;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      white-space: nowrap;
    }
    .admin-sidebar-back {
      justify-content: flex-start !important;
    }
    .admin-sidebar-back:hover {
      color: var(--blue);
    }
    .admin-sidebar-back .lucide {
      width: 19px;
      height: 19px;
      flex: 0 0 19px;
    }
    .admin-sidebar-nav {
      display: grid;
      gap: 5px;
    }
    .admin-sidebar-nav > .admin-nav-section:first-child {
      order: 3;
    }
    .admin-nav-section {
      display: grid;
      gap: 2px;
    }
    .admin-section-button,
    .admin-nav-link,
    .admin-sidebar-action {
      display: grid;
      grid-template-columns: 17px minmax(0, 1fr) auto;
      min-height: 36px;
      align-items: center;
      gap: 9px;
      width: 100%;
      padding: 0 12px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #596273;
      font-size: 12px;
      font-weight: 400;
      text-align: left;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
    }
    .admin-section-button,
    .admin-nav-link,
    .admin-sidebar-action {
      display: grid !important;
      justify-content: initial !important;
    }
    .admin-section-button:hover,
    .admin-nav-link:hover,
    .admin-nav-link.active {
      background: #edf2ff;
      color: var(--blue);
      font-weight: 600;
    }
    .admin-section-button > .lucide:first-child,
    .admin-nav-link > .lucide,
    .admin-sidebar-action > .lucide {
      width: 17px;
      height: 17px;
    }
    .admin-section-chevron {
      width: 16px;
      height: 16px;
      transition: transform 0.18s ease;
    }
    .admin-nav-section.is-expanded .admin-section-chevron {
      transform: rotate(180deg);
    }
    .admin-nav-submenu {
      display: grid;
      gap: 3px;
      margin: 0 0 4px 21px;
      padding: 4px 0 4px 18px;
      border-left: 1px solid #d5ddeb;
    }
    .admin-nav-sublink {
      display: flex !important;
      justify-content: flex-start !important;
      min-height: 32px;
      align-items: center;
      gap: 9px;
      padding: 0 10px;
      border-radius: 6px;
      color: #697386;
      font-size: 12px;
      text-decoration: none;
    }
    .admin-nav-sublink:hover,
    .admin-nav-sublink.active {
      background: #f0f4ff;
      color: var(--blue);
      font-weight: 600;
    }
    .admin-nav-sublink .lucide {
      width: 16px;
      height: 16px;
    }
    .admin-nav-standalone {
      grid-template-columns: 17px minmax(0, 1fr);
    }
    .admin-sidebar-footer {
      display: grid;
      margin-top: auto;
      padding-top: 18px;
      border-top: 1px solid var(--line);
    }
    .admin-sidebar-action {
      grid-template-columns: 17px minmax(0, 1fr);
      min-height: 36px;
      border-bottom: 1px solid var(--line);
    }
    .admin-sidebar-action:hover {
      color: var(--blue);
      background: #f8faff;
    }
    .admin-sidebar-logout {
      border-bottom: 0;
      color: #c93643;
    }
    .admin-sidebar-logout:hover {
      background: #fff1f2;
      color: #b42331;
    }
    @media (max-width: 800px) {
      :host .admin-sidebar {
        top: auto !important;
        height: auto !important;
        min-height: 0 !important;
      }
      .admin-sidebar-heading {
        padding: 0 4px 12px;
      }
      .admin-sidebar-back {
        margin-bottom: 12px;
      }
      .admin-sidebar-nav {
        display: flex;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .admin-nav-section {
        flex: 0 0 auto;
      }
      .admin-section-button,
      .admin-nav-link {
        width: auto;
        white-space: nowrap;
      }
      .admin-nav-submenu {
        position: absolute;
        z-index: 2;
        margin-top: 50px;
        margin-left: 0;
        padding: 8px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fff;
        box-shadow: var(--shadow);
      }
      .admin-sidebar-footer {
        display: flex;
        margin-top: 12px;
        padding-top: 0;
        border-top: 0;
      }
      .admin-sidebar-action {
        width: auto;
        flex: 0 0 auto;
        border: 0;
      }
    }
  `,
})
export class AdminShellComponent {
  protected readonly settingsExpanded = signal(true);
  protected readonly consultationExpanded = signal(true);
  private readonly auth = inject(AuthApiService);
  private readonly router = inject(Router);

  protected toggleSettings(): void {
    this.settingsExpanded.update((expanded) => !expanded);
  }
  protected toggleConsultation(): void {
    this.consultationExpanded.update((expanded) => !expanded);
  }
  protected logout(): void {
    this.auth.logout().pipe(catchError(() => of(void 0))).subscribe(() => void this.router.navigateByUrl('/produtos'));
  }
}
