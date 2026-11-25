import { ActionIcon } from '@mantine/core'
import type { MouseEventHandler, ReactNode } from 'react'

type Props = { label: string; children: ReactNode; className?: string; onClick?: MouseEventHandler<HTMLButtonElement>; disabled?: boolean; color?: string; size?: number | 'sm' | 'md' | 'lg' }

export function IconButton({ label, children, className = '', onClick, disabled, color = 'gray', size = 'lg' }: Props) {
  return (
    <ActionIcon variant="subtle" color={color} size={size} radius="md" className={className} aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {children}
    </ActionIcon>
  )
}
