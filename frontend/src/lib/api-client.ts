import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './constants';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let accessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setOnUnauthorized(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

function subscribeTokenRefresh(
  resolve: (token: string) => void,
  reject: (error: unknown) => void,
): void {
  refreshSubscribers.push({ resolve, reject });
}

function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach(({ resolve }) => resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(error: unknown): void {
  refreshSubscribers.forEach(({ reject }) => reject(error));
  refreshSubscribers = [];
}

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password')
  );
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/refresh')) {
      setAccessToken(null);
      onUnauthorized?.();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(
          (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          },
          reject,
        );
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh');
      setAccessToken(data.accessToken);
      onTokenRefreshed(data.accessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      }

      return apiClient(originalRequest);
    } catch (refreshError) {
      onRefreshFailed(refreshError);
      setAccessToken(null);
      onUnauthorized?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
