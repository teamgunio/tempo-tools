require('dotenv').config()

const proxyquire = require('proxyquire').noCallThru()
const sinon = require('sinon')
const assert = require('assert')
const tools = require('@google-cloud/nodejs-repo-tools')

const method = 'POST'
const query = 'HBY'
const { SLACK_TOKEN } = process.env

function getSample() {
  const worklogs = sinon.stub().yields()
  const sheets = {
    entities: {
      search: sinon.stub().yields(),
    },
  }
  const googleapis = {
    sheets: sinon.stub().returns(sheets),
  }

  return {
    program: proxyquire('../', {
      googleapis: {google: googleapis},
    }),
    mocks: {
      googleapis: googleapis,
      worklogs: worklogs,
    },
  }
}

function getMocks() {
  const req = {
    headers: {},
    query: {},
    body: {},
    get: function(header) {
      return this.headers[header]
    },
  }
  sinon.spy(req, 'get')
  const res = {
    headers: {},
    send: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    end: sinon.stub().returnsThis(),
    status: function(statusCode) {
      this.statusCode = statusCode
      return this;
    },
    set: function(header, value) {
      this.headers[header] = value
      return this
    },
  }
  sinon.spy(res, 'status')
  sinon.spy(res, 'set')
  const cmd = {
    '@type': 'type.googleapis.com/google.pubsub.v1.PubsubMessage',
    attributes: null,
    data: '',
  }
  const event = {
    context: {
      eventId: '628806596664501',
      timestamp: '2019-07-25T07:22:35.837Z',
      eventType: 'google.pubsub.topic.publish',
      resource: {
        service: 'pubsub.googleapis.com',
        name: 'projects/gunio-tools/topics/tempo-tools',
        type: 'type.googleapis.com/google.pubsub.v1.PubsubMessage',
      },
    },
    callback: function(error) {
      this.error = error
      return this
    },
  }
  sinon.spy(event, 'callback')
  return {
    req,
    res,
    cmd,
    event,
  }
}

const makeEventData = (strData) => {
  return Buffer.from(strData).toString('base64')
}

// beforeEach(tools.stubConsole)
// afterEach(tools.restoreConsole)

describe('PubSub Handler', () => {
  it.skip('Event fails if not the right resource', async () => {
    const error = new Error('Invalid event resource')
    const sample = getSample()
    const mocks = getMocks()

    try {
      await sample.program.pubsubHandler(mocks.cmd, mocks.event.context, mocks.event.callback)
    } catch(err) {
      assert.strictEqual(mocks.event.callback.callCount, 1)
      assert.deepStrictEqual(mocks.event.callback.firstCall.args, [error])
      assert.strictEqual(console.error.callCount, 1)
      assert.deepStrictEqual(console.error.firstCall.args, [error])
    }
  })

  it.skip('Event fails if there is no data', async () => {
    const error = new Error('Invalid event data')
    const sample = getSample()
    const mocks = getMocks()

    try {
      await sample.program.pubsubHandler(mocks.cmd, mocks.event.context, mocks.event.callback)
    } catch(err) {
      assert.strictEqual(mocks.event.callback.callCount, 1)
      assert.deepStrictEqual(mocks.event.callback.firstCall.args, [error])
      assert.strictEqual(console.error.callCount, 1)
      assert.deepStrictEqual(console.error.firstCall.args, [error])
    }
  })

  it.skip('Handles the sync-tempo command', async () => {
    const error = new Error('Invalid event data')
    const sample = getSample()
    const mocks = getMocks()

    const command = 'sync-tempo'
    mocks.cmd.data = makeEventData(command)

    await sample.program.pubsubHandler(mocks.cmd, mocks.event.context, mocks.event.callback)
    assert.strictEqual(mocks.event.callback.callCount, 1)
    assert.deepStrictEqual(mocks.event.callback.firstCall.args, [])
  })

  it('Handles the sync-stripe command', async () => {
    const error = new Error('Invalid event data')
    const sample = getSample()
    const mocks = getMocks()

    const command = 'sync-stripe'
    mocks.cmd.data = makeEventData(command)

    await sample.program.pubsubHandler(mocks.cmd, mocks.event.context, mocks.event.callback)
    assert.strictEqual(mocks.event.callback.callCount, 1)
    assert.deepStrictEqual(mocks.event.callback.firstCall.args, [])
  }).timeout(240000)

  it.skip('Handles the report-sheets command', async () => {
    const sample = getSample()
    const mocks = getMocks()

    const command = 'report-sheets'
    mocks.cmd.data = makeEventData(command)

    await sample.program.pubsubHandler(mocks.cmd, mocks.event.context, mocks.event.callback)
    assert.strictEqual(mocks.event.callback.callCount, 1)
    assert.deepStrictEqual(mocks.event.callback.firstCall.args, [])
  })

  it.skip('Handles the notifications-inform command', async () => {
    const sample = getSample()
    const mocks = getMocks()

    const command = 'notifications-inform'
    mocks.cmd.data = makeEventData(command)

    await sample.program.pubsubHandler(mocks.cmd, mocks.event.context, mocks.event.callback)
    assert.strictEqual(mocks.event.callback.callCount, 1)
    assert.deepStrictEqual(mocks.event.callback.firstCall.args, [])
  })

  it.skip('Handles the notifications-warn command', async () => {
    const sample = getSample()
    const mocks = getMocks()

    const command = 'notifications-warn'
    mocks.cmd.data = makeEventData(command)

    await sample.program.pubsubHandler(mocks.cmd, mocks.event.context, mocks.event.callback)
    assert.strictEqual(mocks.event.callback.callCount, 1)
    assert.deepStrictEqual(mocks.event.callback.firstCall.args, [])
  })

  it.skip('Handles the notifications-alert command', async () => {
    const sample = getSample()
    const mocks = getMocks()

    const command = 'notifications-alert'
    mocks.cmd.data = makeEventData(command)

    await sample.program.pubsubHandler(mocks.cmd, mocks.event.context, mocks.event.callback)
    assert.strictEqual(mocks.event.callback.callCount, 1)
    assert.deepStrictEqual(mocks.event.callback.firstCall.args, [])
  })

  it.skip('Handles the notifications-update command', async () => {
    const sample = getSample()
    const mocks = getMocks()

    const command = 'notifications-update'
    mocks.cmd.data = makeEventData(command)

    await sample.program.pubsubHandler(mocks.cmd, mocks.event.context, mocks.event.callback)
    assert.strictEqual(mocks.event.callback.callCount, 1)
    assert.deepStrictEqual(mocks.event.callback.firstCall.args, [])
  })
})

