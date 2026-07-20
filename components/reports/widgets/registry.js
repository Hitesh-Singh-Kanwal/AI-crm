import KpiCardsWidget from './KpiCardsWidget'
import RevenueTrendWidget from './RevenueTrendWidget'
import SalesPipelineAndLeadSourcesWidget from './SalesPipelineAndLeadSourcesWidget'
import WeeklyActivityAndFunnelWidget from './WeeklyActivityAndFunnelWidget'

// Each entry is one row-level widget that drags/hides as a whole unit.
export const reportsWidgetRegistry = [
  { id: 'kpi-cards', title: 'KPI Cards', component: KpiCardsWidget, defaultSize: 'full', allowedSizes: ['full'] },
  { id: 'revenue-trend', title: 'Revenue Trend', component: RevenueTrendWidget, defaultSize: 'full', allowedSizes: ['full', 'half'] },
  { id: 'sales-pipeline-lead-sources', title: 'Sales Pipeline & Lead Sources', component: SalesPipelineAndLeadSourcesWidget, defaultSize: 'full', allowedSizes: ['full', 'half'] },
  { id: 'weekly-activity-funnel', title: 'Weekly Activity & Conversion Funnel', component: WeeklyActivityAndFunnelWidget, defaultSize: 'full', allowedSizes: ['full', 'half'] },
]
