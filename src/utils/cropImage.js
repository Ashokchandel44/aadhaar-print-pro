const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180
}

function rotateSize(width, height, rotation) {
  const rotRad = getRadianAngle(rotation)

  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

export default async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not prepare image crop.')
  }

  const rotRad = getRadianAngle(rotation)
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation)

  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')

  if (!croppedCtx) {
    throw new Error('Could not render cropped image.')
  }

  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )

  return croppedCanvas.toDataURL('image/jpeg', 0.95)
}

export async function autoCropToCard(imageSrc, aspect = 86 / 54) {
  const image = await createImage(imageSrc)
  const candidates = []
  for (let angle = -12; angle <= 12; angle += 3) {
    candidates.push(angle)
  }
  let bestCandidate = null

  for (const angle of candidates) {
    const rotatedCanvas = createRotatedCanvas(image, angle)
    const candidate = detectAndCropCanvas(rotatedCanvas, aspect)
    const score = scoreCropCandidate(candidate, aspect) - Math.abs(angle) * 0.0008

    if (!bestCandidate || score > bestCandidate.score) {
      bestCandidate = { ...candidate, score }
    }
  }

  if (!bestCandidate) {
    throw new Error('Could not auto crop this image.')
  }

  return cropCanvasToDataUrl(bestCandidate.canvas, bestCandidate.crop)
}

function autoPerspectiveCrop(image, aspect) {
  const sourceCanvas = imageToCanvas(image)
  const points = detectCardCorners(sourceCanvas, aspect)

  if (!points) return null

  return warpPerspective(sourceCanvas, points, aspect)
}

function imageToCanvas(image) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not prepare image.')
  }

  canvas.width = image.width
  canvas.height = image.height
  ctx.drawImage(image, 0, 0)

  return canvas
}

function detectCardCorners(sourceCanvas, targetAspect) {
  const scale = Math.min(1, 760 / Math.max(sourceCanvas.width, sourceCanvas.height))
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) return null

  canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale))
  canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale))
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height)

  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const bg = averageColor(sampleBackground(data, width, height))
  const bgBright = brightness(bg)
  const foreground = new Uint8Array(width * height)

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const color = getPixel(data, width, x, y)
      const bright = brightness(color)
      const localEdge = Math.abs(brightness(getPixel(data, width, x - 1, y)) - brightness(getPixel(data, width, x + 1, y)))
        + Math.abs(brightness(getPixel(data, width, x, y - 1)) - brightness(getPixel(data, width, x, y + 1)))

      if (isLikelyCardPixel(color, bg, bgBright) || (localEdge > 42 && colorDistance(color, bg) > 26)) {
        foreground[y * width + x] = 1
      }
    }
  }

  growMask(foreground, width, height, 2)
  closeMask(foreground, width, height)

  const box = largestMaskBox(foreground, width, height, targetAspect)
  if (!box) return null

  const insetX = Math.max(2, Math.round(box.width * 0.02))
  const insetY = Math.max(2, Math.round(box.height * 0.02))
  const points = extremeCorners(foreground, width, height, {
    x: box.x + insetX,
    y: box.y + insetY,
    width: Math.max(4, box.width - insetX * 2),
    height: Math.max(4, box.height - insetY * 2),
  })

  if (!points) return null

  const scaled = points.map((point) => ({ x: point.x / scale, y: point.y / scale }))
  const edgeLengths = [
    distance(scaled[0], scaled[1]),
    distance(scaled[1], scaled[2]),
    distance(scaled[2], scaled[3]),
    distance(scaled[3], scaled[0]),
  ]
  const avgWidth = (edgeLengths[0] + edgeLengths[2]) / 2
  const avgHeight = (edgeLengths[1] + edgeLengths[3]) / 2
  const detectedAspect = avgWidth / avgHeight

  if (detectedAspect < 1.05 || detectedAspect > 2.45) return null

  return scaled
}

