import { describe, it } from 'node:test'
import { equal } from 'node:assert'

describe("AI integration tests", () => {
  it("should be able to generate a valid SQLite query for a question", async (ctx) => {
    ctx.mock.module("ai", {
      exports: {
        generateText: async ({ system, prompt }) => {
          return {
            experimental_output: {
              sql: 'SELECT date(timestamp) AS date, COUNT(*) AS access_count FROM access_logs GROUP BY date;',
              explanation: 'Esta query conta o numero de acessos por dia agrupando os registros por data',
            },
          }
        },
        Output: {
          object: ({ schema }) => ({ schema })
        }
      }
    })

    const { generateSqlObject } = await import("./ai.js")

    const question = "Quantos acessos tivemos por dia?"
    const { sql } = await generateSqlObject(question)

    equal(typeof sql, 'string');
    equal(sql.trim().length > 0, true)

    equal(sql.trim().toUpperCase().startsWith('SELECT'), true)
  })
})