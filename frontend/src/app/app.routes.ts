import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { AdminShellComponent } from './layout/admin-shell/admin-shell';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'produtos' },
  {
    path: 'produtos',
    loadComponent: () =>
      import('./features/produtos/pages/produtos-list/produtos-list').then(
        (m) => m.ProdutosListPage,
      ),
  },
  {
    path: 'produtos/:id',
    loadComponent: () =>
      import('./features/produtos/pages/produto-details/produto-details').then(
        (m) => m.ProdutoDetailsPage,
      ),
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/autenticacao/pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'admin',
    component: AdminShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'fontes' },
      {
        path: 'fontes',
        loadComponent: () =>
          import('./features/fontes/pages/fontes-list/fontes-list').then((m) => m.FontesListPage),
      },
      {
        path: 'fontes/:fonte',
        loadComponent: () =>
          import('./features/fontes/pages/fonte-details/fonte-details').then(
            (m) => m.FonteDetailsPage,
          ),
      },
      {
        path: 'scraping',
        loadComponent: () =>
          import('./features/scraping/pages/scraping-dashboard/scraping-dashboard').then(
            (m) => m.ScrapingDashboardPage,
          ),
      },
      {
        path: 'busca',
        loadComponent: () =>
          import('./features/scraping/pages/busca-manual/busca-manual').then(
            (m) => m.BuscaManualPage,
          ),
      },
      {
        path: 'autenticacao',
        loadComponent: () =>
          import('./features/autenticacao/pages/autenticacao/autenticacao').then(
            (m) => m.AutenticacaoPage,
          ),
      },
      {
        path: 'sistema',
        loadComponent: () =>
          import('./features/configuracoes/pages/sistema/sistema').then((m) => m.SistemaPage),
      },
    ],
  },
  { path: '**', redirectTo: 'produtos' },
];
