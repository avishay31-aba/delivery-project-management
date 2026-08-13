import { richTextPlainText } from '@/domain/rich-text'

export type CsvCellValue = string | number | boolean | null | undefined

export function csvReadableValue(value: CsvCellValue): string {
  if (value == null) return ''
  const text = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return /<[^>]+>|&(nbsp|amp|lt|gt|quot|#39);/i.test(text) ? richTextPlainText(text) : text
}

export function csvEscape(value: CsvCellValue): string {
  return `"${csvReadableValue(value).replaceAll('"', '""')}"`
}

export function buildCsv(headers: string[], rows: CsvCellValue[][]): string {
  return [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\r\n')
}

export function downloadCsv(fileName: string, headers: string[], rows: CsvCellValue[][]): void {
  const blob = new Blob([`\uFEFF${buildCsv(headers, rows)}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
