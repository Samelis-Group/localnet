import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import {
  ActionIcon, Avatar as MAvatar, Badge as MBadge, Button as MButton, Card, Group,
  Modal as MModal, Progress, Skeleton as MSkeleton, Stack, Switch, Text, ThemeIcon,
} from '@mantine/core'
import { IconAlertCircle, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react'
import { initials } from '../../lib/format'
import { useToastStore } from './toast'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'blue' | 'danger' | 'ghost'
  size?: 'default' | 'sm'
}

const variantMap = {
  default: { variant: 'default' as const, color: 'gray' },
  primary: { variant: 'filled' as const, color: 'primary.8' },
  blue: { variant: 'light' as const, color: 'blue' },
  danger: { variant: 'light' as const, color: 'red' },
  ghost: { variant: 'subtle' as const, color: 'gray' },
}

export function Button({ variant = 'default', size = 'default', className = '', children, type, ...props }: ButtonProps) {
  const mapped = variantMap[variant]
  return (
    <MButton
      {...mapped}
      size={size === 'sm' ? 'xs' : 'sm'}
      className={className}
      type={type}
      onClick={props.onClick}
      disabled={props.disabled}
      style={props.style}
      title={props.title}
    >
      {children}
    </MButton>
  )
}

const toneColor: Record<string, string> = {
  accent: 'primary', blue: 'blue', warn: 'yellow', danger: 'red', violet: 'grape', '': 'gray',
}

export function Badge({ children, tone = '', className = '' }: { children: ReactNode; tone?: string; className?: string }) {
  return <MBadge color={toneColor[tone] ?? 'gray'} variant="light" className={className}>{children}</MBadge>
}

export function Avatar({ name, color, size = '' }: { name: string; color: string; size?: 'sm' | 'lg' | '' }) {
  const px = size === 'sm' ? 28 : size === 'lg' ? 48 : 36
  return <MAvatar size={px} radius="md" color={color} styles={{ root: { background: color, color: '#04110d', fontWeight: 700 } }} title={name}>{initials(name)}</MAvatar>
}

export function ProgressBar({ value, thin = false }: { value: number; thin?: boolean }) {
  return <Progress value={Math.max(0, Math.min(100, value))} size={thin ? 6 : 8} radius="xl" color="primary.8" />
}

export function StatCard({ icon, label, value, hint, tone = '' }: { icon: ReactNode; label: string; value: string; hint?: string; tone?: string }) {
  const color = toneColor[tone] ?? 'primary'
  return (
    <Card className="glass-panel" p="lg">
      <Group justify="space-between" mb="sm">
        <ThemeIcon size={38} radius="md" variant="light" color={color === 'gray' ? 'primary' : color}>{icon}</ThemeIcon>
        {hint && <Text size="xs" c="primary.4" fw={700}>{hint}</Text>}
      </Group>
      <Text fz={28} fw={800} lh={1.1} style={{ letterSpacing: -1 }}>{value}</Text>
      <Text size="sm" c="dimmed" mt={4}>{label}</Text>
    </Card>
  )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <Group gap="xs" mb="sm">
      <Text fw={700} size="md">{children}</Text>
      {hint && <Text size="xs" c="dimmed">{hint}</Text>}
    </Group>
  )
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <MModal opened onClose={onClose} title={<Text fw={700}>{title}</Text>} size={wide ? 'xl' : 'lg'} centered radius="lg"
      overlayProps={{ blur: 6, backgroundOpacity: 0.55 }} fullScreen={typeof window !== 'undefined' && window.innerWidth < 560}>
      {children}
    </MModal>
  )
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <Stack align="center" py="xl" gap="xs">
      <ThemeIcon size={52} radius="xl" variant="light" color="gray">{icon}</ThemeIcon>
      <Text fw={700}>{title}</Text>
      <Text size="sm" c="dimmed" ta="center" maw={380}>{description}</Text>
      {action}
    </Stack>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label?: string }) {
  return <Switch checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} label={label} color="primary.8" />
}

export function Skeleton({ height = 14, width = '100%' }: { height?: number; width?: string | number }) {
  return <MSkeleton height={height} width={width} radius="sm" />
}

export function Toaster() {
  const { toasts, remove } = useToastStore()
  const icons = { success: IconCheck, error: IconAlertCircle, info: IconInfoCircle }
  const colors = { success: 'teal', error: 'red', info: 'blue' }
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000, display: 'grid', gap: 8 }}>
      {toasts.map((item) => {
        const Icon = icons[item.kind]
        return (
          <Card key={item.id} className="glass-panel" p="sm" radius="md" shadow="lg" style={{ minWidth: 260 }}>
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size="sm" radius="xl" color={colors[item.kind]} variant="light"><Icon size={14} /></ThemeIcon>
              <Text size="sm" style={{ flex: 1 }}>{item.message}</Text>
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => remove(item.id)} aria-label="Fermer"><IconX size={14} /></ActionIcon>
            </Group>
          </Card>
        )
      })}
    </div>
  )
}
