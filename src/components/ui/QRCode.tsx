import { useEffect, useState } from 'react'
import { Skeleton } from './index'

export function QRCode({ value, size = 160 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let alive = true
    void import('qrcode')
      .then((qr) => qr.toDataURL(value, { width: size, margin: 1, color: { dark: '#060b14', light: '#ffffff' } }))
      .then((url) => { if (alive) setSrc(url) })
      .catch(() => { if (alive) setSrc('') })
    return () => { alive = false }
  }, [value, size])

  if (!src) return <Skeleton height={size} width={size} />
  return <div className="qr-box"><img src={src} alt={`QR code : ${value}`} width={size} height={size} /></div>
}
