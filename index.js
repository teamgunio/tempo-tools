require('dotenv').config()

const {
  SLACK_TOKEN,
} = process.env

const EVENT_TOPIC = 'projects/gunio-tools/topics/tempo-tools'

const {
  getAccounts,
  getWorklogs,
} = require('./lib/tempo')

const {
  getReport,
  updateReport,
} = require('./lib/sheets')

const buildSlackMessage = (text, attachments=[]) => {
  const slackMessage = {
    response_type: 'in_channel',
    text,
    attachments,
  }

  return slackMessage
}

const validateSlackCommand = (body) => {
  if (!body || body.token !== SLACK_TOKEN) {
    const error = new Error('Invalid credentials')
    error.code = 401
    throw error
  }

  if (!body.command) {
    throw new Error('Method not allowed')
  }
}

const validateEvent = (event, context) => {
  if (!context || !context.resource || context.resource.name !== EVENT_TOPIC) {
    throw new Error('Invalid event resource')
  }

  if (!event || !event.data) {
    throw new Error('Invalid event data')
  }
}

const slackCommands = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  try {
    validateSlackCommand(req.body)

    const accounts = await getAccounts()
    const worklogs = await getWorklogs('HBY')

    const message = buildSlackMessage('Worklogs report', worklogs.results)

    res.status(200).json(message)
  } catch(err) {
    console.error(err);
    res.status(err.code || 500).send(err);
  }
}

const updateSheets = async (event, context, callback) => {
  console.log('Syncing Sheets with latest data from Tempo')

  try {
    validateEvent(event, context)

    const command = Buffer.from(event.data, 'base64').toString()

    console.log(`Handling command ${command}`)

    const compiled = {}
    const accounts = (await getAccounts()).results
    const worklogs = (await getWorklogs()).results

    accounts.map(async account => {
      const logs = worklogs.filter(l => {
        if (!l.attributes.values.length) {
          return l.issue.key.split('-')[0] === account.key
        }

        return l.attributes.values[0].value === account.key
      })
      account.billings = logs.length ? logs.map(log => log.billableSeconds).reduce((a, c) => a + c) : 0
      account.billings = (account.billings > 0) ? ((account.billings/60)/60) : 0

      compiled[account.key] = {
        lead: account.lead.displayName,
        billings: account.billings,
      }

      return account
    })
    console.log(compiled)

    // const update = report.map(record => {
    //   const [
    //     key,
    //     lead,
    //     balance,
    //     tbilled,
    //     lpurchase,
    //     billed,
    //     dpurchase,
    //   ] = record

    //   const worklog = worklogs[key]

    //   return [
    //     key,
    //     worklog.lead,
    //     basis,
    //     tbudget,
    //     worklog.monthly_budget,
    //     worklog.billings,
    //     remaining,
    //     active
    //   ]
    // })

    callback()
  } catch(err) {
    console.error(err)
    callback(err)
  }

}

exports = module.exports = {
  slackCommands,
  updateSheets,
}
