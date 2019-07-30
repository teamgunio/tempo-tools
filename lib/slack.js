const { WebClient } = require('@slack/web-api');

const request = require('request-promise-native')

const {
  getAccounts,
  getWorklogs,
} = require('./tempo')

const {
  SLACK_TOKEN,
  SLACK_OAUTH_TOKEN,
} = process.env

const buildSlackMessage = (text, attachments=[]) => {
  const slackMessage = {
    // response_type: 'in_channel',
    text,
    attachments,
  }

  return slackMessage
}

let slackClient = null
let slackChannels = null

const getClient = async () => {
  if (!slackClient) slackClient = await new WebClient(SLACK_OAUTH_TOKEN)
  return slackClient
}

const getChannels = async () => {
  const client = await getClient()
  if (!slackChannels) slackChannels = await client.conversations.list({
    exclude_archived: true,
    types: 'private_channel',
  })
  return slackChannels
}

const getChannelById = async (id) => {
  const res = await getChannels()

  const [channel] = res.channels.filter(c => c.id === id)
  return channel
}

const getChannelByName = async (name) => {
  const res = await getChannels()

  const [channel] = res.channels.filter(c => c.name === name)
  return channel
}

const getAccountChannels = async (key) => {
  const res = await getChannels()

  const matches = res.channels.filter(c => (
    c.name.toLowerCase().indexOf(`${key.toLowerCase()}-`) === 0
  ))

  if (!matches.length) return null

  const [prod] = matches.filter(c => c.name.indexOf('-prod') > -1)
  const [dev] = matches.filter(c => c.name.indexOf('-dev') > -1)
  const channels = {
    prod,
    dev
  }

  return channels
}

const postMessage = async (channel, message) => {
  const client = await getClient()
  client.chat.postMessage({
    ...message,
    channel,
    as_user: false,
    username: 'Tempo Tools',
  })
}

module.exports = {
  getChannels,
  getChannelById,
  getChannelByName,
  getAccountChannels,
  buildSlackMessage,
  postMessage,
}
