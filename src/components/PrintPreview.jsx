import { FileText } from 'lucide-react'
import { layoutOptions } from './LayoutSelector'

const fitOptions = [
  { value: 'cover', label: 'Fill box' },
  { value: 'contain', label: 'Fit full image' },
]

function AadhaarImageBox({ image, label, showCutLines, fitMode }) {
  return (
    <div className="print-group">
      <span data-html2canvas-ignore="true" className="no-print mb-1 inline-flex rounded-md bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600">
        {label}
      </span>
      <div className={`aadhaar-box overflow-hidden bg-white ${showCutLines ? 'border border-dashed border-slate-500' : 'border border-slate-200'}`}>
        {image ? (
          <img
            src={image}
            alt={`${label} Aadhaar side`}
            className={`h-full w-full ${fitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50 px-3 text-center text-[10px] font-bold text-slate-400">
            Upload image
          </div>
        )}
      </div>
    </div>
  )
}

function renderLayout(layout, frontImage, backImage, showCutLines, fitMode) {
  if (layout === 'pvc') {
    return (
      <div className="grid grid-cols-2 place-items-center gap-[10mm]">
        <AadhaarImageBox image={frontImage} label="Front Side" showCutLines={showCutLines} fitMode={fitMode} />
        <AadhaarImageBox image={backImage} label="Back Side" showCutLines={showCutLines} fitMode={fitMode} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-[7mm]">
      <AadhaarImageBox image={frontImage} label="Front Side" showCutLines={showCutLines} fitMode={fitMode} />
      <AadhaarImageBox image={backImage} label="Back Side" showCutLines={showCutLines} fitMode={fitMode} />
    </div>
  )
}

export default function PrintPreview({ frontImage, backImage, layout, showCutLines, fitMode, onFitModeChange }) {
  const layoutLabel = layoutOptions.find((option) => option.value === layout)?.label || 'A4 Layout'
  const hasImage = Boolean(frontImage || backImage)

  return (
    <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-3 shadow-sm md:p-4">
      <div className="no-print mb-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">A4 Print Preview</h2>
          <p className="text-sm font-semibold text-slate-500">{layoutLabel} · centered on page</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-slate-100 p-1">
            {fitOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onFitModeChange(option.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                  fitMode === option.value ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
            <FileText size={15} />
            A4
          </span>
        </div>
      </div>

      {!hasImage ? (
        <div className="no-print mb-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5 text-center text-sm font-black text-blue-700">
          Upload front/back images to see preview
        </div>
      ) : null}

      <div className="preview-shell overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.28)_1px,transparent_0)] bg-[length:18px_18px] p-3 md:p-4">
        <div className="preview-scale-holder flex justify-center">
          <div id="print-area" className="a4-page screen-scale bg-white p-[14mm] text-slate-900 shadow-2xl shadow-slate-950/20 ring-1 ring-slate-200">
            <div className="flex min-h-[269mm] items-center justify-center">
              <div className="w-full max-w-[182mm]">{renderLayout(layout, frontImage, backImage, showCutLines, fitMode)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
