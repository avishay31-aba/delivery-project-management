import { AlertStatusIcon } from '@/components/ui'

export function ProjectAlertPresentation({ alerts }: { alerts: string[] }) {
  const visibleAlerts = alerts.filter(Boolean)
  if (visibleAlerts.length === 0) return null

  const label = visibleAlerts.join('; ')
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-red-700" title={label}>
      <AlertStatusIcon variant="danger" label={label} />
      <span>{label}</span>
    </span>
  )
}