function largestMaskBox(mask, width, height, targetAspect) {
  const visited = new Uint8Array(mask.length)
  const queue = []
  let best = null

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || visited[index]) continue

    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    let count = 0
    let touchesEdge = false
    queue.length = 0
    queue.push(index)
    visited[index] = 1

    while (queue.length) {
      const current = queue.pop()
      const x = current % width
      const y = Math.floor(current / width)
      count += 1
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      touchesEdge = touchesEdge || x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2

      const neighbors = [current - 1, current + 1, current - width, current + width]
      for (const next of neighbors) {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue
        const nx = next % width
        const ny = Math.floor(next / width)
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue
        visited[next] = 1
        queue.push(next)
      }
    }

    const boxWidth = maxX - minX + 1
    const boxHeight = maxY - minY + 1
    const area = boxWidth * boxHeight
    const aspect = boxWidth / boxHeight
    const areaRatio = area / (width * height)
    const fill = count / area

    if (touchesEdge || areaRatio < 0.035 || areaRatio > 0.86 || aspect < 1.05 || aspect > 2.45 || fill < 0.1) continue

    const score = area * fill * (1 / (1 + Math.abs(aspect - targetAspect)))
    if (!best || score > best.score) {
      best = { x: minX, y: minY, width: boxWidth, height: boxHeight, score }
    }
  }

  return best
}

function extremeCorners(mask, width, height, box) {
  const points = []

  for (let y = box.y; y < box.y + box.height; y += 1) {
    for (let x = box.x; x < box.x + box.width; x += 1) {
      if (mask[y * width + x]) points.push({ x, y })
    }
  }

  if (points.length < 40) return null

  const center = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  }
  const corners = [
    pickCorner(points, center, 'tl'),
    pickCorner(points, center, 'tr'),
    pickCorner(points, center, 'br'),
    pickCorner(points, center, 'bl'),
  ]

  if (corners.some((point) => !point)) return null

  return corners
}

function pickCorner(points, center, corner) {
  const filtered = points.filter((point) => {
    if (corner === 'tl') return point.x <= center.x && point.y <= center.y
    if (corner === 'tr') return point.x >= center.x && point.y <= center.y
    if (corner === 'br') return point.x >= center.x && point.y >= center.y
    return point.x <= center.x && point.y >= center.y
  })

  if (!filtered.length) return null

  return filtered.reduce((best, point) => {
    const score = corner === 'tl'
      ? point.x + point.y
      : corner === 'tr'
        ? -point.x + point.y
        : corner === 'br'
          ? -point.x - point.y
          : point.x - point.y

    return !best || score < best.score ? { ...point, score } : best
  }, null)
}

function warpPerspective(sourceCanvas, points, aspect) {
  const outputWidth = 1200
  const outputHeight = Math.round(outputWidth / aspect)
  const sourceCtx = sourceCanvas.getContext('2d')
  const outputCanvas = document.createElement('canvas')
  const outputCtx = outputCanvas.getContext('2d')

  if (!sourceCtx || !outputCtx) return null

  outputCanvas.width = outputWidth
  outputCanvas.height = outputHeight

  const sourceData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
  const outputImage = outputCtx.createImageData(outputWidth, outputHeight)
  const [tl, tr, br, bl] = points

  for (let y = 0; y < outputHeight; y += 1) {
    const v = y / (outputHeight - 1)
    const left = interpolatePoint(tl, bl, v)
    const right = interpolatePoint(tr, br, v)

    for (let x = 0; x < outputWidth; x += 1) {
      const u = x / (outputWidth - 1)
      const source = interpolatePoint(left, right, u)
      const color = sampleBilinear(sourceData, sourceCanvas.width, sourceCanvas.height, source.x, source.y)
      const index = (y * outputWidth + x) * 4
      outputImage.data[index] = color[0]
      outputImage.data[index + 1] = color[1]
      outputImage.data[index + 2] = color[2]
      outputImage.data[index + 3] = 255
    }
  }

  outputCtx.putImageData(outputImage, 0, 0)
  return trimOuterBackground(outputCanvas).toDataURL('image/jpeg', 0.95)
}

function interpolatePoint(a, b, amount) {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  }
}

