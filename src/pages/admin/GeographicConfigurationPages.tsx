import { useMemo } from 'react'
import { DataDashboard, type DashboardColumn } from '@/components/dashboard'
import { PageHeader, WorkspaceDashboardContent, WorkspaceFrame } from '@/components/record'
import type { GeographicCountryRecord, GeographicUsStateRecord } from '@/data/seed.types'
import { useAppStore } from '@/store/useAppStore'

export function CountrySettingsPage() {
  const countries = useAppStore((state) => state.countryLookups)

  const columns = useMemo<Array<DashboardColumn<GeographicCountryRecord>>>(() => [
    {
      id: 'countryName',
      label: 'Country Name',
      getValue: (row) => row.countryName,
      promoteAsBusinessIdentifier: true,
    },
    {
      id: 'countryCodeName',
      label: 'Country Code Name',
      getValue: (row) => row.countryCodeName,
    },
    {
      id: 'region',
      label: 'Region',
      getValue: (row) => row.region,
    },
    {
      id: 'timeZone',
      label: 'UTC / Time Zone',
      getValue: (row) => row.timeZone,
    },
  ], [])

  return (
    <WorkspaceFrame>
      <PageHeader title="Countries" subtitle="Version 1.3 authoritative Country, Region and UTC reference data" />
      <WorkspaceDashboardContent>
        <DataDashboard
          title="Countries"
          dashboardScope="countryLookups"
          rows={countries}
          columns={columns}
          enableRecordActions={false}
          initialSorting={[{ id: 'countryName', desc: false }]}
        />
      </WorkspaceDashboardContent>
    </WorkspaceFrame>
  )
}

export function UsStateSettingsPage() {
  const states = useAppStore((state) => state.usStateLookups)

  const columns = useMemo<Array<DashboardColumn<GeographicUsStateRecord>>>(() => [
    {
      id: 'state',
      label: 'State',
      getValue: (row) => row.state,
      promoteAsBusinessIdentifier: true,
    },
    {
      id: 'timeZone',
      label: 'UTC / Time Zone',
      getValue: (row) => row.timeZone,
    },
  ], [])

  return (
    <WorkspaceFrame>
      <PageHeader title="US States" subtitle="Version 1.3 authoritative US State UTC reference data" />
      <WorkspaceDashboardContent>
        <DataDashboard
          title="US States"
          dashboardScope="usStateLookups"
          rows={states}
          columns={columns}
          enableRecordActions={false}
          initialSorting={[{ id: 'state', desc: false }]}
        />
      </WorkspaceDashboardContent>
    </WorkspaceFrame>
  )
}
