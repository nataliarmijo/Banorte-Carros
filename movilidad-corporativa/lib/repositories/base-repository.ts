export interface QueryOptions<T> {
  limit?: number;
  offset?: number;
  sortBy?: keyof T;
  sortOrder?: "asc" | "desc";
  filters?: Partial<T>;
}

export interface Repository<T extends { id: string }> {
  create(item: T): Promise<T>;
  getById(id: string): Promise<T | undefined>;
  list(options?: QueryOptions<T>): Promise<T[]>;
  update(id: string, item: Partial<T>): Promise<T | undefined>;
  updateStatus(id: string, estatus: string): Promise<T | undefined>;
  delete(id: string): Promise<void>;
}
