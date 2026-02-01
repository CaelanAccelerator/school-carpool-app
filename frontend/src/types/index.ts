export interface User {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  contactType: ContactType;
  contactValue: string;
  campus: string;
  homeArea: string;
  role: Role;
  timeZone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  schedule?: ScheduleEntry[];
  _count?: {
    sentConnections: number;
    receivedConnections: number;
  };
}

export interface CreateOrUpdateUserData {
  email: string;
  password: string;
  name: string;
  photoUrl?: string;
  contactType: ContactType;
  contactValue: string;
  campus: string;
  homeArea: string;
  role?: Role;
  timeZone?: string;
}

export interface ScheduleEntry {
  id: string;
  dayOfWeek: number;
  toCampusMins: number;
  goHomeMins: number;
  toCampusFlexMin: number;
  goHomeFlexMin: number;
  enabled: boolean;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type Role = 'DRIVER' | 'PASSENGER' | 'BOTH';
export type ContactType = 'EMAIL' | 'PHONE' | 'WECHAT' | 'OTHER';