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

const sheetsBillings = async () => {
  const billings = await getReport('InitialHours!A2:D')
  const customers = (await firestore.collection('customers').get())._docs()
    .filter(customer => customer.get('metadata.AccountID'))
    .map(customer => ({
      id: customer.id,
      key: customer.get('metadata.AccountID')
    }))

  let update = await Promise.all(customers.map(async customer => {
    const payments = (await firestore.collection('payments')
      .where('customer', '==', customer.id)
      .get())._docs()

    const records = []
    const seen = {}
    for (payment of payments) {
      seen[payment.id] = true

      const date = payment.get('created').toDate()

      records.push([
        customer.key,
        payment.get('metadata.Hours'),
        `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`,
        payment.id
      ])
    }

    const logs = billings.filter(row => (row[0] === customer.key && !seen[row[3]]))
    return records.concat(logs)
  }))

  update = update.filter(r => r[0] && r[0].length)
  
  let records = []
  update.forEach(r => {
    records = records.concat(r)
  })

  await updateReport('RawHours!A2:D', records)
}

const sheetsReport = async () => {
  await sheetsBillings()

  const report = await getReport('Report!A2:G')
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

  await updateReport('Report!B2', leads)
  await updateReport('Report!D2', tbilled)
  // await updateReport('Report!E2', lpurchase)
  await updateReport('Report!F2', billings)
  // await updateReport('Report!G2', dpurchase)
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

  const report = await getReport('Report!A2:J')
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
    r[10],
    r[11],
    r[12],
    r[13]
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
    name,
    notifications,
    planName,
    planIncrement,
  ] = eligible

  const color = getColor(balance, inform, warn, alert)

  let text, planText = '', instructions, message

  if (planName) {
    planText = `*Plan:* ${planName === 'Monthly' ? planIncrement+' hours per month' : planName+' - '+planIncrement+' hours'}`
  }

  if (/-dev$/.test(channel.name)) {
    instructions = '(DM or @channel for support)'
    text = `*Gun.io Point of Contact:* ${lead}
${instructions}
*Hours Remaining:* ${balance}
${planText}
  `
    message = buildSlackMessage(`*Tempo Report for ${name || key}*`,[{
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
  } else if (/-prod$/.test(channel.name)) {

    instructions = '(DM or @channel for support, reporting requests, and to modify your current plan)'
    text = `*Gun.io Point of Contact:* ${lead}
${instructions}
*Hours Remaining:* ${balance}
${planText}
  `
    message = buildSlackMessage(`*Tempo Report for ${name || key}*`,[{
      fallback: text,
      color,
      text,
    }])
  }

  if (message && response_url) {
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
