import { useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { DashboardActionButton, DataDashboard } from '@/components/dashboard'
import { PageHeader, WorkspaceFrame, WorkspaceScrollContent } from '@/components/record'
import { createReusedInternalSystemColumns } from '@/config/system-inventory-columns'
import { useAppStore } from '@/store/useAppStore'
import { systemReference } from '@/domain/business-reference'
import {
  formattedReusedInternalMachineId,
  REUSED_INTERNAL_PURPOSE_OBSOLETE,
  REUSED_INTERNAL_SYSTEM_DASHBOARD_COLOR_LEGEND,
  systemDashboardRowClassName,
} from '@/domain/system-inventory'
import { formMessageClassName, PERMANENT_DELETE_LABEL, PermanentDeleteIcon, permanentDeleteConfirmationMessage } from '@/components/ui'

export function ReusedInternalSystemsInventoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const systems = useAppStore((state) => state.reusedInternalSystems)
  const projects = useAppStore((state) => state.projects)
  const projectSystems = useAppStore((state) => state.projectSystems)
  const sortedSystems = useMemo(
    () => [...systems].sort((first, second) => String(second.machineId).localeCompare(String(first.machineId), undefined, { numeric: true })),
    [systems],
  )
  const createSystem = useAppStore((state) => state.createReusedInternalSystem)
  const updateSystem = useAppStore((state) => state.updateReusedInternalSystem)
  const permanentDeleteSystem = useAppStore((state) => state.permanentDeleteReusedInternalSystem)
  const [messages, setMessages] = useState<string[]>([])
  const reusedInternalSystemColumns = useMemo(
    () => createReusedInternalSystemColumns(projects, projectSystems),
    [projectSystems, projects],
  )

  return (
    <WorkspaceFrame>
      <PageHeader
        title="Reused Internal Systems Inventory"
        subtitle="Reusable POC / Demo / Training / Support machines. Source = Reused Internal Systems."
      />
      <WorkspaceScrollContent>
      <DataDashboard
        title="Reused Internal Systems Inventory"
        dashboardScope="reusedInternalSystems"
        rows={sortedSystems}
        columns={reusedInternalSystemColumns}
        getRowClassName={systemDashboardRowClassName}
        colorLegend={REUSED_INTERNAL_SYSTEM_DASHBOARD_COLOR_LEGEND}
        toolbar={
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
            onClick={() => {
              const system = createSystem()
              const routePath = system.machineId ? systemReference(system).routePath : `/systems/reused-internal/${system.id}`
              if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit', newRecordSession: true } })
            }}
          >
            + New Reused Internal System
          </button>
        }
        enableInlineEditing={false}
        onEdit={(row, columnId, value) => {
          const column = reusedInternalSystemColumns.find((candidate) => candidate.id === columnId)
          if (!column?.editKey) return
          updateSystem(row.id, { [column.editKey]: value } as never)
        }}
        onView={(row) => {
          const routePath = systemReference(row).routePath
          if (routePath) navigate(routePath, { state: { returnTo, mode: 'view' } })
        }}
        onEditRecord={(row) => {
          const routePath = systemReference(row).routePath
          if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit' } })
        }}
        renderRecordActions={(row) => row.purpose === REUSED_INTERNAL_PURPOSE_OBSOLETE ? (
          <DashboardActionButton
            icon={<PermanentDeleteIcon />}
            label={PERMANENT_DELETE_LABEL}
            tone="danger"
            onClick={() => {
              const label = formattedReusedInternalMachineId(row.machineId) || row.id
              const confirmed = window.confirm(permanentDeleteConfirmationMessage(`Reused Internal System ${label}`))
              if (!confirmed) return
              const result = permanentDeleteSystem(row.id)
              setMessages([result.message])
            }}
          />
        ) : null}
      />
      {messages.length > 0 ? (
        <div className={`mt-3 ${formMessageClassName(messages)}`}>
          {messages.map((message) => <div key={message}>{message}</div>)}
        </div>
      ) : null}
      </WorkspaceScrollContent>
    </WorkspaceFrame>
  )
}
