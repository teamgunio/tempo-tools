import {} from 'dotenv/config';

import express from 'express';
import bodyparser from 'body-parser';
import request from 'request';

import {
  getWorklogs,
  getAccounts,
} from './tempo';

import {
  updateReport
} from './sheets';

import { RTMClient } from '@slack/rtm-api';

const PORT = process.env.HTTP_PORT || 3000;
const clientToken = process.env.CLIENT_TOKEN;

const app = express();
const rtm = new RTMClient(clientToken);

app.use( bodyparser.json() );
app.use( bodyparser.urlencoded( {
  extended: true
}));

app.get('/', (req, res) => {
  res.send(`Slack bot says, "hello". Nothing to see here.`);
});

// Empty bot handler for now
rtm.on('message', (message) => {
  return null;
  // Log messages to debug bot user messages
  // console.log(message);
});

app.post('/reconcile', async (req, res) => {
  const {
    token,
    channel_name,
    command,
    text,
    response_url,
  } = req.body;
  
  if (!token || command !== '/tempo-report') return res.status(403).send('Unauthorized');

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

});

app.post('/report', async (req, res) => {
  console.log('Request for a report', req.body);
  const {
    token,
    channel_name,
    command,
    text,
    response_url,
  } = req.body;
  
  if (!token || command !== '/tempo-report') return res.status(403).send('Unauthorized');

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
    const accounts = await getAccounts();
    const [account] = accounts.filter(a => a.key === accountKey);
    if (!account.monthly_budget) account.monthly_budget = 0;

    account.worklogs = await getWorklogs(accountKey);
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
});

app.post('/report/download', async (req, res) => {
  console.log('Request for a report', req.body);
  const { token } = req.body;

  if (!token) return res.status(403).send('Unauthorized');
  
  let report = 'Account,Lead,Budget,Hours';
  const accounts = await getAccounts();
  const worklogs = await getWorklogs();

  accounts.map(account => {
    if (!account.monthly_budget) account.monthly_budget = 0;
    account.worklogs = worklogs.filter(log => {
      return log.billing_key === account.key;
    });

    account.billings = account.worklogs.length ? account.worklogs.map(log => log.hours).reduce((a, c) => a + c) : 0;
    report += `\n${account.key},${account.responsable},${account.monthly_budget},${account.billings}`;

    return account;
  });

  res.status(200)
    .set('Content-Disposition', 'attachement;filename=report.csv')
    .type('application/csv')
    .send(report);
});

app.post('/report/update', async (req, res) => {
  console.log('Request for a report', req.body);
  const { token } = req.body;

  if (!token) return res.status(403).send('Unauthorized');
  
  const accounts = await getAccounts();
  const worklogs = await getWorklogs();
  const report = {};

  accounts.map(account => {
    if (!account.monthly_budget) account.monthly_budget = 0;
    account.worklogs = worklogs.filter(log => {
      return log.billing_key === account.key;
    });

    account.billings = account.worklogs.length ? account.worklogs.map(log => log.hours).reduce((a, c) => a + c) : 0;

    report[account.key] = {
      lead: account.responsable,
      monthly_budget: account.monthly_budget,
      billings: account.billings,
    }

    return account;
  });


  await updateReport(report);

  res.status(200).send('OK');
});


if (!module.parent) {
  const { npm_package_name, npm_package_version } = process.env;
  console.log(
    `
    ${npm_package_name} @${npm_package_version} is running:
    Port: ${PORT}
    Slack Client Token: ${clientToken}
    `
  );

  rtm.start();
  app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
  });
}

export default app;
