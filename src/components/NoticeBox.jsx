import { ShieldCheck } from 'lucide-react'

export default function NoticeBox() {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <ShieldCheck size={21} />
        </div>
        <div>
          <p className="text-sm font-black text-emerald-950">Safe and private</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-emerald-800">
            This tool only helps crop, resize, arrange, and print Aadhaar images. It does not edit or change Aadhaar details. Your images are processed only in your browser. We do not upload or store your images.
          </p>
        </div>
      </div>
    </div>
  )
}
