import { Crop, ImagePlus, Trash2, UploadCloud } from 'lucide-react'

export default function ImageUploader({ image, label, side, onFile, onCrop, onAutoCrop, autoBusy, onClear }) {
  const id = `${side.toLowerCase()}-upload`
  const hasImage = Boolean(image?.croppedUrl)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-black text-slate-950">{label}</h3>
          <p className="text-[11px] font-semibold text-slate-500">JPG, PNG, WEBP</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${hasImage ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {hasImage ? 'Added' : side}
        </span>
      </div>

      <label
        htmlFor={id}
        className={`flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-2 text-center transition focus-within:ring-2 focus-within:ring-blue-500 ${
          hasImage ? 'border-blue-200 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        {hasImage ? (
          <img src={image.croppedUrl} alt={`${label} preview`} className="h-20 w-full rounded-xl bg-white object-contain sm:h-24" />
        ) : (
          <>
            <UploadCloud className="text-blue-600" size={24} />
            <p className="mt-1 text-sm font-black text-slate-900">Upload {side} Image</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Click to select</p>
          </>
        )}
      </label>
      <input id={id} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={onFile} className="hidden" />

      {hasImage ? (
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          <button type="button" onClick={onCrop} className="inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-1.5 py-2 text-[11px] font-black text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Crop size={14} />
            Adjust
          </button>
          <button type="button" disabled={autoBusy} onClick={onAutoCrop} className="inline-flex items-center justify-center gap-1 rounded-xl bg-cyan-50 px-1.5 py-2 text-[11px] font-black text-cyan-700 hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-wait disabled:opacity-60">
            <Crop size={14} />
            {autoBusy ? '...' : 'Auto'}
          </button>
          <button type="button" onClick={onClear} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-1.5 py-2 text-[11px] font-black text-slate-600 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200">
            <Trash2 size={14} />
            Remove
          </button>
          <label htmlFor={id} className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl bg-slate-100 px-1.5 py-2 text-[11px] font-black text-slate-700 hover:bg-slate-200">
            <ImagePlus size={14} />
            Replace
          </label>
        </div>
      ) : null}
    </div>
  )
}
