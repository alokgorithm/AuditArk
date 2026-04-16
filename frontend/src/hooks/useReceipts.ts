import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { QueryResponse, Receipt, EditAuditRecord } from '../types';

export interface ReceiptQueryParams {
  vendor?: string;
  month?: number;
  year?: number;
  hostel_no?: number;
  batch_id?: number;
  category?: string;
  date_from?: string;
  date_to?: string;
}

export const useReceipts = (params: ReceiptQueryParams) => {
  return useQuery({
    queryKey: ['receipts', params],
    queryFn: async () => {
      const { data } = await apiClient.get<QueryResponse>('/api/receipts', { params });
      return data;
    },
  });
};

export const useReceipt = (id: number | undefined) => {
  return useQuery({
    queryKey: ['receipt', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Receipt>(`/api/receipts/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useReceiptEdits = (id: number | undefined) => {
  return useQuery({
    queryKey: ['receipt-edits', id],
    queryFn: async () => {
      const { data } = await apiClient.get<EditAuditRecord[]>(`/api/receipts/${id}/edits`);
      return data;
    },
    enabled: !!id,
  });
};

export const useUpdateReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Receipt> }) => {
      const { data } = await apiClient.put(`/api/receipts/${id}`, updates);
      return data;
    },
    onSuccess: (_: unknown, variables: { id: number; updates: Partial<Receipt> }) => {
      queryClient.invalidateQueries({ queryKey: ['receipt', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['receipt-edits', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
};

export const useUpdateStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data } = await apiClient.patch(`/api/receipts/${id}/status`, { status });
      return data;
    },
    onSuccess: (_: unknown, variables: { id: number; status: string }) => {
      queryClient.invalidateQueries({ queryKey: ['receipt', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
};

export const useDeleteReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.delete(`/api/receipts/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
};

export const useBulkDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { data } = await apiClient.post('/api/receipts/bulk-delete', { ids });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
};

export const useDeleteReceiptImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.delete(`/api/receipts/${id}/image`);
      return data;
    },
    onSuccess: (_: unknown, id: number) => {
      queryClient.invalidateQueries({ queryKey: ['receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
};
