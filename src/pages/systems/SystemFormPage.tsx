import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  productionSystemMetadata,
  reusedInternalSystemMetadata,
} from '@/config/system-inventory-metadata'
import type { ProductionSystemInventoryItem, System } from '@/data/seed.types'
import { SYSTEM_SOURCE_REUSED_INTERNAL } from '@/domain/system-inventory'
import { useAppStore } from '@/store/useAppStore'
import { InventoryForm } from './SystemInventoryFormPages'

export function SystemFormPage() {
  const { sid } = useParams<{ sid: string }>()
  const systems = useAppStore((state) => state.systems)
  const productionSystemInventory = useAppStore((state) => state.productionSystemInventory)
  const reusedInternalSystems = useAppStore((state) => state.reusedInternalSystems)
  const saveSystemFormTransaction = useAppStore((state) => state.saveSystemFormTransaction)
  const record = useMemo(
    () => systems.find((system) => system.sid === sid || system.id === sid),
    [systems, sid],
  )
  const isReused = record?.source === SYSTEM_SOURCE_REUSED_INTERNAL
  const productionAllocatedRecords = useMemo(() => systems.filter((system) => system.source !== SYSTEM_SOURCE_REUSED_INTERNAL), [systems])
  const reusedAllocatedRecords = useMemo(() => systems.filter((system) => system.source === SYSTEM_SOURCE_REUSED_INTERNAL), [systems])

  if (isReused) {
    const records = [...reusedInternalSystems, ...reusedAllocatedRecords]
    return (
      <InventoryForm
        record={record}
        records={records}
        metadata={reusedInternalSystemMetadata}
        onSave={(id, patch, options, tenantRemovalIds) => {
          return saveSystemFormTransaction('allocated', id, patch as Partial<System>, tenantRemovalIds, options)
        }}
        dashboardPath="/systems/reused-internal"
      />
    )
  }

  const records = [...productionSystemInventory, ...productionAllocatedRecords]
  return (
    <InventoryForm
      record={record}
      records={records}
      metadata={productionSystemMetadata}
        onSave={(id, patch, options, tenantRemovalIds) => {
          if (productionSystemInventory.some((system) => system.id === id)) {
          return saveSystemFormTransaction('production', id, patch as Partial<ProductionSystemInventoryItem>, tenantRemovalIds, options)
        }
        return saveSystemFormTransaction('allocated', id, patch as Partial<System>, tenantRemovalIds, options)
      }}
      dashboardPath="/systems/production-inventory"
    />
  )
}
