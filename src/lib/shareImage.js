import { toPng } from 'html-to-image'

// Phones: opens the share sheet (Discord shows up there). Desktop: copies the image, or downloads it.
export async function shareAsImage(element, fileName) {
  const dataUrl = await toPng(element, { pixelRatio: 2 })
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], fileName + '.png', { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    return navigator.share({ files: [file] }).catch(() => {})
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    alert('Image copied. Paste it into Discord.')
  } catch {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = file.name
    link.click()
  }
}
