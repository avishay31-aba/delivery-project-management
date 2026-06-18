export interface KeyValuePersistenceAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface PersistenceRepository<T> {
  load(): T | null
  save(value: T): void
  clear(): void
}

