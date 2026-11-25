import { ActionIcon, Card, Group, Text, ThemeIcon } from '@mantine/core'
import { IconAlertCircle, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react'
import { useToastStore } from '../lib/toast'

export function Toaster() {
  const { toasts, remove } = useToastStore()
  const icons = { success: IconCheck, error: IconAlertCircle, info: IconInfoCircle } as const
  const colors = { success: 'teal', error: 'red', info: 'blue' } as const
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
