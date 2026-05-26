import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportPrintAreaToPdf(elementId = 'print-area') {
  const element = document.getElementById(elementId)

  if (!element) {
    throw new Error('Print area was not found.')
  }

  const canvas = await html2canvas(element, {
    scale: 3,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  })

  const imageData = canvas.toDataURL('image/jpeg', 0.96)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = 210
  const pageHeight = 297
  const imageHeight = (canvas.height * pageWidth) / canvas.width
  const fittedHeight = Math.min(imageHeight, pageHeight)

  pdf.addImage(imageData, 'JPEG', 0, 0, pageWidth, fittedHeight)
  pdf.save('aadhaar-print-layout.pdf')
}
