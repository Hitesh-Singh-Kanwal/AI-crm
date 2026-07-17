import StatCardWidget from './StatCardWidget'
import BookingRateTrendWidget from './BookingRateTrendWidget'
import RevenueFromIntrosWidget from './RevenueFromIntrosWidget'
import HumanInterventionRequiredWidget from './HumanInterventionRequiredWidget'
import AiAgentRevenueWidget from './AiAgentRevenueWidget'
import ApiExpenseWidget from './ApiExpenseWidget'
import HumanInterventionByStageWidget from './HumanInterventionByStageWidget'
import HumanInterventionBookingRateWidget from './HumanInterventionBookingRateWidget'
import FollowUpEffectivenessWidget from './FollowUpEffectivenessWidget'
import ResponseRateWidget from './ResponseRateWidget'
import LeadsBySourceWidget from './LeadsBySourceWidget'
import PerStudioBreakdownWidget from './PerStudioBreakdownWidget'
import GrossRevenueWidget from './GrossRevenueWidget'
import NetRevenueWidget from './NetRevenueWidget'

// Registry order is the default layout order for a user who has never
// customized their dashboard. `size` ('third' | 'half' | 'full', default
// 'full') controls how much of the 6-column row a widget occupies. Every
// entry here is its own independently draggable/hideable widget — nothing
// is bundled, so any card can be moved into any row on its own.
export const dashboardWidgetRegistry = [
  { id: 'stat-total-leads', title: 'Total Leads', component: StatCardWidget, size: 'third', props: { statKey: 'totalLeads', label: 'TOTAL LEADS', format: 'number' } },
  { id: 'stat-total-bookings', title: 'Total Bookings', component: StatCardWidget, size: 'third', props: { statKey: 'totalBookings', label: 'TOTAL BOOKINGS', format: 'number' } },
  { id: 'stat-booking-rate', title: 'Booking Rate', component: StatCardWidget, size: 'third', props: { statKey: 'bookingRate', label: 'BOOKING RATE', format: 'percent' } },
  { id: 'booking-rate-trend', title: 'Booking Rate Trend', component: BookingRateTrendWidget, size: 'half' },
  { id: 'follow-up-effectiveness', title: 'Follow-up Effectiveness', component: FollowUpEffectivenessWidget, size: 'half' },
  { id: 'revenue-from-intros', title: 'Revenue Collected from Intros', component: RevenueFromIntrosWidget, size: 'third' },
  { id: 'human-intervention-required', title: 'Human Intervention Required', component: HumanInterventionRequiredWidget, size: 'third' },
  { id: 'ai-agent-revenue', title: 'AI Agent Revenue', component: AiAgentRevenueWidget, size: 'half' },
  { id: 'api-expense', title: 'API Expense by Channel', component: ApiExpenseWidget, size: 'full' },
  { id: 'human-intervention-by-stage', title: 'Human Intervention by Reason', component: HumanInterventionByStageWidget, size: 'half' },
  { id: 'human-intervention-booking-rate', title: 'Human Intervention Booking Rate', component: HumanInterventionBookingRateWidget, size: 'half' },
  { id: 'leads-by-source', title: 'Leads by Source & Conversion Rate', component: LeadsBySourceWidget, size: 'half' },
  { id: 'per-studio-breakdown', title: 'Per Studio Breakdown', component: PerStudioBreakdownWidget, size: 'half' },
  { id: 'response-rate', title: 'Response Rate by Day & Time', component: ResponseRateWidget, size: 'full' },
  { id: 'gross-revenue', title: 'Gross Revenue', component: GrossRevenueWidget, size: 'third' },
  { id: 'net-revenue', title: 'Net Revenue', component: NetRevenueWidget, size: 'third' },
]
