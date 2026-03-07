import { createSign } from 'crypto'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('='))
)

const TEAM_ID = env.MAPKIT_TEAM_ID
const KEY_ID = env.MAPKIT_KEY_ID
const PRIVATE_KEY_PATH = `./AuthKey_${KEY_ID}.p8`

const privateKey = readFileSync(PRIVATE_KEY_PATH, 'utf8')

const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })).toString('base64url')
const now = Math.floor(Date.now() / 1000)
const payload = Buffer.from(JSON.stringify({ iss: TEAM_ID, iat: now, exp: now + 60 * 60 * 24 * 365 })).toString('base64url')

const data = `${header}.${payload}`
const sign = createSign('SHA256')
sign.update(data)
const signature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }, 'base64url')

console.log(`${data}.${signature}`)
