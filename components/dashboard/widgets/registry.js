import OverviewStatsWidget from './OverviewStatsWidget'
import PipelineWidget from './PipelineWidget'
import WeeklyActivityWidget from './WeeklyActivityWidget'
import ConversionFunnelWidget from './ConversionFunnelWidget'
import BookingTrendWidget from './BookingTrendWidget'
import FollowUpEffectivenessWidget from './FollowUpEffectivenessWidget'
import RevenueAndAiAgentWidget from './RevenueAndAiAgentWidget'
import ApiExpenseWidget from './ApiExpenseWidget'
import HumanInterventionWidget from './HumanInterventionWidget'
import LeadsBySourceWidget from './LeadsBySourceWidget'
import StudioBreakdownWidget from './StudioBreakdownWidget'
import ResponseRateByDayWidget from './ResponseRateByDayWidget'
import ResponseRateByTimeWidget from './ResponseRateByTimeWidget'
import GrossNetRevenueWidget from './GrossNetRevenueWidget'

/**
 * Atomic dashboard widgets. Each entry is independently addable, removable,
 * resizable, and reorderable. `defaultSize` is used for first-time layouts;
 * users can change size in customize mode. `allowedSizes` restricts options.
 */
export const dashboardWidgetRegistry = [
  {
    id: 'overview-stats',
    title: 'Overview Stats',
    description: 'Leads, bookings, and booking rate with period trends',
    category: 'Overview',
    component: OverviewStatsWidget,
    defaultSize: 'full',
    allowedSizes: ['full', 'half'],
  },
  {
    id: 'pipeline',
    title: 'Sales Pipeline',
    description: 'Current lead distribution by stage',
    category: 'Pipeline',
    component: PipelineWidget,
    defaultSize: 'third',
    allowedSizes: ['third', 'half', 'full'],
  },
  {
    id: 'weekly-activity',
    title: 'Weekly Activity',
    description: 'Calls, emails, and SMS by weekday',
    category: 'Activity',
    component: WeeklyActivityWidget,
    defaultSize: 'third',
    allowedSizes: ['third', 'half', 'full'],
  },
  {
    id: 'conversion-funnel',
    title: 'Conversion Funnel',
    description: 'Lead → engaged → booked → converted',
    category: 'Pipeline',
    component: ConversionFunnelWidget,
    defaultSize: 'third',
    allowedSizes: ['third', 'half', 'full'],
  },
  {
    id: 'booking-trend',
    title: 'Booking Rate Trend',
    description: 'Booking rate over the last 8 weeks',
    category: 'Performance',
    component: BookingTrendWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'follow-up-effectiveness',
    title: 'Follow-up Effectiveness',
    description: 'Reply rates by SMS follow-up attempt',
    category: 'Performance',
    component: FollowUpEffectivenessWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'revenue-ai-agent',
    title: 'Revenue & AI Agent',
    description: 'Intro revenue and year-over-year comparison',
    category: 'Revenue',
    component: RevenueAndAiAgentWidget,
    defaultSize: 'full',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'gross-net-revenue',
    title: 'Gross & Net Revenue',
    description: 'Revenue after estimated API costs',
    category: 'Revenue',
    component: GrossNetRevenueWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'api-expense',
    title: 'API Expense',
    description: 'Spend by SMS, calls, email, and AI',
    category: 'Costs',
    component: ApiExpenseWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'human-intervention',
    title: 'Human Intervention',
    description: 'Escalation reasons and queue health',
    category: 'Operations',
    component: HumanInterventionWidget,
    defaultSize: 'full',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'leads-by-source',
    title: 'Leads by Source',
    description: 'Lead volume and bookings by source',
    category: 'Leads',
    component: LeadsBySourceWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'studio-breakdown',
    title: 'Studio Breakdown',
    description: 'Leads and booking rate by location',
    category: 'Leads',
    component: StudioBreakdownWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'response-rate-day',
    title: 'Response Rate by Day',
    description: 'SMS sent vs reply by weekday',
    category: 'Engagement',
    component: ResponseRateByDayWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'response-rate-time',
    title: 'Response Rate by Time',
    description: 'SMS engagement by time of day',
    category: 'Engagement',
    component: ResponseRateByTimeWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
]

/** Map old composite widget ids → new atomic ids for layout migration. */
export { LEGACY_WIDGET_MAP } from './legacyWidgetMap'
