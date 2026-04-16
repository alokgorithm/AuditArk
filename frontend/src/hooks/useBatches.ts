import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Batch } from '../types';

export const useBatches = () => {
  return useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data } = await apiClient.get<Batch[]>('/api/batches');
      return data;
    },
  });
};

export const useCreateBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newBatch: { name: string; source_folder: string }) => {
      const { data } = await apiClient.post<Batch>('/api/batches', newBatch);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
};

export interface UploadResult {
  batch_id: number;
  total_imported: number;
  images: number;
  csv_receipts: number;
  zip_images: number;
  duplicates: Array<{ file: string; existing_receipt_id: number; existing_batch_id: number }>;
  errors: string[];
}

export const useUploadFiles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, files }: { id: number; files: File[] }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      const { data } = await apiClient.post<UploadResult>(
        `/api/batches/${id}/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};
