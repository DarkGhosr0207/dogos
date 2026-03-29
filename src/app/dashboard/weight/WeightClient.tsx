'use client'

import {
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts'
import { deleteWeight, logWeight } from './actions'
import { inputClass } from '@/lib/ui'

export type WeightDogOption = {
  id: string
  name: string
}

export type WeightLogRow = {
  id: string
  dog_id: string
  weight_kg: number
  logged_at: string
  notes: string | null
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return `${MONTHS_SHORT[m - 1]} ${d}`
}

function todayIsoLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const whiteCard: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '20px',
}

const subStyle: CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
}

const greenBtn: CSSProperties = {
  backgroundColor: '#2d7a4f',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '10px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
}

type WeightClientProps = {
  dogs: WeightDogOption[]
  weightLogs: WeightLogRow[]
}

export default function WeightClient({ dogs, weightLogs }: WeightClientProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [deletePending, setDeletePending] = useState<string | null>(null)

  const [dogId, setDogId] = useState(dogs[0]?.id ?? '')
  const [weightKg, setWeightKg] = useState('')
  const [loggedAt, setLoggedAt] = useState(todayIsoLocal)
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const logsForDog = useMemo(
    () => weightLogs.filter((l) => l.dog_id === dogId).sort((a, b) => a.logged_at.localeCompare(b.logged_at)),
    [weightLogs, dogId]
  )

  const chartData = useMemo(
    () =>
      logsForDog.map((l) => ({
        logged_at: l.logged_at,
        label: formatShortDate(l.logged_at),
        weight: l.weight_kg,
      })),
    [logsForDog]
  )

  const stats = useMemo(() => {
    const n = logsForDog.length
    if (n === 0) {
      return {
        current: null as number | null,
        start: null as number | null,
        change: null as number | null,
        total: 0,
      }
    }
    const start = logsForDog[0]
    const current = logsForDog[n - 1]
    const change = current.weight_kg - start.weight_kg
    return {
      current: current.weight_kg,
      start: start.weight_kg,
      change,
      total: n,
    }
  }, [logsForDog])

  const history10 = useMemo(() => {
    return [...logsForDog]
      .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
      .slice(0, 10)
  }, [logsForDog])

  function changeStyle(delta: number): CSSProperties {
    if (delta === 0) return { color: '#6b7280', fontWeight: 600 }
    if (delta < 0) return { color: '#2d7a4f', fontWeight: 600 }
    return { color: '#dc2626', fontWeight: 600 }
  }

  function formatChange(delta: number): string {
    const sign = delta > 0 ? '+' : ''
    return `${sign}${delta.toFixed(1)} kg`
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const fd = new FormData()
    fd.set('dog_id', dogId)
    fd.set('weight_kg', weightKg)
    fd.set('logged_at', loggedAt)
    if (notes.trim()) fd.set('notes', notes.trim())

    startTransition(async () => {
      const result = await logWeight(fd)
      if (!result.ok) {
        setFormError(result.error ?? 'Could not save.')
        return
      }
      setWeightKg('')
      setNotes('')
      setLoggedAt(todayIsoLocal())
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    setDeletePending(id)
    const result = await deleteWeight(id)
    setDeletePending(null)
    if (result.ok) router.refresh()
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold" style={{ color: '#111827' }}>
        Weight Tracker
      </h1>
      <p className="mb-6 text-sm" style={subStyle}>
        Log weight and see trends over the last 90 days.
      </p>

      <section style={{ ...whiteCard, marginBottom: '24px' }}>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: '#111827' }}>
          Log weight
        </h2>
        {dogs.length === 0 ? (
          <p className="text-sm" style={subStyle}>
            Add a dog first to log weight.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="weight-dog"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: '#374151' }}
              >
                Dog
              </label>
              <select
                id="weight-dog"
                className={inputClass}
                value={dogId}
                onChange={(e) => setDogId(e.target.value)}
                required
              >
                {dogs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="weight-kg"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: '#374151' }}
              >
                Weight (kg)
              </label>
              <input
                id="weight-kg"
                name="weight_kg"
                type="number"
                step={0.1}
                min={0.1}
                className={inputClass}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="e.g. 12.5"
                required
              />
            </div>
            <div>
              <label
                htmlFor="weight-date"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: '#374151' }}
              >
                Date
              </label>
              <input
                id="weight-date"
                name="logged_at"
                type="date"
                className={inputClass}
                value={loggedAt}
                onChange={(e) => setLoggedAt(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                htmlFor="weight-notes"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: '#374151' }}
              >
                Notes <span style={subStyle}>(optional)</span>
              </label>
              <textarea
                id="weight-notes"
                name="notes"
                rows={2}
                className={inputClass}
                placeholder="Optional notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {formError ? (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              style={{
                ...greenBtn,
                opacity: pending ? 0.65 : 1,
                cursor: pending ? 'not-allowed' : 'pointer',
              }}
            >
              {pending ? 'Saving…' : 'Log weight'}
            </button>
          </form>
        )}
      </section>

      <section style={{ ...whiteCard, marginBottom: '24px' }}>
        <h2 className="mb-3 text-base font-semibold" style={{ color: '#111827' }}>
          Weight over time
        </h2>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm" style={subStyle}>
            No weight entries in the last 90 days for this dog.
          </p>
        ) : (
          <div className="w-full" style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  domain={['auto', 'auto']}
                  width={44}
                  tickFormatter={(v) => `${v}`}
                  label={{
                    value: 'kg',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: '#6b7280', fontSize: 12 },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${value ?? ''} kg`, 'Weight']}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { logged_at?: string } | undefined
                    return p?.logged_at ?? ''
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#2d7a4f"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy } = props
                    if (cx == null || cy == null) return null
                    return <Dot cx={cx} cy={cy} r={4} fill="#2d7a4f" stroke="#2d7a4f" />
                  }}
                  activeDot={{ r: 6, fill: '#2d7a4f' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section style={{ ...whiteCard, marginBottom: '24px' }}>
        <h2 className="mb-3 text-base font-semibold" style={{ color: '#111827' }}>
          Stats
        </h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt style={subStyle}>Current weight</dt>
            <dd className="text-lg font-semibold" style={{ color: '#111827' }}>
              {stats.current != null ? `${stats.current.toFixed(1)} kg` : '—'}
            </dd>
          </div>
          <div>
            <dt style={subStyle}>Starting weight (in range)</dt>
            <dd className="text-lg font-semibold" style={{ color: '#111827' }}>
              {stats.start != null ? `${stats.start.toFixed(1)} kg` : '—'}
            </dd>
          </div>
          <div>
            <dt style={subStyle}>Change</dt>
            <dd className="text-lg" style={stats.change != null ? changeStyle(stats.change) : { color: '#111827' }}>
              {stats.change != null ? formatChange(stats.change) : '—'}
            </dd>
          </div>
          <div>
            <dt style={subStyle}>Total entries</dt>
            <dd className="text-lg font-semibold" style={{ color: '#111827' }}>
              {stats.total}
            </dd>
          </div>
        </dl>
      </section>

      <section style={whiteCard}>
        <h2 className="mb-3 text-base font-semibold" style={{ color: '#111827' }}>
          History
        </h2>
        {history10.length === 0 ? (
          <p className="text-sm" style={subStyle}>
            No entries yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history10.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-2 border-b pb-3 last:border-0 last:pb-0"
                style={{ borderColor: '#e5e7eb' }}
              >
                <div className="min-w-0">
                  <div className="font-medium" style={{ color: '#111827' }}>
                    {formatShortDate(row.logged_at)} · {row.weight_kg.toFixed(1)} kg
                  </div>
                  {row.notes?.trim() ? (
                    <div className="mt-1 text-sm" style={subStyle}>
                      {row.notes}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium underline-offset-2 hover:underline"
                  style={{ color: '#9ca3af' }}
                  disabled={deletePending === row.id}
                  onClick={() => handleDelete(row.id)}
                >
                  {deletePending === row.id ? 'Removing…' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
