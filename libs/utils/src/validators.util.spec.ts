import { describe, it, expect } from 'vitest';
import { ValidatorsUtil } from './validators.util';

describe('ValidatorsUtil', () => {
  
  describe('isValidEmail', () => {
    it.each([
      // Valid emails
      ['test@example.com', true, 'standard email'],
      ['user.name@domain.co.uk', true, 'email with dots and subdomain'],
      ['test+tag@example.com', true, 'email with plus sign'],
      // Invalid emails
      ['invalid@', false, 'incomplete domain'],
      ['@example.com', false, 'missing local part'],
      ['notanemail', false, 'no @ symbol'],
      ['', false, 'empty string'],
      ['  ', false, 'whitespace only']
    ])('should return %s for %s', (email, expected, _description) => {
      expect(ValidatorsUtil.isValidEmail(email)).toBe(expected);
    });
  });

  describe('getEmailValidationError', () => {
    it.each([
      ['', 'Email is required', 'empty email'],
      ['invalid@', 'Please enter a valid email address', 'invalid format'],
      ['test@example.com', '', 'valid email']
    ])('should return "%s" for %s', (email, expected, _description) => {
      expect(ValidatorsUtil.getEmailValidationError(email)).toBe(expected);
    });
  });

  describe('isValidPhone', () => {
    it.each([
      // Valid phones (10 digits)
      ['9876543210', true, 'standard phone'],
      ['1234567890', true, 'another valid phone'],
      // Invalid phones
      ['123456789', false, 'too short'],
      ['12345678901', false, 'too long'],
      ['abcdefghij', false, 'non-numeric'],
      ['', false, 'empty'],
      ['  ', false, 'whitespace']
    ])('should return %s for %s', (phone, expected, _description) => {
      expect(ValidatorsUtil.isValidPhone(phone)).toBe(expected);
    });
  });

  describe('getPhoneValidationError', () => {
    it.each([
      ['', 'Phone number is required', 'empty phone'],
      ['12345', 'Please enter a valid 10-digit phone number', 'invalid length'],
      ['9876543210', '', 'valid phone']
    ])('should return "%s" for %s', (phone, expected, _description) => {
      expect(ValidatorsUtil.getPhoneValidationError(phone)).toBe(expected);
    });
  });

  describe('isValidOtp', () => {
    it.each([
      // Valid OTPs (6 digits)
      ['123456', true, 'standard OTP'],
      ['000000', true, 'all zeros'],
      // Invalid OTPs
      ['12345', false, 'too short'],
      ['1234567', false, 'too long'],
      ['abcdef', false, 'non-numeric'],
      ['', false, 'empty']
    ])('should return %s for %s', (otp, expected, _description) => {
      expect(ValidatorsUtil.isValidOtp(otp)).toBe(expected);
    });
  });

  describe('getOtpValidationError', () => {
    it.each([
      ['', 'OTP is required', 'empty OTP'],
      ['12345', 'Please enter a valid 6-digit OTP', 'invalid length'],
      ['123456', '', 'valid OTP']
    ])('should return "%s" for %s', (otp, expected, _description) => {
      expect(ValidatorsUtil.getOtpValidationError(otp)).toBe(expected);
    });
  });

  describe('isValidPassword', () => {
    it.each([
      // Valid passwords
      ['password123', 6, true, 'long password'],
      ['exactsix', 6, true, 'exactly min length'],
      // Invalid passwords
      ['short', 6, false, 'too short'],
      ['123', 6, false, 'way too short'],
      ['', 6, false, 'empty'],
      // Default minLength behavior
      ['12345', undefined, false, 'below default minLength'],
      ['123456', undefined, true, 'meets default minLength']
    ])('should return %s for %s', (password, minLength, expected, _description) => {
      expect(ValidatorsUtil.isValidPassword(password, minLength)).toBe(expected);
    });
  });

  describe('getPasswordValidationError', () => {
    it.each([
      ['', 6, 'Password is required', 'empty password'],
      ['short', 8, 'Password must be at least 8 characters long', 'too short'],
      ['validpass', 6, '', 'valid password']
    ])('should return "%s" for %s', (password, minLength, expected, _description) => {
      expect(ValidatorsUtil.getPasswordValidationError(password, minLength)).toBe(expected);
    });
  });

  describe('isValidName', () => {
    it.each([
      // Valid names
      ['John Doe', true, 'full name'],
      ['Alice', true, 'single name'],
      // Invalid names
      ['A', false, 'too short'],
      ['', false, 'empty'],
      ['John123', false, 'contains numbers'],
      ['John@Doe', false, 'special characters'],
      ['  ', false, 'whitespace only']
    ])('should return %s for %s', (name, expected, _description) => {
      expect(ValidatorsUtil.isValidName(name)).toBe(expected);
    });
  });

  describe('getNameValidationError', () => {
    it.each([
      ['', 'Name is required', 'empty name'],
      ['A', 'Name must be at least 2 characters long', 'too short'],
      ['John123', 'Name can only contain letters and spaces', 'invalid characters'],
      ['John Doe', '', 'valid name']
    ])('should return "%s" for %s', (name, expected, _description) => {
      expect(ValidatorsUtil.getNameValidationError(name)).toBe(expected);
    });
  });

  describe('isFieldValid', () => {
    it.each([
      ['test@example.com', '', true, 'valid value with no error'],
      ['test', 'Invalid', false, 'has error message'],
      ['', '', false, 'empty value']
    ])('should return %s for %s', (value, error, expected, _description) => {
      expect(ValidatorsUtil.isFieldValid(value, error)).toBe(expected);
    });
  });

  describe('isFieldInvalid', () => {
    it.each([
      ['test@', 'Invalid email', true, 'has value and error'],
      ['test@example.com', '', false, 'valid with no error'],
      ['', 'Required', false, 'empty value']
    ])('should return %s for %s', (value, error, expected, _description) => {
      expect(ValidatorsUtil.isFieldInvalid(value, error)).toBe(expected);
    });
  });
});
