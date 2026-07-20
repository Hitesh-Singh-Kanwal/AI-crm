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
      className="bg-card h-full w-full border-l-0 lg:border-l border-border rounded-none lg:rounded-r-lg overflow-y-auto lg:min-w-[280px] lg:max-w-[340px]"
      style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className="relative flex flex-col items-center pt-8 pb-4 px-5 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Avatar */}
        <div
          className="flex items-center justify-center rounded-full mb-3 bg-primary/15 ring-1 ring-border"
          style={{
            width: 72,
            height: 72,
          }}
        >
          <span className="text-xl font-bold text-primary">
            {getInitials(name)}
          </span>
        </div>

        <h2 className="text-base font-semibold text-foreground">{name}</h2>
        {phoneNumber && <p className="text-sm text-muted-foreground mt-0.5">{phoneNumber}</p>}
        {email && <p className="text-xs text-muted-foreground mt-0.5">{email}</p>}
      </div>

      {/* Lead Info */}
      <div className="px-5 py-4 space-y-4 border-b border-border">
        <InfoRow label="Lead Stage" value={stage || 'No Stage'} />
        <InfoRow
          label="Active sales journey"
          value={activeSalesJourney || 'No active sales journey'}
          valueClassName={!activeSalesJourney ? 'text-red-500 dark:text-red-400 font-medium' : 'text-foreground'}
        />
        <InfoRow
          label="Booking Status"
          value={bookingStatus || 'Not Booked'}
          valueClassName={bookingStatus === 'Booked' ? 'text-green-600 dark:text-green-400 font-medium' : 'text-foreground'}
        />
        {location && <InfoRow label="Location" value={location} />}
        {isEscalated !== null && (
          <InfoRow
            label="Escalated"
            value={isEscalated ? 'Yes' : 'No'}
            valueClassName={isEscalated ? 'text-red-500 dark:text-red-400 font-medium' : 'text-foreground'}
          />
        )}
        {assignedAiAgent && <InfoRow label="AI Agent" value={assignedAiAgent} />}
        {assignedHumanAgent && <InfoRow label="Human Agent" value={assignedHumanAgent} />}
      </div>

      {/* Account Totals */}
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Account totals</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Money Credits</p>
            <p className="text-sm font-semibold text-foreground">$0.00</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Class/Appointment credit</p>
            <p className="text-sm font-semibold text-foreground">0</p>
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

function InfoRow({ label, value, valueClassName = 'text-foreground' }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm ${valueClassName}`}>{value}</p>
    </div>
  )
}
