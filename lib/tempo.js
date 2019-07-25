const { URL, URLSearchParams } = require('url')
const request = require('request-promise-native')

const {
  TEMPO_ACCESS_TOKEN,
  TEMPO_REFRESH_TOKEN,
} = process.env

const TEMPO_API_BASE = 'https://api.tempo.io'
const TEMPO_API_PATH = '/core/3'

const tempo = async (action, options={}) => {
  const url = new URL(`${TEMPO_API_PATH}/${action}`, TEMPO_API_BASE)
  url.search = new URLSearchParams(options)
  return await request(url.toString()).auth(null,
    null,
    true,
    TEMPO_ACCESS_TOKEN
  )
}

const getWorklogs = async (accountKey, dateFrom, dateTo) => {
  const action = (accountKey) ? `worklogs/account/${accountKey}` : `worklogs`

  if (!dateFrom || !dateTo) {
    const today = new Date()
    if (!dateFrom) dateFrom = `${today.getFullYear()}-${today.getMonth()+1}-01`
    if (!dateTo) {
      const days = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate()
      dateTo = `${today.getFullYear()}-${today.getMonth()+1}-${days}`
    }
  }

  const options = {
    from: dateFrom,
    to: dateTo,
    limit: 1000,
  }

  return await tempo(action, options)
}

const getAccounts = async () => {
  return await tempo('accounts')
}

module.exports = {
  getWorklogs,
  getAccounts,
}
