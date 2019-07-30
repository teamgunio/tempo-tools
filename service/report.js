const request = require('request-promise-native')

const {
  firestore
} = require('../lib/firestore')

const {
  getReport,
  updateReport,
} = require('../lib/sheets')

const {
  getChannelById,
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
    channel_id,
    channel_name,
    command,
    text,
    response_url,
    user_name,
    user_id,
  } = req.body;

  // We can't rely on channel_name for private channels
  const channel = await getChannelById(channel_id)
  console.log(`Tempo report request from ${user_name}|${user_id} on ${channel.name}|${channel_id}`)

  if (!/-(dev|prod)$/i.test(channel.name)) 
    return res.status(200)
      .send(`Tempo report is not available for this channel`)

  const accountKey = channel.name.split('-').shift().toUpperCase()
  console.log(`Building report for ${accountKey}`)

  const report = await getReport('Sheet1!A2:J')
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
  ] = eligible

  const message = buildSlackMessage(`Tempo Update:
    Account: ${key}
    Lead: ${lead}
    Hours Remaining: ${balance}
    Hours Billed Since Last Purchase: ${billed}
  `)

  if (response_url) {
    request.post({
      uri: response_url,
      json: {
        response_type: 'in_channel',
        ...req.body,
        ...message,
      },
    })
  }

  res.status(200).send()
}

module.exports = {
  sheetsReport,
  slackReport,
}
