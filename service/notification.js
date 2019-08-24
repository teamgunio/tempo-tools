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
  const report = await getReport('Report!A2:L')
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
    r[10],
    r[11],
    r[12],
    r[13]
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
      name,
      notifications,
      planName,
      planIncrement,
    ] = record

    if (!key) return
    if (notifications !== 'Yes') return

    const channels = await getAccountChannels(name || key)
    if (!channels) return

    const color = getColor(balance, inform, warn, alert)
    let text, planText = '', instructions

    if (planName) {
      planText = `*Plan:* ${planName === 'Monthly' ? planIncrement+' hours per month' : planName+' - '+planIncrement+' hours'}`
    }

    instructions = '(DM or @channel for support, reporting requests, and to modify your current plan)'
    text = `*Gun.io Point of Contact:* ${lead}
${instructions}
*Hours Remaining:* ${balance}
${planText}
`
    const prodMessage = buildSlackMessage(`*Tempo Alert for ${name || key}*`,[{
      fallback: text,
      color,
      text,
    }])

    instructions = '(DM or @channel for support)'
    text = `*Gun.io Point of Contact:* ${lead}
${instructions}
*Hours Remaining:* ${balance}
${planText}
`

    const devMessage = buildSlackMessage(`*Tempo Alert for ${name || key}*`,[{
      fallback: text,
      color,
      text,
      fields: [{
        title: 'Last Replenish',
        value: `${lpurchase} hours added ${dpurchase}`,
      },
      {
        title: 'Hours Billed Since Last Replenish',
        value: billed,
      }],
    }])

    if (channels.dev) await postMessage(channels.dev.id, devMessage)
    if (channels.prod) await postMessage(channels.prod.id, prodMessage)
  }))
}

const accountUpdateNotification = async () => {
  const report = await getReport('Report!A2:N')
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
    r[10],
    r[11],
    r[12],
    r[13]
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
      name,
      notifications,
      planName,
      planIncrement,
    ] = record

    if (!key) return
    if (notifications !== 'Yes') return

    const channels = await getAccountChannels(name || key)
    if (!channels) return

    const color = getColor(balance, inform, warn, alert)

    let text, planText = '', instructions

    if (planName) {
      planText = `*Plan:* ${planName === 'Monthly' ? planIncrement+' hours per month' : planName+' - '+planIncrement+' hours'}`
    }

    instructions = '(DM or @channel for support, reporting requests, and to modify your current plan)'
    text = `*Gun.io Point of Contact:* ${lead}
${instructions}
*Hours Remaining:* ${balance}
${planText}
`
    const prodMessage = buildSlackMessage(`*Tempo Report Update for ${name || key}*`,[{
      fallback: text,
      color,
      text,
    }])

    instructions = '(DM or @channel for support)'
    text = `*Gun.io Point of Contact:* ${lead}
${instructions}
*Hours Remaining:* ${balance}
${planText}
`
    const devMessage = buildSlackMessage(`*Tempo Report Update for ${name || key}*`,[{
      fallback: text,
      color,
      text,
      fields: [{
        title: 'Last Replenish',
        value: `${lpurchase} hours added ${dpurchase}`,
      },
      {
        title: 'Hours Billed Since Last Replenish',
        value: billed,
      }],
    }])
    
    if (channels.dev) await postMessage(channels.dev.id, devMessage)
    if (channels.prod) await postMessage(channels.prod.id, prodMessage)
  }))
}

module.exports = {
  accountThresholdNotification,
  accountUpdateNotification,
}
