import { Check, Crop, FileDown, Upload } from 'lucide-react'

const steps = [
  { icon: Upload, label: 'Upload' },
  { icon: Crop, label: 'Crop' },
  { icon: FileDown, label: 'Layout' },
  { icon: Check, label: 'Print/PDF' },
]

export default function WorkflowSteps({ ready }) {
  return (
    <section className="no-print rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-4 gap-2">
        {steps.map(({ icon: Icon, label }, index) => {
          const active = ready || index === 0
          return (
            <div
              key={label}
              className={`rounded-md border px-2 py-3 text-center ${active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
            >
              <Icon className="mx-auto" size={18} />
              <p className="mt-2 text-[11px] font-black uppercase tracking-wide">{label}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
