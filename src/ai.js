import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const BLOCKED_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'REPLACE',
  'PRAGMA', 'ATTACH', 'DETACH', 'VACUUM'
]

const SCHEMA_DESCRIPTION = `
  Tabela: access_logs
  Colunas:
    - ip TEXT NOT NULL,
    - username TEXT NOT NULL,
    - first_name TEXT NOT NULL,
    - last_name TEXT NOT NULL,
    - email TEXT NOT NULL,
    - location TEXT NOT NULL,
    - job_area TEXT NOT NULL,
    - company TEXT NOT NULL,
    - job_title TEXT NOT NULL,
    - id TEXT PRIMARY KEY,
    - timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
`

export function validateSql(sql) {
  if (typeof sql !== 'string' || !sql.trim()) {
    throw new Error('SQL vazia.')
  }

  const safeSql = sql.trim().replace(/;\s*$/, '').trim()

  for (const keyword of BLOCKED_KEYWORDS) {
    if(new RegExp(`\\b${keyword}\\b`, 'i').test(safeSql)) {
      throw new Error(`Comando bloqueado: ${keyword}`)
    }
  }

  return safeSql
}

const sqlSuggestionSchema = z.object({
  sql: z.string(),
  explanation: z.string(),
})

const model = openai('gpt-4o-mini', { 
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateSqlObject(question) {
  const { experimental_output } = await generateText({
    model,
    experimental_output: Output.object({ schema: sqlSuggestionSchema }),
    system: `
      Você é um assistente especialista em SQLite.

      Sua tarefa é gerar uma única query SQL para responder pergunta do(a) usuário(a).

      Regras obrigatórias:
      - Gere apenas SELECT.
      - Use apenas a tabela access_logs.
      - Não use ${BLOCKED_KEYWORDS.join(', ')}.
      - Não gere múltiplas queries.
      - Não use comentários SQL.
      - Se a pergunta não puder ser respondida com o schema disponível, gere uma query simples de inspeção ou explique a limitação.

      Schema disponível:
      ${SCHEMA_DESCRIPTION}`,
    prompt: `
      Pergunta do usuário:
      ${question}
    `,
  });

  if (!experimental_output?.sql) {
    throw new Error('O modelo nao retornou uma sugestão SQL valida.');
  }

  return {
    sql: validateSql(experimental_output.sql),
    explanation: experimental_output.explanation,
  };
}