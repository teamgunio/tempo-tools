const {
  getAccounts,
  getWorklogs,
} = require('../lib/tempo')

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

const syncWorklogs = async () => {
  const [latestWorklog] = (await firestore.collection(`worklogs`)
                                  .orderBy('createdAt', 'desc')
                                  .limit(1)
                                  .get())._docs()

  const startDate = new Date(latestWorklog.get('createdAt').toDate())
  const dateFrom = `${startDate.getFullYear()}-${startDate.getMonth()+1}-${startDate.getDate()}`
  const worklogs = (await getWorklogs(null, dateFrom)).results

  await worklogs.map(async worklog => {
    const {
      issue,
      createdAt,
      updatedAt,
      tempoWorklogId,
      billableSeconds,
    } = worklog

    const doc = firestore.collection(`worklogs`).doc(`${tempoWorklogId}`)
    const hours = ((billableSeconds/60)/60)
    const [account] = issue.key.split('-')

    await doc.set({
      ...worklog,
      hours,
      account,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
    })
  })
}

module.exports = {
  syncAccounts,
  syncWorklogs,
}
