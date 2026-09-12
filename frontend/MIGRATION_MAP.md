# Mapa de migração do frontend para Angular

Este documento registra o inventário funcional do frontend legado e o destino de cada responsabilidade na aplicação Angular. Ele deve ser atualizado durante a migração e usado como checklist antes da desativação de `interface-produtos`.

## Inventário atual

| Área                | Funcionalidades existentes                                                                                | Estado principal                                  | Integrações                          |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------ |
| Layout público      | Marca, busca global, sugestões, menu da conta, navegação para administração                               | sessão, termo de busca, sugestões                 | sessão, sugestões                    |
| Catálogo            | novidades, grade, skeleton, paginação, ordenação, filtros por categoria/fonte/preço/status e chips ativos | consulta, página, itens, total, carregamento      | itens, novidades, categorias, fontes |
| Produto             | detalhes, ofertas agrupadas, preço atual/anterior, histórico, faixa de preços e gráfico por período       | produto, ofertas, histórico, período              | histórico do produto                 |
| Autenticação        | login em duas etapas, verificação de necessidade de MFA, sessão e logout                                  | administrador, MFA necessário, carregamento, erro | autenticação                         |
| MFA                 | geração de QR Code e ativação com código TOTP                                                             | configuração pendente, código, feedback           | autenticação/MFA                     |
| Fontes              | lista, inclusão com logo, ativação, desativação e exclusão                                                | configuração, nova fonte, feedback                | configuração de scraping             |
| Categorias da fonte | inclusão e remoção dinâmica, URL por categoria, ativação e seletores independentes                        | formulário tipado com lista dinâmica              | configuração de scraping             |
| Seletores           | campos CSS, página virtualizada, carregar mais, teste, quantidade, cards de amostra e captura da página   | formulário, execução, resultado, erro             | teste de seletores                   |
| Análise de HTML     | editor de HTML, formatação, análise por IA, confiança e aplicação dos seletores sugeridos                 | HTML, análise, carregamento, erro                 | análise de HTML                      |
| Busca manual        | seleção de fontes, execução, filtro textual, filtro multilojas, tabela, CSV e impressão/PDF               | fontes, resultados, erros, filtros                | busca manual                         |
| Monitoramento       | resumo, próxima coleta, status por fonte/categoria, erros, histórico paginado e filtros                   | status, resumo, execuções, filtros                | status e execuções                   |
| Logs                | modal, níveis, progresso, scroll, carregamento inicial e atualização em tempo real                        | execução aberta, logs, níveis                     | logs e SSE                           |
| Sistema             | iniciar coleta, limpar produtos, reset total, confirmação e validação de senha/MFA                        | diálogo, confirmação, feedback                    | scraping e configuração              |
| Onboarding          | bloqueio das áreas dependentes de fonte e cadastro da primeira fonte                                      | quantidade de fontes                              | configuração de scraping             |

## Rotas Angular

| Rota                   | Página Angular          | Origem legada                 |
| ---------------------- | ----------------------- | ----------------------------- |
| `/produtos`            | `ProdutosListPage`      | catálogo em `#`               |
| `/produtos/:id`        | `ProdutoDetailsPage`    | `#produto/:id`                |
| `/admin/login`         | `LoginPage`             | login administrativo dinâmico |
| `/admin/fontes`        | `FontesListPage`        | `#admin`                      |
| `/admin/fontes/:fonte` | `FonteDetailsPage`      | `#admin/fontes/:fonte`        |
| `/admin/scraping`      | `ScrapingDashboardPage` | `#admin/scraping`             |
| `/admin/busca`         | `BuscaManualPage`       | `#admin/busca`                |
| `/admin/autenticacao`  | `AutenticacaoPage`      | `#admin/autenticacao`         |
| `/admin/sistema`       | `SistemaPage`           | `#admin/sistema`              |

`/` redirecionará para `/produtos`. As rotas administrativas serão protegidas pelo `authGuard`; as rotas que exigem fontes também validarão a configuração carregada.

