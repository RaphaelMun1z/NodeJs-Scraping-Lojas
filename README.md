# Scraping Lojas

Aplicação em Node.js/TypeScript que coleta produtos de várias lojas, organiza URLs de coleta por categoria, agrupa ofertas equivalentes e disponibiliza uma API REST para consulta.

## Requisitos

- Node.js 20+
- MongoDB local ou uma URI acessível
- Chromium do Playwright

Para desenvolver o frontend Angular 22, use Node.js `^22.22.3`, `^24.15.0` ou `>=26.0.0`.

## Instalação

```bash
npm --prefix backend install
npm --prefix backend exec -- playwright install chromium
```

Para subir um MongoDB local com Docker:

```bash
docker compose up -d
```

Para subir somente MongoDB e Elasticsearch e executar backend e frontend localmente:

```bash
docker compose -f docker-compose.infra.yml up -d
npm --prefix backend run dev
cd frontend
npm start
```

Nesse modo, o arquivo `.env` deve usar `mongodb://127.0.0.1:27018/scraping_lojas` e `http://127.0.0.1:9200`, que são os valores padrão deste projeto.

## Configuração

Copie `.env.example` para `.env`. As lojas, categorias, URLs e seletores são cadastrados dinamicamente na área administrativa.

| Variável | Obrigatória | Finalidade |
| --- | --- | --- |
| `MONGODB_URI` | Não | Conexão com o MongoDB. |
| `PORTA_API` | Não | Porta da API; padrão `3000`. |
| `SALVAR_COLETA` | Não | Persiste os itens quando `true`; padrão `false`. |
| `REQUEST_TIMEOUT_MS` | Não | Tempo limite de navegação em milissegundos. |
| `NAVEGADOR_VISIVEL` | Não | Exibe o Chromium somente durante o teste de seletores da configuração da fonte. O scraping normal é sempre executado em segundo plano. |
| `NAVEGADOR_PAUSA_MS` | Não | Pausa após o carregamento da página. |
| `CRON_EXPRESSAO` | Não | Expressão do agendamento; padrão `0 15 * * *`. |
| `CRON_FUSO_HORARIO` | Não | Fuso do agendamento; padrão `America/Sao_Paulo`. |
| `EXECUTAR_COLETA_AO_INICIAR` | Não | Executa uma coleta ao iniciar; padrão `true`. |
| `LOG_LEVEL` | Não | Nível dos logs do Pino. |
| `LOG_FILE` | Não | Arquivo onde os logs são gravados; por padrão `backend/.dados/logs/aplicacao.log`. |
| `LOG_PRETTY` | Não | Quando `true`, grava os logs em formato legível; o destino continua sendo o arquivo. |

## Execução

Desenvolvimento:

```bash
npm --prefix backend run dev
```

Produção:

```bash
npm --prefix backend run build
npm --prefix backend start
```

Frontend Angular em desenvolvimento (com proxy para a API na porta 3000):

```bash
cd frontend
npm ci
npm start
```

Validação do frontend:

```bash
cd frontend
npm run lint
npm test
npm run build
```

Para executar toda a pilha, incluindo o frontend Angular em `http://localhost:8080`:

```bash
docker compose up --build
```

## API

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/api/saude` | Verifica se a API e o banco estão disponíveis. |
| `GET` | `/api/itens` | Lista itens paginados. Aceita `pagina`, `limite` e `busca`. |
| `GET` | `/api/itens/:id` | Busca um item pelo ID do MongoDB. |

Exemplo:

```text
GET /api/itens?pagina=1&limite=20&busca=produto
```

## Estrutura de diretórios

| Diretório | Responsabilidade |
| --- | --- |
| `backend/src/agendadores` | Agenda e controla execuções automáticas da coleta. |
| `backend/src/analisadores` | Interpreta o HTML e transforma cards em itens validados. |
| `backend/src/api` | Configura a API REST, rotas, controladores e tratamento de erros. |
| `backend/src/banco` | Gerencia a conexão, o schema Mongoose e o repositório de itens. |
| `backend/src/clientes` | Obtém o HTML usando Playwright ou HTTP. |
| `backend/src/coletores` | Coordena a obtenção e a análise do conteúdo da loja. |
| `backend/src/config` | Centraliza configuração, seletores e logger. |
| `backend/src/modelos` | Define os tipos e a validação dos dados coletados. |
| `backend/src/servicos` | Contém o fluxo de negócio da coleta e evita execuções simultâneas. |
| `backend/src/utilitarios` | Reúne funções auxiliares, como geração de chaves de itens. |
| `backend/src/index.ts` | Compõe as dependências e inicia o ciclo de vida da aplicação. |
| `frontend` | Aplicação Angular de catálogo e administração. |

## Persistência

Quando `SALVAR_COLETA=true`, os itens são gravados em lote com `bulkWrite` e `upsert`. A chave usa a URL do item quando disponível e evita duplicidades entre coletas.

Cada loja pode possuir várias configurações de coleta. Uma configuração contém a categoria informada pelo administrador, sua URL e seus próprios seletores CSS. A sincronização de produtos ocorre por loja e categoria, enquanto o matching compara produtos da mesma categoria em lojas diferentes para formar os grupos de ofertas.
