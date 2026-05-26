import { CheckCircle2, CircleDashed, Layers3 } from 'lucide-react'
import { layoutOptions } from './LayoutSelector'

function StatusItem({ complete, label }) {
  const Icon = complete ? CheckCircle2 : CircleDashed

  return (
    <div className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2">
      <Icon size={17} className={complete ? 'text-emerald-600' : 'text-slate-400'} />
      <span className={`text-sm font-bold ${complete ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
    </div>
  )
}

export default function StatusPanel({ hasFront, hasBack, layout }) {
  const layoutLabel = layoutOptions.find((option) => option.value === layout)?.label || 'A4 layout'

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <Layers3 size={19} />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-950">Job status</h2>
          <p className="text-xs font-medium text-slate-500">{layoutLabel}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <StatusItem complete={hasFront} label="Front image added" />
        <StatusItem complete={hasBack} label="Back image added" />
        <StatusItem complete={hasFront || hasBack} label="Ready for print or PDF" />
      </div>
    </section>
  )
}
