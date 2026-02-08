import axios, { AxiosResponse } from 'axios';
import {
    ApiResponse,
    ChangePasswordData,
    CreateOrUpdateUserData,
    PaginatedResponse,
    RideDirection,
    RideRequest,
    RideRequestStatus,
    UpdateUserData,
    User
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4321';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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
  updateUser: async (id: string, userData: UpdateUserData): Promise<User> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.put(`/api/users/${id}`, userData);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update user');
    }
    return response.data.data;
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

export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.post('/api/auth/login', {
      email,
      password
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Login failed');
    }

    return response.data.data;
  },

  me: async (): Promise<User> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.get('/api/auth/me');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Not authenticated');
    }
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.post('/api/auth/logout');
    if (!response.data.success) {
      throw new Error(response.data.error || response.data.message || 'Logout failed');
    }
  }
};

export const rideRequestService = {
  createOrUpdateRideRequestKey: async (
    fromUserId: string,
    toUserId: string,
    dayOfWeek: number,
    direction: RideDirection,
    message?: string
  ): Promise<RideRequest> => {
    const response: AxiosResponse<ApiResponse<RideRequest>> = await api.put(
      `/api/requests/key/${fromUserId}/${toUserId}/${dayOfWeek}/${direction}`,
      { message }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to create ride request');
    }

    return response.data.data;
  },

  respondToRideRequest: async (
    id: string,
    actorUserId: string,
    status: Exclude<RideRequestStatus, 'PENDING' | 'CANCELLED'>,
    driverNote?: string
  ): Promise<RideRequest> => {
    const response: AxiosResponse<ApiResponse<RideRequest>> = await api.put(
      `/api/requests/${id}/respond`,
      { actorUserId, status, driverNote }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to respond to ride request');
    }

    return response.data.data;
  },

  cancelRideRequest: async (id: string, actorUserId: string): Promise<RideRequest> => {
    const response: AxiosResponse<ApiResponse<RideRequest>> = await api.put(
      `/api/requests/${id}/cancel`,
      { actorUserId }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to cancel ride request');
    }

    return response.data.data;
  },

  getInbox: async (userId: string): Promise<RideRequest[]> => {
    const response: AxiosResponse<ApiResponse<RideRequest[]>> = await api.get(
      `/api/requests/inbox/${userId}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to fetch inbox');
    }

    return response.data.data;
  },

  getOutbox: async (userId: string): Promise<RideRequest[]> => {
    const response: AxiosResponse<ApiResponse<RideRequest[]>> = await api.get(
      `/api/requests/outbox/${userId}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to fetch outbox');
    }

    return response.data.data;
  }
};

export const scheduleService = {
  getUserScheduleEntries: async (userId: string) => {
    const response: AxiosResponse<ApiResponse<any[]>> = await api.get(
      `/api/users/${userId}/schedule`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to fetch schedule');
    }

    return response.data.data;
  },

  updateScheduleEntry: async (
    userId: string,
    entryId: string,
    payload: {
      toCampusMins?: number;
      goHomeMins?: number;
      toCampusFlexMin?: number;
      goHomeFlexMin?: number;
      toCampusMaxDetourMins?: number;
      goHomeMaxDetourMins?: number;
      enabled?: boolean;
    }
  ) => {
    const response: AxiosResponse<ApiResponse<any>> = await api.put(
      `/api/users/${userId}/schedule/${entryId}`,
      payload
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to update schedule entry');
    }

    return response.data.data;
  },

  createScheduleEntry: async (
    userId: string,
    payload: {
      dayOfWeek: number;
      toCampusMins: number;
      goHomeMins: number;
      toCampusFlexMin?: number;
      goHomeFlexMin?: number;
      toCampusMaxDetourMins?: number;
      goHomeMaxDetourMins?: number;
      enabled?: boolean;
    }
  ) => {
    const response: AxiosResponse<ApiResponse<any>> = await api.put(
      `/api/users/${userId}/schedule`,
      payload
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to create schedule entry');
    }

    return response.data.data;
  },

  deleteScheduleEntry: async (userId: string, entryId: string) => {
    const response: AxiosResponse<ApiResponse<null>> = await api.delete(
      `/api/users/${userId}/schedule/${entryId}`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || response.data.message || 'Failed to delete schedule entry');
    }
  }
};

type MatchingResultsPayload = {
  drivers?: any[];
  passengers?: any[];
  note?: string;
};

export const matchingService = {
  findDriversToCampus: async (
    userId: string,
    dayOfWeek: number,
    toCampusTime: string,
    flexibilityMins: number
  ): Promise<{ results: any[]; note?: string }> => {
    const response: AxiosResponse<ApiResponse<MatchingResultsPayload>> = await api.post(
      `/api/matching/users/${userId}/find-optimal-drivers-to-campus`,
      { dayOfWeek, toCampusTime, flexibilityMins }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to fetch matches');
    }

    return {
      results: response.data.data.drivers || [],
      note: response.data.data.note
    };
  },

  findDriversGoHome: async (
    userId: string,
    dayOfWeek: number,
    goHomeTime: string,
    flexibilityMins: number
  ): Promise<{ results: any[]; note?: string }> => {
    const response: AxiosResponse<ApiResponse<MatchingResultsPayload>> = await api.post(
      `/api/matching/users/${userId}/find-optimal-drivers-go-home`,
      { dayOfWeek, goHomeTime, flexibilityMins }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to fetch matches');
    }

    return {
      results: response.data.data.drivers || [],
      note: response.data.data.note
    };
  },

  findPassengersToCampus: async (
    userId: string,
    dayOfWeek: number,
    toCampusTime: string,
    flexibilityMins: number
  ): Promise<{ results: any[]; note?: string }> => {
    const response: AxiosResponse<ApiResponse<MatchingResultsPayload>> = await api.post(
      `/api/matching/users/${userId}/find-optimal-passengers-to-campus`,
      { dayOfWeek, toCampusTime, flexibilityMins }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to fetch matches');
    }

    return {
      results: response.data.data.passengers || [],
      note: response.data.data.note
    };
  },

  findPassengersGoHome: async (
    userId: string,
    dayOfWeek: number,
    goHomeTime: string,
    flexibilityMins: number
  ): Promise<{ results: any[]; note?: string }> => {
    const response: AxiosResponse<ApiResponse<MatchingResultsPayload>> = await api.post(
      `/api/matching/users/${userId}/find-optimal-passengers-go-home`,
      { dayOfWeek, goHomeTime, flexibilityMins }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to fetch matches');
    }

    return {
      results: response.data.data.passengers || [],
      note: response.data.data.note
    };
  }
};

export default api;