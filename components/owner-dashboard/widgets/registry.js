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

/**
 * Atomic Owner Dashboard widgets. Each entry is independently addable,
 * removable, resizable, and reorderable via DashboardBuilder.
 */
export const ownerDashboardWidgetRegistry = [
  {
    id: 'owner-student-health-overview',
    title: 'Student Health Overview',
    description: 'Active students, booked %, and new-active growth',
    category: 'Student Health',
    component: StudentHealthOverviewWidget,
    defaultSize: 'full',
    allowedSizes: ['full', 'half'],
  },
  {
    id: 'owner-student-health-by-studio',
    title: 'Student Health by Studio',
    description: 'Booked vs not-booked active students per studio',
    category: 'Student Health',
    component: StudentHealthByStudioWidget,
    defaultSize: 'full',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-revenue-by-studio',
    title: 'Revenue by Studio',
    description: 'Net revenue per studio for the selected period',
    category: 'Revenue',
    component: RevenueByStudioWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-membership-revenue',
    title: 'Membership Revenue',
    description: 'Revenue split by membership type',
    category: 'Revenue',
    component: MembershipRevenueWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-outstanding-balances',
    title: 'Outstanding Balances',
    description: 'Amounts due on active packages and memberships',
    category: 'Revenue',
    component: OutstandingBalancesWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-lessons-by-studio',
    title: 'Lessons by Studio',
    description: 'Completed lessons per studio',
    category: 'Lessons',
    component: LessonsByStudioWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-lessons-by-teacher',
    title: 'Lessons by Teacher',
    description: 'Completed lessons per teacher',
    category: 'Lessons',
    component: LessonsByTeacherWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-lesson-trend',
    title: 'Lessons Trend',
    description: 'Completed lessons by week',
    category: 'Lessons',
    component: LessonTrendWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-lesson-forecast',
    title: 'Scheduled Lessons Forecast',
    description: 'Upcoming scheduled lessons per studio',
    category: 'Lessons',
    component: LessonForecastWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-instructor-utilization',
    title: 'Instructor Utilization',
    description: 'Actual lessons per week vs. each teacher\'s weekly capacity',
    category: 'Lessons',
    component: InstructorUtilizationWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-conversion-funnel-reports',
    title: 'Conversion Funnel Reports',
    description: 'Lead to Intro Booked, and Intro to First Purchase',
    category: 'Funnel',
    component: ConversionFunnelReportsWidget,
    defaultSize: 'full',
    allowedSizes: ['full'],
  },
  {
    id: 'owner-purchase-journey',
    title: 'Purchase Journey',
    description: 'Repeat-purchase progression and value per milestone',
    category: 'Funnel',
    component: PurchaseJourneyWidget,
    defaultSize: 'full',
    allowedSizes: ['full'],
  },
  {
    id: 'owner-revenue-by-curriculum',
    title: 'Revenue by Curriculum Tier',
    description: 'Purchase revenue split by curriculum tier',
    category: 'Revenue',
    component: RevenueByCurriculumWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-lessons-by-curriculum',
    title: 'Lessons by Curriculum Tier',
    description: 'Completed lessons split by curriculum tier',
    category: 'Lessons',
    component: LessonsByCurriculumWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  {
    id: 'owner-curriculum-progression',
    title: 'Curriculum Progression',
    description: 'Students who have ever reached each curriculum tier',
    category: 'Funnel',
    component: CurriculumProgressionWidget,
    defaultSize: 'full',
    allowedSizes: ['full'],
  },
  {
    id: 'owner-goals',
    title: 'Goals This Month',
    description: 'Revenue, new students, and lessons vs. this month\'s targets',
    category: 'Goals',
    component: GoalsWidget,
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
]
