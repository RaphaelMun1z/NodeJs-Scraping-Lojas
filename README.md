# Scraping Lojas

Projeto de scraping de lojas em HTML com persistência em MongoDB, API REST e coleta agendada.

## Tecnologias

- TypeScript e Node.js
- Cheerio para leitura do HTML
- `fetch` nativo para obter as páginas
- Zod para validação
- MongoDB + Mongoose para persistência
- Express para API REST
- node-cron para agendamento
- Pino para logs
- dotenv para configuração

## Instalação

```bash
npm install
```

## MongoDB local

Com Docker:

```bash
docker compose up -d
```

## Configuração

1. Copie `.env.example` para `.env`.
2. Defina `SCRAPER_URL`.
3. Preencha os seletores em `src/config/selectors.ts`.
4. Ajuste `src/modelos/item-coletado.model.ts` caso os campos extraídos sejam diferentes.

Configuração padrão do agendamento:

```env
CRON_EXPRESSAO=0 15 * * *
CRON_FUSO_HORARIO=America/Sao_Paulo
```

Isso executa a coleta todos os dias às 15:00 no horário de São Paulo.

`EXECUTAR_COLETA_AO_INICIAR=true` também faz uma coleta ao iniciar a aplicação.

## Executar

```bash
npm run dev
```

Build de produção:

```bash
npm run build
npm start
```

## API REST

### Saúde

```http
GET /api/saude
```

### Listar itens

```http
GET /api/itens
```

Parâmetros opcionais:

```text
pagina=1
limite=20
busca=texto
```

Exemplo:

```http
GET /api/itens?pagina=1&limite=20&busca=produto
```

### Buscar item por ID

```http
GET /api/itens/:id
```

## Persistência

Os itens são gravados em lote usando `bulkWrite` com `upsert`. A chave de identificação usa a URL quando disponível e, caso contrário, uma combinação do título e descrição. Assim, coletas futuras atualizam o item em vez de criar duplicatas.

## Estrutura

```text
src/
├── agendadores/     # Agendamento das coletas
├── analisadores/    # Extração do HTML com Cheerio
├── api/             # API REST
├── banco/           # Conexão, modelos e repositórios MongoDB
├── clientes/        # Comunicação HTTP
├── coletores/       # Coordenação do scraping
├── config/          # Configurações, seletores e logs
├── modelos/         # Tipos e validação dos dados extraídos
├── servicos/        # Regras de aplicação
├── utilitarios/     # Funções auxiliares
└── index.ts         # Inicialização da aplicação
```
