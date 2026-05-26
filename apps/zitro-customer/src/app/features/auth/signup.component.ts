import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, inject } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { FirebaseAuthService } from '@zitro/services';
import { Router } from '@angular/router';
import { ValidatorsUtil } from '@zitro/utils';
import {
  PHONE_CONSTANTS,
  VALIDATION_MESSAGES,
} from '../../core/constants/app.constants';
import { AnalyticsService } from '@zitro/services';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
  private authService = inject(FirebaseAuthService);
  private router = inject(Router);
  private analyticsService = inject(AnalyticsService);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  // Phone signup state
  phone = '';
  otp = '';
  showOtp = false;
  phoneError = '';
  otpError = '';
  signupWithPhone = false;
  errorMsg = '';
  emailError = '';
  nameError = '';
  passwordError = '';
  confirmPasswordError = '';

  validatePhone() {
    this.phoneError = ValidatorsUtil.getPhoneValidationError(this.phone);
    return this.phoneError === '';
  }

  validateOtp() {
    this.otpError = ValidatorsUtil.getOtpValidationError(this.otp);
    return this.otpError === '';
  }

  onOtpInput(event: any) {
    // Allow only numeric input for OTP
    const input = event.target.value.replace(/[^0-9]/g, '');
    this.otp = input;
    this.validateOtp();
  }

  validateEmail() {
    this.emailError = ValidatorsUtil.getEmailValidationError(this.email);
    return this.emailError === '';
  }

  validateName() {
    this.nameError = ValidatorsUtil.getNameValidationError(this.name);
    return this.nameError === '';
  }

  validatePassword() {
    this.passwordError = ValidatorsUtil.getPasswordValidationError(
      this.password,
      6,
    );
    return this.passwordError === '';
  }

  validateConfirmPassword() {
    this.confirmPasswordError = '';
    if (!this.confirmPassword || this.confirmPassword.trim().length === 0) {
      this.confirmPasswordError = VALIDATION_MESSAGES.PASSWORD_CONFIRM_REQUIRED;
      return false;
    }
    if (this.password !== this.confirmPassword) {
      this.confirmPasswordError = VALIDATION_MESSAGES.PASSWORDS_DO_NOT_MATCH;
      return false;
    }
    return true;
  }

  validateForm() {
    const isEmailValid = this.validateEmail();
    const isNameValid = this.validateName();
    const isPasswordValid = this.validatePassword();
    const isConfirmPasswordValid = this.validateConfirmPassword();

    return (
      isEmailValid && isNameValid && isPasswordValid && isConfirmPasswordValid
    );
  }

  // Helper methods for UI state
  isNameValid(): boolean {
    return ValidatorsUtil.isFieldValid(this.name, this.nameError);
  }

  isNameInvalid(): boolean {
    return ValidatorsUtil.isFieldInvalid(this.name, this.nameError);
  }

  isEmailValid(): boolean {
    return ValidatorsUtil.isFieldValid(this.email, this.emailError);
  }

  isEmailInvalid(): boolean {
    return ValidatorsUtil.isFieldInvalid(this.email, this.emailError);
  }

  isPasswordValid(): boolean {
    return ValidatorsUtil.isFieldValid(this.password, this.passwordError);
  }

  isPasswordInvalid(): boolean {
    return ValidatorsUtil.isFieldInvalid(this.password, this.passwordError);
  }

  isConfirmPasswordValid(): boolean {
    return ValidatorsUtil.isFieldValid(
      this.confirmPassword,
      this.confirmPasswordError,
    );
  }

  isConfirmPasswordInvalid(): boolean {
    return ValidatorsUtil.isFieldInvalid(
      this.confirmPassword,
      this.confirmPasswordError,
    );
  }

  isPhoneValid(): boolean {
    return ValidatorsUtil.isFieldValid(this.phone, this.phoneError);
  }

  isPhoneInvalid(): boolean {
    return ValidatorsUtil.isFieldInvalid(this.phone, this.phoneError);
  }

  isOtpValid(): boolean {
    return ValidatorsUtil.isFieldValid(this.otp, this.otpError);
  }

  isOtpInvalid(): boolean {
    return ValidatorsUtil.isFieldInvalid(this.otp, this.otpError);
  }

  async onPhoneSubmit() {
    if (this.validatePhone()) {
      try {
        this.errorMsg = 'Sending OTP...';
        // sendOtp now returns the OTP string directly
        await this.authService.sendOtp(PHONE_CONSTANTS.INDIA_CODE + this.phone);
        this.showOtp = true;
        this.errorMsg = '';
      } catch (err: any) {
        this.errorMsg = err?.message || 'Failed to send OTP';
      }
    }
  }

  async onOtpSubmit() {
    if (!this.validateOtp()) {
      return;
    }

    try {
      this.errorMsg = 'Verifying OTP...';

      // Verify OTP first
      const isValid = this.authService.verifyOtp(
        PHONE_CONSTANTS.INDIA_CODE + this.phone,
        this.otp,
      );

      if (!isValid) {
        this.errorMsg = 'Invalid or expired OTP. Please try again.';
        return;
      }

      // Sign in with phone after OTP verification
      await this.authService.signInWithPhone(this.phone, this.otp);
      this.errorMsg = '';

      // Track signup event
      await this.analyticsService.logSignUp('phone');

      this.router.navigate(['/home']);
    } catch (err: any) {
      this.errorMsg = err?.message || 'Invalid OTP';
    }
  }

  async onEmailSignup(form: any) {
    if (this.validateForm() && form.valid) {
      // You may want to add signup logic here (e.g., createUserWithEmailAndPassword)
      // For now, just simulate success and redirect
      this.errorMsg = '';
      this.router.navigate(['/home']);
    }
  }

  continueAsGuest() {
    this.authService.continueAsGuest();
    this.router.navigate(['/home']);
  }
}
