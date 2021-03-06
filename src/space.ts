import { STEP, MAX, MIN } from './constant'
import { getStepFromLevel } from './utils'

/**
 * The Range and Plug are equivalent
 */

/**
 * range of space
 *
 * storage `pos` and `len`
 * calculate to `start` and `end`
 *
 * readonly: should only been transfer
 */
export type Range = {
  readonly pos: number
  readonly len: number
  readonly start: number
  readonly end: number
}
export const createRange = (start: number, end: number): Range => {
  const len = end - start + 1
  return {
    get pos() {
      return start
    },
    get len() {
      return len
    },
    get start() {
      return start
    },
    get end() {
      return end
    },
  }
}
export const createRangeFromPlug = (plug: Plug): Range => {
  return createRange(plug.startIndex, plug.endIndex)
}

/**
 * the list of index
 *
 * a draft form of Floor
 *
 * It is level index in space module
 * It is element index in place module
 */
export type Indexs = number[]

export const createIndexs = (index: number = 0): Indexs => {
  let indexs: Indexs = []

  while (index >= STEP) {
    indexs.push(index % STEP)
    index = Math.floor(index / STEP)
  }

  if (indexs.length > 0 || index !== 0) indexs.push(index)

  return indexs
}

export const getIndexFromIndexs = (indexs: Indexs): number => {
  let index = indexs[indexs.length - 1] || 0

  for (let i = indexs.length - 2; i >= 0; i--) {
    index = index * STEP + (indexs[i] || 0)
  }

  return index
}

/**
 * position of floor
 *
 * level 0 >>> level n
 * max level = length
 *
 * start: the lowest level
 * end: the highest level
 * index: the index of each level
 *
 * support to change
 */
export type Floor = {
  readonly index: number
  readonly indexs: Indexs
  readonly length: number
  get: (level: number) => number
  set: (level: number, index: number) => void
  remove: (level: number) => number
  higer: () => void
  lower: () => void
}
const createFloorBase = (index: number, indexs: Indexs): Floor => {
  const get = (level: number) => {
    return indexs[level] || 0
  }

  const set = (level: number, i: number) => {
    const offset = i - (indexs[level] || 0)
    index += getStepFromLevel(level) * offset
    indexs[level] = i
  }

  const remove = (level: number): number => {
    const i = indexs[level]
    if (i !== undefined && i !== 0) {
      index = index - getStepFromLevel(level) * i
      indexs[level] = 0
    }
    return i || 0
  }

  const transform = (transitLevel: (level: number) => number) => {
    const newIndexs = createIndexs()

    indexs.forEach((i, level) => {
      const newLevel = transitLevel(level)
      if (newLevel < 0) return
      newIndexs[newLevel] = i
    })

    indexs = newIndexs
  }

  const higer = () => {
    index = index * STEP
    transform((i) => i + 1)
  }

  const lower = () => {
    if (index !== 0) index = index / STEP
    transform((i) => i - 1)
  }

  return {
    get index() {
      return index
    },
    get indexs() {
      return indexs
    },
    get length() {
      return indexs.length
    },
    get,
    set,
    remove,
    higer,
    lower,
  }
}
export const createFloor = (index: number = 0): Floor => {
  return createFloorBase(index, createIndexs(index))
}
export const createFloorFromIndexs = (indexs: Indexs = []): Floor => {
  return createFloorBase(getIndexFromIndexs(indexs), indexs)
}

export const cloneFloor = (floor: Floor): Floor => {
  return createFloorBase(floor.index, floor.indexs.slice())
}

export const getIndexOfFloor = (floor: Floor): number => {
  return getIndexFromIndexs(floor.indexs)
}

/**
 * record range with floor
 *
 * base: shared floor
 *
 * only support transform not support change
 */
