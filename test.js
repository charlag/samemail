const fs = require('fs')
const samemail = require('./lib')

const ids = fs.readdirSync('data')
const getEmailById = (id) => {
  const content = fs.readFileSync(`data/${id}`, 'utf8')
  const firstNewline = content.indexOf('\n')
  const secondNewline = content.indexOf('\n', firstNewline + 1)
  const thirdNewLine = content.indexOf('\n', secondNewline + 1)
  const sender = content.substring(firstNewline + 1, secondNewline)
  const topic = content.substring(secondNewline + 1, thirdNewLine)
  const emailContent = content.substring(thirdNewLine + 1)
  return {
    id,
    sender,
    topic,
    content: emailContent
  }
}

const ratings = samemail.calculateRatings(
  ids,
  getEmailById
)
console.log(JSON.stringify(ratings, null, 2))
