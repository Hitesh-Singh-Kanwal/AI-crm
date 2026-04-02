'use server'

import { NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

function env(name) {
  const v = process.env[name]
  return v && String(v).trim() ? String(v).trim() : null
}

function jsonError(message, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function GET() {
  // We support the env style you already have in `.env`:
  // - PROPERTY_ID
  // - GA_CREDENTIALS_PATH (service account json)
  // You can also use GA4_PROPERTY_ID + GOOGLE_APPLICATION_CREDENTIALS.
  const propertyId = env('GA4_PROPERTY_ID') || env('PROPERTY_ID')
  const credPath = env('GA_CREDENTIALS_PATH') || env('GOOGLE_APPLICATION_CREDENTIALS')

  if (credPath) {
    // Ensure the library reads the intended key.
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath
  }

  if (!propertyId) {
    return jsonError('Missing PROPERTY_ID (or GA4_PROPERTY_ID) for GA4.', 400)
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return jsonError('Missing GA_CREDENTIALS_PATH (service-account json path).', 400)
  }

  try {
    const client = new BetaAnalyticsDataClient()
    const property = `properties/${String(propertyId).replace(/^properties\//, '')}`

    const getTotal = (report) => {
      const v = report?.rows?.[0]?.metricValues?.[0]?.value
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }

    const getPages = (report) => {
      const rows = Array.isArray(report?.rows) ? report.rows : []
      return rows.map((r) => {
        const pagePath = r?.dimensionValues?.[0]?.value || ''
        const screenClass = r?.dimensionValues?.[1]?.value || ''
        const viewsValue = r?.metricValues?.[0]?.value
        const activeUsersValue = r?.metricValues?.[1]?.value
        const viewsPerActiveUserValue = r?.metricValues?.[2]?.value
        const avgEngagementTimePerActiveUserValue = r?.metricValues?.[3]?.value

        const views = Number(viewsValue)
        const activeUsers = Number(activeUsersValue)
        const viewsPerActiveUser = Number(viewsPerActiveUserValue)
        const avgEngagementTimePerActiveUser = Number(avgEngagementTimePerActiveUserValue)
        return {
          pagePath,
          screenClass,
          views: Number.isFinite(views) ? views : 0,
          activeUsers: Number.isFinite(activeUsers) ? activeUsers : 0,
          viewsPerActiveUser: Number.isFinite(viewsPerActiveUser) ? viewsPerActiveUser : 0,
          avgEngagementTimePerActiveUser: Number.isFinite(avgEngagementTimePerActiveUser)
            ? avgEngagementTimePerActiveUser
            : 0,
        }
      })
    }

    const runPagesReport = async (dateRanges) => {
      const [report] = await client.runReport({
        property,
        dateRanges,
        // GA4 "Pages and screens" — use unified screen dimension for compatibility
        dimensions: [{ name: 'pagePath' }, { name: 'unifiedScreenClass' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          // Calculated metrics (predefined-reports pattern)
          { name: 'viewsPerActiveUser', expression: 'screenPageViews/activeUsers' },
          { name: 'avgEngagementTimePerActiveUser', expression: 'userEngagementDuration/activeUsers' },
        ],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 25,
      })
      return report
    }

    const [allTimeViewsReport] = await client.runReport({
      property,
      // GA4 Data API only supports dates >= 2015-08-14
      dateRanges: [{ startDate: '2015-08-14', endDate: 'today' }],
      metrics: [{ name: 'screenPageViews' }],
      limit: 1,
    })

    const [last30ViewsReport] = await client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [{ name: 'screenPageViews' }],
      limit: 1,
    })

    const [last7ViewsReport] = await client.runReport({
      property,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [{ name: 'screenPageViews' }],
      limit: 1,
    })

    const [allTimeActiveUsersReport] = await client.runReport({
      property,
      dateRanges: [{ startDate: '2015-08-14', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 1,
    })

    const [last30ActiveUsersReport] = await client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 1,
    })

    const [last7ActiveUsersReport] = await client.runReport({
      property,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 1,
    })

    const allTimePagesReport = await runPagesReport([{ startDate: '2015-08-14', endDate: 'today' }])
    const last30PagesReport = await runPagesReport([{ startDate: '30daysAgo', endDate: 'today' }])
    const last7PagesReport = await runPagesReport([{ startDate: '7daysAgo', endDate: 'today' }])

    return NextResponse.json({
      success: true,
      data: {
        views: {
          allTime: getTotal(allTimeViewsReport),
          last30Days: getTotal(last30ViewsReport),
          last7Days: getTotal(last7ViewsReport),
        },
        activeUsers: {
          allTime: getTotal(allTimeActiveUsersReport),
          last30Days: getTotal(last30ActiveUsersReport),
          last7Days: getTotal(last7ActiveUsersReport),
        },
        pages: {
          allTime: getPages(allTimePagesReport),
          last30Days: getPages(last30PagesReport),
          last7Days: getPages(last7PagesReport),
        },
      },
    })
  } catch (e) {
    const details =
      (Array.isArray(e?.details) && e.details.length ? e.details : null) ||
      (Array.isArray(e?.errors) && e.errors.length ? e.errors : null) ||
      (typeof e?.details === 'string' && e.details ? e.details : null)
    const msg = e?.message || (details ? JSON.stringify(details) : null) || String(e) || 'Failed to query Google Analytics.'
    return jsonError(msg, 500)
  }
}

