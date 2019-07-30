require('dotenv').config()

const {
  SLACK_TOKEN,
} = process.env

const EVENT_TOPIC = 'projects/gunio-tools/topics/tempo-tools'

const {
  syncAccounts,
  syncWorklogs,
} = require('./service/sync')

const {
  sheetsReport,
  slackReport,
} = require('./service/report')

const {
  accountThresholdNotification,
  accountUpdateNotification,
} = require('./service/notification')

const commands = ['/tempo-report']

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
    console.log(`Handling command ${command}`)

    switch(command) {
      case '/tempo-report':
        await slackReport(req, res)
      break
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

    switch(command) {
      case 'sync-tempo':
        await syncAccounts()
        await syncWorklogs()
      break
      case 'report-sheets':
        await sheetsReport()
      break
      case 'notifications-update':
        await accountUpdateNotification()
      break
      case 'notifications-inform':
        await accountThresholdNotification('inform')
      break
      case 'notifications-warn':
        await accountThresholdNotification('warn')
      break
      case 'notifications-alert':
        await accountThresholdNotification('alert')
      break
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
}
