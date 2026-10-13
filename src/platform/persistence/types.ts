export interface KeyValuePersistenceAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  key?(index: number): string | null
  readonly length?: number
}

export interface PersistenceRepository<T> {
  load(): T | null
  save(value: T): void
  clear(): void
}
