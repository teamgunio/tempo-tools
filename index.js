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

const {
  buildSlackMessage,
  report,
} = require('./lib/slack')

const {
  syncAccounts,
  syncWorklogs,
} = require('./service/sync')

const {
  sheetsReport,
} = require('./service/report')

const commands = ['/tempo-reconcile']

const validateSlackCommand = (body) => {
  if (!body || body.token !== SLACK_TOKEN) {
    const error = new Error('Invalid credentials')
    error.code = 401
    throw error
  }

  if (!body.command || !commands.includes(body.command)) {
    console.log(`Slack attempted command: ${body.command}`)
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

    const { command } = req.body
    if (command === '/tempo-reconcile') {
      await report(req, res)
    }
    

  } catch(err) {
    console.error(err);
    res.status(err.code || 500).send(err);
  }
}

const pubsubHandler = async (event, context, callback) => {
  console.log('Running sync handler')

  try {
    validateEvent(event, context)

    const command = Buffer.from(event.data, 'base64').toString()
    console.log(`Handling command ${command}`)

    if (command === 'sync') {
      await syncAccounts()
      await syncWorklogs()
    }

    callback()
  } catch(err) {
    console.error(err)
    callback(err)
  }
}

const updateSheets = async (event, context, callback) => {
  console.log('Syncing Sheets with latest data from Tempo')

  try {
    validateEvent(event, context)

    const command = Buffer.from(event.data, 'base64').toString()
    console.log(`Handling command ${command}`)

    if (command === 'sync') {
      await sheetsReport()
    }

    callback()
  } catch(err) {
    console.error(err)
    callback(err)
  }

}

exports = module.exports = {
  slackCommands,
  pubsubHandler,
  updateSheets,
}
