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

const getColor = (balance, inform, warn, alert) => {
  let color = '#929292'
  if (balance > inform) color = '#83B972'
  if (balance < inform && balance > warn) color = '#E6E888'
  if (balance < warn && balance > alert) color = '#E6C055'
  if (balance < alert && balance > 0) color = '#E26B6B'
  if (balance <= 0) color = '#D30000'
  return color  
}

const sheetsReport = async () => {
  const report = await getReport('Sheet1!A2:G')
  const update = await Promise.all(report.map(async record => {
    let [
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

    let customer, payment
    [customer] = (await firestore.collection('customers')
          .where('metadata.AccountID', '==', key)
          .get())._docs()

    if (customer) {
      [payment] = (await firestore.collection('payments')
                .where('customer', '==', customer.id)
                .orderBy('created', 'DESC')
                .limit(1)
                .get())._docs()

    }

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

    if (payment) {
      lpurchase = Number(payment.get('metadata.Hours'))
      dpurchase = payment.get('created').toDate()
      dpurchase = `${dpurchase.getMonth()+1}/${dpurchase.getDate()}/${dpurchase.getFullYear()}`
    }

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
  const lpurchase = update.map(r => [r[4]])
  const billings = update.map(r => [r[5]])
  const dpurchase = update.map(r => [r[6]])

  await updateReport('Sheet1!B2', leads)
  await updateReport('Sheet1!D2', tbilled)
  await updateReport('Sheet1!E2', lpurchase)
  await updateReport('Sheet1!F2', billings)
  await updateReport('Sheet1!G2', dpurchase)
}

const slackReport = async (req, res) => {
  const {
    token,
    channel_id,
    channel_name,
    command,
    text: options,
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

  const color = getColor(balance, inform, warn, alert)
  const fallback = `Account Manager: ${lead}
    Last Purchase Date: ${dpurchase}
    Hours Last Purchased: ${lpurchase}
    Hours Billed Since Last Purchase: ${billed}
    Hours Remaining: ${balance}
  `
  const message = buildSlackMessage(`*Tempo Report for ${key}*`,[{
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
