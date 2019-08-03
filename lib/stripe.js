const {
  STRIPE_API_KEY
} = process.env

const stripe = require('stripe')(STRIPE_API_KEY)

// Use the latest API version
stripe.setApiVersion('2019-05-16')

const getCustomers = async (dateFrom) => {
  const customers = []

  const options = {
    limit: 1000
  }

  if (dateFrom) {
    const dt = new Date(dateFrom)
    options.created = {
      gte: dt.getTime()/1000
    }
  }

  for await (const customer of stripe.customers.list(options)) {
    customers.push(customer)
  }

  return customers
}

const getPayments = async (dateFrom) => {
  const options = {
    // limit: 1000
  }

  if (dateFrom) {
    const dt = new Date(dateFrom)
    options.created = {
      gte: dt.getTime()/1000
    }
  }

  /* -----------------------------------------------------------
  None of the other methods below adequately capture charges
  and payment intents. Either of these can include the metadata
  we need to reflect the full picture of "payments" that may
  have metadata for tracking Hours purchased
  */

  let intents = await stripe.paymentIntents.list(options).autoPagingToArray({ limit: 10000 })
  intents = intents.filter(c => c.metadata.hasOwnProperty('Hours'))

  let charges = await stripe.charges.list(options).autoPagingToArray({ limit: 10000 })
  charges = charges.filter(c => c.metadata.hasOwnProperty('Hours'))

  charges = charges.concat(intents)

  /* -----------------------------------------------------------
  This is the expanded path to finding transactions that have 
  metadata for tracking hours purchased. The stripe.charges.list
  API does not return payouts or payments as expected, it only
  seems to provide CC charges.
  */  
  
  // const transactions = []
  
  // for await (const charge of stripe.balanceTransactions.list({ ...options, type: 'charge', expand: ['data.source'] })) {
  //   transactions.push(charge)
  // }

  // for await (const payment of stripe.balanceTransactions.list({ ...options, type: 'payment', expand: ['data.source'] })) {
  //   transactions.push(payment)
  // }

  // for await (const payout of stripe.balanceTransactions.list({ ...options, type: 'payout', expand: ['data.source'] })) {
  //   transactions.push(payout)
  // }

  // const charges = transactions.map(c => c.source).filter(c => Object.keys(c.metadata).length)
  // console.log(charges.length)

  /* -----------------------------------------------------------
   Using the events API we are able to find when metadata was
   added to a charge, payment, or payout. We'll have to dedupe
   and skip prior events for charges we've already seen
  */

  // let charges = []
  // for await (const event of stripe.events.list({ ...options, type: 'charge.updated' })) {
  //   charges.push(event.data.object)
  // }

  // charges = charges.filter(c => Object.keys(c.metadata).length)

  // const dupeTable = {}
  // charges = charges.filter(e => {
  //   const key = JSON.stringify(e)
  //   const match = Boolean(dupeTable[e.id])
  //   return (match ? false : dupeTable[e.id] = true)
  // })

  return charges
}

module.exports = {
  getCustomers,
  getPayments,
}
