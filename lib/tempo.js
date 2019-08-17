const { URL, URLSearchParams } = require('url')
const request = require('request-promise-native')
const parser = require('fast-xml-parser')

const {
  TEMPO_STRATEGY,
  TEMPO_ACCESS_TOKEN,
  TEMPO_REFRESH_TOKEN,
  TEMPO_API_TOKEN,
  TEMPO_TENANT,
} = process.env

const TEMPO_APP_BASE = 'https://app.tempo.io'
const TEMPO_APP_PATH = '/api/1'

const TEMPO_API_BASE = 'https://api.tempo.io'
const TEMPO_API_PATH = '/core/3'

const tempoSystemAPIRequest = async (action, options={}) => {
  const url = new URL(`${TEMPO_APP_PATH}/${action}`, TEMPO_APP_BASE)
  url.search = new URLSearchParams({
    ...options,
    baseUrl: TEMPO_TENANT,
    tempoApiToken: TEMPO_API_TOKEN,
  })
  const res = await request(url.toString())
  return parser.parse(res)
}

const tempoCoreAPIRequest = async (action, options={}) => {
  const url = new URL(`${TEMPO_API_PATH}/${action}`, TEMPO_API_BASE)
  url.search = new URLSearchParams(options)
  const res = await request(url.toString()).auth(null,
    null,
    true,
    TEMPO_ACCESS_TOKEN
  )
  return JSON.parse(res)
}

const getWorklogs = async (accountKey, dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) {
    const today = new Date()
    if (!dateFrom) dateFrom = `${today.getFullYear()}-${today.getMonth()+1}-01`
    if (!dateTo) {
      const days = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate()
      dateTo = `${today.getFullYear()}-${today.getMonth()+1}-${days}`
    }
  }

  if (TEMPO_STRATEGY === 'system') {
    const action = `getWorklog`
    const options = {
      format: 'xml',
      addBillingInfo: true,
      addIssueSummary: true,
      addIssueDetails: true,
      addIssueDescription: true,
      addWorklogDetails: true,
      addUserDetails: true,
      dateFrom,
      dateTo,
    }
    if (accountKey) options.billingKey = accountKey
    const res = await tempoSystemAPIRequest(action, options)

    // If there's no results worklogs contains an empty string
    if (!res.worklogs.hasOwnProperty('worklog')) {
      console.log({ count: 0 })
      return []
    }

    console.log({ count: res.worklogs.worklog.length})
    const results = res.worklogs.worklog.map(r => ({
      ...r,
      account: r.billing_key,
      issueKey: r.issue_key,
      tempoWorklogId: r.tempo_worklog_id,
      createdAt: new Date(r.worklog_details.created),
      updatedAt: new Date(r.worklog_details.updated),
    }))

    return results
  } else {
    const action = (accountKey) ? `worklogs/account/${accountKey}` : `worklogs`
    const options = {
      from: dateFrom,
      to: dateTo,
      limit: 1000,
    }
    // We may need to loop since this call supports
    // offset and limit; there may be more than 1000
    const res = await tempoCoreAPIRequest(action, options)
    console.log(res.metadata)

    const results = res.results.map(r => ({
      ...r,
      hours: ((r.billableSeconds/60)/60),
      account: r.issue.key.split('-').shift(),
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))

    return res.results
  }
}

const getAccounts = async () => {
  return await tempoCoreAPIRequest('accounts')
}

module.exports = {
  getWorklogs,
  getAccounts,
}