function sampleBilinear(imageData, width, height, x, y) {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)))
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)))
  const x1 = Math.max(0, Math.min(width - 1, x0 + 1))
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1))
  const dx = x - x0
  const dy = y - y0
  const c00 = getPixel(imageData.data, width, x0, y0)
  const c10 = getPixel(imageData.data, width, x1, y0)
  const c01 = getPixel(imageData.data, width, x0, y1)
  const c11 = getPixel(imageData.data, width, x1, y1)

  return [0, 1, 2].map((channel) => {
    const top = c00[channel] * (1 - dx) + c10[channel] * dx
    const bottom = c01[channel] * (1 - dx) + c11[channel] * dx
    return Math.round(top * (1 - dy) + bottom * dy)
  })
}

function growMask(mask, width, height, iterations) {
  for (let pass = 0; pass < iterations; pass += 1) {
    const original = mask.slice()
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x
        if (original[index]) continue
        if (original[index - 1] || original[index + 1] || original[index - width] || original[index + width]) {
          mask[index] = 1
        }
      }
    }
  }
}

function createRotatedCanvas(image, rotation = 0) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not rotate this image.')
  }

  const { width, height } = rotateSize(image.width, image.height, rotation)
  canvas.width = Math.round(width)
  canvas.height = Math.round(height)
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(getRadianAngle(rotation))
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  return canvas
}

function detectAndCropCanvas(scanCanvas, aspect) {
  const scanCtx = scanCanvas.getContext('2d')

  if (!scanCtx) {
    throw new Error('Could not auto crop this image.')
  }

  const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height)
  const data = imageData.data
  const corners = sampleBackground(data, scanCanvas.width, scanCanvas.height)
  const bg = averageColor(corners)
  let sx = 0
  let sy = 0
  let sw = scanCanvas.width
  let sh = scanCanvas.height

  const projectionBox = findCardByProjection(data, scanCanvas.width, scanCanvas.height, bg, aspect)
  const componentBox = findLargestCardComponent(data, scanCanvas.width, scanCanvas.height, bg, aspect)
  const fallback = findCentralDocumentBox(data, scanCanvas.width, scanCanvas.height, bg)
  const bestBox = chooseBestBox([projectionBox, componentBox, fallback], scanCanvas.width, scanCanvas.height, aspect)
  let score = 0.1

  if (bestBox) {
    sx = bestBox.x
    sy = bestBox.y
    sw = bestBox.width
    sh = bestBox.height
    score = bestBox.score || 0.5
  }

  const detectedAspect = sw / sh

  if (detectedAspect > aspect) {
    const nextWidth = sh * aspect
    sx += (sw - nextWidth) / 2
    sw = nextWidth
  } else if (detectedAspect < aspect) {
    const nextHeight = sw / aspect
    sy += (sh - nextHeight) / 2
    sh = nextHeight
  }

  return {
    canvas: scanCanvas,
    crop: { sx, sy, sw, sh },
    score,
  }
}

function scoreCropCandidate(candidate, targetAspect) {
  const { canvas, crop, score } = candidate
  const areaRatio = (crop.sw * crop.sh) / (canvas.width * canvas.height)
  const aspect = crop.sw / crop.sh
  const aspectScore = 1 / (1 + Math.abs(aspect - targetAspect) * 2.5)
  const usefulAreaScore = areaRatio > 0.08 && areaRatio < 0.82 ? 1 : 0.35
  const edgeScore = cardEdgeCleanliness(canvas, crop)

  return score * aspectScore * usefulAreaScore * edgeScore
}

function cardEdgeCleanliness(canvas, crop) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return 1

  const sampleWidth = Math.max(20, Math.min(90, Math.round(crop.sw * 0.18)))
  const sampleHeight = Math.max(14, Math.min(60, Math.round(crop.sh * 0.18)))
  const regions = [
    { x: crop.sx, y: crop.sy, w: sampleWidth, h: sampleHeight },
    { x: crop.sx + crop.sw - sampleWidth, y: crop.sy, w: sampleWidth, h: sampleHeight },
    { x: crop.sx, y: crop.sy + crop.sh - sampleHeight, w: sampleWidth, h: sampleHeight },
    { x: crop.sx + crop.sw - sampleWidth, y: crop.sy + crop.sh - sampleHeight, w: sampleWidth, h: sampleHeight },
  ]
  let lightPixels = 0
  let totalPixels = 0

  for (const region of regions) {
    const imageData = ctx.getImageData(
      Math.max(0, Math.round(region.x)),
      Math.max(0, Math.round(region.y)),
      Math.max(1, Math.min(canvas.width - region.x, Math.round(region.w))),
      Math.max(1, Math.min(canvas.height - region.y, Math.round(region.h))),
    )
    const data = imageData.data
    for (let i = 0; i < data.length; i += 16) {
      const bright = (data[i] + data[i + 1] + data[i + 2]) / 3
      if (bright > 72) lightPixels += 1
      totalPixels += 1
    }
  }

  const ratio = totalPixels ? lightPixels / totalPixels : 0.5
  return 0.65 + Math.min(0.75, ratio)
}