## Arquitetura de destino

```text
src/app/
├── core/
│   ├── api/                 # cliente e DTOs compartilhados da API
│   ├── auth/                # estado da sessão, guard e API de autenticação
│   ├── config/              # tokens e configuração de ambiente
│   ├── interceptors/        # CSRF e tratamento uniforme de erros
│   ├── models/              # envelopes e erros da API
│   └── services/            # diálogo e notificações globais
├── layout/
│   ├── header/              # marca, busca e conta
│   ├── sidebar/             # navegação administrativa
│   └── shell/               # shells público e administrativo
├── shared/
│   ├── components/          # identidade da fonte, estados, paginação e diálogo
│   ├── pipes/               # moeda, duração e data/hora
│   ├── utils/               # CSV, normalização e agrupamento de histórico
│   └── validators/          # URL, seletores e arquivos de logo
└── features/
    ├── produtos/            # catálogo, novidades, filtros, cards e detalhes
    ├── fontes/              # lista, cadastro, categorias e seletores
    ├── scraping/            # dashboard, histórico, logs SSE e busca manual
    ├── configuracoes/       # sistema, limpeza e reset
    └── autenticacao/        # login e MFA
```

## Serviços especializados

| Serviço                 | Responsabilidade                                                |
| ----------------------- | --------------------------------------------------------------- |
| `ProdutosApiService`    | catálogo, sugestões, categorias, novidades e detalhes/histórico |
| `FontesApiService`      | fontes públicas e configuração administrativa                   |
| `SeletoresApiService`   | teste de seletores e análise de HTML                            |
| `ScrapingApiService`    | execução manual, status, histórico e logs                       |
| `LogsStreamService`     | conexão SSE, reconexão, tipagem de eventos e encerramento       |
| `BuscaManualApiService` | execução da busca manual                                        |
| `AuthApiService`        | login, verificação MFA, sessão, logout e configuração TOTP      |
| `SistemaApiService`     | limpeza de produtos e reset total                               |
| `CatalogoStore`         | estado com signals da consulta e dos resultados do catálogo     |
| `FontesStore`           | cache tipado da configuração e identidades das lojas            |

## Contratos HTTP existentes

Todos os endpoints permanecem relativos a `/api`; cookies de sessão continuam sendo enviados na mesma origem.

| Método    | Endpoint                                                      | Uso                                         |
| --------- | ------------------------------------------------------------- | ------------------------------------------- |
| `GET`     | `/api/fontes`                                                 | identidades públicas das fontes             |
| `GET`     | `/api/itens`                                                  | catálogo paginado e filtrado                |
| `GET`     | `/api/itens/sugestoes?q=`                                     | autocomplete                                |
| `GET`     | `/api/itens/categorias`                                       | categorias disponíveis                      |
| `GET`     | `/api/itens/novidades?limite=`                                | novidades                                   |
| `GET`     | `/api/itens/:id/historico`                                    | produto, histórico e ofertas agrupadas      |
| `POST`    | `/api/autenticacao/login/verificar-mfa`                       | etapa inicial do login                      |
| `POST`    | `/api/autenticacao/login`                                     | login e cookies de sessão/CSRF              |
| `GET`     | `/api/autenticacao/sessao`                                    | administrador autenticado                   |
| `POST`    | `/api/autenticacao/logout`                                    | encerra a sessão                            |
| `POST`    | `/api/autenticacao/mfa/iniciar`                               | segredo e QR Code                           |
| `POST`    | `/api/autenticacao/mfa/ativar`                                | ativa TOTP                                  |
| `GET/PUT` | `/api/admin/configuracoes/scraping`                           | lê e grava fontes/categorias/seletores      |
| `POST`    | `/api/admin/configuracoes/scraping/fontes`                    | cria fonte                                  |
| `DELETE`  | `/api/admin/configuracoes/scraping/fontes/:fonte`             | remove fonte                                |
| `POST`    | `/api/admin/configuracoes/scraping/testar-seletores`          | testa URL e seletores                       |
| `POST`    | `/api/admin/configuracoes/scraping/analisar-html`             | sugere seletores a partir de HTML           |
| `POST`    | `/api/admin/configuracoes/scraping/limpar-produtos`           | limpa catálogo e índices                    |
| `POST`    | `/api/admin/configuracoes/scraping/reset-total/validar-senha` | valida credenciais do reset                 |
| `POST`    | `/api/admin/configuracoes/scraping/reset-total`               | reseta dados operacionais                   |
| `POST`    | `/api/admin/busca-manual`                                     | coleta sem persistência                     |
| `GET`     | `/api/admin/scraping/status`                                  | status e resumo operacional                 |
| `POST`    | `/api/admin/scraping/executar`                                | inicia coleta                               |
| `GET`     | `/api/admin/scraping/execucoes`                               | histórico paginado e filtrado               |
| `GET`     | `/api/admin/scraping/execucoes/:id`                           | detalhes da execução                        |
| `GET`     | `/api/admin/scraping/execucoes/:id/logs`                      | logs da execução                            |
| `GET`     | `/api/admin/scraping/eventos`                                 | stream SSE (`conectado`, `execucao`, `log`) |

