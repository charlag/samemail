/* eslint-env node, mocha */
const samemail = require('../lib')
const expect = require('chai').expect

describe('samemail', function () {
  describe('arrayIntersectionSize', function () {
    it('should return correct count for the same indexes', function () {
      expect(samemail.arrayIntersectionSize([1, 2, 3], [1, 2, 4])).to.be.equal(2)
    })

    it('should not count equal items in dieefernt positions', function () {
      expect(samemail.arrayIntersectionSize([1, 3, 2], [1, 2, 3])).to.be.equal(1)
    })
  })

  describe('makeNgrams', function () {
    it('should make correct ngram', function () {
      expect(samemail.makeNgrams([1, 2, 3, 4, 5, 6], 3))
        .to.be.deep.equal([[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6]])
    })
  })

  describe('calculateSimilarities', function () {
    it('should calculate correct similarity', function () {
      const input = [
        // First email signature
        [1, 2, 3],
        // Second email signature
        [1, 4, 3]
      ]
      expect(samemail.calculateSimilarities(input)).to.be.deep.equal([
        [0, 2 / 3], // Two positions are the same, signature length is 3
        [0, 0]
      ])
    })
  })
})