function cropCanvasToDataUrl(sourceCanvas, crop) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not crop this image.')
  }

  canvas.width = Math.round(crop.sw)
  canvas.height = Math.round(crop.sh)
  ctx.drawImage(sourceCanvas, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height)

  const tightened = trimOuterBackground(trimOuterBackground(canvas))
  return tightened.toDataURL('image/jpeg', 0.95)
}

export async function cropImageByPercent(imageSrc, cropPercent, rotation = 0) {
  const image = await createImage(imageSrc)
  const rotRad = getRadianAngle(rotation)
  const { width: canvasWidth, height: canvasHeight } = rotateSize(image.width, image.height, rotation)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not prepare crop.')
  }

  canvas.width = canvasWidth
  canvas.height = canvasHeight
  ctx.translate(canvasWidth / 2, canvasHeight / 2)
  ctx.rotate(rotRad)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const left = Math.min(cropPercent.left, 90 - cropPercent.right)
  const top = Math.min(cropPercent.top, 90 - cropPercent.bottom)
  const right = Math.max(cropPercent.right, 0)
  const bottom = Math.max(cropPercent.bottom, 0)
  const sx = Math.round((left / 100) * canvasWidth)
  const sy = Math.round((top / 100) * canvasHeight)
  const sw = Math.max(10, Math.round(canvasWidth - sx - (right / 100) * canvasWidth))
  const sh = Math.max(10, Math.round(canvasHeight - sy - (bottom / 100) * canvasHeight))
  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')

  if (!croppedCtx) {
    throw new Error('Could not crop image.')
  }

  croppedCanvas.width = sw
  croppedCanvas.height = sh
  croppedCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)

  return croppedCanvas.toDataURL('image/jpeg', 0.95)
}

function getPixel(data, width, x, y) {
  const safeX = Math.max(0, Math.min(width - 1, x))
  const index = (y * width + safeX) * 4
  return [data[index], data[index + 1], data[index + 2]]
}

function sampleBackground(data, width, height) {
  const points = []
  const marginX = Math.max(2, Math.floor(width * 0.04))
  const marginY = Math.max(2, Math.floor(height * 0.04))

  for (let i = 0; i <= 4; i += 1) {
    const x = Math.round((width - 1) * (i / 4))
    points.push(getPixel(data, width, x, marginY))
    points.push(getPixel(data, width, x, height - marginY - 1))
  }

  for (let i = 1; i <= 3; i += 1) {
    const y = Math.round((height - 1) * (i / 4))
    points.push(getPixel(data, width, marginX, y))
    points.push(getPixel(data, width, width - marginX - 1, y))
  }

  return points
}

function averageColor(colors) {
  return colors.reduce(
    (sum, color) => [sum[0] + color[0] / colors.length, sum[1] + color[1] / colors.length, sum[2] + color[2] / colors.length],
    [0, 0, 0],
  )
}

function brightness(color) {
  return (color[0] + color[1] + color[2]) / 3
}

function colorDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
}

function chooseBestBox(boxes, width, height, targetAspect) {
  let best = null

  for (const box of boxes) {
    if (!box) continue

    const areaRatio = (box.width * box.height) / (width * height)
    const aspect = box.width / box.height
    const aspectScore = 1 / (1 + Math.abs(aspect - targetAspect) * 1.7)
    const areaScore = areaRatio > 0.04 && areaRatio < 0.82 ? 1 : 0.3
    const score = (box.score || box.width * box.height) * aspectScore * areaScore

    if (!best || score > best.score) {
      best = { ...box, score }
    }
  }

  return best
}

