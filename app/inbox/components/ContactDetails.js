import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'

export default function ContactDetails({ contact, leadData, onClose }) {
  if (!contact) return null

  // Use leadData (full API response) when available, fall back to contact
  const lead = leadData || {}
  const name = lead.name || contact.name
  const email = lead.email || contact.email || ''
  const phoneNumber = lead.phoneNumber || contact.phoneNumber || ''
  const stage = lead.stage ? capitalize(lead.stage) : null
  const bookingStatus = lead.bookingStatus || null
  const rawLocation = lead.location || null
  // Guard against raw ObjectIds stored in the location field (legacy data issue)
  const location = rawLocation && /^[a-f0-9]{24}$/i.test(rawLocation) ? null : rawLocation
  const isEscalated = lead.isEscalated ?? null
  const assignedAiAgent = lead.assignedAiAgent || null
  const assignedHumanAgent = lead.assignedHumanAgent || null
  const activeSalesJourney = Array.isArray(lead.flowInstances) && lead.flowInstances.length > 0
    ? `${lead.flowInstances.length} active flow${lead.flowInstances.length > 1 ? 's' : ''}`
    : null

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
            {getInitials(name)}
          </span>
        </div>

        <h2 className="text-base font-semibold text-slate-900">{name}</h2>
        {phoneNumber && <p className="text-sm text-slate-500 mt-0.5">{phoneNumber}</p>}
        {email && <p className="text-xs text-slate-400 mt-0.5">{email}</p>}
      </div>

      {/* Lead Info */}
      <div className="px-5 py-4 space-y-4 border-b border-slate-100">
        <InfoRow label="Lead Stage" value={stage || 'No Stage'} />
        <InfoRow
          label="Active sales journey"
          value={activeSalesJourney || 'No active sales journey'}
          valueClassName={!activeSalesJourney ? 'text-red-500 font-medium' : 'text-slate-700'}
        />
        <InfoRow
          label="Booking Status"
          value={bookingStatus || 'Not Booked'}
          valueClassName={bookingStatus === 'Booked' ? 'text-green-600 font-medium' : 'text-slate-700'}
        />
        {location && <InfoRow label="Location" value={location} />}
        {isEscalated !== null && (
          <InfoRow
            label="Escalated"
            value={isEscalated ? 'Yes' : 'No'}
            valueClassName={isEscalated ? 'text-red-500 font-medium' : 'text-slate-700'}
          />
        )}
        {assignedAiAgent && <InfoRow label="AI Agent" value={assignedAiAgent} />}
        {assignedHumanAgent && <InfoRow label="Human Agent" value={assignedHumanAgent} />}
      </div>

      {/* Account Totals */}
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Account totals</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500">Money Credits</p>
            <p className="text-sm font-semibold text-slate-800">$0.00</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Class/Appointment credit</p>
            <p className="text-sm font-semibold text-slate-800">0</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function capitalize(str) {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function InfoRow({ label, value, valueClassName = 'text-slate-700' }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm ${valueClassName}`}>{value}</p>
    </div>
  )
}