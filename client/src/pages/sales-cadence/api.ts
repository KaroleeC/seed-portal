import type { CadenceModel } from "./types";
import { apiFetch } from "@/lib/api";

const BASE = "/api/cadence";

export async function upsertCadenceApi(model: CadenceModel): Promise<CadenceModel> {
  return await apiFetch<CadenceModel>("POST", BASE, model);
}

export async function getCadenceApi(id: string): Promise<CadenceModel> {
  return await apiFetch<CadenceModel>("GET", `${BASE}/${encodeURIComponent(id)}`);
}

export interface CadenceSummary {
  id: string;
  name: string;
  isActive: boolean;
  ownerUserId?: string;
  timezone: string;
}

export async function listCadencesApi(): Promise<CadenceSummary[]> {
  return await apiFetch<CadenceSummary[]>("GET", BASE);
}
