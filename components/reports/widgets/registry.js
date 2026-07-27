import KpiCardsWidget from './KpiCardsWidget'
import RevenueTrendWidget from './RevenueTrendWidget'
import SalesPipelineAndLeadSourcesWidget from './SalesPipelineAndLeadSourcesWidget'
import WeeklyActivityAndFunnelWidget from './WeeklyActivityAndFunnelWidget'
import StudentHealthWidget from './StudentHealthWidget'
import ReasonForDancingWidget from './ReasonForDancingWidget'
import GroupAttendanceWidget from './GroupAttendanceWidget'
import OutstandingBalanceWidget from './OutstandingBalanceWidget'
import PaymentPlanWidget from './PaymentPlanWidget'
import RevenueByTeacherWidget from './RevenueByTeacherWidget'

// Each entry is one row-level widget that drags/hides as a whole unit.
export const reportsWidgetRegistry = [
  { id: 'kpi-cards', title: 'KPI Cards', component: KpiCardsWidget, defaultSize: 'full', allowedSizes: ['full'] },
  { id: 'revenue-trend', title: 'Revenue Trend', component: RevenueTrendWidget, defaultSize: 'full', allowedSizes: ['full', 'half'] },
  { id: 'sales-pipeline-lead-sources', title: 'Sales Pipeline & Lead Sources', component: SalesPipelineAndLeadSourcesWidget, defaultSize: 'full', allowedSizes: ['full', 'half'] },
  { id: 'outstanding-balance', title: 'Outstanding Balance', component: OutstandingBalanceWidget, defaultSize: 'full', allowedSizes: ['full', 'half'] },
  { id: 'payment-plan', title: 'Payment Plan Due', component: PaymentPlanWidget, defaultSize: 'full', allowedSizes: ['full', 'half'] },
  { id: 'revenue-by-teacher', title: 'Revenue by Teacher', component: RevenueByTeacherWidget, defaultSize: 'full', allowedSizes: ['full', 'half'] },
  { id: 'student-health', title: 'Student Health', component: StudentHealthWidget, defaultSize: 'full', allowedSizes: ['full', 'half'] },
  { id: 'reason-for-dancing', title: 'Reason for Dancing', component: ReasonForDancingWidget, defaultSize: 'full', allowedSizes: ['full', 'half'] },
  { id: 'group-attendance', title: 'Group Attendance', component: GroupAttendanceWidget, defaultSize: 'full', allowedSizes: ['full', 'half'] },
  { id: 'weekly-activity-funnel', title: 'Weekly Activity & Conversion Funnel', component: WeeklyActivityAndFunnelWidget, defaultSize: 'full', allowedSizes: ['full', 'half'] },
]
