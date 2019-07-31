const {
  getReport,
} = require('../lib/sheets')

const {
  getChannels,
  getAccountChannels,
  buildSlackMessage,
  postMessage,
} = require('../lib/slack')

getChannels() // prime memory with Slack channels

const getColor = (balance, inform, warn, alert) => {
  let color = '#929292'
  if (balance > inform) color = '#83B972'
  if (balance < inform && balance > warn) color = '#E6E888'
  if (balance < warn && balance > alert) color = '#E6C055'
  if (balance < alert && balance > 0) color = '#E26B6B'
  if (balance <= 0) color = '#D30000'
  return color  
}

const accountThresholdNotification = async (level='inform') => {
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
  let threshold = '50%'
  switch(level){
    case 'inform':
      list = eligible.filter(r => (r[2] < r[7] && r[2] > r[8]))
      threshold = '50%'
    break
    case 'warn':
      list = eligible.filter(r => (r[2] < r[8] && r[2] > r[9]))
      threshold = '25%'
    break
    case 'alert':
      list = eligible.filter(r => r[2] < r[9])
      threshold = '10%'
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

    const color = getColor(balance, inform, warn, alert)
    const text = `This account has less than ${threshold} of the balance remaining.`
    const fallback = `${text}
      Account Manager: ${lead}
      Last Purchase Date: ${dpurchase}
      Hours Last Purchased: ${lpurchase}
      Hours Billed Since Last Purchase: ${billed}
      Hours Remaining: ${balance}
    `

    const message = buildSlackMessage(`*Tempo Alert for ${key}*`,[{
      text,
      color,
      fallback,
      fields: [{
        title: 'Account Manager',
        value: lead
      },{
        title: 'Last Purchase Date',
        value: dpurchase,
        short: true,
      },
      {
        title: 'Hours Last Purchased',
        value: lpurchase,
        short: true,
      },
      {
        title: 'Hours Billed Since Last Purchase',
        value: billed,
        short: true,
      },
      {
        title: 'Hours Remaining',
        value: balance,
        short: true,
      }]
    }])

    if (channels.dev) await postMessage(channels.dev.id, message)
    if (channels.prod) await postMessage(channels.prod.id, message)
  }))
}

const accountUpdateNotification = async () => {
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

    const color = getColor(balance, inform, warn, alert)
    const fallback = `Account Manager: ${lead}
      Last Purchase Date: ${dpurchase}
      Hours Last Purchased: ${lpurchase}
      Hours Billed Since Last Purchase: ${billed}
      Hours Remaining: ${balance}
    `
    const message = buildSlackMessage(`*Tempo Report Update for ${key}*`,[{
      color,
      fallback,
      fields: [{
        title: 'Account Manager',
        value: lead
      },{
        title: 'Last Purchase Date',
        value: dpurchase,
        short: true,
      },
      {
        title: 'Hours Last Purchased',
        value: lpurchase,
        short: true,
      },
      {
        title: 'Hours Billed Since Last Purchase',
        value: billed,
        short: true,
      },
      {
        title: 'Hours Remaining',
        value: balance,
        short: true,
      }]
    }])
    
    if (channels.dev) await postMessage(channels.dev.id, message)
    if (channels.prod) await postMessage(channels.prod.id, message)
  }))
}

module.exports = {
  accountThresholdNotification,
  accountUpdateNotification,
}
