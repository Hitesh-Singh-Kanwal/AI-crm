import OverviewStatsWidget from './OverviewStatsWidget'
import BookingTrendAndFollowUpWidget from './BookingTrendAndFollowUpWidget'
import RevenueAndAiAgentWidget from './RevenueAndAiAgentWidget'
import ApiExpenseWidget from './ApiExpenseWidget'
import HumanInterventionWidget from './HumanInterventionWidget'
import LeadsAndStudioBreakdownWidget from './LeadsAndStudioBreakdownWidget'
import ResponseRateWidget from './ResponseRateWidget'
import GrossNetRevenueWidget from './GrossNetRevenueWidget'

// Registry order is the default layout order for a user who has never
// customized their dashboard. Every entry is one row-level widget that
// drags/hides as a whole unit — no widget is split up internally, so
// related cards that used to share a row (e.g. a chart next to its table)
// stay bundled together instead of being independently draggable.
export const dashboardWidgetRegistry = [
  { id: 'overview-stats', title: 'Overview Stats', component: OverviewStatsWidget, size: 'full' },
  { id: 'booking-trend-follow-up', title: 'Booking Rate Trend & Follow-up Effectiveness', component: BookingTrendAndFollowUpWidget, size: 'full' },
  { id: 'revenue-ai-agent', title: 'Revenue & AI Agent Revenue', component: RevenueAndAiAgentWidget, size: 'full' },
  { id: 'api-expense', title: 'API Expense by Channel', component: ApiExpenseWidget, size: 'full' },
  { id: 'human-intervention', title: 'Human Intervention', component: HumanInterventionWidget, size: 'full' },
  { id: 'leads-and-studio-breakdown', title: 'Leads by Source & Per Studio Breakdown', component: LeadsAndStudioBreakdownWidget, size: 'full' },
  { id: 'response-rate', title: 'Response Rate by Day & Time', component: ResponseRateWidget, size: 'full' },
  { id: 'gross-net-revenue', title: 'Gross & Net Revenue', component: GrossNetRevenueWidget, size: 'full' },
]
