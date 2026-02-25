import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'

export default function ContactDetails({ contact, onClose }) {
  if (!contact) return null
const memberships = contact.memberships || []
  const moneyCredits = contact.moneyCredits || '$0.00'
  const classAppointmentCredit = contact.classAppointmentCredit ?? 0

  return (
    <aside
      className="bg-white h-full border-l border-slate-200 rounded-r-lg overflow-y-auto"
      style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", minWidth: 280, maxWidth: 340 }}
    >
      {/* Header */}
      <div className="relative flex flex-col items-center pt-8 pb-4 px-5 border-b border-slate-100">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Avatar */}
        <div
          className="flex items-center justify-center rounded-full mb-3"
          style={{
            width: 72,
            height: 72,
            background: 'linear-gradient(135deg, #E9D5FF 0%, #C4B5FD 100%)',
          }}
        >
          <span className="text-xl font-bold text-purple-600">
            {getInitials(contact.name)}
          </span>
        </div>

        <h2 className="text-base font-semibold text-slate-900">{contact.name}</h2>
        {contact.phone && (
          <p className="text-sm text-slate-500 mt-0.5">{contact.phone}</p>
        )}
      </div>

      {/* Info Rows */}
      <div className="px-5 py-4 space-y-4 border-b border-slate-100">
        <InfoRow label="Lead Stage" value={contact.leadStage || 'No Stage'} />
        <InfoRow
          label="Active sales journey"
          value={contact.activeSalesJourney || 'No active sales journey'}
          valueClassName={!contact.activeSalesJourney ? 'text-red-500 font-medium' : 'text-slate-700'}
        />
        <InfoRow label="Next visit" value={contact.nextVisit || 'No scheduled visit'} />
      </div>

      {/* Active Memberships */}
      {memberships.length > 0 && (
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Active memberships</h3>
          <div className="space-y-3">
            {memberships.map((m, i) => (
              <div key={i}>
                <p className="text-sm font-medium" style={{ color: m.color || '#6366F1' }}>
                  {m.name}
                </p>
                {m.creditsRemaining != null && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Remaining:{' '}
                    <span className="text-slate-700 font-medium">{m.creditsRemaining} credits</span>
                  </p>
                )}
                {m.renewsExpires && (
                  <p className="text-xs text-slate-500">
                    Renews/Expires:{' '}
                    <span className="text-slate-700 font-medium">{m.renewsExpires}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Totals */}
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Account totals</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500">Money Credits</p>
            <p className="text-sm font-semibold text-slate-800">{moneyCredits}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Class/Appointment credit</p>
            <p className="text-sm font-semibold text-slate-800">{classAppointmentCredit}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function InfoRow({ label, value, valueClassName = 'text-slate-700' }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm ${valueClassName}`}>{value}</p>
    </div>
  )
}