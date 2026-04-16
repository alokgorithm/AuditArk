import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Vendor } from '../types';

export type VendorPayload = {
  name: string;
  account_no?: string;
  ifsc?: string;
  bank_name?: string;
  default_amount?: number;
  remarks?: string;
};

export const useVendors = () => {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data } = await apiClient.get<Vendor[]>('/api/vendors');
      return data;
    },
  });
};

export const useMergeVendors = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { source_vendor_id: number; target_vendor_id: number }) => {
      const { data } = await apiClient.post('/api/vendors/merge', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useCreateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VendorPayload) => {
      const { data } = await apiClient.post<Vendor>('/api/vendors', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<VendorPayload> }) => {
      const { data } = await apiClient.put<Vendor>(`/api/vendors/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};

export const useDeleteVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.delete<{ deleted: boolean; id: number }>(`/api/vendors/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};
