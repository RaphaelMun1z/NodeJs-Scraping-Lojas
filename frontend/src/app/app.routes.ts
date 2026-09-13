import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { AdminShellComponent } from './layout/admin-shell/admin-shell';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'produtos' },
  {
    path: 'produtos',
    data: {
      title: 'Produtos',
      description: 'Compare produtos e preços no Comparaê.',
      indexable: true,
    },
    loadComponent: () =>
      import('./features/produtos/pages/produtos-list/produtos-list').then(
        (m) => m.ProdutosListPage,
      ),
  },
  {
    path: 'produtos/:id',
    data: {
      title: 'Detalhes do produto',
      description: 'Confira detalhes, preços e ofertas do produto no Comparaê.',
      indexable: true,
    },
    loadComponent: () =>
      import('./features/produtos/pages/produto-details/produto-details').then(
        (m) => m.ProdutoDetailsPage,
      ),
  },
  {
    path: 'admin/login',
    data: { title: 'Login', indexable: false },
    loadComponent: () =>
      import('./features/autenticacao/pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'admin',
    component: AdminShellComponent,
    canActivate: [authGuard],
    data: { indexable: false },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'fontes' },
      {
        path: 'fontes',
        data: { title: 'Fontes' },
        loadComponent: () =>
          import('./features/fontes/pages/fontes-list/fontes-list').then((m) => m.FontesListPage),
      },
      {
        path: 'fontes/:fonte',
        data: { title: 'Detalhes da fonte' },
        loadComponent: () =>
          import('./features/fontes/pages/fonte-details/fonte-details').then(
            (m) => m.FonteDetailsPage,
          ),
      },
      {
        path: 'scraping',
        data: { title: 'Monitoramento' },
        loadComponent: () =>
          import('./features/scraping/pages/scraping-dashboard/scraping-dashboard').then(
            (m) => m.ScrapingDashboardPage,
          ),
      },
      {
        path: 'busca',
        data: { title: 'Busca manual' },
        loadComponent: () =>
          import('./features/scraping/pages/busca-manual/busca-manual').then(
            (m) => m.BuscaManualPage,
          ),
      },
      {
        path: 'autenticacao',
        data: { title: 'Autenticação' },
        loadComponent: () =>
          import('./features/autenticacao/pages/autenticacao/autenticacao').then(
            (m) => m.AutenticacaoPage,
          ),
      },
      {
        path: 'sistema',
        data: { title: 'Sistema' },
        loadComponent: () =>
          import('./features/configuracoes/pages/sistema/sistema').then((m) => m.SistemaPage),
      },
    ],
  },
  { path: '**', redirectTo: 'produtos' },
];
