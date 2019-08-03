const {
  STRIPE_API_KEY
} = process.env

const stripe = require('stripe')(STRIPE_API_KEY)

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
  const transactions = []

  const options = {
    limit: 1000
  }

  if (dateFrom) {
    const dt = new Date(dateFrom)
    options.created = {
      gte: dt.getTime()/1000
    }
  }

  for await (const charge of stripe.balanceTransactions.list({ ...options, type: 'charge', expand: ['data.source'] })) {
    transactions.push(charge)
  }

  for await (const payment of stripe.balanceTransactions.list({ ...options, type: 'payment', expand: ['data.source'] })) {
    transactions.push(payment)
  }

  for await (const payout of stripe.balanceTransactions.list({ ...options, type: 'payout', expand: ['data.source'] })) {
    transactions.push(payout)
  }

  const charges = transactions.map(c => c.source).filter(c => Object.keys(c.metadata).length)

  return charges
}

module.exports = {
  getCustomers,
  getPayments,
}
