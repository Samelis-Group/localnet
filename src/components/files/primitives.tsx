import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }

export function IconButton({ label, children, className = '', ...props }: Props) {
  return (
    <button className={`icon-btn ${className}`} style={{ width: 28, height: 28, border: 0, background: 'transparent' }} aria-label={label} title={label} {...props}>
      {children}
    </button>
  )
}
