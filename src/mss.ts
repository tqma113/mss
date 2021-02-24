import { getNextRange } from './range'
import { generateIndex } from './generate'
import { Ok, Err } from './result'
import { MIN, MAX } from './constant'

import type { Result } from './result'
import type { OutputIndex } from './generate'
import type { Range } from './range'

/**
 * the input info
 * 
 * @field {number} inputCount: the amount of input elements
 * @field {Range} inputRange: the range of input position
*/
export type Input = {
  inputCount: number
  inputRange: Range
}

/**
 * the result message
 * 
 * @field {Range} range: the affected range of this reconcile
 */
export type Output = OutputIndex & {
  range: Range
}

/**
 * get amount of exist elements in determinate range
 * 
 * @param {Range} range
 * @returns {Promise<number>}
 */
export type GetElementCount = (range: Range) => Promise<number>

const validateRange = (range: Range): Result<true, string> => {
  if (range.pos < MIN || range.pos > MAX) {
    return Err(`The start: ${range.pos} of range is invalid.`)
  }

  if (range.len < MIN || range.len > MAX) {
    return Err(`The length: ${range.len} of range is invalid.`)
  }

  const end = range.pos + range.len
  if (end < MIN || end > MAX) {
    return Err(`The end: ${end} of range is invalid.`)
  }

  return Ok(true)
}

const validateElementCount = (range: Range, count: number) => {
  if (count > range.len) {
    return Err(`The count: ${count} of exist elements is invalid.`)
  }

  return Ok(true)
}

/**
 * mss
 * 
 * @param {Input} input 
 * @param {GetElementAmount} getElementAmount 
 */
export const mss = async (input: Input, getElementCount: GetElementCount): Promise<Result<Output, string>> => {
  const { inputCount, inputRange } = input

  const validateResult = validateRange(inputRange)
  switch(validateResult.kind) {
    case 'Err': return Err(validateResult.value)
  }

  if ((await getElementCount(inputRange)) > 0) {
    return Err(`The input range: ${inputRange} is not empty.`)
  }

  let level = 1
  let range = inputRange
  let sumCount = inputCount

  while (sumCount > range.len) {
    level += 1
    range = getNextRange(range, level)

    const existCount = await getElementCount(range)
    const validateResult = validateElementCount(range, existCount)
    switch(validateResult.kind) {
      case 'Err': return Err(validateResult.value)
    }

    sumCount = existCount + inputCount
  }

  return Ok({
    ...generateIndex(range, inputRange, sumCount),
    range
  })
}
