import axios from 'axios';

// Backend always runs on localhost:8741 (both dev and packaged)
const BASE_URL = 'http://127.0.0.1:8741';

export const API_BASE = BASE_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s timeout — OCR operations can take time
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);
