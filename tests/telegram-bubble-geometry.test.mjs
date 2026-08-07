import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TELEGRAM_IOS_BUBBLE_SOURCE,
  canMergeTelegramMessageBoundary,
  getTelegramBubbleContinuity,
  getTelegramBubblePosition,
  getTelegramSourceRadii,
  makeTelegramBubbleGeometry,
} from '../components/telegram-bubble-geometry.ts'

test('official Telegram iOS constants stay pinned', () => {
  assert.deepEqual(TELEGRAM_IOS_BUBBLE_SOURCE, {
    fixedMainDiameter: 33,
    tailExtension: 6,
    mainRadius: 16,
    mergedRadius: 8,
    minRadiusForFullTail: 14,
    bottomEllipse: { x: 24, y: 16, width: 27, height: 17 },
    topEllipse: { x: 33, y: 14, width: 23, height: 21 },
  })
})

test('33pt source cap ports every constructive primitive exactly', () => {
  const geometry = makeTelegramBubbleGeometry(33, 33, 'single')

  assert.equal(geometry.canvasWidth, 39)
  assert.equal(
    geometry.bridgePath,
    'M 16.5 16 H 33 V 25 H 16.5 Z',
  )
  assert.equal(
    geometry.tailPath,
    'M 24 24.5 Q 24 33 37.5 33 Q 51 33 51 24.5 Z',
  )
  assert.deepEqual(geometry.cutout, {
    cx: 44.5,
    cy: 24.5,
    rx: 11.5,
    ry: 10.5,
  })
})

test('only single and last bubbles draw the tail', () => {
  const positions = ['single', 'first', 'middle', 'last']
  assert.deepEqual(
    positions.map((position) =>
      makeTelegramBubbleGeometry(180, 58, position).drawTail,
    ),
    [true, false, false, true],
  )
})

test('group radii match Telegram neighbor variants before mirroring', () => {
  assert.deepEqual(getTelegramSourceRadii('first'), {
    topLeft: 16,
    topRight: 16,
    bottomRight: 8,
    bottomLeft: 16,
    drawTail: false,
  })
  assert.deepEqual(getTelegramSourceRadii('middle'), {
    topLeft: 16,
    topRight: 8,
    bottomRight: 8,
    bottomLeft: 16,
    drawTail: false,
  })
  assert.deepEqual(getTelegramSourceRadii('last'), {
    topLeft: 16,
    topRight: 8,
    bottomRight: 16,
    bottomLeft: 16,
    drawTail: true,
  })
})

test('all four neighbor combinations resolve deterministically', () => {
  assert.equal(getTelegramBubblePosition(false, false), 'single')
  assert.equal(getTelegramBubblePosition(false, true), 'first')
  assert.equal(getTelegramBubblePosition(true, true), 'middle')
  assert.equal(getTelegramBubblePosition(true, false), 'last')
})

test('author, text boundaries, and day all participate in message grouping', () => {
  const base = {
    sameAuthor: true,
    beforeEndsWithText: true,
    afterStartsWithText: true,
    crossesDay: false,
  }

  assert.equal(canMergeTelegramMessageBoundary(base), true)
  assert.equal(
    canMergeTelegramMessageBoundary({ ...base, sameAuthor: false }),
    false,
  )
  assert.equal(
    canMergeTelegramMessageBoundary({ ...base, beforeEndsWithText: false }),
    false,
  )
  assert.equal(
    canMergeTelegramMessageBoundary({ ...base, afterStartsWithText: false }),
    false,
  )
  assert.equal(
    canMergeTelegramMessageBoundary({ ...base, crossesDay: true }),
    false,
  )
})

test('a tool part breaks text-part continuity instead of hiding a tail', () => {
  const beforeTool = getTelegramBubbleContinuity({
    previousMessageIsSameGroup: false,
    nextMessageIsSameGroup: false,
    previousPartIsText: false,
    nextPartIsText: false,
    isAtMessageStart: true,
    isAtMessageEnd: false,
  })
  const afterTool = getTelegramBubbleContinuity({
    previousMessageIsSameGroup: false,
    nextMessageIsSameGroup: false,
    previousPartIsText: false,
    nextPartIsText: false,
    isAtMessageStart: false,
    isAtMessageEnd: true,
  })

  assert.equal(beforeTool.position, 'single')
  assert.equal(afterTool.position, 'single')
})

test('a tool at a message edge also blocks grouping with adjacent messages', () => {
  const textAfterLeadingTool = getTelegramBubbleContinuity({
    previousMessageIsSameGroup: true,
    nextMessageIsSameGroup: false,
    previousPartIsText: false,
    nextPartIsText: false,
    isAtMessageStart: false,
    isAtMessageEnd: true,
  })
  const textBeforeTrailingTool = getTelegramBubbleContinuity({
    previousMessageIsSameGroup: false,
    nextMessageIsSameGroup: true,
    previousPartIsText: false,
    nextPartIsText: false,
    isAtMessageStart: true,
    isAtMessageEnd: false,
  })

  assert.equal(textAfterLeadingTool.position, 'single')
  assert.equal(textBeforeTrailingTool.position, 'single')
})

test('consecutive text parts form one group and keep one final tail', () => {
  const first = getTelegramBubbleContinuity({
    previousMessageIsSameGroup: false,
    nextMessageIsSameGroup: false,
    previousPartIsText: false,
    nextPartIsText: true,
    isAtMessageStart: true,
    isAtMessageEnd: false,
  })
  const last = getTelegramBubbleContinuity({
    previousMessageIsSameGroup: false,
    nextMessageIsSameGroup: false,
    previousPartIsText: true,
    nextPartIsText: false,
    isAtMessageStart: false,
    isAtMessageEnd: true,
  })

  assert.equal(first.position, 'first')
  assert.equal(last.position, 'last')
})
