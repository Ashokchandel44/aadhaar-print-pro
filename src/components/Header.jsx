import { Lock, MonitorCheck, Printer, ShieldCheck } from 'lucide-react'

export default function Header() {
  return (
    <header className="no-print border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/20">
            <Printer size={24} />
          </div>
          <div>
            <p className="text-xl font-black tracking-tight text-slate-950">Aadhaar Print Pro</p>
            <p className="text-sm font-semibold text-slate-500">Simple A4 print and PDF tool</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: 'No Upload', icon: Lock },
            { label: 'Browser Only', icon: MonitorCheck },
            { label: 'Print Ready', icon: ShieldCheck },
          ].map(({ label, icon: Icon }) => (
            <span key={label} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700">
              <Icon size={14} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </header>
  )
}
