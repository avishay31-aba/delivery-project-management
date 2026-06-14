import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createAllocatedSystemColumns } from '@/config/system-inventory-columns'

export function SystemListPage() {
  const navigate = useNavigate()
  const systems = useAppStore((s) => s.systems)
  const projects = useAppStore((s) => s.projects)
  const tenants = useAppStore((s) => s.tenants)
  const projectSystems = useAppStore((s) => s.projectSystems)
  const updateSystem = useAppStore((s) => s.updateSystem)
  const allocatedSystemIds = new Set(projectSystems.map((link) => link.systemId))
  const allocatedSystems = systems.filter((system) => Boolean(system.sid) && allocatedSystemIds.has(system.id))
  const systemListColumns = createAllocatedSystemColumns(projects, tenants)

  return (
    <div>
      <PageHeader title="Allocated Systems" subtitle="Allocated systems only. Production rows show SID; reused internal rows show SID plus MID." />

      <DataDashboard
        title="Allocated Systems"
        dashboardScope="systems"
        rows={allocatedSystems}
        columns={systemListColumns}
        onEdit={(row, columnId, value) => {
          const column = systemListColumns.find((candidate) => candidate.id === columnId)
          if (!column?.editKey) return
          updateSystem(row.id, { [column.editKey]: value } as never)
        }}
        onRowClick={(row) => {
          if (row.source === 'Reused Internal Systems' && row.machineId) {
            navigate(`/systems/reused-internal/${row.machineId}`)
            return
          }
          navigate(`/systems/production-inventory/${row.sid}`)
        }}
      />
    </div>
  )
}
