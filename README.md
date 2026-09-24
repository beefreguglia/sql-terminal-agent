# SQL Terminal Agent

Aplicacao de terminal em Node.js que gera logs de acesso ficticios, armazena esses dados em SQLite e permite consulta-los usando perguntas em linguagem natural. A pergunta e enviada a um modelo de IA, que sugere uma consulta SQL; depois da confirmacao do usuario, a consulta e executada e o resultado e convertido em uma resposta em portugues.

## Objetivo

O projeto pratica:

- leitura e escrita de arquivos grandes usando streams;
- processamento de JSON Lines, uma entrada por linha;
- persistencia com o modulo nativo `node:sqlite`;
- uso do test runner nativo `node:test`;
- mocks de modulos nativos do Node.js;
- integracao com a SDK `ai` e o provedor OpenAI;
- validacao basica de SQL antes da execucao;
- construcao de uma interface interativa de terminal.

## Requisitos

- Node.js 22 ou superior, por causa do uso de `node:sqlite`;
- uma chave `OPENAI_API_KEY` para usar a integracao com a OpenAI.

Instale as dependencias com:

```bash
npm install
```

## Configuracao

Crie um arquivo `.env.local` na raiz do projeto:

```env
OPENAI_API_KEY=sua_chave_aqui
```

O arquivo `.env.local` nao deve ser versionado. O banco e o arquivo de logs usam os nomes definidos em `src/constants.js`:

- `access.log` para os logs;
- `logs.db` para o banco SQLite;
- intervalo de progresso de 1 segundo nos scripts de geracao e ingestao.

## Estrutura do projeto

```text
.
├── package.json
├── README.md
└── src/
    ├── ai.js
    ├── ai.spec.js
    ├── constants.js
    ├── db.js
    ├── db.spec.js
    ├── index.js
    ├── ingest.js
    ├── mocks.js
    └── seed.js
```

### `src/constants.js`

Centraliza o nome do arquivo de logs, o nome do banco e o intervalo usado para exibir progresso.

### `src/mocks.js`

Usa `@faker-js/faker` para gerar usuarios e entradas de log. Cada entrada contem:

```json
{
  "ip": "192.168.0.1",
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "location": "Sao Paulo",
  "job_area": "Engineering",
  "company": "Rocketseat",
  "job_title": "Developer",
  "id": "uuid",
  "timestamp": "2026-06-15T10:00:00.000Z"
}
```

### `src/seed.js`

Gera o arquivo `access.log` linha a linha. O numero de registros e recebido como argumento, e a escrita respeita backpressure para evitar acumular dados na memoria.

```bash
npm run seed -- 1000
```

Sem argumento, o script continua gerando registros ate ser interrompido com `Ctrl+C`. Durante a execucao, ele informa a quantidade gerada e o tamanho atual do arquivo.

### `src/db.js`

Exporta `createDb(path)`, que abre um banco SQLite com `DatabaseSync` e cria a tabela `access_logs` caso ela ainda nao exista. Sem caminho informado, usa um banco em memoria, o que e utilizado pelo teste da camada de banco.

Schema atual:

```sql
CREATE TABLE IF NOT EXISTS access_logs (
  ip TEXT NOT NULL,
  username TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  location TEXT NOT NULL,
  job_area TEXT NOT NULL,
  company TEXT NOT NULL,
  job_title TEXT NOT NULL,
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### `src/ingest.js`

Le o `access.log` com `createReadStream` e `readline`, processando uma linha por vez. Linhas vazias e linhas que nao sao JSON valido sao ignoradas. Registros validos sao inseridos em `access_logs` com parametros posicionais, e o banco e fechado ao final.

```bash
npm run ingest
```

O script informa o progresso e o total de registros ingeridos. Campos ausentes ou invalidos podem gerar erro durante a insercao, pois o schema possui colunas obrigatorias.

### `src/ai.js`

Integra a SDK `ai` com o modelo `gpt-4o-mini` da OpenAI. `generateSqlObject(question)`:

1. envia ao modelo o schema de `access_logs` e as regras de consulta;
2. solicita um objeto estruturado com `sql` e `explanation`;
3. rejeita uma resposta sem SQL;
4. remove um ponto e virgula final;
5. bloqueia palavras associadas a comandos destrutivos, como `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `PRAGMA`, `ATTACH`, `DETACH` e `VACUUM`.

O prompt instrui o modelo a gerar somente `SELECT`, usar apenas `access_logs`, nao criar consultas multiplas e nao inserir comentarios SQL. A funcao `validateSql` faz a validacao local das palavras bloqueadas, mas nao implementa um parser SQL nem verifica de forma independente que a consulta comece com `SELECT`.

`generateTextAnswer({ question, sql, rows })` envia a pergunta original, a SQL executada e as linhas retornadas ao mesmo modelo para produzir uma resposta objetiva em portugues.

### `src/index.js`

Inicia o agente interativo:

```bash
npm start
```

O fluxo e:

```text
Pergunta do usuario
        |
        v
SQL e explicacao geradas pela IA
        |
        v
Confirmacao: executar? (s/n)
        |
        v
Consulta SQLite -> resposta textual da IA
```

O agente mostra a SQL e a explicacao, executa a consulta somente quando o usuario responde `s`, exibe a resposta e continua aceitando perguntas. Uma pergunta vazia e ignorada. `Ctrl+C` fecha o banco e encerra o processo.

## Testes

Execute:

```bash
npm test
```

Os testes atuais sao:

- `src/db.spec.js`: cria um banco em memoria, gera um registro falso, insere o registro e confirma que a tabela possui uma linha;
- `src/ai.spec.js`: substitui o modulo `ai` usando o mock experimental do Node.js, simula uma resposta estruturada e confirma que a funcao retorna uma SQL nao vazia iniciada por `SELECT`.

O teste de IA retorna o formato que a implementacao realmente consome:

```js
{
  experimental_output: {
    sql: 'SELECT ...',
    explanation: '...'
  }
}
```

O comando de testes usa `--experimental-test-module-mocks`, por isso o Node exibe um aviso de que o recurso de mock de modulos ainda e experimental.

## Scripts disponiveis

| Comando | Funcao |
| --- | --- |
| `npm run seed -- 1000` | gera 1000 registros em `access.log` |
| `npm run seed` | gera registros ate `Ctrl+C` |
| `npm run ingest` | importa `access.log` para `logs.db` |
| `npm start` | abre o agente interativo |
| `npm run dev` | abre o agente com `node --watch` |
| `npm test` | executa os testes |
| `npm run test:watch` | executa os testes em modo watch |

## Fluxo recomendado

```bash
npm install
npm run seed 1000
npm run ingest
npm start
```

Depois, faca uma pergunta como:

```text
Quantos acessos tivemos por cidade?
```

Revise a SQL sugerida antes de confirmar a execucao.
