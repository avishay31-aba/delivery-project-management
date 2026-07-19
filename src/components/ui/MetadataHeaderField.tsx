import type { ReactNode } from 'react'
import { FormField } from '@/components/ui/FormField'
import { HeaderReadonlyValue } from '@/components/ui/HeaderReadonlyValue'

interface EffectiveHeaderFieldEditabilityInput {
  businessEditable: boolean
  roleCanEdit?: boolean
}

interface MetadataHeaderFieldProps extends EffectiveHeaderFieldEditabilityInput {
  label: ReactNode
  editor: ReactNode
  readOnlyValue: ReactNode
  controlWidthClassName?: string
  readOnlyControlWidthClassName?: string
  required?: boolean
}

export function effectiveHeaderFieldCanEdit({
  businessEditable,
  roleCanEdit = true,
}: EffectiveHeaderFieldEditabilityInput): boolean {
  return businessEditable && roleCanEdit
}

export function MetadataHeaderField({
  label,
  editor,
  readOnlyValue,
  controlWidthClassName = 'w-40',
  readOnlyControlWidthClassName = controlWidthClassName,
  required = false,
  businessEditable,
  roleCanEdit = true,
}: MetadataHeaderFieldProps) {
  const canEdit = effectiveHeaderFieldCanEdit({ businessEditable, roleCanEdit })

  return (
    <FormField
      label={label}
      controlWidthClassName={canEdit ? controlWidthClassName : readOnlyControlWidthClassName}
      required={required}
    >
      {canEdit ? editor : <HeaderReadonlyValue>{readOnlyValue}</HeaderReadonlyValue>}
    </FormField>
  )
}
