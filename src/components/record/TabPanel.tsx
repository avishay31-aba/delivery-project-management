import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface TabDefinition {
  id: string
  label: string
}

interface TabPanelProps {
  tabs: TabDefinition[]
  activeTab: string
  onTabChange: (id: string) => void
  children: ReactNode
}

export function TabPanel({ tabs, activeTab, onTabChange, children }: TabPanelProps) {
  return (
    <div className="sf-card overflow-hidden">
      <div
        className="flex border-b border-sf-border bg-sf-surface-alt"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-sf-brand text-sf-brand'
                : 'border-transparent text-sf-text-muted hover:text-sf-text',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4" role="tabpanel">
        {children}
      </div>
    </div>
  )
}
