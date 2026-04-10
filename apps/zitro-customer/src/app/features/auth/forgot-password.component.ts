import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ValidatorsUtil } from '@zitro/utils';
import { FirebaseAuthService } from '@zitro/services';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  email = '';
  emailError = '';
  isSubmitted = false;
  successMessage = '';

  constructor(private authService: FirebaseAuthService, private router: Router) {}

  validateEmail() {
    this.emailError = ValidatorsUtil.getEmailValidationError(this.email);
    return this.emailError === '';
  }

  onSubmit() {
    if (this.validateEmail()) {
      this.isSubmitted = true;
      this.successMessage = `Password reset link has been sent to ${this.email}`;
      
      // Here you would typically call a service to send password reset email
      // For now, just show success message
      console.log('Password reset requested for:', this.email);
    }
  }

  continueAsGuest() {
    this.authService.continueAsGuest();
    this.router.navigate(['/home']);
  }

  // Helper methods for UI state
  isEmailValid(): boolean {
    return ValidatorsUtil.isFieldValid(this.email, this.emailError);
  }

  isEmailInvalid(): boolean {
    return ValidatorsUtil.isFieldInvalid(this.email, this.emailError);
  }
}
