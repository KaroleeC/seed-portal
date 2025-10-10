import { CadenceModel, createEmptyCadence } from "./types";

// In-memory store for Phase A.1 (cleared on reload)
const memoryStore: Record<string, CadenceModel> = {};

export function listCadences(): CadenceModel[] {
  return Object.values(memoryStore);
}

export function getCadence(id: string): CadenceModel | undefined {
  return memoryStore[id];
}

export function upsertCadence(model: CadenceModel): CadenceModel {
  memoryStore[model.id] = model;
  return model;
}

export function ensureCadence(id: string, ownerUserId?: string): CadenceModel {
  const existing = getCadence(id);
  if (existing) return existing;
  const created = createEmptyCadence(id, ownerUserId);
  upsertCadence(created);
  return created;
}
