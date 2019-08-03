// const Stripe = require('stripe')

const {
  STRIPE_API_KEY
} = process.env


const stripe = require('stripe')(STRIPE_API_KEY)

const getCustomers = async () => {
  const customers = []

  let res = await stripe.customers.list({limit: 100})
  console.log(res)
}

module.exports = {
  getCustomers,
}
