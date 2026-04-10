// Fast2SMS API Response Types

export interface Fast2SmsSuccessResponse {
  return: true;
  request_id: string;
  message: string[];
}

export interface Fast2SmsActivationRequired {
  status_code: 999;
  message: string;
}

export interface Fast2SmsAuthError {
  status_code: 401;
  message: string;
}

export interface Fast2SmsBadRequest {
  status_code: 400;
  message: string;
}

export interface Fast2SmsDltError {
  status_code: 412;
  message: string;
}

export interface Fast2SmsInsufficientBalance {
  status_code: 402;
  message: string;
}

export interface Fast2SmsRateLimit {
  status_code: 429;
  message: string;
}

// Union type for all possible responses
export type Fast2SmsResponse =
  | Fast2SmsSuccessResponse
  | Fast2SmsActivationRequired
  | Fast2SmsAuthError
  | Fast2SmsBadRequest
  | Fast2SmsDltError
  | Fast2SmsInsufficientBalance
  | Fast2SmsRateLimit;

// Type guard helper for success response
export function isFast2SmsSuccess(
  res: Fast2SmsResponse
): res is Fast2SmsSuccessResponse {
  return (res as Fast2SmsSuccessResponse).return === true;
}
