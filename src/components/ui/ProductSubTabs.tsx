export interface ProductSubTabDefinition<TId extends string = string> {
  id: TId
  label: string
}

interface ProductSubTabsProps<TId extends string = string> {
  tabs: Array<ProductSubTabDefinition<TId>>
  activeTab: TId
  onTabChange: (id: TId) => void
}

export function ProductSubTabs<TId extends string = string>({
  tabs,
  activeTab,
  onTabChange,
}: ProductSubTabsProps<TId>) {
  return (
    <div className="flex flex-wrap border-b border-sf-border bg-sf-surface-alt">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={[
            'sf-view-mode-allow border-b-2 px-4 py-2 text-sm font-semibold',
            activeTab === tab.id
              ? 'border-sf-brand bg-white text-sf-text'
              : 'border-transparent text-sf-text-muted hover:bg-white hover:text-sf-text',
          ].join(' ')}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
