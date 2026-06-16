import type { ReactNode } from 'react'

interface ReadonlyGridProps {
  headers: ReactNode[]
  rows: ReactNode[][]
  emptyText: string
  className?: string
}

export function ReadonlyGrid({ headers, rows, emptyText, className = '' }: ReadonlyGridProps) {
  if (rows.length === 0) {
    return <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">{emptyText}</div>
  }

  return (
    <div className={`overflow-x-auto rounded border border-sf-border bg-white ${className}`}>
      <table className="min-w-full border-collapse text-sm leading-tight">
        <thead className="bg-sf-surface-alt text-left">
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-sf-surface-alt">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-sf-border px-1.5 py-1 align-top text-sf-text">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
