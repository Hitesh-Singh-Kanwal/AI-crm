'use server'

import { NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

function env(name) {
  const v = process.env[name]
  return v && String(v).trim() ? String(v).trim() : null
}

/** Private keys in .env often use literal `\n` — normalize for the Google client. */
function normalizePrivateKey(key) {
  if (!key) return null
  return String(key).replace(/\\n/g, '\n')
}

/**
 * Inline credentials work on any host (Vercel, another laptop) without a local json file path.
 * Priority: GA_CREDENTIALS_BASE64 → GA_CREDENTIALS_JSON → GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY.
 */
function getInlineServiceAccount() {
  const fromBase64 = env('GA_CREDENTIALS_BASE64')
  if (fromBase64) {
    try {
      const raw = Buffer.from(fromBase64, 'base64').toString('utf8')
      const parsed = JSON.parse(raw)
      const client_email = parsed.client_email
      const private_key = normalizePrivateKey(parsed.private_key)
      const project_id = parsed.project_id || null
      if (client_email && private_key) return { client_email, private_key, project_id }
    } catch {
      // fall through
    }
  }
  const jsonRaw = env('GA_CREDENTIALS_JSON')
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw)
      const client_email = parsed.client_email
      const private_key = normalizePrivateKey(parsed.private_key)
      const project_id = parsed.project_id || null
      if (client_email && private_key) return { client_email, private_key, project_id }
    } catch {
      // fall through
    }
  }
  const client_email = env('GA4_CLIENT_EMAIL') || env('GOOGLE_CLIENT_EMAIL')
  const private_key = normalizePrivateKey(env('GA4_PRIVATE_KEY') || env('GOOGLE_PRIVATE_KEY'))
  const project_id = env('GA4_PROJECT_ID') || env('GOOGLE_CLOUD_PROJECT') || env('GCLOUD_PROJECT')
  if (client_email && private_key) return { client_email, private_key, project_id }
  return null
}

function createAnalyticsClient() {
  const inline = getInlineServiceAccount()
  if (inline) {
    return new BetaAnalyticsDataClient({
      credentials: {
        client_email: inline.client_email,
        private_key: inline.private_key,
      },
      ...(inline.project_id ? { projectId: inline.project_id } : {}),
    })
  }
  const credPath = env('GA_CREDENTIALS_PATH') || env('GOOGLE_APPLICATION_CREDENTIALS')
  if (credPath) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath
    return new BetaAnalyticsDataClient()
  }
  return null
}

function jsonError(message, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function GET(request) {
  // Optional query param:
  // - pagesDimension=pagePath | pageTitle
  // Defaults to pagePath.
  let pagesDimension = 'pagePath'
  try {
    const url = new URL(request.url)
    const q = url.searchParams.get('pagesDimension')
    if (q === 'pageTitle' || q === 'pagePath') pagesDimension = q
  } catch {
    // ignore
  }

  // PROPERTY_ID (or GA4_PROPERTY_ID) for GA4.
  // Credentials (pick one): inline env (portable) OR path to service-account json (local).
  const propertyId = env('GA4_PROPERTY_ID') || env('PROPERTY_ID')

  if (!propertyId) {
    return jsonError('Missing PROPERTY_ID (or GA4_PROPERTY_ID) for GA4.', 400)
  }

  try {
    const client = createAnalyticsClient()
    if (!client) {
      return jsonError(
        'Missing GA credentials. Use one of: GA_CREDENTIALS_BASE64, GA_CREDENTIALS_JSON, GA4_CLIENT_EMAIL+GA4_PRIVATE_KEY, or GA_CREDENTIALS_PATH / GOOGLE_APPLICATION_CREDENTIALS (path to service-account json on that machine).',
        400,
      )
    }
    const property = `properties/${String(propertyId).replace(/^properties\//, '')}`

    const getTotal = (report) => {
      const v = report?.rows?.[0]?.metricValues?.[0]?.value
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }

    const getPages = (report) => {
      const rows = Array.isArray(report?.rows) ? report.rows : []
      return rows.map((r) => {
        const primaryValue = r?.dimensionValues?.[0]?.value || ''
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
          value: primaryValue,
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

    const getGeo = (report, keyName) => {
      const rows = Array.isArray(report?.rows) ? report.rows : []
      return rows.map((r) => {
        const key = r?.dimensionValues?.[0]?.value || ''
        const activeUsersValue = r?.metricValues?.[0]?.value
        const activeUsers = Number(activeUsersValue)
        return {
          [keyName]: key,
          activeUsers: Number.isFinite(activeUsers) ? activeUsers : 0,
        }
      })
    }

    const runPagesReport = async (dateRanges) => {
      const [report] = await client.runReport({
        property,
        dateRanges,
        // GA4 "Pages and screens" — use unified screen dimension for compatibility
        dimensions: [{ name: pagesDimension }, { name: 'unifiedScreenClass' }],
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

    const runGeoReport = async (dimensionName, dateRanges) => {
      const [report] = await client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: dimensionName }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 20,
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

    const allTimeCountriesReport = await runGeoReport('country', [{ startDate: '2015-08-14', endDate: 'today' }])
    const last30CountriesReport = await runGeoReport('country', [{ startDate: '30daysAgo', endDate: 'today' }])
    const last7CountriesReport = await runGeoReport('country', [{ startDate: '7daysAgo', endDate: 'today' }])

    const allTimeRegionsReport = await runGeoReport('region', [{ startDate: '2015-08-14', endDate: 'today' }])
    const last30RegionsReport = await runGeoReport('region', [{ startDate: '30daysAgo', endDate: 'today' }])
    const last7RegionsReport = await runGeoReport('region', [{ startDate: '7daysAgo', endDate: 'today' }])

    const allTimeCitiesReport = await runGeoReport('city', [{ startDate: '2015-08-14', endDate: 'today' }])
    const last30CitiesReport = await runGeoReport('city', [{ startDate: '30daysAgo', endDate: 'today' }])
    const last7CitiesReport = await runGeoReport('city', [{ startDate: '7daysAgo', endDate: 'today' }])

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
          dimension: pagesDimension,
          allTime: getPages(allTimePagesReport),
          last30Days: getPages(last30PagesReport),
          last7Days: getPages(last7PagesReport),
        },
        demographics: {
          countries: {
            allTime: getGeo(allTimeCountriesReport, 'country'),
            last30Days: getGeo(last30CountriesReport, 'country'),
            last7Days: getGeo(last7CountriesReport, 'country'),
          },
          regions: {
            allTime: getGeo(allTimeRegionsReport, 'region'),
            last30Days: getGeo(last30RegionsReport, 'region'),
            last7Days: getGeo(last7RegionsReport, 'region'),
          },
          cities: {
            allTime: getGeo(allTimeCitiesReport, 'city'),
            last30Days: getGeo(last30CitiesReport, 'city'),
            last7Days: getGeo(last7CitiesReport, 'city'),
          },
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

