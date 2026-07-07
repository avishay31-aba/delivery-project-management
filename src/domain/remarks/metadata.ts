import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import type { RemarkType } from './types'

export const REMARK_TYPE_OPTIONS: RemarkType[] = [
  'Note',
  'Task',
  'Temporary Change',
  'Permanent Change / Task',
]

export const REMARK_AUTHOR_LOCAL_USER = CURRENT_USER_DISPLAY_NAME