describe.skip('Slack command handler', () => {
  it('Send fails if not a POST request', async () => {
    const error = new Error('Method not allowed')
    error.code = 405
    const mocks = getMocks()
    const sample = getSample()

    try {
      await sample.program.slackCommands(mocks.req, mocks.res)
    } catch (err) {
      assert.deepStrictEqual(err, error)
      assert.strictEqual(mocks.res.status.callCount, 1)
      assert.deepStrictEqual(mocks.res.status.firstCall.args, [error.code])
      assert.strictEqual(mocks.res.send.callCount, 1)
      assert.deepStrictEqual(mocks.res.send.firstCall.args, [error])
      assert.strictEqual(console.error.callCount, 1)
      assert.deepStrictEqual(console.error.firstCall.args, [error])
    }
  })

  it('Throws if invalid slack token', async () => {
    const error = new Error('Invalid credentials')
    error.code = 401
    const mocks = getMocks()
    const sample = getSample()

    mocks.req.method = method
    mocks.req.body.token = 'wrong'

    try {
      await sample.program.slackCommands(mocks.req, mocks.res)
    } catch (err) {
      assert.deepStrictEqual(err, error)
      assert.strictEqual(mocks.res.status.callCount, 1)
      assert.deepStrictEqual(mocks.res.status.firstCall.args, [error.code])
      assert.strictEqual(mocks.res.send.callCount, 1)
      assert.deepStrictEqual(mocks.res.send.firstCall.args, [error])
      assert.strictEqual(console.error.callCount, 1)
      assert.deepStrictEqual(console.error.firstCall.args, [error])
    }
  })

  it('Throws if no slack command', async () => {
    const error = new Error('Method not allowed')
    error.code = 500
    const mocks = getMocks()
    const sample = getSample()

    mocks.req.method = method
    mocks.req.body.token = SLACK_TOKEN

    try {
      await sample.program.slackCommands(mocks.req, mocks.res)
    } catch (err) {
      assert.deepStrictEqual(err, error)
      assert.strictEqual(mocks.res.status.callCount, 1)
      assert.deepStrictEqual(mocks.res.status.firstCall.args, [error.code])
      assert.strictEqual(mocks.res.send.callCount, 1)
      assert.deepStrictEqual(mocks.res.send.firstCall.args, [error])
      assert.strictEqual(console.error.callCount, 1)
      assert.deepStrictEqual(console.error.firstCall.args, [error])
    }
  })
})

