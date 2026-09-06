# Scraping Lojas

Aplicação em Node.js/TypeScript que coleta produtos de uma loja HTML, valida os dados, opcionalmente grava-os no MongoDB e disponibiliza uma API REST para consulta.

## Requisitos

- Node.js 20+
- MongoDB local ou uma URI acessível
- Chromium do Playwright

## Instalação

```bash
npm install
npx playwright install chromium
```

Para subir um MongoDB local com Docker:

```bash
docker compose up -d
```

## Configuração

Copie `.env.example` para `.env`, informe a URL da loja e ajuste os seletores em [`src/config/selectors.ts`](src/config/selectors.ts).

| Variável | Obrigatória | Finalidade |
| --- | --- | --- |
| `SCRAPER_URL` | Sim | Página usada como origem da coleta. |
| `MONGODB_URI` | Não | Conexão com o MongoDB. |
| `PORTA_API` | Não | Porta da API; padrão `3000`. |
| `SALVAR_COLETA` | Não | Persiste os itens quando `true`; padrão `false`. |
| `REQUEST_TIMEOUT_MS` | Não | Tempo limite de navegação em milissegundos. |
| `NAVEGADOR_VISIVEL` | Não | Exibe o Chromium quando `true`. |
| `NAVEGADOR_PAUSA_MS` | Não | Pausa após o carregamento da página. |
| `CRON_EXPRESSAO` | Não | Expressão do agendamento; padrão `0 15 * * *`. |
| `CRON_FUSO_HORARIO` | Não | Fuso do agendamento; padrão `America/Sao_Paulo`. |
| `EXECUTAR_COLETA_AO_INICIAR` | Não | Executa uma coleta ao iniciar; padrão `true`. |
| `LOG_LEVEL` | Não | Nível dos logs do Pino. |

## Execução

Desenvolvimento:

```bash
npm run dev
```

Produção:

```bash
npm run build
npm start
```

Para gerar um CSV sem iniciar a API:

```bash
npm run scraping:test
```

O arquivo pode ser definido com `CSV_SAIDA`.

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
| `src/agendadores` | Agenda e controla execuções automáticas da coleta. |
| `src/analisadores` | Interpreta o HTML e transforma cards em itens validados. |
| `src/api` | Configura a API REST, rotas, controladores e tratamento de erros. |
| `src/banco` | Gerencia a conexão, o schema Mongoose e o repositório de itens. |
| `src/clientes` | Obtém o HTML usando Playwright ou HTTP. |
| `src/coletores` | Coordena a obtenção e a análise do conteúdo da loja. |
| `src/config` | Centraliza configuração, seletores e logger. |
| `src/modelos` | Define os tipos e a validação dos dados coletados. |
| `src/servicos` | Contém o fluxo de negócio da coleta e evita execuções simultâneas. |
| `src/utilitarios` | Reúne funções auxiliares, como geração de chaves de itens. |
| `src/index.ts` | Compõe as dependências e inicia o ciclo de vida da aplicação. |

## Persistência

Quando `SALVAR_COLETA=true`, os itens são gravados em lote com `bulkWrite` e `upsert`. A chave usa a URL do item quando disponível e evita duplicidades entre coletas.
