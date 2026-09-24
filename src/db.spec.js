import { describe, it } from 'node:test'
import { equal } from 'node:assert'

import { createDb } from './db.js'
import { generateLogEntry, generateUser } from './mocks.js'

describe("Database layer tests", () => {
  const db = createDb()

  it("should be able to insert a registry on database", () => {
    const user = generateUser()
    const record = generateLogEntry(user)

    db.prepare(`
      INSERT INTO access_logs (
        ip,
        username,
        first_name,
        last_name,
        email,
        location,
        job_area,
        company,
        job_title,
        id,
        timestamp
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `).run(
      record.ip,
      record.username,
      record.first_name,
      record.last_name,
      record.email,
      record.location,
      record.job_area,
      record.company,
      record.job_title,
      record.id,
      record.timestamp
    )

    const all = db.prepare("SELECT COUNT(*) FROM access_logs").all()
    equal(all[0]["COUNT(*)"], 1)
  })
})