import { useEffect, useMemo, useState } from 'react'
import { getToken } from './auth.js'

function formatCount(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value || 0))
}

function HeatmapGrid({ points }) {
  const cells = useMemo(() => {
    const map = new Map()
    let max = 0
    for (const point of points || []) {
      const key = `${point.x}:${point.y}`
      const count = Number(point.count || 0)
      map.set(key, { x: Number(point.x || 0), y: Number(point.y || 0), count })
      if (count > max) max = count
    }
    return { max, cells: Array.from(map.values()) }
  }, [points])

  if (!cells.cells.length) {
    return <div className="text-sm text-white/45 font-mono">Heatmap появится после первых кликов по странице.</div>
  }

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
      {cells.cells.map((point) => {
        const strength = cells.max > 0 ? point.count / cells.max : 0
        return (
          <div
            key={`${point.x}:${point.y}`}
            className="rounded-2xl border border-white/10 p-3 text-xs font-mono text-white/70"
            style={{
              background: `rgba(1, 210, 197, ${0.08 + strength * 0.45})`,
            }}
          >
            <div>{point.count} clicks</div>
            <div className="mt-1 text-white/35">{point.x}, {point.y}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function DemoPage() {
  const token = getToken()
  const [summary, setSummary] = useState(null)
  const [heatmap, setHeatmap] = useState(null)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const [summaryRes, heatmapRes] = await Promise.all([
          fetch('/api/admin/analytics/summary?hours=12', { headers }),
          fetch('/api/admin/analytics/heatmap?hours=24&path=/', { headers }),
        ])

        if (!active) return

        if (!summaryRes.ok || !heatmapRes.ok) {
          throw new Error('no-access')
        }

        setSummary(await summaryRes.json())
        setHeatmap(await heatmapRes.json())

        const reportRes = await fetch('/api/admin/analytics/reports/latest?report_type=openclaw_12h', { headers })
        if (reportRes.ok) {
          setReport(await reportRes.json())
        }
      } catch {
        if (active) setError(token ? 'Не удалось загрузить live-аналитику.' : 'Войдите в админку, чтобы увидеть live-аналитику OpenClaw.')
      }
    }

    load()
    return () => {
      active = false
    }
  }, [token])

  async function handleGenerateReport() {
    if (!token || isGenerating) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/admin/analytics/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hours: 12, path: '/' }),
      })
      if (!res.ok) throw new Error('generate-failed')
      const data = await res.json()
      setReport(data.report)
      setError('')
    } catch {
      setError('Не удалось сгенерировать отчёт OpenClaw.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-white">
      <section className="mx-auto max-w-6xl px-5 py-10 lg:py-14">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 lg:p-8 shadow-[0_24px_120px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-200">OpenClaw demo</span>
            <span className="text-xs font-mono text-white/45">/demo</span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight lg:text-6xl">Analytics, heatmaps и 12-hour reports для JustRouter</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/65 lg:text-lg">
            Эта страница показывает, как OpenClaw будет видеть реальное поведение пользователей, выделять проблемные места интерфейса и собирать рекомендации для улучшений.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/35">Events</div>
            <div className="mt-2 text-3xl font-semibold">{formatCount(summary?.total_events)}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/35">Visitors</div>
            <div className="mt-2 text-3xl font-semibold">{formatCount(summary?.unique_visitors)}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/35">Window</div>
            <div className="mt-2 text-3xl font-semibold">{summary?.hours || 12}h</div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Heatmap preview</h2>
              <span className="text-xs font-mono text-white/40">path /</span>
            </div>
            <div className="mt-5">
              {error ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">{error}</div>
              ) : (
                <HeatmapGrid points={heatmap?.points} />
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">12-hour report</h2>
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={!token || isGenerating}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate now'}
                </button>
              </div>
              <p className="mt-2 text-xs font-mono text-white/40">
                {report?.created_at ? `Generated ${new Date(report.created_at).toLocaleString('ru-RU')}` : 'Waiting for the first automated report'}
              </p>
              <div className="mt-4 space-y-3">
                {(report?.summary?.recommendations || []).length ? report.summary.recommendations.map((item) => (
                  <div key={item} className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-3 text-sm text-white/75">
                    {item}
                  </div>
                )) : <div className="text-sm text-white/45">Пока нет рекомендаций.</div>}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Top pages</h2>
              <div className="mt-4 space-y-3">
                {(summary?.top_pages || []).length ? summary.top_pages.map((page) => (
                  <div key={page.path} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                    <span className="truncate text-sm text-white/70">{page.path}</span>
                    <span className="text-sm font-mono text-white">{formatCount(page.count)}</span>
                  </div>
                )) : <div className="text-sm text-white/45">Данные появятся после первых событий.</div>}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Next OpenClaw step</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Когда появится Docker-обвязка для agent2.0, этот экран станет центром для 12-часовых отчётов и списка рекомендаций, которые можно сразу внедрять в JustRouter.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
