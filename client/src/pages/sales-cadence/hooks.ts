import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCadenceApi, listCadencesApi, upsertCadenceApi } from "./api";
import type { CadenceModel } from "./types";

export function useCadenceList() {
  return useQuery({
    queryKey: ["cadence", "list"],
    queryFn: listCadencesApi,
    staleTime: 60_000,
  });
}

export function useCadence(id: string | undefined) {
  return useQuery({
    queryKey: ["cadence", id],
    queryFn: () => getCadenceApi(id as string),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useSaveCadence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (model: CadenceModel) => upsertCadenceApi(model),
    onSuccess: (saved) => {
      qc.setQueryData(["cadence", saved.id], saved);
      qc.invalidateQueries({ queryKey: ["cadence", "list"] });
    },
  });
}
