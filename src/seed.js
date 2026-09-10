// Precisamos gerar um arquivo access.log fake
import { createWriteStream, statSync } from 'node:fs'
import { faker } from '@faker-js/faker'

import { LOG_FILE, LOG_INTERVAL } from './constants.js'

const maxRecords = Number(process.argv[2] || Infinity) //argv se referencia a 3 posicao do comando no terminal

if (
  (!Number.isInteger(maxRecords) && Number.isFinite(maxRecords)) 
  || Number.isNaN(maxRecords)
  || maxRecords <= 0
) {
  console.log("Uso: npm run seed -- <Quantidade>")
  console.log("A quantidade deve ser um número inteiro maior que zero")
  process.exit(1)
}

const stream = createWriteStream(LOG_FILE)

function generateUser() {
  return {
    ip: faker.internet.ip(),
    username: faker.internet.userName(),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
    location: faker.location.city(),
    job_area: faker.person.jobArea(),
    company: faker.company.name(),
    job_title: faker.person.jobTitle(),
  }
}

function generateLogEntry(user) {
  return {
    ...user,
    id: faker.string.uuid(),
    timestamp: faker.date.recent().toISOString(),
  }
}

function convertFromBytesToGigabytes(size) {
  return (size / 1024 / 1024 / 1024).toFixed(4)
}

// Backpressure implementation
function writeRecord(line) {
  return new Promise((resolve) => {
    if(!stream.write(line)) {
      stream.once("drain", resolve)
    } else {
      resolve()
    }
  })
}

console.log(`Gerando logs de acesso falsos em ${LOG_FILE}... (Ctrl+C para parar)`)
console.log(`Limite de resgistros: ${maxRecords.toLocaleString()}`)

const users = Array.from({ length: 5 }, generateUser)

process.on("SIGINT", () => {
  stream.end(() => {
    const { size } = statSync(LOG_FILE)
    console.log(`Geração de logs interrompida. Registros: ${count.toLocaleString()}, Tamanho do arquivo: ${convertFromBytesToGigabytes(size)} GB`)
  })
})

let count = 0
while(count < maxRecords) {
  const user = faker.helpers.arrayElement(users)
  const record = generateLogEntry(user)

  await writeRecord(JSON.stringify(record) + "\n")
  count++

  if(count % LOG_INTERVAL === 0) {
    const { size } = statSync(LOG_FILE)
    console.log(`Registro: ${count.toLocaleString()}, Tamanho do arquivo: ${convertFromBytesToGigabytes(size)} GB`)
  }
}

stream.end(() => {
  const { size } = statSync(LOG_FILE)
  console.log(`Geração de logs concluída. Registros: ${count.toLocaleString()}, Tamanho do arquivo: ${convertFromBytesToGigabytes(size)} GB`)
})