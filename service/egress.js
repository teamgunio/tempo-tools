const request = require('request-promise-native')

const checkIP = async () => {
  const ip = await request('http://ifconfig.io/ip')
  console.log(`I'm running at ${ip}`)
  return ip
}

module.exports = {
  checkIP,
} 
