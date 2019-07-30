const { google } = require('googleapis')

const spreadsheetId = '1gyvdS8zval1C8qgDxH7yoeordSjF56Q2BVGZ_vrfuQg';

const getClient = async () => {
  return await google.auth.getClient({
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  })
}

const getReport = async (range) => {
  const auth = await getClient();
  const sheets = google.sheets({ version: 'v4', auth })

  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    }, (err, res) => {
      if (err) reject(err)
      else resolve(res.data.values)
    })
  })
}

const updateReport = async (range, values) => {
  const auth = await getClient()
  const sheets = google.sheets({ version: 'v4', auth })

  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values,
      }
    }, (err, res) => {
      if (err) reject(err);
      else resolve(res.data.values);
    })
  })
}

module.exports = {
  getReport,
  updateReport,
}
