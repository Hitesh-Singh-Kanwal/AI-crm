import StudentHealthOverviewWidget from './StudentHealthOverviewWidget'
import StudentHealthByStudioWidget from './StudentHealthByStudioWidget'
import RevenueByStudioWidget from './RevenueByStudioWidget'
import MembershipRevenueWidget from './MembershipRevenueWidget'
import OutstandingBalancesWidget from './OutstandingBalancesWidget'
import LessonsByStudioWidget from './LessonsByStudioWidget'
import LessonsByTeacherWidget from './LessonsByTeacherWidget'
import LessonTrendWidget from './LessonTrendWidget'
import LessonForecastWidget from './LessonForecastWidget'
import ConversionFunnelReportsWidget from './ConversionFunnelReportsWidget'
import InstructorUtilizationWidget from './InstructorUtilizationWidget'
import PurchaseJourneyWidget from './PurchaseJourneyWidget'
import RevenueByCurriculumWidget from './RevenueByCurriculumWidget'
import LessonsByCurriculumWidget from './LessonsByCurriculumWidget'
import CurriculumProgressionWidget from './CurriculumProgressionWidget'
import GoalsWidget from './GoalsWidget'
import LeadsByUploadTypeWidget from './LeadsByUploadTypeWidget'
import { withOwnRange, withRangeState } from './withOwnRange'

/**
 * Each widget's `permission` names the backend module (under the "dashboard"
 * permission category — see permissions.helper.js in the backend repo) that
 * gates it. A role needs "read" on that specific module to see this widget at
 * all — there's no single blanket "Owner Dashboard" permission anymore, each
 * section (Student Health, Revenue, Lessons, Funnel, Marketing, Goals) is
 * independently grantable in Settings → Roles.
 */
const PERMISSION = {
  studentHealth: { category: 'dashboard', module: 'OwnerOverviewStudentHealth' },
  revenue: { category: 'dashboard', module: 'OwnerOverviewRevenue' },
  lessons: { category: 'dashboard', module: 'OwnerOverviewLessons' },
  funnel: { category: 'dashboard', module: 'OwnerOverviewFunnel' },
  marketing: { category: 'dashboard', module: 'OwnerOverviewMarketing' },
  goals: { category: 'dashboard', module: 'goals' },
}

/**
 * Atomic Owner Dashboard widgets. Each entry is independently addable,
 * removable, resizable, and reorderable via DashboardBuilder.
 *
 * Each widget also manages its own date-range (7D/30D/90D/12M) independently
 * of every other widget — `withOwnRange` gives a widget its own local range
 * state and its own owner-overview fetch (deduped by SWR when two widgets
 * happen to share the same range); `withRangeState` is for widgets that fetch
 * their own data directly instead of reading owner-overview (Leads by Source).
 */
export const ownerDashboardWidgetRegistry = [
  {
    id: 'owner-student-health-overview',
    title: 'Student Health Overview',
    description: 'Active students, booked %, and new-active growth',
    category: 'Student Health',
    permission: PERMISSION.studentHealth,
    component: withOwnRange(StudentHealthOverviewWidget),
    defaultSize: 'full',
    allowedSizes: ['full', 'half'],
  },
  {
    id: 'owner-student-health-by-studio',
    title: 'Student Health by Studio',
    description: 'Booked vs not-booked active students per studio',
    category: 'Student Health',
    permission: PERMISSION.studentHealth,
    component: withOwnRange(StudentHealthByStudioWidget),
    defaultSize: 'full',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-revenue-by-studio',
    title: 'Revenue by Studio',
    description: 'Net revenue per studio for the selected period',
    category: 'Revenue',
    permission: PERMISSION.revenue,
    component: withOwnRange(RevenueByStudioWidget),
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-membership-revenue',
    title: 'Membership Revenue',
    description: 'Revenue split by membership type',
    category: 'Revenue',
    permission: PERMISSION.revenue,
    component: withOwnRange(MembershipRevenueWidget),
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-outstanding-balances',
    title: 'Outstanding Balances',
    description: 'Amounts due on active packages and memberships',
    category: 'Revenue',
    permission: PERMISSION.revenue,
    component: withOwnRange(OutstandingBalancesWidget),
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-lessons-by-studio',
    title: 'Lessons by Studio',
    description: 'Completed lessons per studio',
    category: 'Lessons',
    permission: PERMISSION.lessons,
    component: withOwnRange(LessonsByStudioWidget),
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-lessons-by-teacher',
    title: 'Lessons by Teacher',
    description: 'Completed lessons per teacher',
    category: 'Lessons',
    permission: PERMISSION.lessons,
    component: withOwnRange(LessonsByTeacherWidget),
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-lesson-trend',
    title: 'Lessons Trend',
    description: 'Completed lessons by week',
    category: 'Lessons',
    permission: PERMISSION.lessons,
    component: withOwnRange(LessonTrendWidget),
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-lesson-forecast',
    title: 'Scheduled Lessons Forecast',
    description: 'Upcoming scheduled lessons per studio',
    category: 'Lessons',
    permission: PERMISSION.lessons,
    component: withOwnRange(LessonForecastWidget),
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-instructor-utilization',
    title: 'Instructor Utilization',
    description: 'Actual lessons per week vs. each teacher\'s weekly capacity',
    category: 'Lessons',
    permission: PERMISSION.lessons,
    component: withOwnRange(InstructorUtilizationWidget),
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-conversion-funnel-reports',
    title: 'Conversion Funnel Reports',
    description: 'Lead to Intro Booked, and Intro to First Purchase',
    category: 'Funnel',
    permission: PERMISSION.funnel,
    component: withOwnRange(ConversionFunnelReportsWidget),
    defaultSize: 'full',
    allowedSizes: ['full'],
  },
  {
    id: 'owner-purchase-journey',
    title: 'Purchase Journey',
    description: 'Repeat-purchase progression and value per milestone',
    category: 'Funnel',
    permission: PERMISSION.funnel,
    component: withOwnRange(PurchaseJourneyWidget),
    defaultSize: 'full',
    allowedSizes: ['full'],
  },
  {
    id: 'owner-revenue-by-curriculum',
    title: 'Revenue by Curriculum Tier',
    description: 'Purchase revenue split by curriculum tier',
    category: 'Revenue',
    permission: PERMISSION.revenue,
    component: withOwnRange(RevenueByCurriculumWidget),
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-lessons-by-curriculum',
    title: 'Lessons by Curriculum Tier',
    description: 'Completed lessons split by curriculum tier',
    category: 'Lessons',
    permission: PERMISSION.lessons,
    component: withOwnRange(LessonsByCurriculumWidget),
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-curriculum-progression',
    title: 'Curriculum Progression',
    description: 'Students who have ever reached each curriculum tier',
    category: 'Funnel',
    permission: PERMISSION.funnel,
    component: withOwnRange(CurriculumProgressionWidget),
    defaultSize: 'full',
    allowedSizes: ['full'],
  },
  {
    id: 'owner-leads-by-source',
    title: 'Leads by Source',
    description: 'Leads grouped by upload type — manual, bulk upload, form, and incoming channels',
    category: 'Marketing',
    permission: PERMISSION.marketing,
    component: withRangeState(LeadsByUploadTypeWidget),
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-goals',
    title: 'Goals This Month',
    description: 'Revenue, new students, and lessons vs. this month\'s targets',
    category: 'Goals',
    permission: PERMISSION.goals,
    component: withOwnRange(GoalsWidget),
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
]