function trimOuterBackground(sourceCanvas) {
  const ctx = sourceCanvas.getContext('2d')
  if (!ctx || sourceCanvas.width < 20 || sourceCanvas.height < 20) return sourceCanvas

  const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
  const { data } = imageData
  const { width, height } = sourceCanvas
  const bg = averageColor(sampleBackground(data, width, height))
  const bgBright = brightness(bg)
  const rowCounts = new Array(height).fill(0)
  const colCounts = new Array(width).fill(0)
  const minDelta = bgBright < 80 ? 34 : 28

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = getPixel(data, width, x, y)
      const bright = brightness(color)
      const delta = colorDistance(color, bg)
      const saturation = Math.max(color[0], color[1], color[2]) - Math.min(color[0], color[1], color[2])
      const looksLikeCard = delta > minDelta && (bright > 62 || saturation > 18)

      if (looksLikeCard) {
        rowCounts[y] += 1
        colCounts[x] += 1
      }
    }
  }

  const rowThreshold = Math.max(3, Math.floor(width * 0.045))
  const colThreshold = Math.max(3, Math.floor(height * 0.045))
  let top = firstActiveIndex(rowCounts, rowThreshold)
  let bottom = lastActiveIndex(rowCounts, rowThreshold)
  let left = firstActiveIndex(colCounts, colThreshold)
  let right = lastActiveIndex(colCounts, colThreshold)

  if (top < 0 || bottom < 0 || left < 0 || right < 0) return sourceCanvas

  const pad = Math.max(1, Math.round(Math.min(width, height) * 0.004))
  top = Math.max(0, top - pad)
  bottom = Math.min(height - 1, bottom + pad)
  left = Math.max(0, left - pad)
  right = Math.min(width - 1, right + pad)

  const cropWidth = right - left + 1
  const cropHeight = bottom - top + 1
  const cropAreaRatio = (cropWidth * cropHeight) / (width * height)

  if (cropWidth < 20 || cropHeight < 20 || cropAreaRatio > 0.96) {
    return sourceCanvas
  }

  const canvas = document.createElement('canvas')
  const trimCtx = canvas.getContext('2d')
  if (!trimCtx) return sourceCanvas

  canvas.width = cropWidth
  canvas.height = cropHeight
  trimCtx.drawImage(sourceCanvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
  return canvas
}

function firstActiveIndex(counts, threshold) {
  for (let index = 0; index < counts.length; index += 1) {
    const current = counts[index]
    const next = counts[index + 1] || 0
    const nextTwo = counts[index + 2] || 0
    if (current >= threshold || (current + next + nextTwo) / 3 >= threshold * 0.72) {
      return index
    }
  }

  return -1
}

function lastActiveIndex(counts, threshold) {
  for (let index = counts.length - 1; index >= 0; index -= 1) {
    const current = counts[index]
    const previous = counts[index - 1] || 0
    const previousTwo = counts[index - 2] || 0
    if (current >= threshold || (current + previous + previousTwo) / 3 >= threshold * 0.72) {
      return index
    }
  }

  return -1
}

function findCentralDocumentBox(data, width, height, bg) {
  const step = Math.max(2, Math.floor(Math.min(width, height) / 350))
  const rows = []
  const cols = []
  const minBright = brightness(bg) < 110 ? 74 : 0

  for (let y = 0; y < height; y += step) {
    let count = 0
    for (let x = 0; x < width; x += step) {
      const color = getPixel(data, width, x, y)
      const bright = brightness(color)
      if (bright > minBright && colorDistance(color, bg) > 32) {
        count += 1
      }
    }
    rows.push({ y, count })
  }

  for (let x = 0; x < width; x += step) {
    let count = 0
    for (let y = 0; y < height; y += step) {
      const color = getPixel(data, width, x, y)
      const bright = brightness(color)
      if (bright > minBright && colorDistance(color, bg) > 32) {
        count += 1
      }
    }
    cols.push({ x, count })
  }

  const rowThreshold = Math.max(3, Math.floor((width / step) * 0.12))
  const colThreshold = Math.max(3, Math.floor((height / step) * 0.12))
  const activeRows = rows.filter((row) => row.count > rowThreshold)
  const activeCols = cols.filter((col) => col.count > colThreshold)

  if (activeRows.length < 4 || activeCols.length < 4) {
    return null
  }

  const x = activeCols[0].x
  const y = activeRows[0].y
  const maxX = activeCols[activeCols.length - 1].x
  const maxY = activeRows[activeRows.length - 1].y
  const pad = Math.round(Math.min(width, height) * 0.01)

  return {
    x: Math.max(0, x - pad),
    y: Math.max(0, y - pad),
    width: Math.min(width - x, maxX - x + pad * 2),
    height: Math.min(height - y, maxY - y + pad * 2),
    score: (maxX - x) * (maxY - y) * 0.2,
  }
}

