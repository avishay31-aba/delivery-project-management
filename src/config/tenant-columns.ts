/**
 * Tenant list column definitions — wired in Phase B.
 */
export const tenantListColumns = [
  { id: 'tid', label: 'TID', editable: false },
  { id: 'accountName', label: 'Account', editable: false },
  { id: 'operationalStatus', label: 'Operational status', editable: true },
  { id: 'warrantyStatus', label: 'Warranty status', editable: false },
  { id: 'warrantyEndDate', label: 'Warranty end', editable: false },
] as const
