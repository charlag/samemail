const crc32 = require('crc-32')

// This number should probably be calculated from the set size
const NUM_HASHES = 25
const MAX_SHINGLE_ID = Math.pow(2, 32) - 1
// This one should be found by some heuristic too
const SUSPICIOUS_COLLISION_THRESHOLD = 0.4
// Coefficient which will be appliet to the suspicious rating if both emails are
// from the same address
const SAME_ADDRESS_COEFF = 2

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

/**
 * Function which generates 'shingles' (all sequences of length hashed).
 * Example: 'I write code in ES 6' would generate ngrams
 * 'I write code', 'write code in', 'code in ES', 'in ES 6'. Each of these
 * would be hashed.
 * @param {string} str String from which shingles will be made.
 * @return {array<Number>} Hashed shingles
 */
const makeShingles = (str) => {
  const ngrams = makeWordNgrams(str)
  return ngrams.map(ngram => {
    const [f, s, t] = ngram
    const ngramStr = `${f} ${s} ${t}`
    return crc32.str(ngramStr)
  })
}

const _generateSignatures = (shingles, hashesNumber, coeffA, coeffB, nextPrime) => {
  const universalHash = (i, shingle) =>
        (coeffA[i] * shingle + coeffB[i]) % nextPrime

  return shingles.map(shinglesForDoc => {
    const signature = []

    for (let i = 0; i < hashesNumber; i++) {
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
}

/**
 * Generate signatures to identify emails according to MinHash algorithm.
 * @oaram {array<Number>} shingles Shingles to use for signatures
 * @param {Number} hashesNumber Number of hashes which will be generated
 * @param {Number} maxShingleId Upper bound for generated IDs
 * @return {array<Number>} Signatures which represent shingles in compact form
 */
const generateSignatures = (shingles, hashesNumber, maxShingleId) => {
  const nextPrime = 4294967311
  const coeffA = generateRandomCoeffs(shingles.length, maxShingleId)
  const coeffB = generateRandomCoeffs(shingles.length, maxShingleId)

  return _generateSignatures(shingles, hashesNumber, coeffA, coeffB, nextPrime)
}

/**
 * Calculate similarities matrix for the signatures array. Each signature is an
 * array. This function calculates how many positions are the same for any given
 * pair.
 * @param {array<array<number>>} signatures matrix with signatures which will be
 * checked for similarity.
 * @return {array<<array<number>>} Pairwise similarities. Only upper-right half
 * of the matrix is filled.
 */
const calculateSimilarities = (signatures) => {
  const distances = signatures.map(i => Array.from(
    new Array(signatures.length),
    () => 0
  ))

  for (let i = 0; i < signatures.length - 1; i++) {
    const firstSignature = signatures[i]
    for (let j = i + 1; j < signatures.length; j++) {
      const secondSignature = signatures[j]
      const intersectionSize = arrayIntersectionSize(firstSignature, secondSignature)
      const estimate = intersectionSize / NUM_HASHES
      distances[i][j] = estimate
    }
  }
  return distances
}

/**
 * Function which calculates emails spam rating by matrix of similarities.
 * The bigger the rating - the higher chance that email is a spam.
 * This implementation takes into account sender address.
 * @param {array<array<int>} similarities Matrix of similarities
 * @param {array<string>} emailIds Array of EmailIDs. Should have the same order
 * as similarities matrix
 * @param {function} emailById Function to fetch email by specified ID
 * @return {object} Object with keys as emailIds and values as ratings
 */
const calculateRatingsActual = (similarities, emailIds, emailById) => {
  const length = emailIds.length
  const emailsRating = {}

  for (let i = 0; i < length - 1; i++) {
    for (let j = i + 1; j < length; j++) {
      const similarity = similarities[i][j]
      const firstId = emailIds[i]
      const secondId = emailIds[j]
      let prevI = emailsRating[firstId] || 0
      let prevJ = emailsRating[secondId] || 0
      let newI = prevI
      let newJ = prevJ
      if (similarity > SUSPICIOUS_COLLISION_THRESHOLD) {
        const firstEmail = emailById(firstId)
        const secondEmail = emailById(secondId)
        // While this implementation takes into account the sender, it could
        // be much smarter and raise rating of all emails by specified sender
        // by some fraction. We also don't analyse email contents itself while
        // it could improve accuracy a lot.
        const senderCoeff = firstEmail.sender === secondEmail.sender
              ? SAME_ADDRESS_COEFF : 1
        const finalCoeff = similarity * senderCoeff + 0.1
        newI = prevI + finalCoeff
        newJ = prevJ + finalCoeff
      }
      emailsRating[firstId] = newI
      emailsRating[secondId] = newJ
    }
  }
  return emailsRating
}

const averageObjValue = (obj) => {
  const values = Object.values(obj)
  return values.reduce((acc, cur) => acc + cur) / values.length
}

/**
 * Calculate ratings for each email in the emails database.
 * Each email should be an object with the following fields:
 * id: string
 * sender: string
 * topic: string
 * content: string
 * @param {Iterable<Object>} emailIterator Iterable object with emails
 */
const calculateRatings = (emailIds, getEmailById) => {
  const shingles = emailIds.map(emailId =>
                                makeShingles(getEmailById(emailId).content))

  const signatures = generateSignatures(shingles,
                                        NUM_HASHES,
                                        MAX_SHINGLE_ID)
  const similarities = calculateSimilarities(signatures)
  const emailsRating = calculateRatingsActual(similarities, emailIds, getEmailById)

  const averageRating = averageObjValue(emailsRating)
  return {
    averageRating,
    ratings: emailsRating
  }
}

module.exports.calculateRatings = calculateRatings
