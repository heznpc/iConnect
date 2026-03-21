/** Shared interfaces used across multiple modules. */

export interface Shareable {
  shared: boolean;
}

export interface MutationResult {
  id: string;
  name: string;
}

export interface DeleteResult {
  deleted: boolean;
  name: string;
}
