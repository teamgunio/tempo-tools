const {
  firestore
} = require('../lib/firestore')

const {
  getReport,
  updateReport,
} = require('../lib/sheets')

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

module.exports = {
  sheetsReport,
}
