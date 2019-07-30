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

const report = async (req, res) => {
  const {
    token,
    channel_name,
    command,
    text,
    response_url,
  } = req.body;

  let accountKey = '';

  // Check to see if we're in a client dev channel
  // If not, we'll need a user specified Account Key
  if (channel_name.indexOf('-dev') > -1) {
    accountKey = channel_name.split('-').shift().toUpperCase();
  } else if (text) {
    accountKey = text.toUpperCase();
  } else {
    return res.status(200)
      .send(`You're not in a dev channel, please specify an Account Key`);
  }

  // Respond immediately
  res.status(200)
    .send(`Update on account: ${accountKey}`);

  // If we have a response url from Slack we'll build the
  // report and send it when it's ready
  if (response_url) {
    const accounts = (await getAccounts()).results;
    const [account] = accounts.filter(a => a.key === accountKey);
    if (!account.monthly_budget) account.monthly_budget = 0;

    account.worklogs = (await getWorklogs(accountKey)).results;
    account.billings = account.worklogs.length ? account.worklogs.map(log => log.hours).reduce((a, c) => a + c) : 0;

    await request.post({
      uri: response_url,
      json: {
        ...req.body,
        text: `Lead: ${account.responsable}
        Monthly Budget: ${account.monthly_budget} hours
        Consumed Hours: ${account.billings} hours
        Remaining Hours: ${account.monthly_budget - account.billings} hours
        `,
      },
    });
  }  
}

module.exports = {
  report,
  getChannel,
  buildSlackMessage,
  postMessage,
}
