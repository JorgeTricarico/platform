/**
 * Hook that provides a fully configured ApiClient + domain-specific sub-APIs.
 * Reads VITE_API_URL and VITE_TENANT from env.
 */
import { useMemo } from 'react';
import {
  createApiClient,
  createOrdersApi,
  createAppointmentsApi,
  createFinancesApi,
  createClientsApi,
  createPatientRecordsApi,
  createDashboardApi,
} from '../services/api';

const API_URL = import.meta.env.VITE_API_URL as string || 'http://localhost:3001';
const TENANT = import.meta.env.VITE_TENANT as string || 'zenco';

export function useApi() {
  return useMemo(() => {
    const client = createApiClient(API_URL, TENANT);
    return {
      client,
      orders: createOrdersApi(client),
      appointments: createAppointmentsApi(client),
      finances: createFinancesApi(client),
      clients: createClientsApi(client),
      patientRecords: createPatientRecordsApi(client),
      dashboard: createDashboardApi(client),
    };
  }, []);
}
