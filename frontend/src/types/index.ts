export interface User {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  contactType: ContactType;
  contactValue: string;
  campus: string;
  homeArea: string;
  homeAddress?: string;
  homeLat?: number | null;
  homeLng?: number | null;
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

export interface UpdateUserData {
  name?: string;
  photoUrl?: string;
  contactType?: ContactType;
  contactValue?: string;
  campus?: string;
  homeArea?: string;
  role?: Role;
  timeZone?: string;
  isActive?: boolean;
  homeAddress?: string;
  homeLat?: number | null;
  homeLng?: number | null;
}

export interface ScheduleEntry {
  id: string;
  dayOfWeek: number;
  toCampusMins: number;
  goHomeMins: number;
  toCampusFlexMin: number;
  goHomeFlexMin: number;
  toCampusMaxDetourMins?: number;
  goHomeMaxDetourMins?: number;
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

export type RideDirection = 'TO_CAMPUS' | 'GO_HOME';
export type RideRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | string;

export interface RideRequestUser {
  id: string;
  name: string;
  photoUrl?: string | null;
  campus?: string;
  homeArea?: string;
  contactType?: ContactType | null;
  contactValue?: string | null;
}

export interface RideRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  dayOfWeek: number;
  direction: RideDirection;
  status: RideRequestStatus;
  message?: string | null;
  driverNote?: string | null;
  createdAt: string;
  updatedAt: string;
  fromUser?: RideRequestUser;
  toUser?: RideRequestUser;
}