/**
 * Project list column definitions — wired in Phase B (TanStack Table).
 */
export const projectListColumns = [
  { id: 'pid', label: 'PID', editable: false },
  { id: 'accountName', label: 'Account', editable: false },
  { id: 'mainType', label: 'Type', editable: false },
  { id: 'deliveryDate', label: 'Delivery date', editable: true },
  { id: 'progressStatus', label: 'Progress', editable: true },
  { id: 'dealOwner', label: 'Deal owner', editable: true },
] as const
