import {} from 'dotenv/config';

import request from 'supertest';
import assert from 'assert';

import app from '../lib/index.js';

describe('Web Server', () => {
  let server;

  before(() => {
    server = app.listen();
  });
  
  after(() => {
    server.close();
  });

  it('should return 200', done => {
    request(server)
      .get('/')
      .expect(200, done);
  });
  
  it('should not handle slack posts without a token', done => {
    request(server)
      .post('/report')
      .expect(403, done);
  });

  it('should not handle slack posts without the right command', done => {
    request(server)
      .post('/report')
      .send({
        token: '1234',
      })
      .expect(403, done);
  });

  it('should get a report from a dev channel', done => {
    request(server)
      .post('/report')
      .send({
        token: '1234',
        command: '/tempo-report',
        channel_name: 'hby-healthybytes-dev',
      })
      .expect(200, `Update on account: HBY`, done);
  }); 

  it('should get the account key from dev channel in favor of user supplied text', done => {
    request(server)
      .post('/report')
      .send({
        token: '1234',
        command: '/tempo-report',
        channel_name: 'hby-healthybytes-dev',
        text: 'DNV',
      })
      .expect(200, `Update on account: HBY`, done);
  }); 

  it('should get the account key from text if not in a dev channel', done => {
    request(server)
      .post('/report')
      .send({
        token: '1234',
        command: '/tempo-report',
        channel_name: 'directmessage',
        text: 'HBY',
      })
      .expect(200, `Update on account: HBY`, done);
  }); 

  it('should get handle a lowercase account key', done => {
    request(server)
      .post('/report')
      .send({
        token: '1234',
        command: '/tempo-report',
        channel_name: 'directmessage',
        text: 'hby',
      })
      .expect(200, `Update on account: HBY`, done);
  }); 

  it('should prompt for an account key if not in a dev channel', done => {
    request(server)
      .post('/report')
      .send({
        token: '1234',
        command: '/tempo-report',
        channel_name: 'directmessage',
      })
      .expect(200, `You're not in a dev channel, please specify an Account Key`, done);
  }); 

  it('should not output worklogs without a token', done => {
    request(server)
      .post('/report/download')
      .expect(403, done);
  });

  it.skip('should output worklogs with a token', done => {
    request(server)
      .post('/report/download')
      .send({ token: '1234' })
      .expect(200, done);
  }).timeout(30000);

  it('should update a report in Google Sheets', done => {
    request(server)
      .post('/report/update')
      .send({ token: '1234' })
      .expect(200, done);
  }).timeout(30000);

});