function findCardByProjection(data, width, height, bg, targetAspect) {
  const step = Math.max(2, Math.floor(Math.max(width, height) / 700))
  const bgBright = brightness(bg)
  const minX = Math.floor(width * 0.02)
  const maxX = Math.ceil(width * 0.98)
  const minY = Math.floor(height * 0.02)
  const maxY = Math.ceil(height * 0.98)
  const rows = []
  const cols = []

  for (let y = minY; y < maxY; y += step) {
    let count = 0
    for (let x = minX; x < maxX; x += step) {
      if (isLikelyCardPixel(getPixel(data, width, x, y), bg, bgBright)) count += 1
    }
    rows.push({ y, count })
  }

  for (let x = minX; x < maxX; x += step) {
    let count = 0
    for (let y = minY; y < maxY; y += step) {
      if (isLikelyCardPixel(getPixel(data, width, x, y), bg, bgBright)) count += 1
    }
    cols.push({ x, count })
  }

  const rowLimit = Math.max(4, Math.floor(((maxX - minX) / step) * 0.1))
  const colLimit = Math.max(4, Math.floor(((maxY - minY) / step) * 0.1))
  const activeRows = trimRuns(rows, rowLimit)
  const activeCols = trimRuns(cols, colLimit)

  if (!activeRows || !activeCols) return null

  const x = activeCols.start
  const y = activeRows.start
  const right = activeCols.end
  const bottom = activeRows.end
  const boxWidth = right - x
  const boxHeight = bottom - y
  const aspect = boxWidth / boxHeight
  const areaRatio = (boxWidth * boxHeight) / (width * height)

  if (areaRatio < 0.035 || areaRatio > 0.86 || aspect < 1.05 || aspect > 2.35) {
    return null
  }

  const pad = Math.round(Math.min(width, height) * 0.008)
  const aspectScore = 1 / (1 + Math.abs(aspect - targetAspect))

  return {
    x: Math.max(0, x - pad),
    y: Math.max(0, y - pad),
    width: Math.min(width, right + pad) - Math.max(0, x - pad),
    height: Math.min(height, bottom + pad) - Math.max(0, y - pad),
    score: boxWidth * boxHeight * aspectScore * 0.95,
  }
}

function isLikelyCardPixel(color, bg, bgBright) {
  const bright = brightness(color)
  const delta = colorDistance(color, bg)
  const saturation = Math.max(color[0], color[1], color[2]) - Math.min(color[0], color[1], color[2])
  const isWhiteOrLightCard = bright > Math.max(92, bgBright + 28) && delta > 24
  const isGreenAadhaarBand = color[1] > color[0] + 8 && color[1] > color[2] + 4 && bright > 72 && delta > 30
  const isWarmHeader = color[0] > 115 && color[1] > 75 && color[2] < 120 && saturation > 25 && delta > 35
  const isInkOnLightSurface = bgBright > 155 && bright < bgBright - 35 && delta > 45

  return isWhiteOrLightCard || isGreenAadhaarBand || isWarmHeader || isInkOnLightSurface
}

function trimRuns(items, threshold) {
  const active = items.map((item) => item.count >= threshold)
  const smooth = active.map((value, index) => {
    const nearby = [active[index - 1], value, active[index + 1]].filter(Boolean).length
    return nearby >= 2
  })

  let start = smooth.findIndex(Boolean)
  let end = smooth.length - 1

  while (end >= 0 && !smooth[end]) end -= 1

  if (start < 0 || end < 0 || end - start < 3) return null

  while (start < end && items[start].count < threshold * 1.35) start += 1
  while (end > start && items[end].count < threshold * 1.35) end -= 1

  return {
    start: items[start].y ?? items[start].x,
    end: items[end].y ?? items[end].x,
  }
}

