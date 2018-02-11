# samemail
A little experiment to detect similar emails using variant of MinHash algorithm.

For information on the algorithm please check [Mining of Massive Datasets](http://www.mmds.org/) course, Chapter 3 in particular.

Another good explanation is in this article: [MinHash Tutorial with Python](http://mccormickml.com/2015/06/12/minhash-tutorial-with-python-code/).

## Testing
Unit tests:
```
npm test
```
Running on a test data:
```
npm run testOnData
```
t0010 - t0015 should have low rating while other emails should have higher-than-average rating. Results may differ from run to run.

# API

## `calculateRatings`

Calculate ratings for each email in the emails database.
Each email should be an object with the following fields:
```
id: string
sender: string
topic: string
content: string
```

Resulting object is in the format:
```
ratings: object from id to the given rating (string & number)
averageRating: number
```
The bigger the rating is the more probable it is that email is a spam
### Parameters:

`emailIds` *(Array\<string\>)* Array with IDs of all available emails.

`getEmailById` *(Function)* Function which will fetch email by its id. May be called more than once.

# Example
```js
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

/*
{
  "averageRating": 1.0293333333333332,
  "ratings": {
    "t0001": 1.1,
    "t0002": 1.1,
    "t0003": 1.96,
    "t0004": 1.92,
    "t0005": 1.8399999999999999,
    "t0006": 1.86,
    "t0007": 1.86,
    "t0008": 1.28,
    "t0009": 1.28,
    "t0010": 1.24,
    "t0011": 0,
    "t0012": 0,
    "t0013": 0,
    "t0014": 0,
    "t0015": 0
  }
}
*/
```

![Jake the mailman](http://67.media.tumblr.com/tumblr_md787xAplD1rnrne9o1_1280.png)
Image by http://irogh.tumblr.com

