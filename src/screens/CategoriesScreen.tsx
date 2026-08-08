import { formatBase } from '../lib/money'
import { useStore } from '../lib/store'
import { Empty } from '../components/Empty'

const TONES = [
  'var(--accent-owed)',
  'var(--accent-owing)',
  'var(--eur)',
  'var(--accent-bad)',
  '#8fb08a',
  '#c08fb0',
  'var(--fg-dim)',
]

export function CategoriesScreen() {
  const { d } = useStore()
  if (d.byCategory.length === 0) {
    return <Empty title="No categories yet" body="Tag an expense and it turns up here." />
  }
  const max = d.byCategory[0].total

  return (
    <div className="px-4 pb-8 pt-5">
      <h1 className="disp" style={{ fontSize: 'var(--text-title)', fontWeight: 600 }}>
        Where it went
      </h1>
      <p className="mb-5 mt-1" style={{ color: 'var(--fg-dim)', fontSize: 'var(--text-small)' }}>
        {formatBase(d.total)} across {d.byCategory.length} categories
      </p>

      <div className="space-y-3.5">
        {d.byCategory.map((c, i) => (
          <div key={c.category}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span style={{ fontWeight: 500 }}>{c.category}</span>
              <span className="disp" style={{ fontWeight: 600 }}>
                {formatBase(c.total)}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden"
              style={{ background: 'var(--surface)', borderRadius: 2 }}
            >
              <div
                style={{
                  width: `${Math.max(2, (c.total / max) * 100)}%`,
                  height: '100%',
                  background: TONES[i % TONES.length],
                  borderRadius: 2,
                }}
              />
            </div>
            <div
              className="disp-tight mt-1"
              style={{ fontSize: 'var(--text-micro)', color: 'var(--fg-dim)' }}
            >
              {Math.round((c.total / d.total) * 100)}% of the trip
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