Requisições mutáveis autenticadas enviam `X-CSRF-Token` com o valor do cookie legível `csrf-token`.

## Componentes reutilizáveis

- `SourceIdentityComponent`: logo, ícone alternativo e nome da fonte.
- `LoadingSkeletonComponent`, `EmptyStateComponent` e `ErrorStateComponent`.
- `PaginationComponent`.
- `FeedbackMessageComponent`.
- `ConfirmDialogComponent` e `MessageDialogComponent` via CDK Dialog.
- `ProductCardComponent`, `PriceDisplayComponent` e `OfferCardComponent`.
- `SelectorFormComponent`, `SelectorTestResultComponent` e `HtmlAnalyzerDialogComponent`.
- `ProgressBarComponent`, `ExecutionStatusBadgeComponent` e `LogsConsoleComponent`.

## Estratégia visual

1. Copiar inicialmente os tokens, reset, tipografia e utilitários do CSS legado para `src/styles`.
2. Mover regras específicas para os componentes conforme cada feature for migrada.
3. Manter os mesmos nomes de classes durante a fase de equivalência visual.
4. Usar Lucide por componentes Angular e Chart.js no detalhe do produto.
5. Não introduzir tema visual do Angular Material.

## Checklist de equivalência

- [ ] Shell público, cabeçalho e menu da conta
- [ ] Busca e sugestões com cancelamento/debounce
- [ ] Filtros, ordenação, paginação e chips ativos
- [ ] Novidades e estados de carregamento/vazio/erro
- [ ] Detalhe, ofertas agrupadas e gráfico de histórico
- [ ] Login, detecção de MFA, sessão e logout
- [ ] Configuração e ativação de MFA
- [ ] Shell e navegação administrativa
- [ ] Lista, cadastro, logo, status e exclusão de fontes
- [ ] Categorias dinâmicas por fonte, URLs e seletores independentes
- [ ] Teste de seletores com causa específica de erro, amostras e captura
- [ ] Análise de HTML e aplicação de seletores
- [ ] Busca manual, filtro multilojas, CSV e impressão
- [ ] Resumo, status e histórico de scraping
- [ ] SSE com reconexão, filtros e encerramento sem vazamentos
- [ ] Detalhes, progresso e logs da execução
- [ ] Execução imediata de scraping
- [ ] Limpeza de produtos e reset total com confirmações
- [ ] Onboarding sem fontes
- [ ] Responsividade e estilos de impressão
- [ ] Build, lint, testes e comparação visual
- [ ] Backend atual sem alterações incompatíveis
- [ ] Frontend legado mantido até equivalência funcional
