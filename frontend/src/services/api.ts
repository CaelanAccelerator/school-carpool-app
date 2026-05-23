import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
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

// ─── Token helpers ────────────────────────────────────────────────────────────

const KEYS = { access: 'accessToken', refresh: 'refreshToken' } as const;

export const getAccessToken  = () => localStorage.getItem(KEYS.access);
export const getRefreshToken = () => localStorage.getItem(KEYS.refresh);

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(KEYS.access, access);
  localStorage.setItem(KEYS.refresh, refresh);
};

export const clearTokens = () => {
  localStorage.removeItem(KEYS.access);
  localStorage.removeItem(KEYS.refresh);
};

// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── 401 → auto-refresh interceptor ──────────────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const drainQueue = (err: any, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Skip refresh loop for auth endpoints themselves
    if (original.url?.includes('/api/auth/')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      isRefreshing = false;
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
      const newAccessToken: string = data.data.accessToken;
      localStorage.setItem(KEYS.access, newAccessToken);
      drainQueue(null, newAccessToken);
      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(original);
    } catch (refreshErr) {
      drainQueue(refreshErr, null);
      clearTokens();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// ─── Auth service ─────────────────────────────────────────────────────────────

export const authService = {
  /** Returns the User object and stores tokens internally. */
  login: async (email: string, password: string): Promise<User> => {
    const response: AxiosResponse<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> =
      await api.post('/api/auth/login', { email, password });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Login failed');
    }

    const { user, accessToken, refreshToken } = response.data.data;
    setTokens(accessToken, refreshToken);
    return user;
  },

  me: async (): Promise<User> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.get('/api/auth/me');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Not authenticated');
    }
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    const refreshToken = getRefreshToken();
    clearTokens();
    if (refreshToken) {
      await api.post('/api/auth/logout', { refreshToken }).catch(() => {});
    }
  },
};

// ─── User service ─────────────────────────────────────────────────────────────

export const userService = {
  upsertUser: async (userData: CreateOrUpdateUserData & { id?: string }): Promise<User> => {
    const { id, ...data } = userData;
    let response: AxiosResponse<ApiResponse<User>>;

    if (id) {
      response = await api.put(`/api/users/${id}`, data);
    } else {
      response = await api.put('/api/users', data);
    }

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to upsert user');
    }
    return response.data.data;
  },

  createUser: async (userData: CreateOrUpdateUserData): Promise<User> =>
    userService.upsertUser(userData),

  updateUser: async (id: string, userData: UpdateUserData): Promise<User> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.put(`/api/users/${id}`, userData);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update user');
    }
    return response.data.data;
  },

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

  getUserById: async (id: string): Promise<User> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.get(`/api/users/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch user');
    }
    return response.data.data;
  },

  changePassword: async (id: string, passwordData: ChangePasswordData): Promise<void> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.patch(`/api/users/${id}/password`, passwordData);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to change password');
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.delete(`/api/users/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete user');
    }
  },

  permanentDeleteUser: async (id: string): Promise<void> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.delete(`/api/users/${id}/permanent`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to permanently delete user');
    }
  },
};

// ─── Health service ───────────────────────────────────────────────────────────

export const healthService = {
  checkHealth: async (): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/health');
    return response.data;
  },

  getApiInfo: async (): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/api');
    return response.data;
  },
};

// ─── Ride request service ─────────────────────────────────────────────────────

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

  // actorUserId is kept in signature for backward compatibility but no longer sent —
  // the backend now derives actor identity from the JWT.
  respondToRideRequest: async (
    id: string,
    _actorUserId: string,
    status: Exclude<RideRequestStatus, 'PENDING' | 'CANCELLED'>,
    driverNote?: string
  ): Promise<RideRequest> => {
    const response: AxiosResponse<ApiResponse<RideRequest>> = await api.put(
      `/api/requests/${id}/respond`,
      { status, driverNote }
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || response.data.message || 'Failed to respond to ride request');
    }
    return response.data.data;
  },

  cancelRideRequest: async (id: string, _actorUserId: string): Promise<RideRequest> => {
    const response: AxiosResponse<ApiResponse<RideRequest>> = await api.put(
      `/api/requests/${id}/cancel`,
      {}
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
  },
};

// ─── Schedule service ─────────────────────────────────────────────────────────

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
  },
};

// ─── Matching service ─────────────────────────────────────────────────────────

type MatchingResultsPayload = { drivers?: any[]; passengers?: any[]; note?: string };

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
    return { results: response.data.data.drivers || [], note: response.data.data.note };
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
    return { results: response.data.data.drivers || [], note: response.data.data.note };
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
    return { results: response.data.data.passengers || [], note: response.data.data.note };
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
    return { results: response.data.data.passengers || [], note: response.data.data.note };
  },
};

export default api;
