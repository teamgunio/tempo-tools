require('dotenv').config()

const {
  SLACK_TOKEN,
} = process.env

const {
  getAccounts,
  getWorklogs,
} = require('./lib/tempo')

// const {
//   getReport,
//   updateReport,
// } = require('./lib/sheets')

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
    const error = new Error('Method not allowed')
    throw error
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

const updateSheets = async (pubSubEvent, context) => {
  // const report = await getReport()
  console.log('Syncing Sheets with latest data from Tempo')
}

exports = module.exports = {
  slackCommands,
  updateSheets,
}
