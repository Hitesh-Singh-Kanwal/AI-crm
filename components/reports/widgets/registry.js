import SingleKpiCardWidget from './SingleKpiCardWidget'
import RevenueTrendWidget from './RevenueTrendWidget'
import SalesPipelineWidget from './SalesPipelineWidget'
import LeadSourcesChartWidget from './LeadSourcesChartWidget'
import WeeklyActivityWidget from './WeeklyActivityWidget'
import ConversionFunnelWidget from './ConversionFunnelWidget'

// `size` ('quarter' | 'third' | 'half' | 'full', default 'full') controls
// how much of the 12-column row a widget occupies. Every entry is
// independently draggable/hideable — nothing is bundled.
export const reportsWidgetRegistry = [
  { id: 'kpi-revenue', title: 'Total Revenue', component: SingleKpiCardWidget, size: 'quarter', props: { index: 0 } },
  { id: 'kpi-leads', title: 'New Leads', component: SingleKpiCardWidget, size: 'quarter', props: { index: 1 } },
  { id: 'kpi-conversion', title: 'Conversion Rate', component: SingleKpiCardWidget, size: 'quarter', props: { index: 2 } },
  { id: 'kpi-deal-size', title: 'Avg Deal Size', component: SingleKpiCardWidget, size: 'quarter', props: { index: 3 } },
  { id: 'revenue-trend', title: 'Revenue Trend', component: RevenueTrendWidget, size: 'full' },
  { id: 'sales-pipeline', title: 'Sales Pipeline', component: SalesPipelineWidget, size: 'half' },
  { id: 'lead-sources', title: 'Lead Sources', component: LeadSourcesChartWidget, size: 'half' },
  { id: 'weekly-activity', title: 'Weekly Activity', component: WeeklyActivityWidget, size: 'half' },
  { id: 'conversion-funnel', title: 'Conversion Funnel', component: ConversionFunnelWidget, size: 'half' },
]
