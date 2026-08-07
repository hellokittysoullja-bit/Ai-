export type TelegramBubblePosition = 'single' | 'first' | 'middle' | 'last'

/**
 * Literal geometry from Telegram-iOS:
 * submodules/TelegramPresentationData/Sources/ChatMessageBubbleImages.swift
 * (TelegramMessenger/Telegram-iOS, 6ad963e5b62d354da79040f388ae2b9132fb17b8).
 *
 * Telegram rasterises this 33 pt cap and stretches only its centre. The web
 * renderer below does the equivalent operation analytically: the corners and
 * tail remain fixed while only the straight middle sections grow.
 */
export const TELEGRAM_IOS_BUBBLE_SOURCE = Object.freeze({
  fixedMainDiameter: 33,
  tailExtension: 6,
  mainRadius: 16,
  mergedRadius: 8,
  minRadiusForFullTail: 14,
  bottomEllipse: Object.freeze({ x: 24, y: 16, width: 27, height: 17 }),
  topEllipse: Object.freeze({ x: 33, y: 14, width: 23, height: 21 }),
})

export type TelegramBubbleRadii = {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

export type TelegramBubbleGeometry = {
  bodyPath: string
  bridgePath: string | null
  tailPath: string | null
  cutout: { cx: number; cy: number; rx: number; ry: number } | null
  bodyWidth: number
  bodyHeight: number
  canvasWidth: number
  drawTail: boolean
}

function number(value: number): string {
  return Number(value.toFixed(3)).toString()
}

function clampRadius(radius: number, width: number, height: number): number {
  return Math.max(0, Math.min(radius, width / 2, height / 2))
}

/** Telegram's .none / .top / .both / .bottom variants before mirroring. */
export function getTelegramSourceRadii(
  position: TelegramBubblePosition,
  mainRadius = TELEGRAM_IOS_BUBBLE_SOURCE.mainRadius,
  mergedRadius = TELEGRAM_IOS_BUBBLE_SOURCE.mergedRadius,
): TelegramBubbleRadii & { drawTail: boolean } {
  switch (position) {
    case 'single':
      return {
        topLeft: mainRadius,
        topRight: mainRadius,
        bottomRight: mainRadius,
        bottomLeft: mainRadius,
        drawTail: true,
      }
    case 'first':
      return {
        topLeft: mainRadius,
        topRight: mainRadius,
        bottomRight: mergedRadius,
        bottomLeft: mainRadius,
        drawTail: false,
      }
    case 'middle':
      return {
        topLeft: mainRadius,
        topRight: mergedRadius,
        bottomRight: mergedRadius,
        bottomLeft: mainRadius,
        drawTail: false,
      }
    case 'last':
      return {
        topLeft: mainRadius,
        topRight: mergedRadius,
        bottomRight: mainRadius,
        bottomLeft: mainRadius,
        drawTail: true,
      }
  }
}

function makeRoundedBodyPath(
  width: number,
  height: number,
  radii: TelegramBubbleRadii,
): string {
  const topLeft = clampRadius(radii.topLeft, width, height)
  const topRight = clampRadius(radii.topRight, width, height)
  const bottomRight = clampRadius(radii.bottomRight, width, height)
  const bottomLeft = clampRadius(radii.bottomLeft, width, height)

  const arc = (radius: number, x: number, y: number) =>
    radius > 0
      ? `A ${number(radius)} ${number(radius)} 0 0 1 ${number(x)} ${number(y)}`
      : `L ${number(x)} ${number(y)}`

  return [
    `M 0 ${number(topLeft)}`,
    arc(topLeft, topLeft, 0),
    `L ${number(width - topRight)} 0`,
    arc(topRight, width, topRight),
    `L ${number(width)} ${number(height - bottomRight)}`,
    arc(bottomRight, width - bottomRight, height),
    `L ${number(bottomLeft)} ${number(height)}`,
    arc(bottomLeft, 0, height - bottomLeft),
    'Z',
  ].join(' ')
}

/**
 * Rebuilds Telegram's stretchable source mask at an arbitrary body size.
 * The returned coordinates describe the outgoing/right-hand source. Incoming
 * bubbles are its exact horizontal mirror at render time.
 */
export function makeTelegramBubbleGeometry(
  rawBodyWidth: number,
  rawBodyHeight: number,
  position: TelegramBubblePosition,
): TelegramBubbleGeometry {
  const bodyWidth = Math.max(1, rawBodyWidth)
  const bodyHeight = Math.max(1, rawBodyHeight)
  const source = getTelegramSourceRadii(position)
  const bodyPath = makeRoundedBodyPath(bodyWidth, bodyHeight, source)
  const canvasWidth = bodyWidth + TELEGRAM_IOS_BUBBLE_SOURCE.tailExtension

  if (!source.drawTail) {
    return {
      bodyPath,
      bridgePath: null,
      tailPath: null,
      cutout: null,
      bodyWidth,
      bodyHeight,
      canvasWidth,
      drawTail: false,
    }
  }

  // The source fills this bridge before subtracting the upper ellipse. It is
  // essential: without it, the rounded body and lower ellipse meet through a
  // one-pixel throat that looks jagged after rasterisation.
  const bridgeLeft = Math.min(bodyWidth, TELEGRAM_IOS_BUBBLE_SOURCE.fixedMainDiameter / 2)
  const bridgeTop = Math.min(bodyHeight, TELEGRAM_IOS_BUBBLE_SOURCE.bottomEllipse.y)
  const bridgeBottom = Math.max(bridgeTop, bodyHeight - 8)
  const bridgePath = [
    `M ${number(bridgeLeft)} ${number(bridgeTop)}`,
    `H ${number(bodyWidth)}`,
    `V ${number(bridgeBottom)}`,
    `H ${number(bridgeLeft)}`,
    'Z',
  ].join(' ')

  // This is deliberately two quadratic curves, not an SVG ellipse: it is the
  // exact pair of addQuadCurve calls used by Telegram iOS.
  const tailPath = [
    `M ${number(bodyWidth - 9)} ${number(bodyHeight - 8.5)}`,
    `Q ${number(bodyWidth - 9)} ${number(bodyHeight)} ${number(bodyWidth + 4.5)} ${number(bodyHeight)}`,
    `Q ${number(bodyWidth + 18)} ${number(bodyHeight)} ${number(bodyWidth + 18)} ${number(bodyHeight - 8.5)}`,
    'Z',
  ].join(' ')

  return {
    bodyPath,
    bridgePath,
    tailPath,
    cutout: {
      cx: bodyWidth + 11.5,
      cy: bodyHeight - 8.5,
      rx: 11.5,
      ry: 10.5,
    },
    bodyWidth,
    bodyHeight,
    canvasWidth,
    drawTail: true,
  }
}

export function getTelegramBubblePosition(
  previousIsSameGroup: boolean,
  nextIsSameGroup: boolean,
): TelegramBubblePosition {
  if (!previousIsSameGroup && !nextIsSameGroup) return 'single'
  if (!previousIsSameGroup) return 'first'
  if (!nextIsSameGroup) return 'last'
  return 'middle'
}

export function canMergeTelegramMessageBoundary({
  sameAuthor,
  beforeEndsWithText,
  afterStartsWithText,
  crossesDay,
}: {
  sameAuthor: boolean
  beforeEndsWithText: boolean
  afterStartsWithText: boolean
  crossesDay: boolean
}): boolean {
  return (
    sameAuthor &&
    beforeEndsWithText &&
    afterStartsWithText &&
    !crossesDay
  )
}

export function getTelegramBubbleContinuity({
  previousMessageIsSameGroup,
  nextMessageIsSameGroup,
  previousPartIsText,
  nextPartIsText,
  isAtMessageStart,
  isAtMessageEnd,
}: {
  previousMessageIsSameGroup: boolean
  nextMessageIsSameGroup: boolean
  previousPartIsText: boolean
  nextPartIsText: boolean
  isAtMessageStart: boolean
  isAtMessageEnd: boolean
}): {
  previousIsSameBubble: boolean
  nextIsSameBubble: boolean
  position: TelegramBubblePosition
} {
  const previousIsSameBubble =
    previousPartIsText ||
    (isAtMessageStart && previousMessageIsSameGroup)
  const nextIsSameBubble =
    nextPartIsText || (isAtMessageEnd && nextMessageIsSameGroup)

  return {
    previousIsSameBubble,
    nextIsSameBubble,
    position: getTelegramBubblePosition(
      previousIsSameBubble,
      nextIsSameBubble,
    ),
  }
}
