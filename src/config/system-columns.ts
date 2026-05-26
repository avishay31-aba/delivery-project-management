/**
 * System list column definitions — wired in Phase B.
 */
export const systemListColumns = [
  { id: 'sid', label: 'SID', editable: false },
  { id: 'machineId', label: 'MID', editable: false },
  { id: 'systemClass', label: 'Class', editable: false },
  { id: 'purpose', label: 'Purpose', editable: true },
  { id: 'availability', label: 'Availability', editable: true },
  { id: 'operationalStatus', label: 'Status', editable: true },
] as const
