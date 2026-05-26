import { CheckCircle2, Columns3, IdCard, Sparkles } from 'lucide-react'

export const layoutOptions = [
  { value: 'frontBack', label: 'Front + Back', helper: 'Front above, back below', icon: Columns3 },
  { value: 'pvc', label: 'PVC Side by Side', helper: 'Front and back aamne-saamne', icon: IdCard },
]

export default function LayoutSelector({
  value,
  onChange,
  showCutLines,
  onCutLineChange,
  autoCrop,
  onAutoCropChange,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2">
        <h2 className="text-base font-black text-slate-950">Step 2: Layout & Options</h2>
        <p className="text-xs font-semibold text-slate-500">Choose useful print style and auto settings</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {layoutOptions.map(({ value: optionValue, label, helper, icon: Icon }) => {
          const active = value === optionValue
          return (
            <button
              key={optionValue}
              type="button"
              onClick={() => onChange(optionValue)}
              className={`rounded-2xl border p-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                active ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={active ? 'text-blue-700' : 'text-slate-500'} size={18} />
                {active ? <CheckCircle2 className="text-blue-700" size={16} /> : null}
              </div>
              <p className="mt-1.5 text-[13px] font-black text-slate-950">{label}</p>
              <p className="text-[11px] font-semibold text-slate-500">{helper}</p>
            </button>
          )
        })}
      </div>

      <div className="mt-2.5 rounded-2xl border border-blue-100 bg-blue-50/70 p-2.5">
        <div className="flex gap-2">
          <Sparkles className="mt-0.5 shrink-0 text-blue-700" size={16} />
          <div>
            <p className="text-[13px] font-black text-slate-950">Advanced options</p>
            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500">
              Auto crop keeps the Aadhaar card shape ready after upload. Manual free crop is still available from Crop / Adjust.
            </p>
          </div>
        </div>

        <div className="mt-2 grid gap-1.5">
          <label className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[13px] font-black text-slate-700">
            Auto crop on upload
            <input
              type="checkbox"
              checked={autoCrop}
              onChange={(event) => onAutoCropChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[13px] font-black text-slate-700">
            Cut line border
            <input
              type="checkbox"
              checked={showCutLines}
              onChange={(event) => onCutLineChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>
    </div>
  )
}
