const request = require('request-promise-native')

const {
  firestore
} = require('../lib/firestore')

const {
  getReport,
  updateReport,
} = require('../lib/sheets')

const {
  buildSlackMessage,
} = require('../lib/slack')

const sheetsReport = async () => {
  const report = await getReport('Sheet1!A2:G')
  const update = await Promise.all(report.map(async record => {
    const [
      key,
      lead,
      balance,
      tbilled,
      lpurchase,
      billed,
      dpurchase,
    ] = record

    const account = await firestore.collection('accounts').doc(key).get()
    let worklogs = await firestore.collection('worklogs')
      .where('account', '==', key)
      .where('createdAt', '>=', new Date(dpurchase))
      .get()

    const billings = worklogs._docs()
      .map(l => l.get('hours'))
      .reduce((a, c) => a + c, 0)

    const today = new Date()
    worklogs = await firestore.collection('worklogs')
      .where('account', '==', key)
      .where('createdAt', '>=', new Date(`1-1-2019`))
      .get()

    const tbillings = worklogs._docs()
      .map(l => l.get('hours'))
      .reduce((a, c) => a + c, 0)

    return [
      key,
      account.get('lead'),
      balance,
      tbillings,
      lpurchase,
      billings,
      dpurchase,
    ]
  }))

  const leads = update.map(r => [r[1]])
  const tbilled = update.map(r => [r[3]])
  const billings = update.map(r => [r[5]])

  await updateReport('Sheet1!B2', leads)
  await updateReport('Sheet1!D2', tbilled)
  await updateReport('Sheet1!F2', billings)
}

const slackReport = async (req, res) => {
  const {
    token,
    channel_name,
    command,
    text,
    response_url,
  } = req.body;

  let accountKey = '';

  // Check to see if we're in a client dev channel
  // If not, we'll need a user specified Account Key
  if (channel_name.indexOf('-dev') > -1) {
    accountKey = channel_name.split('-').shift().toUpperCase()
  } else if (text) {
    accountKey = text.toUpperCase()
  } else {
    return res.status(200)
      .send(`You're not in a dev channel, please specify an Account Key`)
  }

  // Respond immediately
  res.status(200)
    .write(`Fetching update for ${accountKey}...`)

  if (response_url) {
    const report = await getReport('Sheet1!A2:K')
    const [eligible] = report.filter(r => r[0] === accountKey).map(r => [
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
    ] = eligible

    const message = buildSlackMessage(`Tempo Update:
      Account: ${key}
      Lead: ${lead}
      Hours Remaining: ${balance}
      Hours Billed Since Last Purchase: ${billed}
    `)

    await request.post({
      uri: response_url,
      json: {
        ...req.body,
        ...message,
      },
    })
  }

  res.end()
}

module.exports = {
  sheetsReport,
  slackReport,
}
