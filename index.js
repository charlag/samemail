const fs = require('fs')
const crc32 = require('crc-32')

// This number should probably be calculated from the set size
const NUM_HASHES = 20
const MAX_SHINGLE_ID = Math.pow(2, 32) - 1
// This one should be found by some heuristic too
const SUSPICIOUS_COLLISION_THRESHOLD = 0.45

/**
 * Calculates number of the equal elements in the same positions. Similar to
 * set intersection but takes position into account.
 * @param {array} arr1 The first array
 * @param {array} arr2 The second array
 * @returns {number} Number of the positions with equal elements
 */
const arrayIntersectionSize = (arr1, arr2) => {
  const arrSize = Math.min(arr1.length, arr2.length)
  let count = 0
  for (let i = 0; i < arrSize; i++) {
    if (arr1[i] === arr2[i]) {
      count++
    }
  }
  return count
}

/**
 * Calculate average of the numeric array (sum / length)
 * @param {array<number>} arr Array to calculate avarage of
 * @return {number} Average of the array
 */
const average = (arr) => arr.reduce((acc, el) => acc + el, 0) / arr.length

/**
 * Make ngrams [sequences of length n]
 * @param {array} array of values from which ngrams will be constructed
 * @returns {array<array>} array of ngrams
 */
const makeNgrams = (values, length) => {
  const ngrams = []
  const valuesLen = values.length
  for (let i = 0; i < valuesLen; i++) {
    const ngram = values.slice(i, Math.min(i + length, valuesLen))
    ngrams.push(ngram)
  }
  return ngrams
}

/**
 * Makes ngrams out of string with words
 * @param {string} document String representing the document
 * @returns {array<array<string>>} Array of ngrams (arrays of words)
 */
const makeWordNgrams = (document) => {
  const words = document.toLowerCase().split(' ')
  return makeNgrams(words, 3)
}

/**
 * Get random integer in the range [0, max)
 * @param {number} max Upper bound of the number range
 * @return {number} Random number in the specified range
 */
const getRandomInt = (max) =>
      Math.floor(Math.random() * Math.floor(max))

/**
 * Generate an array of random numbers in the range [0, maxId). They are
 * checked to be uniquie in the array.
 * @param {number} Size Size of the array which will be generated
 * @param {number} Upper bound of the possible numbers
 * @return {array} Array of unique random numbers in specified range
 */
const generateRandomCoeffs = (size, maxId) => {
  const array = new Array(size)
  for (let i = 0; i < size; i++) {
    let randIndex
    do {
      randIndex = getRandomInt(maxId)
    } while (array.indexOf(randIndex) !== -1)
    array[i] = randIndex
  }
  return array
}

const documents = fs.readFileSync('data/mails.train', 'utf8')
      .split('\n')
      .map(line => {
        const idLength = line.indexOf(' ')
        const id = line.substring(0, idLength)
        const content = line.substring(idLength + 1)
        return {
          id,
          content
        }
      })

const shingles = documents.map(({content}) => {
  const ngrams = makeWordNgrams(content)
  const shinglesForDoc = ngrams.map(ngram => {
    const [f, s, t] = ngram
    const ngramStr = `${f} ${s} ${t}`
    return crc32.str(ngramStr)
  })
  return shinglesForDoc
})

const documentsSize = Object.keys(documents).length
const coeffA = generateRandomCoeffs(documentsSize, MAX_SHINGLE_ID)
const coeffB = generateRandomCoeffs(documentsSize, MAX_SHINGLE_ID)

const signatures = (() => {
  let nextPrime = 4294967311

  const universalHash = (i, shingle) =>
        (coeffA[i] * shingle + coeffB[i]) % nextPrime

  return shingles.map(shinglesForDoc => {
    const signature = []

    for (let i = 0; i < NUM_HASHES; i++) {
      let minHashCode = nextPrime + 1

      for (let shingle of shinglesForDoc) {
        const hashCode = universalHash(i, shingle)

        if (hashCode < minHashCode) {
          minHashCode = hashCode
        }
      }

      signature.push(minHashCode)
    }
    return signature
  })
})()

// documentsSize * documentsSize matrix
const estimates = Array.from(Array(documentsSize), (i) => {
  return new Array(documentsSize)
})

const emailsRating = {}

for (let i = 0; i < documentsSize - 1; i++) {
  const firstSignature = signatures[i]
  for (let j = i + 1; j < documentsSize; j++) {
    const secondSignature = signatures[j]
    const intersectionSize = arrayIntersectionSize(firstSignature, secondSignature)
    const estimate = intersectionSize / NUM_HASHES
    estimates[i][j] = estimate
    const dangerous = estimate >= SUSPICIOUS_COLLISION_THRESHOLD
    const warnSign = dangerous ? '!' : ''
    console.log(`${documents[i].id} & ${documents[j].id}: ${Number(estimate).toFixed(2)}      ${warnSign}`)
    const prevI = emailsRating[i] || 0
    const prevJ = emailsRating[j] || 0
    const addScoreI = dangerous ? prevI + estimate + 0.1 : 0
    const addScoreJ = dangerous ? prevJ + estimate + 0.1 : 0
    emailsRating[i] = prevI + addScoreI
    emailsRating[j] = prevJ + addScoreJ
  }
  console.log('------------')
}

const averageRating = average(Object.values(emailsRating))
console.log(`Average rating: ${averageRating}`)
console.log('Emails rating: ')
for (let i = 0; i < documentsSize; i++) {
  const rating = emailsRating[i]
  console.log(`${documents[i].id}: ${rating}`)
}
