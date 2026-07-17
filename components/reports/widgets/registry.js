import KpiCardsWidget from './KpiCardsWidget'
import RevenueTrendWidget from './RevenueTrendWidget'
import SalesPipelineAndLeadSourcesWidget from './SalesPipelineAndLeadSourcesWidget'
import WeeklyActivityAndFunnelWidget from './WeeklyActivityAndFunnelWidget'

// Each entry is one row-level widget that drags/hides as a whole unit.
export const reportsWidgetRegistry = [
  { id: 'kpi-cards', title: 'KPI Cards', component: KpiCardsWidget },
  { id: 'revenue-trend', title: 'Revenue Trend', component: RevenueTrendWidget },
  { id: 'sales-pipeline-lead-sources', title: 'Sales Pipeline & Lead Sources', component: SalesPipelineAndLeadSourcesWidget },
  { id: 'weekly-activity-funnel', title: 'Weekly Activity & Conversion Funnel', component: WeeklyActivityAndFunnelWidget },
]
