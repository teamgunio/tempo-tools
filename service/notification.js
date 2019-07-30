const {
  getReport,
} = require('../lib/sheets')

const {
  getChannels,
  getAccountChannels,
  buildSlackMessage,
  postMessage,
} = require('../lib/slack')

const accountThresholdNotification = async (level='inform') => {
  await getChannels() // prime memory with Slack channels
  const report = await getReport('Sheet1!A2:J')
  const eligible = report.map(r => [
    r[0],
    r[1],
    Number(r[2]),
    Number(r[3]),
    Number(r[4]),
    Number(r[5]),
    r[6],
    Number(r[7]),
    Number(r[8]),
    Number(r[9]),
  ])

  let list = []
  switch(level){
    case 'inform':
      list = eligible.filter(r => (r[2] < r[7] && r[2] > r[8]))
    break
    case 'warn':
      list = eligible.filter(r => (r[2] < r[8] && r[2] > r[9]))
    break
    case 'alert':
      list = eligible.filter(r => r[2] < r[9])
    break
    default:
      list = []
  }

  await Promise.all(list.map(async record => {
    const [
      key,
      lead,
      balance,
      tbilled,
      lpurchase,
      billed,
      dpurchase,
      inform,
      warn,
      alert,
    ] = record

    if (!key) return

    const channels = await getAccountChannels(key)
    if (!channels) return

    const message = buildSlackMessage(`This account has exceeded the threshold:
      Account: ${key}
      Lead: ${lead}
      Hours Remaining: ${balance}
      Hours Billed Since Last Purchase: ${billed}
    `)
    
    if (channels.dev) await postMessage(channels.dev.id, message)
    if (channels.prod) await postMessage(channels.prod.id, message)
  }))
}

const accountUpdateNotification = async () => {
  await getChannels() // prime memory with Slack channels
  const report = await getReport('Sheet1!A2:J')
  const eligible = report.map(r => [
    r[0],
    r[1],
    Number(r[2]),
    Number(r[3]),
    Number(r[4]),
    Number(r[5]),
    r[6],
    Number(r[7]),
    Number(r[8]),
    Number(r[9]),
  ])

  await Promise.all(eligible.map(async record => {
    const [
      key,
      lead,
      balance,
      tbilled,
      lpurchase,
      billed,
      dpurchase,
      inform,
      warn,
      alert,
    ] = record

    if (!key) return

    const channels = await getAccountChannels(key)
    if (!channels) return

    const message = buildSlackMessage(`Tempo Update:
      Account: ${key}
      Lead: ${lead}
      Hours Remaining: ${balance}
      Hours Billed Since Last Purchase: ${billed}
    `)
    
    if (channels.dev) await postMessage(channels.dev.id, message)
    if (channels.prod) await postMessage(channels.prod.id, message)
  }))
}

module.exports = {
  accountThresholdNotification,
  accountUpdateNotification,
}
