import api from '@/lib/api'

const idOf = (ref) => String(ref?._id ?? ref ?? '')

function saleValue(enrollment) {
  const services = enrollment.package?.services ?? []
  const fromServices = services.reduce((sum, s) => sum + Number(s.finalAmount || 0), 0)
  return fromServices > 0 ? fromServices : Number(enrollment.package?.totalPaid || 0)
}

/**
 * Loads every active teacher and normalizes their package sales. A package sale is an
 * enrollment that carries both a package and the teacher chosen at enrollment time —
 * the only point where a teacher is attributed to a customer purchase.
 */
export async function loadTeacherSales() {
  const [teachersRes, enrollmentsRes] = await Promise.all([
    api.get('/api/teacher?limit=200'),
    api.get('/api/enrollment?limit=1000'),
  ])

  const teachers = (teachersRes.success && Array.isArray(teachersRes.data) ? teachersRes.data : []).map(
    (t) => ({ id: idOf(t), name: t.name || t.email || 'Unnamed', status: t.status }),
  )
  const teacherNames = new Map(teachers.map((t) => [t.id, t.name]))

  const sales = (enrollmentsRes.success && Array.isArray(enrollmentsRes.data) ? enrollmentsRes.data : [])
    .filter((e) => e.package && idOf(e.teacherID))
    .map((e) => ({
      teacherID: idOf(e.teacherID),
      teacherName: teacherNames.get(idOf(e.teacherID)) || e.teacherID?.name || 'Unknown',
      customerName: e.customerID?.name || e.customerID?.email || 'Customer',
      packageName: e.package?.packageName || e.label || 'Package',
      value: saleValue(e),
      date: new Date(e.purchaseDate ?? e.package?.purchaseDate ?? e.createdAt ?? Date.now()),
    }))
    .sort((a, b) => b.date - a.date)

  return { teachers, sales }
}

const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`

export function summarizeTeacher(sales) {
  const now = new Date()
  const thisMonth = monthKey(now)
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  let soldThisMonth = 0
  let soldLastMonth = 0
  let revenue = 0
  for (const s of sales) {
    revenue += s.value
    const key = monthKey(s.date)
    if (key === thisMonth) soldThisMonth += 1
    else if (key === lastMonth) soldLastMonth += 1
  }
  const latest = sales[0] ?? null

  return {
    packagesSold: sales.length,
    soldThisMonth,
    soldLastMonth,
    revenue,
    lastSaleDate: latest?.date ?? null,
    lastSaleValue: latest?.value ?? 0,
  }
}

/** Packages sold and revenue bucketed by calendar month over the trailing `months` window. */
export function monthlyTrend(sales, months = 12) {
  const now = new Date()
  const buckets = []
  const index = new Map()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const bucket = {
      key: monthKey(d),
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      count: 0,
      revenue: 0,
    }
    index.set(bucket.key, bucket)
    buckets.push(bucket)
  }
  for (const s of sales) {
    const bucket = index.get(monthKey(s.date))
    if (bucket) {
      bucket.count += 1
      bucket.revenue += s.value
    }
  }
  return buckets
}