describe.skip('Slack tempo-report command', () => {
  it.skip('Handles search error', async () => {
    const error = new Error('error')
    const mocks = getMocks()
    const sample = getSample()

    mocks.req.method = method
    mocks.req.body.token = SLACK_TOKEN
    mocks.req.body.channel_name = '2342512'
    mocks.req.body.command = '/tempo-report'
    mocks.req.body.text = query
    sample.mocks.worklogs.yields(error)

    try {
      await sample.program.slackCommands(mocks.req, mocks.res)
    } catch (err) {
      assert.deepStrictEqual(err, error)
      assert.strictEqual(mocks.res.status.callCount, 1)
      assert.deepStrictEqual(mocks.res.status.firstCall.args, [500])
      assert.strictEqual(mocks.res.send.callCount, 1)
      assert.deepStrictEqual(mocks.res.send.firstCall.args, [error])
      assert.strictEqual(console.error.callCount, 1)
      assert.deepStrictEqual(console.error.firstCall.args, [error])
    }
  })

  it('Makes search request, receives empty results', async () => {
    const mocks = getMocks()
    const sample = getSample()

    mocks.req.method = method
    mocks.req.body.token = SLACK_TOKEN
    mocks.req.body.channel_id = 'GLRP2KR2A'
    mocks.req.body.channel_name = 'privategroup'
    mocks.req.body.user_id = 'U03UE1N22'
    mocks.req.body.user_name = 'dermidgen'
    mocks.req.body.command = '/tempo-report'
    mocks.req.body.text = query
    sample.mocks.worklogs.yields(null, {
      results: [],
    })

    await sample.program.slackCommands(mocks.req, mocks.res)
    // assert.strictEqual(mocks.res.json.callCount, 1)
    // assert.deepStrictEqual(mocks.res.json.firstCall.args, [
    //   {
    //     response_type: 'in_channel',
    //     text: `Worklogs report`,
    //     attachments: [],
    //   },
    // ])
  })

  // it('Makes search request, receives non-empty results', async () => {
  //   const mocks = getMocks();
  //   const sample = getSample();

  //   mocks.req.method = method;
  //   mocks.req.body.token = SLACK_TOKEN;
  //   mocks.req.body.text = query;
  //   sample.mocks.kgsearch.entities.search.yields(null, {
  //     data: {
  //       itemListElement: [
  //         {
  //           result: {
  //             name: 'Giraffe',
  //             description: 'Animal',
  //             detailedDescription: {
  //               url: 'http://domain.com/giraffe',
  //               articleBody: 'giraffe is a tall animal',
  //             },
  //             image: {
  //               contentUrl: 'http://domain.com/image.jpg',
  //             },
  //           },
  //         },
  //       ],
  //     },
  //   });

  //   await sample.program.kgSearch(mocks.req, mocks.res);
  //   assert.strictEqual(mocks.res.json.callCount, 1);
  //   assert.deepStrictEqual(mocks.res.json.firstCall.args, [
  //     {
  //       text: `Query: ${query}`,
  //       response_type: 'in_channel',
  //       attachments: [
  //         {
  //           color: '#3367d6',
  //           title: 'Giraffe: Animal',
  //           title_link: 'http://domain.com/giraffe',
  //           text: 'giraffe is a tall animal',
  //           image_url: 'http://domain.com/image.jpg',
  //         },
  //       ],
  //     },
  //   ]);
  // });

  // it('Makes search request, receives non-empty results but partial data', async () => {
  //   const mocks = getMocks();
  //   const sample = getSample();

  //   mocks.req.method = method;
  //   mocks.req.body.token = SLACK_TOKEN;
  //   mocks.req.body.text = query;
  //   sample.mocks.kgsearch.entities.search.yields(null, {
  //     data: {
  //       itemListElement: [
  //         {
  //           result: {
  //             name: 'Giraffe',
  //             detailedDescription: {},
  //             image: {},
  //           },
  //         },
  //       ],
  //     },
  //   });

  //   await sample.program.kgSearch(mocks.req, mocks.res);
  //   assert.strictEqual(mocks.res.json.callCount, 1);
  //   assert.deepStrictEqual(mocks.res.json.firstCall.args, [
  //     {
  //       text: `Query: ${query}`,
  //       response_type: 'in_channel',
  //       attachments: [
  //         {
  //           color: '#3367d6',
  //           title: 'Giraffe',
  //         },
  //       ],
  //     },
  //   ]);
  // });
})

