'use client'
import { useState } from 'react'
import { Check, Plus, Star, Pencil, X } from 'lucide-react'

interface Plan {
  id: string
  name: string
  duration_days: number
  price: number
  gst_rate: number
  features: string[]
  is_popular: boolean
  is_active: boolean
  member_count: number
}

interface PlansClientProps {
  plans: Plan[]
}

function durationLabel(days: number) {
  if (days === 30) return '1 month'
  if (days === 60) return '2 months'
  if (days === 90) return '3 months'
  if (days === 180) return '6 months'
  if (days === 365) return '1 year'
  return `${days} days`
}

function planAccent(name: string) {
  const n = name.toLowerCase()
  if (n.includes('premium') || n.includes('pro')) return 'border-t-4 border-t-purple-400'
  if (n.includes('standard') || n.includes('growth')) return 'border-t-4 border-t-blue-400'
  return 'border-t-4 border-t-gray-300'
}

export default function PlansClient({ plans: initialPlans }: PlansClientProps) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('30')
  const [price, setPrice] = useState('')
  const [features, setFeatures] = useState('')
  const [isPopular, setIsPopular] = useState(false)

  function resetForm() {
    setName(''); setDuration('30'); setPrice('')
    setFeatures(''); setIsPopular(false); setError('')
  }

  function openModal() { resetForm(); setShowModal(true) }
  function closeModal() { setShowModal(false); resetForm() }

  async function handleSave() {
    if (!name.trim()) { setError('Plan name is required'); return }
    if (!price || isNaN(Number(price))) { setError('Enter a valid price'); return }

    setSaving(true)
    setError('')

    const featureList = features
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean)

    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        duration_days: Number(duration),
        price: Number(price),
        features: featureList,
        is_popular: isPopular,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Failed to save plan')
      setSaving(false)
      return
    }

    setPlans(prev => [...prev, json.plan])
    closeModal()
    setSaving(false)
  }

  return (
    <>

    <main className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Plans & pricing</h1>
            <p className="mt-0.5 text-sm text-ink-muted">{plans.length} plans · assign to members on registration</p>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            <Plus className="h-4 w-4" /> New plan
          </button>
        </div>

        {/* Plan cards */}
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-medium py-20">
            <p className="text-sm font-medium text-ink">No plans yet</p>
            <p className="mt-1 text-sm text-ink-muted">Create your first membership plan</p>
            <button
              onClick={openModal}
              className="mt-4 flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> New plan
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map(plan => {
              const features = Array.isArray(plan.features) ? plan.features : []
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-xl border border-border bg-bg-card p-5 shadow-sm ${planAccent(plan.name)}`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-3 right-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-0.5 text-xs font-semibold text-white shadow">
                        <Star className="h-3 w-3 fill-white" /> Most popular
                      </span>
                    </div>
                  )}

                  <div className="mb-1 text-lg font-semibold text-ink">{plan.name}</div>
                  <div className="text-xs text-ink-muted">{durationLabel(plan.duration_days)}</div>

                  <div className="mt-4">
                    <span className="text-3xl font-bold text-ink">₹{plan.price.toLocaleString('en-IN')}</span>
                    <span className="text-sm text-ink-muted"> / {durationLabel(plan.duration_days)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">{plan.member_count} members · +18% GST</p>

                  <div className="mt-4 flex-1 space-y-2 border-t border-border pt-4">
                    {features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-light" />
                        <span>{f}</span>
                      </div>
                    ))}
                    {features.length === 0 && (
                      <p className="text-xs italic text-ink-muted">No features listed</p>
                    )}
                  </div>

                  <button className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-medium text-ink-secondary hover:bg-bg-page">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Add Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-bg-card shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-ink">New plan</h2>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-ink-muted hover:bg-bg-page">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-secondary">Plan name *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Standard"
                  className="h-10 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-ink-secondary">Duration</label>
                  <select
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="h-10 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none"
                  >
                    <option value="30">1 month</option>
                    <option value="60">2 months</option>
                    <option value="90">3 months</option>
                    <option value="180">6 months</option>
                    <option value="365">1 year</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-ink-secondary">Price (₹) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="999"
                    className="h-10 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-secondary">Features (one per line)</label>
                <textarea
                  value={features}
                  onChange={e => setFeatures(e.target.value)}
                  placeholder={"Unlimited gym access\nLocker room\nGroup classes"}
                  rows={4}
                  className="resize-none rounded-lg border border-border-medium bg-bg-input p-3 text-sm text-ink focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPopular}
                  onChange={e => setIsPopular(e.target.checked)}
                  className="h-4 w-4 rounded border-border-medium text-brand"
                />
                <span className="text-sm text-ink-secondary">Mark as most popular</span>
              </label>

              {error && (
                <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{error}</p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-bg-page"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Create plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}