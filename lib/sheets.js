const { google } = require('googleapis')

// const pkey = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
const spreadsheetId = '1gyvdS8zval1C8qgDxH7yoeordSjF56Q2BVGZ_vrfuQg';

// const getJWT = async () => {
//   const jwt = new google.auth.JWT(
//     pkey.client_email,
//     null,
//     pkey.private_key,
//     [
//       'https://www.googleapis.com/auth/spreadsheets',
//       'https://www.googleapis.com/auth/drive'
//     ]
//   );

//   await (new Promise((resolve, reject) => {
//     jwt.authorize((err, token) => {
//       if (err) reject(err);
//       else resolve(token);
//     });
//   }));

//   return jwt
// };

const getClient = async () => {
  return await google.auth.getClient({
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  })
}

const getReport = async () => {
  const auth = await getClient();
  const sheets = google.sheets({ version: 'v4', auth })

  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:G'
    }, (err, res) => {
      if (err) reject(err)
      else resolve(res.data.values)
    })
  })
}

const updateReport = async (worklogs) => {
  const jwt = await auth();
  const sheets = google.sheets({version: 'v4', auth: jwt})
  const report = await getReport()
  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A2:G',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: report.map(record => {
          const [
            key,
            lead,
            basis,
            tbudget,
            mbudget,
            booked,
            remaining,
            active
          ] = record;
          const worklog = worklogs[key];
          return [
            key,
            worklog.lead,
            basis,
            tbudget,
            worklog.monthly_budget,
            worklog.billings,
            remaining,
            active
          ];
        }),
      },
    }, (err, res) => {
      if (err) reject(err);
      else resolve(res.data.values);
    })
  })
};

module.exports = {
  getReport,
  updateReport,
}
