import 'dotenv/config'
import db from '../server/db.js'
import { generateAndStoreOpenClawReport } from '../server/openclaw-reports.js'
import { broadcastOpenClawReportToAdmins } from '../server/openclaw-telegram.js'

async function main() {
  const hours = Number.parseInt(process.env.OPENCLAW_REPORT_HOURS || '12', 10) || 12
  const path = process.env.OPENCLAW_REPORT_PATH || '/'
  const report = generateAndStoreOpenClawReport(db, { hours, path })
  await broadcastOpenClawReportToAdmins(db, report)
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error('[openclaw] report-now failed', error)
  process.exitCode = 1
})
