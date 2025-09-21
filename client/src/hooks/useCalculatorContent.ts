import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { seedqcKeys } from '@/lib/queryKeys';

export interface CalculatorServiceContentItem {
  id: number;
  service: string;
  sowTitle?: string | null;
  sowTemplate?: string | null;
  agreementLink?: string | null;
  includedFieldsJson?: string | null;
  updatedBy?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedIncludedFields {
  [section: string]: any;
}

export interface CalculatorContentResult {
  items: (CalculatorServiceContentItem & { includedFields?: ParsedIncludedFields })[];
}

export function useCalculatorContent(service?: string) {
  return useQuery<CalculatorContentResult>({
    queryKey: seedqcKeys.content(service || 'all'),
    queryFn: async () => {
      const qs = service ? `?service=${encodeURIComponent(service)}` : '';
      const data = await apiRequest(`/api/apps/seedqc/content${qs}`);
      const items = Array.isArray(data?.items) ? data.items : [];
      return {
        items: items.map((it: any) => ({
          ...it,
          includedFields: it?.includedFieldsJson ? safeParseJson(it.includedFieldsJson) : undefined,
        }))
      } as CalculatorContentResult;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function safeParseJson(s: string): any {
  try { return JSON.parse(s); } catch { return undefined; }
}