function findLargestCardComponent(data, width, height, bg, targetAspect) {
  const maxGrid = 260
  const scale = Math.max(width, height) / maxGrid
  const gridWidth = Math.max(20, Math.round(width / scale))
  const gridHeight = Math.max(20, Math.round(height / scale))
  const bgBright = brightness(bg)
  const mask = new Uint8Array(gridWidth * gridHeight)

  for (let gy = 0; gy < gridHeight; gy += 1) {
    for (let gx = 0; gx < gridWidth; gx += 1) {
      const x = Math.min(width - 1, Math.round((gx + 0.5) * scale))
      const y = Math.min(height - 1, Math.round((gy + 0.5) * scale))
      const color = getPixel(data, width, x, y)
      const bright = brightness(color)
      const delta = colorDistance(color, bg)
      const saturation = Math.max(color[0], color[1], color[2]) - Math.min(color[0], color[1], color[2])
      const isLightCard = bright > Math.max(68, bgBright + 18) && delta > 24
      const isColoredCard = bright > 55 && saturation > 14 && delta > 34
      const isDarkTextOnLightBg = bgBright > 150 && bright < bgBright - 32 && delta > 42

      if (isLightCard || isColoredCard || isDarkTextOnLightBg) {
        mask[gy * gridWidth + gx] = 1
      }
    }
  }

  closeMask(mask, gridWidth, gridHeight)

  const visited = new Uint8Array(mask.length)
  const queue = []
  let best = null

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || visited[index]) continue

    let minGX = gridWidth
    let minGY = gridHeight
    let maxGX = 0
    let maxGY = 0
    let count = 0
    let touchesEdge = false
    queue.length = 0
    queue.push(index)
    visited[index] = 1

    while (queue.length) {
      const current = queue.pop()
      const gx = current % gridWidth
      const gy = Math.floor(current / gridWidth)
      count += 1
      minGX = Math.min(minGX, gx)
      minGY = Math.min(minGY, gy)
      maxGX = Math.max(maxGX, gx)
      maxGY = Math.max(maxGY, gy)
      touchesEdge = touchesEdge || gx === 0 || gy === 0 || gx === gridWidth - 1 || gy === gridHeight - 1

      const neighbors = [current - 1, current + 1, current - gridWidth, current + gridWidth]
      for (const next of neighbors) {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue
        const nx = next % gridWidth
        const ny = Math.floor(next / gridWidth)
        if (Math.abs(nx - gx) + Math.abs(ny - gy) !== 1) continue
        visited[next] = 1
        queue.push(next)
      }
    }

    const boxW = maxGX - minGX + 1
    const boxH = maxGY - minGY + 1
    const area = boxW * boxH
    const aspect = boxW / boxH
    const imageArea = gridWidth * gridHeight

    if (count < imageArea * 0.015 || touchesEdge || aspect < 1.05 || aspect > 2.35) continue

    const aspectScore = 1 / (1 + Math.abs(aspect - targetAspect))
    const fillScore = count / area
    const score = area * aspectScore * Math.min(1.6, 0.7 + fillScore)

    if (!best || score > best.score) {
      best = { minGX, minGY, maxGX, maxGY, score }
    }
  }

  if (!best) return null

  const pad = Math.round(Math.min(width, height) * 0.006)
  const x = Math.max(0, Math.round(best.minGX * scale) - pad)
  const y = Math.max(0, Math.round(best.minGY * scale) - pad)
  const right = Math.min(width, Math.round((best.maxGX + 1) * scale) + pad)
  const bottom = Math.min(height, Math.round((best.maxGY + 1) * scale) + pad)

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
    score: best.score,
  }
}

function closeMask(mask, width, height) {
  const original = mask.slice()

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x
      if (original[index]) continue
      let neighbors = 0
      for (let yy = -1; yy <= 1; yy += 1) {
        for (let xx = -1; xx <= 1; xx += 1) {
          if (original[(y + yy) * width + x + xx]) neighbors += 1
        }
      }
      if (neighbors >= 4) mask[index] = 1
    }
  }
}
