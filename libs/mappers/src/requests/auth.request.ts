// Outbound shape for POST /api/auth/verify-otp
export interface VerifyOtpRequest {
  firebaseIdToken: string;
  phone: string;
}

// Outbound shape for PUT /api/users/profile
export interface UpdateProfileRequest {
  name: string;
  email?: string | null;
}
