const {
  getReport,
} = require('../lib/sheets')

const {
  getChannel,
  buildSlackMessage,
  postMessage,
} = require('../lib/slack')

const accountThresholdNotification = async (level='inform') => {
  const report = await getReport('Sheet1!A2:K')
  const eligible = report.filter(r => r[10]).map(r => [
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
    r[10]
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
      channelName,
    ] = record
    const channel = await getChannel(channelName)

    const message = buildSlackMessage(`This account has exceeded the threshold:
      Account: ${key}
      Lead: ${lead}
      Hours Remaining: ${balance}
      Hours Billed Since Last Purchase: ${billed}
    `)
    
    await postMessage(channel.id, message)
  }))
}

module.exports = {
  accountThresholdNotification,
}
