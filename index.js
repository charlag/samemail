const fs = require('fs')
const crc32 = require('crc-32')

const NUM_HASHES = 10

const arrayRange = (max) => Array.from(new Array(max), (x, i) => i)

const arrayIntersectionSize = (arr1, arr2) => {
  const arrSize = arr1.length
  let count = 0
  for (let i = 0; i < arrSize; i++) {
    if (arr1[i] === arr2[i]) {
      count++
    }
  }
  return count
}

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
  const words = document.split(' ')
  return makeNgrams(words, 3)
}

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    let temp = array[i]
    array[i] = array[j]
    array[j] = temp
    }
}

const generateRandomCoeffs = (size) => {
  const array = arrayRange(size)
  shuffleArray(array)
  return array
}

const documents = fs.readFileSync('data/articles_100.train', 'utf8')
      .split('\n')
      .reduce((accum, line) => {
        const idLength = line.indexOf(' ')
        const id = line.substring(0, idLength)
        const content = line.substring(idLength + 1)
        accum[id] = content
        return accum
      }, {})

const shingles = Object.keys(documents).reduce((acc, key) => {
  const content = documents[key] // string with content
  const ngrams = makeWordNgrams(content)
  const shingles = ngrams.map(ngram => {
    const [f, s, t] = ngram
    const ngramStr = `${f} ${s} ${t}`
    return crc32.str(ngramStr)
  })
  acc[key] = shingles
  return acc
}, {})

// const totalShingles = Object.keys(shingles).reduce((acc, key) => {
//   return acc + shingles[key].length
// }, 0)

const documentsSize = Object.keys(documents).length
const coeffA = generateRandomCoeffs(documentsSize)
const coeffB = generateRandomCoeffs(documentsSize)

const signatures = (() => {
  let nextPrime = 4294967311

  const universalHash = (i, shingle) =>
        (coeffA[i] * shingle + coeffB[i]) % nextPrime

  return Object.keys(shingles).map(key => {
    const shinglesForDoc = shingles[key]

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
const estimates = Array.from(new Array(documentsSize), (i) => {
  return new Array(documentsSize)
})

for (let i = 0; i < documentsSize; i++) {
  const firstSignature = signatures[i]
  for (let j = i + 1; j < documentsSize; j++) {
    const secondSignature = signatures[j]
    const intersectionSize = arrayIntersectionSize(firstSignature, secondSignature)
    const estimate = intersectionSize / NUM_HASHES
    estimates[i][j] = estimate
    if (estimate > 0.5) {
      console.log(`Estimate ${i} ${j} is high`)
    }
  }
}
