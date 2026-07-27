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
 * Each widget's `permission` names the backend module (under the "dashboard"
 * permission category) that gates it — matches DASHBOARD_OVERVIEW_KEY_PERMISSIONS
 * in the backend repo (dashboardOverviewSections.js), which also filters the
 * /api/dashboard/overview response to just the keys the caller can see.
 * "leadConversion" = raw lead/pipeline/booking metrics; "AiAnalytics" =
 * AI-agent, automation, cost, and engagement analytics.
 */
const PERMISSION = {
  leadConversion: { category: 'dashboard', module: 'leadConversion' },
  aiAnalytics: { category: 'dashboard', module: 'AiAnalytics' },
}

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
    permission: PERMISSION.leadConversion,
    component: OverviewStatsWidget,
    defaultSize: 'full',
    allowedSizes: ['full', 'half'],
  },
  {
    id: 'pipeline',
    title: 'Sales Pipeline',
    description: 'Current lead distribution by stage',
    category: 'Pipeline',
    permission: PERMISSION.leadConversion,
    component: PipelineWidget,
    defaultSize: 'third',
    allowedSizes: ['third', 'half', 'full'],
  },
  {
    id: 'weekly-activity',
    title: 'Weekly Activity',
    description: 'Calls, emails, and SMS by weekday',
    category: 'Activity',
    permission: PERMISSION.aiAnalytics,
    component: WeeklyActivityWidget,
    defaultSize: 'third',
    allowedSizes: ['third', 'half', 'full'],
  },
  {
    id: 'conversion-funnel',
    title: 'Conversion Funnel',
    description: 'Lead → engaged → booked → converted',
    category: 'Pipeline',
    permission: PERMISSION.leadConversion,
    component: ConversionFunnelWidget,
    defaultSize: 'third',
    allowedSizes: ['third', 'half', 'full'],
  },
  {
    id: 'booking-trend',
    title: 'Booking Rate Trend',
    description: 'Booking rate over the last 8 weeks',
    category: 'Performance',
    permission: PERMISSION.leadConversion,
    component: BookingTrendWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'follow-up-effectiveness',
    title: 'Follow-up Effectiveness',
    description: 'Reply rates by SMS follow-up attempt',
    category: 'Performance',
    permission: PERMISSION.aiAnalytics,
    component: FollowUpEffectivenessWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'revenue-ai-agent',
    title: 'Revenue & AI Agent',
    description: 'Intro revenue and year-over-year comparison',
    category: 'Revenue',
    permission: PERMISSION.aiAnalytics,
    component: RevenueAndAiAgentWidget,
    defaultSize: 'full',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'gross-net-revenue',
    title: 'Gross & Net Revenue',
    description: 'Revenue after estimated API costs',
    category: 'Revenue',
    permission: PERMISSION.aiAnalytics,
    component: GrossNetRevenueWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'api-expense',
    title: 'API Expense',
    description: 'Spend by SMS, calls, email, and AI',
    category: 'Costs',
    permission: PERMISSION.aiAnalytics,
    component: ApiExpenseWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'human-intervention',
    title: 'Human Intervention',
    description: 'Escalation reasons and queue health',
    category: 'Operations',
    permission: PERMISSION.aiAnalytics,
    component: HumanInterventionWidget,
    defaultSize: 'full',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'leads-by-source',
    title: 'Leads by Source',
    description: 'Lead volume and bookings by source',
    category: 'Leads',
    permission: PERMISSION.leadConversion,
    component: LeadsBySourceWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'studio-breakdown',
    title: 'Studio Breakdown',
    description: 'Leads and booking rate by location',
    category: 'Leads',
    permission: PERMISSION.leadConversion,
    component: StudioBreakdownWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'response-rate-day',
    title: 'Response Rate by Day',
    description: 'SMS sent vs reply by weekday',
    category: 'Engagement',
    permission: PERMISSION.aiAnalytics,
    component: ResponseRateByDayWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'response-rate-time',
    title: 'Response Rate by Time',
    description: 'SMS engagement by time of day',
    category: 'Engagement',
    permission: PERMISSION.aiAnalytics,
    component: ResponseRateByTimeWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
]

/** Map old composite widget ids → new atomic ids for layout migration. */
export { LEGACY_WIDGET_MAP } from './legacyWidgetMap'