export type Plug = {
  readonly base: Floor
  readonly start: Floor
  readonly end: Floor
  readonly baseStartLevel: number
  readonly startIndex: number
  readonly endIndex: number
  readonly length: number
  readonly isLevelMax: boolean
}
const createPlugBase = (
  base: Floor,
  start: Floor,
  end: Floor,
  baseStartLevel: number,
  startIndex: number,
  endIndex: number
): Plug => {
  const length = endIndex - startIndex + 1
  const step = getStepFromLevel(baseStartLevel)
  const isLevelMax = step <= length

  return {
    get base() {
      return base
    },
    get start() {
      return start
    },
    get end() {
      return end
    },
    get baseStartLevel() {
      return baseStartLevel
    },
    get startIndex() {
      return startIndex
    },
    get endIndex() {
      return endIndex
    },
    get length() {
      return length
    },
    get isLevelMax() {
      return isLevelMax
    },
  }
}
export const createPlug = (
  base: Floor,
  start: Floor,
  end: Floor,
  baseStartLevel: number
): Plug => {
  const baseIndex = getIndexOfFloor(base)
  const startIndex = baseIndex + getIndexOfFloor(start)
  const endIndex = baseIndex + getIndexOfFloor(end)

  return createPlugBase(base, start, end, baseStartLevel, startIndex, endIndex)
}
export const createPlugFromFloor = (start: Floor, end: Floor): Plug => {
  const base = createFloorFromIndexs()

  // should not change original data
  start = cloneFloor(start)
  end = cloneFloor(end)

  let baseStartLevel: number = Math.max(start.length, end.length)

  for (let level = baseStartLevel - 1; level >= 0; level--) {
    const startIndex = start.indexs[level]
    const endIndex = end.indexs[level]
    // 0 and undefined is equivalent
    if (
      ((startIndex === undefined || startIndex === 0) &&
        (endIndex === undefined || endIndex === 0)) ||
      startIndex === endIndex
    ) {
      baseStartLevel = level
      base.set(level, start.indexs[level])
      start.remove(level)
      end.remove(level)
    } else {
      break
    }
  }

  return createPlug(base, start, end, baseStartLevel)
}

export const createPlugFromIndex = (index: number): Plug => {
  // should not change original data
  const start = createFloor(index)
  const end = createFloor(index)

  start.set(0, 0)
  end.set(0, 7)

  return createPlugFromFloor(start, end)
}
export const createPlugFromRange = (range: Range) => {
  return createPlugFromFloor(createFloor(range.start), createFloor(range.end))
}

/**
 * expand plug to get more space
 *
 * @param {Plug} plug
 * @returns {Plug}
 */
export const expand = (plug: Plug): Plug => {
  if (is_max(plug)) return plug

  if (!plug.isLevelMax) {
    // expand to level max
    // max *4 usualy *2
    const base = cloneFloor(plug.base)
    const start = createFloorFromIndexs()
    const end = createFloorFromIndexs(Array(plug.baseStartLevel).fill(STEP - 1))
    return createPlug(base, start, end, plug.baseStartLevel)
  } else {
    // expand one level upwards with double block
    // always *2
    const base = cloneFloor(plug.base)
    const start = createFloorFromIndexs()
    const end = createFloorFromIndexs(Array(plug.baseStartLevel).fill(STEP - 1))
    start.set(plug.baseStartLevel, base.get(plug.baseStartLevel))
    end.set(plug.baseStartLevel, base.get(plug.baseStartLevel) + 1)
    return createPlug(base, start, end, plug.baseStartLevel + 1)
  }
}

const isInCacheBlock = (start: number, end: number): boolean => {
  if (end - start !== 1) return false
  if (start >= STEP - 1) return false
  if (end <= 0) return false
  if (start % 2 !== 0) return false
  return true
}

/**
 * optimize plug to level max or level cache max
 *
 * @param {Plug} plug
 * @returns {Plug}
 */
export const optimize = (plug: Plug): Plug => {
  if (plug.baseStartLevel === 1) {
    if (!plug.isLevelMax) return expand(plug)
    else return plug
  } else {
    const lowStart = plug.start.get(plug.baseStartLevel - 1)
    const lowEnd = plug.end.get(plug.baseStartLevel - 1)
    if (isInCacheBlock(lowStart, lowEnd)) {
      // in cache block expand to max of cache block
      const base = cloneFloor(plug.base)
      const start = createFloorFromIndexs()
      const end = createFloorFromIndexs(
        Array(plug.baseStartLevel - 1).fill(STEP - 1)
      )
      start.set(plug.baseStartLevel - 1, lowStart)
      end.set(plug.baseStartLevel - 1, lowEnd)
      return createPlug(base, start, end, plug.baseStartLevel)
    } else {
      // else expand to max of level
      return expand(plug)
    }
  }
}

export const is_max = (plug: Plug): boolean => {
  return plug.startIndex <= MIN && plug.endIndex >= MAX
}
