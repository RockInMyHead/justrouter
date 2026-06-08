import 'dotenv/config'
import db from '../server/db.js'
import { checkpointDatabase } from '../server/db.js'
import { generateAndStoreOpenClawReport } from '../server/openclaw-reports.js'
import { broadcastOpenClawReportToAdmins } from '../server/openclaw-telegram.js'

const HOURS = Number.parseInt(process.env.OPENCLAW_REPORT_HOURS || '12', 10) || 12
const PATH = process.env.OPENCLAW_REPORT_PATH || '/'
const INTERVAL_MS = Number.parseInt(process.env.OPENCLAW_REPORT_INTERVAL_MS || String(12 * 60 * 60 * 1000), 10)

function logReport(result) {
  const recommendationCount = result.recommendations?.length || 0
  console.log(
    `[openclaw] report generated id=${result.id || 'n/a'} hours=${result.hours} path=${result.path} recommendations=${recommendationCount}`,
  )
}

async function runOnce() {
  const result = generateAndStoreOpenClawReport(db, { hours: HOURS, path: PATH })
  logReport(result)
  await broadcastOpenClawReportToAdmins(db, result)
  checkpointDatabase('PASSIVE')
}

async function main() {
  console.log(`[openclaw] worker started hours=${HOURS} path=${PATH} intervalMs=${INTERVAL_MS}`)
  try {
    await runOnce()
  } catch (error) {
    console.error('[openclaw] initial report failed', error)
  }

  setInterval(async () => {
    try {
      await runOnce()
    } catch (error) {
      console.error('[openclaw] scheduled report failed', error)
    }
  }, INTERVAL_MS)
}

main().catch((error) => {
  console.error('[openclaw] worker fatal error', error)
  process.exitCode = 1
})
