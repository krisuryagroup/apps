/**
 * Common validation utilities for form inputs
 */
import { VALIDATION_MESSAGES } from './app.constants';

export class ValidatorsUtil {

  /**
   * Validate email format
   * @param email Email string to validate
   * @returns boolean - true if valid, false if invalid
   */
  static isValidEmail(email: string): boolean {
    if (!email || email.trim().length === 0) {
      return false;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Get email validation error message
   * @param email Email string to validate
   * @returns string - error message or empty string if valid
   */
  static getEmailValidationError(email: string): string {
    if (!email || email.trim().length === 0) {
      return VALIDATION_MESSAGES.EMAIL_REQUIRED;
    }

    if (!this.isValidEmail(email)) {
      return VALIDATION_MESSAGES.EMAIL_INVALID;
    }

    return '';
  }

  /**
   * Validate phone number format (10 digits)
   * @param phone Phone number string to validate
   * @returns boolean - true if valid, false if invalid
   */
  static isValidPhone(phone: string): boolean {
    if (!phone || phone.trim().length === 0) {
      return false;
    }

    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone.trim());
  }

  /**
   * Get phone validation error message
   * @param phone Phone number string to validate
   * @returns string - error message or empty string if valid
   */
  static getPhoneValidationError(phone: string): string {
    if (!phone || phone.trim().length === 0) {
      return VALIDATION_MESSAGES.PHONE_REQUIRED;
    }

    if (!this.isValidPhone(phone)) {
      return VALIDATION_MESSAGES.PHONE_INVALID;
    }

    return '';
  }

  /**
   * Validate OTP format (6 digits)
   * @param otp OTP string to validate
   * @returns boolean - true if valid, false if invalid
   */
  static isValidOtp(otp: string): boolean {
    if (!otp || otp.trim().length === 0) {
      return false;
    }

    const otpRegex = /^\d{6}$/;
    return otpRegex.test(otp.trim());
  }

  /**
   * Get OTP validation error message
   * @param otp OTP string to validate
   * @returns string - error message or empty string if valid
   */
  static getOtpValidationError(otp: string): string {
    if (!otp || otp.trim().length === 0) {
      return VALIDATION_MESSAGES.OTP_REQUIRED;
    }

    if (!this.isValidOtp(otp)) {
      return VALIDATION_MESSAGES.OTP_INVALID;
    }

    return '';
  }

  /**
   * Validate password strength
   * @param password Password string to validate
   * @param minLength Minimum length requirement (default: 6)
   * @returns boolean - true if valid, false if invalid
   */
  static isValidPassword(password: string, minLength: number = 6): boolean {
    if (!password || password.length === 0) {
      return false;
    }

    return password.length >= minLength;
  }

  /**
   * Get password validation error message
   * @param password Password string to validate
   * @param minLength Minimum length requirement (default: 6)
   * @returns string - error message or empty string if valid
   */
  static getPasswordValidationError(password: string, minLength: number = 6): string {
    if (!password || password.length === 0) {
      return VALIDATION_MESSAGES.PASSWORD_REQUIRED;
    }

    if (password.length < minLength) {
      return VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH.replace('{0}', minLength.toString());
    }

    return '';
  }

  /**
   * Validate name format (only letters and spaces)
   * @param name Name string to validate
   * @returns boolean - true if valid, false if invalid
   */
  static isValidName(name: string): boolean {
    if (!name || name.trim().length === 0) {
      return false;
    }

    const nameRegex = /^[a-zA-Z\s]+$/;
    return nameRegex.test(name.trim()) && name.trim().length >= 2;
  }

  /**
   * Get name validation error message
   * @param name Name string to validate
   * @returns string - error message or empty string if valid
   */
  static getNameValidationError(name: string): string {
    if (!name || name.trim().length === 0) {
      return VALIDATION_MESSAGES.NAME_REQUIRED;
    }

    if (name.trim().length < 2) {
      return VALIDATION_MESSAGES.NAME_MIN_LENGTH;
    }

    if (!this.isValidName(name)) {
      return VALIDATION_MESSAGES.NAME_INVALID;
    }

    return '';
  }

  // ============ UI Helper Methods ============

  /**
   * Check if field has valid input (has value and no error)
   * @param value Field value
   * @param error Field error message
   * @returns boolean - true if valid input exists
   */
  static isFieldValid(value: string, error: string): boolean {
    return value.length > 0 && error === '';
  }

  /**
   * Check if field has invalid input (has value but has error)
   * @param value Field value
   * @param error Field error message
   * @returns boolean - true if invalid input exists
   */
  static isFieldInvalid(value: string, error: string): boolean {
    return value.length > 0 && error !== '';
  }
}
