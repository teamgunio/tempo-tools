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

const getChannel = async (name) => {
  const client = await new WebClient(SLACK_OAUTH_TOKEN)
  const res = await client.conversations.list({
    exclude_archived: true,
    types: 'private_channel',
  })

  const [channel] = res.channels.filter(c => c.name === name)
  return channel
}

const postMessage = async (channel, message) => {
  const client = await new WebClient(SLACK_OAUTH_TOKEN)
  client.chat.postMessage({
    ...message,
    channel,
    as_user: false,
    username: 'Tempo Tools',
  })
}

module.exports = {
  getChannel,
  buildSlackMessage,
  postMessage,
}
