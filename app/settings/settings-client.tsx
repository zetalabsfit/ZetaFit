'use client'
import TimeRangePicker from '@/components/time-range-picker'
import dynamic from 'next/dynamic'
const GymQR = dynamic(() => import('@/components/gym-qr'), { ssr: false })
import { useState } from 'react'
import {
  Building2, Phone, Mail, MapPin, FileText,
  Globe, Save, CheckCircle2,
} from 'lucide-react'

type Tab = 'gym' | 'notifications' | 'billing'

interface Props {
  org: Record<string, any> | null
  userFullName: string
}

export default function SettingsClient({ org, userFullName }: Props) {
  const [tab, setTab] = useState<Tab>('gym')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Gym profile form state
  const [name, setName] = useState(org?.name ?? '')
  const [phone, setPhone] = useState(org?.phone ?? '')
  const [email, setEmail] = useState(org?.email ?? '')
  const [address, setAddress] = useState(org?.address ?? '')
  const [city, setCity] = useState(org?.city ?? '')
  const [state, setState] = useState(org?.state ?? '')
  const [pincode, setPincode] = useState(org?.pincode ?? '')
  const [gstNumber, setGstNumber] = useState(org?.gst_number ?? '')
  const [operatingHours, setOperatingHours] = useState(org?.operating_hours ?? '')
  const [website, setWebsite] = useState(org?.website ?? '')

  // Notification toggles
  const [notifyExpiry, setNotifyExpiry] = useState(true)
  const [notifyReceipt, setNotifyReceipt] = useState(true)
  const [notifyWelcome, setNotifyWelcome] = useState(true)

  async function handleSave() {
    if (!name.trim()) { setError('Gym name is required'); return }

    setSaving(true)
    setSaved(false)
    setError('')

    console.log('[Settings] Saving:', { name, phone, email, gstNumber })

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        gst_number: gstNumber.trim() || null,
        operating_hours: operatingHours.trim() || null,
        website: website.trim() || null,
      }),
    })

    const json = await res.json()
    console.log('[Settings] Response:', json)

    if (!res.ok) {
      setError(json.error ?? 'Failed to save')
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'gym', label: 'Gym profile' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'billing', label: 'Billing' },
  ]

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="mt-0.5 text-sm text-ink-muted">Manage your gym profile and preferences</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
        {/* Tab nav */}
        <nav className="flex gap-1 lg:flex-col">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-brand-muted text-brand'
                  : 'text-ink-secondary hover:bg-bg-page'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="rounded-xl border border-border bg-bg-card p-6 shadow-sm">

          {/* ── Gym profile ── */}
          {tab === 'gym' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-muted text-xl font-bold text-brand">
                  {name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'GY'}
                </div>
                <div>
                  <p className="font-semibold text-ink">{name || 'Your Gym'}</p>
                  <p className="text-xs text-ink-muted">Gym logo upload coming soon</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Name */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-ink-secondary">Gym name *</label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Iron Fitness, Adyar"
                      className="h-10 w-full rounded-lg border border-border-medium bg-bg-input pl-9 pr-3 text-sm text-ink focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-ink-secondary">Phone</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98401 00200"
                      type="tel"
                      className="h-10 w-full rounded-lg border border-border-medium bg-bg-input pl-9 pr-3 text-sm text-ink focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-ink-secondary">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="gym@ironfitness.in"
                      type="email"
                      className="h-10 w-full rounded-lg border border-border-medium bg-bg-input pl-9 pr-3 text-sm text-ink focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-ink-secondary">Address</label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-muted" />
                    <textarea
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="2nd Floor, 14 Anna Salai, Adyar, Chennai"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-border-medium bg-bg-input pb-2 pl-9 pr-3 pt-2 text-sm text-ink focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                    />
                  </div>
                </div>

                {/* City + State + Pincode */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-ink-secondary">City</label>
                  <input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Chennai"
                    className="h-10 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-ink-secondary">State</label>
                    <input
                      value={state}
                      onChange={e => setState(e.target.value)}
                      placeholder="Tamil Nadu"
                      className="h-10 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-ink-secondary">Pincode</label>
                    <input
                      value={pincode}
                      onChange={e => setPincode(e.target.value)}
                      placeholder="600020"
                      className="h-10 rounded-lg border border-border-medium bg-bg-input px-3 text-sm text-ink focus:border-brand-light focus:outline-none"
                    />
                  </div>
                </div>

                {/* GST */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-ink-secondary">GST number</label>
                  <div className="relative">
                    <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input
                      value={gstNumber}
                      onChange={e => setGstNumber(e.target.value.toUpperCase())}
                      placeholder="33ABCDE1234F1Z5"
                      className="h-10 w-full rounded-lg border border-border-medium bg-bg-input pl-9 pr-3 text-sm font-mono text-ink focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                    />
                  </div>
                </div>

                {/* Operating hours */}
                <div className="sm:col-span-2">
                  <TimeRangePicker
                    value={operatingHours || '5:00 AM – 10:00 PM'}
                    onChange={setOperatingHours}
                  />
                </div>

                {/* Website */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-ink-secondary">Website (optional)</label>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      placeholder="https://ironfitness.in"
                      type="url"
                      className="h-10 w-full rounded-lg border border-border-medium bg-bg-input pl-9 pr-3 text-sm text-ink focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                    />
                  </div>
                </div>
              </div>

              {/* QR Code section */}
              <div className="rounded-xl border border-border p-4 sm:col-span-2">
                <p className="mb-4 text-sm font-semibold text-ink">Gym QR code &amp; join link</p>
                <p className="mb-4 text-xs text-ink-muted">
                  Members scan this QR to join your gym and log daily attendance. Print and display it at the entrance.
                </p>
                {org?.gym_code ? (
                  <GymQR gymCode={org.gym_code} gymName={name || org.name} />
                ) : (
                  <p className="text-sm text-ink-muted">No gym code generated yet. Save your settings first.</p>
                )}
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                {saved && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                    <CheckCircle2 className="h-4 w-4" /> Saved successfully
                  </div>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {tab === 'notifications' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-ink">WhatsApp notifications</p>
              <p className="text-xs text-ink-muted">These require a connected WhatsApp BSP account (Phase 6)</p>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {[
                  { key: 'expiry', label: 'Expiry reminder', desc: '3 days before membership expires', value: notifyExpiry, set: setNotifyExpiry },
                  { key: 'receipt', label: 'Payment receipt', desc: 'Sent automatically after every payment', value: notifyReceipt, set: setNotifyReceipt },
                  { key: 'welcome', label: 'Welcome message', desc: 'Sent when a new member is registered', value: notifyWelcome, set: setNotifyWelcome },
                ].map(({ key, label, desc, value, set }) => (
                  <label key={key} className="flex cursor-pointer items-center justify-between p-4 hover:bg-bg-page">
                    <div>
                      <p className="text-sm font-medium text-ink">{label}</p>
                      <p className="text-xs text-ink-muted">{desc}</p>
                    </div>
                    <div
                      onClick={() => set(!value)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${value ? 'bg-brand' : 'bg-border-medium'}`}
                    >
                      <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Billing ── */}
          {tab === 'billing' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">Current plan</p>
                <p className="text-xl font-bold capitalize text-ink">{org?.platform_plan ?? 'Starter'}</p>
                <p className="text-sm text-ink-muted mt-0.5">
                  {org?.platform_status === 'trial'
                    ? `Trial · ends ${new Date(org?.platform_trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`
                    : 'Active subscription'
                  }
                </p>
              </div>
              <div className="rounded-xl border border-border p-4 text-sm text-ink-muted">
                Razorpay billing integration coming in Phase 7. Your 14-day trial is active.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

// NOTE: GymQR import added at top — see updated file
