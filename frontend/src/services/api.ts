import axios, { AxiosResponse } from 'axios';
import {
  User,
  CreateOrUpdateUserData,
  ChangePasswordData,
  ApiResponse,
  PaginatedResponse
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4321';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use((config) => {
  console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const userService = {
  // Idempotent upsert operation - creates or updates a user
  // If id is provided, it will update; if not, it will create
  upsertUser: async (userData: CreateOrUpdateUserData & { id?: string }): Promise<User> => {
    const { id, ...data } = userData;
    let response: AxiosResponse<ApiResponse<User>>;
    
    if (id) {
      // Update existing user - use PUT for idempotency
      response = await api.put(`/api/users/${id}`, data);
    } else {
      // Create new user - use PUT with email as key for idempotency
      // This allows the same create request to be sent multiple times safely
      response = await api.put('/api/users', data);
    }
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to upsert user');
    }
    return response.data.data;
  },

  // Legacy method for backward compatibility - now uses upsert
  createUser: async (userData: CreateOrUpdateUserData): Promise<User> => {
    return userService.upsertUser(userData);
  },

  // Legacy method for backward compatibility - now uses upsert
  updateUser: async (id: string, userData: CreateOrUpdateUserData): Promise<User> => {
    return userService.upsertUser({
      ...userData, 
      id,
    } as CreateOrUpdateUserData & { id?: string });
  },

  // Get all users with optional filtering
  getUsers: async (params?: {
    campus?: string;
    homeArea?: string;
    role?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<User>> => {
    const response: AxiosResponse<PaginatedResponse<User>> = await api.get('/api/users', { params });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch users');
    }
    return response.data;
  },

  // Get user by ID
  getUserById: async (id: string): Promise<User> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.get(`/api/users/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch user');
    }
    return response.data.data;
  },

  // Change password
  changePassword: async (id: string, passwordData: ChangePasswordData): Promise<void> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.patch(`/api/users/${id}/password`, passwordData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to change password');
    }
  },

  // Soft delete user
  deleteUser: async (id: string): Promise<void> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.delete(`/api/users/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete user');
    }
  },

  // Hard delete user
  permanentDeleteUser: async (id: string): Promise<void> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.delete(`/api/users/${id}/permanent`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to permanently delete user');
    }
  }
};

export const healthService = {
  // Health check
  checkHealth: async (): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/health');
    return response.data;
  },

  // API info
  getApiInfo: async (): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/api');
    return response.data;
  }
};

export default api;