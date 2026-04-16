import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { VendorReportResponse, MonthlyReportResponse, HostelReportResponse, YearlyReportResponse } from '../types';

export const useVendorReport = (vendor: string | undefined, month?: number, year?: number) => {
  return useQuery({
    queryKey: ['report-vendor', vendor, month, year],
    queryFn: async () => {
      const { data } = await apiClient.get<VendorReportResponse>('/api/reports/vendor', {
        params: { vendor, month, year }
      });
      return data;
    },
    enabled: !!vendor,
  });
};

export const useMonthlyReport = (month: number | undefined, year: number | undefined) => {
  return useQuery({
    queryKey: ['report-monthly', month, year],
    queryFn: async () => {
      const { data } = await apiClient.get<MonthlyReportResponse>('/api/reports/monthly', {
        params: { month, year }
      });
      return data;
    },
    enabled: !!month && !!year,
  });
};

export const useHostelReport = (hostel_no: number | undefined, month: number | undefined, year: number | undefined) => {
  return useQuery({
    queryKey: ['report-hostel', hostel_no, month, year],
    queryFn: async () => {
      const { data } = await apiClient.get<HostelReportResponse>('/api/reports/hostel', {
        params: { hostel_no, month, year }
      });
      return data;
    },
    enabled: !!hostel_no && !!month && !!year,
  });
};

export const useYearlyReport = (year: number | undefined) => {
  return useQuery({
    queryKey: ['report-yearly', year],
    queryFn: async () => {
      const { data } = await apiClient.get<YearlyReportResponse>('/api/reports/yearly', {
        params: { year }
      });
      return data;
    },
    enabled: !!year,
  });
};
