const {
  getAccounts,
  getWorklogs,
} = require('../lib/tempo')

const {
  getCustomers,
  getPayments,
} = require('../lib/stripe')

const {
  firestore
} = require('../lib/firestore')

const syncAccounts = async () => {
  const accounts = (await getAccounts()).results
  await accounts.map(async account => {
    const doc = firestore.collection(`accounts`).doc(`${account.key}`)
    await doc.set({
      lead: account.lead.displayName
    })
  })
}

const syncCustomers = async () => {
  const [latestCustomer] = (await firestore.collection(`customers`)
                                  .orderBy('created', 'desc')
                                  .limit(1)
                                  .get())._docs()

  const startDate = new Date(latestCustomer.get('created').toDate())
  const dateFrom = `${startDate.getFullYear()}-${startDate.getMonth()+1}-${startDate.getDate()}`
  const customers = await getCustomers(startDate)

  await Promise.all(customers.map(async customer => {
    const doc = firestore.collection(`customers`).doc(`${customer.id}`)
    await doc.set({
      ...customer,
      created: new Date(Number(customer.created) * 1000)
    })
  }))
}

const syncPayments = async () => {
  const [latestPayment] = (await firestore.collection(`payments`)
                                  .orderBy('created', 'desc')
                                  .limit(1)
                                  .get())._docs()

  const startDate = new Date(latestPayment.get('created').toDate())
  const dateFrom = `${startDate.getFullYear()}-${startDate.getMonth()+1}-${startDate.getDate()}`

  const payments = await getPayments(dateFrom)

  await Promise.all(payments.map(async payment => {
    const doc = firestore.collection(`payments`).doc(`${payment.id}`)
    await doc.set({
      ...payment,
      created: new Date(Number(payment.created) * 1000)
    })
  }))
}

const syncWorklogs = async () => {
  const [latestWorklog] = (await firestore.collection(`worklogs`)
                                  .orderBy('createdAt', 'desc')
                                  .limit(1)
                                  .get())._docs()

  const startDate = new Date(latestWorklog.get('createdAt').toDate())
  const dateFrom = `${startDate.getFullYear()}-${startDate.getMonth()+1}-${startDate.getDate()}`
  const worklogs = await getWorklogs(null, dateFrom)

  await Promise.all(worklogs.map(async worklog => {
    const doc = firestore.collection(`worklogs`).doc(`${worklog.tempoWorklogId}`)
    await doc.set({
      ...worklog,
    })
  }))
}

module.exports = {
  syncAccounts,
  syncCustomers,
  syncPayments,
  syncWorklogs,
}
