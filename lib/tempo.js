import {} from 'dotenv/config';
import parser from 'fast-xml-parser';
import request from 'request-promise-native';
import { URL, URLSearchParams } from 'url';

const {
  TEMPO_API_TOKEN,
  TEMPO_TENANT
} = process.env;
const TEMPO_API_BASE = 'https://app.tempo.io';
const TEMPO_API_PATH = '/api/1';

const tempo = async (action, options={}) => {
  const url = new URL(`${TEMPO_API_PATH}/${action}`, TEMPO_API_BASE);
  const params = new URLSearchParams({
    ...options,
    baseUrl: TEMPO_TENANT,
    tempoApiToken: TEMPO_API_TOKEN,
  });
  url.search = params;

  console.log(url.toString());
  const res = await request(url.toString());
  return res;
};

export const getWorklogs = async (accountKey, dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) {
    const today = new Date();
    if (!dateFrom) dateFrom = `${today.getFullYear()}-${today.getMonth()+1}-01`;
    if (!dateTo) {
      const days = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
      dateTo = `${today.getFullYear()}-${today.getMonth()+1}-${days}`;
    }
  }

  const options = {
    dateFrom,
    dateTo,
    format: 'xml',
  };

  if (accountKey) options.billingKey = accountKey;

  const xml = await tempo(`getWorklog`, options);
  const json = parser.parse(xml);
  const { worklog } = json.worklogs;

  return worklog;
};

export const getAccounts = async () => {
  const xml = await tempo(`billingKeyList`);
  const json = parser.parse(xml, {
    attributeNamePrefix: '',
    ignoreAttributes: false,
  });
  const { Billing } = json.billing_keys;

  return Billing;
};

