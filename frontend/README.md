# Frontend Angular — Live Promo

Aplicação web standalone em Angular 22 para o catálogo público e a administração do scraping. O frontend usa TypeScript estrito, Reactive Forms, signals, rotas lazy, Chart.js e integração tipada com a API existente.

## Requisitos

- Node.js `^22.22.3`, `^24.15.0` ou `>=26.0.0`
- backend do projeto disponível em `http://localhost:3000`

## Desenvolvimento

```bash
cd frontend
npm ci
npm start
```

Abra `http://localhost:4200`. O proxy de desenvolvimento encaminha `/api` ao backend local e preserva sessão, CSRF e SSE na mesma origem.

## Qualidade e produção

```bash
npm run lint
npm test
npm run format:check
npm run build
```

O resultado de produção fica em `dist/live-promo-frontend/browser`. Na raiz do repositório, `docker compose up --build` publica a aplicação em `http://localhost:8080` por meio do Nginx.

## Organização

- `core`: autenticação, interceptador CSRF, contratos HTTP e tratamento de erros;
- `layout`: cabeçalho público e shell administrativo;
- `features/produtos`: catálogo, filtros, novidades, detalhe, ofertas e histórico;
- `features/fontes`: fontes, categorias dinâmicas, seletores e testes;
- `features/scraping`: monitoramento SSE, histórico, logs e busca manual;
- `features/configuracoes`: limpeza e reset do sistema;
- `shared`: componentes e pipes reutilizáveis.

Este diretório contém a implementação oficial da interface pública e administrativa do projeto.
