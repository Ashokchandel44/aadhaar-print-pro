import { Download, Printer, RotateCcw } from 'lucide-react'

export default function ActionButtons({ disabled, onPrint, onDownload, onClear, error, busy }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="text-base font-black text-slate-950">Step 3: Print or Download</h2>
      <p className="mt-1 text-xs font-semibold text-slate-500">Ready after image upload</p>

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">{error}</p> : null}

      <div className="mt-3 grid gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onPrint}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
        >
          <Printer size={18} />
          Print Now
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={onDownload}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Download size={18} />
          {busy ? 'Making PDF...' : 'Download PDF'}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-black text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
        >
          <RotateCcw size={18} />
          Clear All
        </button>
      </div>
    </div>
  )
}
