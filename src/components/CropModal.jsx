import { useEffect, useRef, useState } from 'react'
import { Check, Move, RotateCcw, RotateCcwSquare, RotateCwSquare, X } from 'lucide-react'
import { cropImageByPercent } from '../utils/cropImage'

const minSize = 12
const startBox = { x: 8, y: 10, width: 84, height: 80 }

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function toCropPercent(box) {
  return {
    left: Math.round(box.x * 10) / 10,
    top: Math.round(box.y * 10) / 10,
    right: Math.round((100 - box.x - box.width) * 10) / 10,
    bottom: Math.round((100 - box.y - box.height) * 10) / 10,
  }
}

function applyDrag(box, drag, dx, dy) {
  const next = { ...box }

  if (drag.handle === 'move') {
    next.x = clamp(box.x + dx, 0, 100 - box.width)
    next.y = clamp(box.y + dy, 0, 100 - box.height)
    return next
  }

  if (drag.handle.includes('w')) {
    const newX = clamp(box.x + dx, 0, box.x + box.width - minSize)
    next.width = box.width + box.x - newX
    next.x = newX
  }

  if (drag.handle.includes('e')) {
    next.width = clamp(box.width + dx, minSize, 100 - box.x)
  }

  if (drag.handle.includes('n')) {
    const newY = clamp(box.y + dy, 0, box.y + box.height - minSize)
    next.height = box.height + box.y - newY
    next.y = newY
  }

  if (drag.handle.includes('s')) {
    next.height = clamp(box.height + dy, minSize, 100 - box.y)
  }

  return next
}

export default function CropModal({ imageSrc, title, onCancel, onApply }) {
  const imageWrapRef = useRef(null)
  const dragRef = useRef(null)
  const [box, setBox] = useState(startBox)
  const [rotation, setRotation] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)


  useEffect(() => {
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [])


  useEffect(() => {
    const onPointerMove = (event) => {
      const drag = dragRef.current
      const rect = imageWrapRef.current?.getBoundingClientRect()
      if (!drag || !rect) return

      event.preventDefault()
      const dx = ((event.clientX - drag.startX) / rect.width) * 100
      const dy = ((event.clientY - drag.startY) / rect.height) * 100
      setBox(applyDrag(drag.startBox, drag, dx, dy))
      setError('')
    }

    const onPointerUp = () => {
      dragRef.current = null
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  const beginDrag = (event, handle) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startBox: box,
    }
  }

  const reset = () => {
    setBox(startBox)
    setRotation(0)
    setError('')
  }

  const applyCrop = async () => {
    try {
      setBusy(true)
      const croppedImage = await cropImageByPercent(imageSrc, toCropPercent(box), rotation)
      onApply(croppedImage)
    } catch (cropError) {
      setError(cropError.message || 'Could not crop this image.')
    } finally {
      setBusy(false)
    }
  }

  const handleButton = 'absolute h-5 w-5 rounded-full border-2 border-white bg-blue-600 shadow-lg ring-2 ring-blue-200'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm md:p-4">
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">Free crop</p>
            <h2 className="text-lg font-black text-slate-950">{title}</h2>
          </div>
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">
            <X size={16} />
            Cancel
          </button>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_320px]">
          <div className="flex min-h-[340px] items-center justify-center overflow-hidden bg-slate-950 p-3 md:p-6">
            <div className="max-h-[64vh] max-w-full select-none rounded-2xl bg-slate-900 p-2">
              <div ref={imageWrapRef} className="relative overflow-hidden rounded-xl">
                <img
                  src={imageSrc}
                  alt="Crop preview"
                  draggable="false"
                  className="block max-h-[60vh] max-w-full object-contain"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />

                <div className="pointer-events-none absolute inset-0 bg-slate-950/55" />
                <div
                  className="absolute border-2 border-blue-500 bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]"
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                  }}
                  onPointerDown={(event) => beginDrag(event, 'move')}
                >
                  <div className="absolute inset-0 cursor-move bg-white/5" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[11px] font-black text-white shadow">
                    <Move size={13} />
                    Drag
                  </div>
                  <button type="button" aria-label="Resize top left" onPointerDown={(event) => beginDrag(event, 'nw')} className={`${handleButton} -left-2.5 -top-2.5 cursor-nwse-resize`} />
                  <button type="button" aria-label="Resize top right" onPointerDown={(event) => beginDrag(event, 'ne')} className={`${handleButton} -right-2.5 -top-2.5 cursor-nesw-resize`} />
                  <button type="button" aria-label="Resize bottom left" onPointerDown={(event) => beginDrag(event, 'sw')} className={`${handleButton} -bottom-2.5 -left-2.5 cursor-nesw-resize`} />
                  <button type="button" aria-label="Resize bottom right" onPointerDown={(event) => beginDrag(event, 'se')} className={`${handleButton} -bottom-2.5 -right-2.5 cursor-nwse-resize`} />
                  <button type="button" aria-label="Resize top" onPointerDown={(event) => beginDrag(event, 'n')} className={`${handleButton} left-1/2 -top-2.5 -translate-x-1/2 cursor-ns-resize`} />
                  <button type="button" aria-label="Resize bottom" onPointerDown={(event) => beginDrag(event, 's')} className={`${handleButton} -bottom-2.5 left-1/2 -translate-x-1/2 cursor-ns-resize`} />
                  <button type="button" aria-label="Resize left" onPointerDown={(event) => beginDrag(event, 'w')} className={`${handleButton} -left-2.5 top-1/2 -translate-y-1/2 cursor-ew-resize`} />
                  <button type="button" aria-label="Resize right" onPointerDown={(event) => beginDrag(event, 'e')} className={`${handleButton} -right-2.5 top-1/2 -translate-y-1/2 cursor-ew-resize`} />
                </div>
              </div>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col border-t border-slate-200 lg:border-l lg:border-t-0">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <p className="text-sm font-black text-slate-950">Select card area by hand</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Drag the blue box, then pull corners/sides to crop exactly. Use rotate if the photo is tilted.
              </p>

              <label className="mt-4 grid gap-2 rounded-xl bg-blue-50 p-3 text-sm font-black text-slate-800">
                <span className="flex items-center justify-between">
                  Rotate
                  <span className="text-xs text-slate-500">{rotation}°</span>
                </span>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  step={1}
                  value={rotation}
                  onChange={(event) => {
                    setRotation(Number(event.target.value))
                    setError('')
                  }}
                  className="w-full accent-blue-600"
                />
              </label>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setRotation((value) => value - 90)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                  <RotateCcwSquare size={16} />
                  Left
                </button>
                <button type="button" onClick={() => setRotation((value) => value + 90)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                  <RotateCwSquare size={16} />
                  Right
                </button>
                <button type="button" onClick={reset} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                  <RotateCcw size={16} />
                  Reset
                </button>
              </div>

              {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-600">{error}</p> : null}
            </div>

            <div className="border-t border-slate-200 bg-white p-4">
              <button type="button" disabled={busy} onClick={applyCrop} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:bg-slate-300">
                <Check size={16} />
                {busy ? 'Saving...' : 'OK / Apply Crop'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
