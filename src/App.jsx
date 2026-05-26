import { useState } from 'react'
import { ArrowDown, Crop, FileDown, MonitorCheck, Printer } from 'lucide-react'
import ActionButtons from './components/ActionButtons'
import CropModal from './components/CropModal'
import Header from './components/Header'
import ImageUploader from './components/ImageUploader'
import LayoutSelector from './components/LayoutSelector'
import NoticeBox from './components/NoticeBox'
import PrintPreview from './components/PrintPreview'
import { autoCropToCard } from './utils/cropImage'
import { exportPrintAreaToPdf } from './utils/pdfExport'

const emptyImage = {
  originalUrl: '',
  croppedUrl: '',
}

const features = [
  { label: 'Browser-only Privacy', icon: MonitorCheck },
  { label: 'Auto Crop', icon: Crop },
  { label: 'A4 Center Align', icon: Printer },
  { label: 'PDF Download', icon: FileDown },
]

export default function App() {
  const [frontImage, setFrontImage] = useState(emptyImage)
  const [backImage, setBackImage] = useState(emptyImage)
  const [activeCrop, setActiveCrop] = useState(null)
  const [layout, setLayout] = useState('frontBack')
  const [showCutLines, setShowCutLines] = useState(true)
  const [autoCrop, setAutoCrop] = useState(true)
  const [fitMode, setFitMode] = useState('cover')
  const [autoBusySide, setAutoBusySide] = useState(null)
  const [error, setError] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)

  const hasAnyImage = Boolean(frontImage.croppedUrl || backImage.croppedUrl)

  const handleFile = (side) => async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, JPEG, PNG, or WEBP image.')
      return
    }

    const imageUrl = URL.createObjectURL(file)

    let croppedUrl = imageUrl
    if (autoCrop) {
      try {
        setAutoBusySide(side)
        croppedUrl = await autoCropToCard(imageUrl)
      } catch {
        croppedUrl = imageUrl
      } finally {
        setAutoBusySide(null)
      }
    }

    const nextImage = { originalUrl: imageUrl, croppedUrl }

    if (side === 'front') {
      if (frontImage.originalUrl?.startsWith('blob:')) URL.revokeObjectURL(frontImage.originalUrl)
      setFrontImage(nextImage)
    } else {
      if (backImage.originalUrl?.startsWith('blob:')) URL.revokeObjectURL(backImage.originalUrl)
      setBackImage(nextImage)
    }

    setError('')
    if (!autoCrop) {
      setActiveCrop(side)
    }
  }

  const applyCrop = (croppedUrl) => {
    if (activeCrop === 'front') {
      setFrontImage((current) => ({ ...current, croppedUrl }))
    } else if (activeCrop === 'back') {
      setBackImage((current) => ({ ...current, croppedUrl }))
    }

    setActiveCrop(null)
  }

  const autoCropSide = async (side) => {
    const currentImage = side === 'front' ? frontImage : backImage
    if (!currentImage.originalUrl) return

    try {
      setAutoBusySide(side)
      const croppedUrl = await autoCropToCard(currentImage.originalUrl)
      if (side === 'front') {
        setFrontImage((current) => ({ ...current, croppedUrl }))
      } else {
        setBackImage((current) => ({ ...current, croppedUrl }))
      }
      setError('')
    } catch {
      setError('Auto crop could not detect the Aadhaar card clearly. Please use Adjust.')
    } finally {
      setAutoBusySide(null)
    }
  }

  const clearSide = (side) => {
    if (side === 'front') {
      if (frontImage.originalUrl?.startsWith('blob:')) URL.revokeObjectURL(frontImage.originalUrl)
      setFrontImage(emptyImage)
    } else {
      if (backImage.originalUrl?.startsWith('blob:')) URL.revokeObjectURL(backImage.originalUrl)
      setBackImage(emptyImage)
    }
  }

  const clearAll = () => {
    clearSide('front')
    clearSide('back')
    setActiveCrop(null)
    setLayout('frontBack')
    setShowCutLines(true)
    setAutoCrop(true)
    setFitMode('cover')
    setError('')
  }

  const printNow = () => {
    if (!hasAnyImage) {
      setError('Please upload at least the front or back Aadhaar image before printing.')
      return
    }

    setError('')
    window.print()
  }

  const downloadPdf = async () => {
    if (!hasAnyImage) {
      setError('Please upload at least the front or back Aadhaar image before downloading PDF.')
      return
    }

    try {
      setPdfBusy(true)
      setError('')
      await exportPrintAreaToPdf()
    } catch (pdfError) {
      setError(pdfError.message || 'Could not create PDF. Please try again.')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 text-slate-900">
      <div className="pointer-events-none fixed -right-24 top-20 h-80 w-80 rounded-full bg-blue-300/25 blur-3xl" />
      <div className="pointer-events-none fixed -left-28 bottom-16 h-96 w-96 rounded-full bg-cyan-300/25 blur-3xl" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(59,130,246,0.10)_1px,transparent_0)] bg-[length:26px_26px]" />
      <Header />

      <main className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="no-print rounded-3xl border border-blue-100 bg-white/85 p-5 shadow-xl shadow-blue-950/5 backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Aadhaar Card Print Online Tool – Aadhaar Print Pro ashok </h1>
              <p className="mt-3 text-base font-medium leading-7 text-slate-600">
                Upload front and back Aadhaar images, auto crop Aadhaar image and generate print-ready PDF, then download and print Aadhaar card instantly.
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Aadhaar card print online tool for arranging user-provided Aadhaar photos on A4 with browser-only processing.
              </p>
              <a
                href="#tool-dashboard"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-blue-600/30"
              >
                Start Creating Layout
                <ArrowDown size={17} />
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              {['No Upload', 'Browser Only', 'Print Ready'].map((badge) => (
                <span key={badge} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="tool-dashboard" className="mt-5 rounded-3xl border border-blue-100 bg-white/95 p-3 shadow-2xl shadow-blue-950/10 backdrop-blur md:p-5">
          <div className="mb-4 no-print">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Online image/PDF tool</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">Create print layout in 3 simple steps</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] xl:grid-cols-[340px_1fr]">
            <aside className="no-print order-1 space-y-3 lg:order-none">
              <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <h2 className="text-base font-black text-slate-950">Step 1: Upload Images</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">Uploaded images show here and update preview.</p>
                <div className="mt-2.5 grid gap-2.5">
                  <ImageUploader
                    label="Front Aadhaar Image"
                    side="Front"
                    image={frontImage}
                    onFile={handleFile('front')}
                    onCrop={() => setActiveCrop('front')}
                    onAutoCrop={() => autoCropSide('front')}
                    autoBusy={autoBusySide === 'front'}
                    onClear={() => clearSide('front')}
                  />
                  <ImageUploader
                    label="Back Aadhaar Image"
                    side="Back"
                    image={backImage}
                    onFile={handleFile('back')}
                    onCrop={() => setActiveCrop('back')}
                    onAutoCrop={() => autoCropSide('back')}
                    autoBusy={autoBusySide === 'back'}
                    onClear={() => clearSide('back')}
                  />
                </div>
              </section>

              <LayoutSelector
                value={layout}
                onChange={setLayout}
                showCutLines={showCutLines}
                onCutLineChange={setShowCutLines}
                autoCrop={autoCrop}
                onAutoCropChange={setAutoCrop}
              />

              <div className="hidden lg:block">
                <ActionButtons
                  disabled={!hasAnyImage}
                  busy={pdfBusy}
                  error={error}
                  onPrint={printNow}
                  onDownload={downloadPdf}
                  onClear={clearAll}
                />
              </div>
            </aside>

            <div className="order-2 lg:order-none">
              <PrintPreview
                frontImage={frontImage.croppedUrl}
                backImage={backImage.croppedUrl}
                layout={layout}
                showCutLines={showCutLines}
                fitMode={fitMode}
                onFitModeChange={setFitMode}
              />
            </div>

            <div className="no-print order-3 lg:hidden">
              <ActionButtons
                disabled={!hasAnyImage}
                busy={pdfBusy}
                error={error}
                onPrint={printNow}
                onDownload={downloadPdf}
                onClear={clearAll}
              />
            </div>
          </div>
        </section>

        <section className="no-print mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ label, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <Icon className="text-blue-600" size={24} />
              <p className="mt-3 text-base font-black text-slate-950">{label}</p>
            </div>
          ))}
        </section>

        <section className="no-print mt-6">
          <NoticeBox />
        </section>
      </main>

      <footer className="no-print mx-auto max-w-7xl px-4 pb-6 text-sm font-semibold text-slate-500 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="font-black text-slate-900">Aadhaar Print Pro.</span> Your images stay in the browser. For official Aadhaar PVC card, use the official UIDAI portal. This tool only arranges user-provided images for printing.
        </div>
      </footer>

      {activeCrop ? (
        <CropModal
          imageSrc={activeCrop === 'front' ? frontImage.originalUrl : backImage.originalUrl}
          title={activeCrop === 'front' ? 'Crop Front Image' : 'Crop Back Image'}
          onCancel={() => setActiveCrop(null)}
          onApply={applyCrop}
        />
      ) : null}
    </div>
  )
}
