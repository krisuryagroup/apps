import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PHONE_CONSTANTS } from '../core/constants/app.constants';
import { AppSettingsService, ContactInfo } from '@zitro/services';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.scss']
})
export class ContactUsComponent implements OnInit {
  emailCopied: boolean = false;
  phoneCopied: boolean = false;

  email = 'Loading...';
  phone = 'Loading...';

  constructor(private appSettingsService: AppSettingsService) {}

  async ngOnInit(): Promise<void> {
    try {
      const contactInfo: ContactInfo = await this.appSettingsService.getContactInfo();
      this.email = contactInfo.contactEmail;
      this.phone = `${PHONE_CONSTANTS.INDIA_CODE} ${contactInfo.contactPhone}`;
    } catch (error) {
      console.error('Error loading contact info:', error);
      // Fallback to defaults
      this.email = 'mahendrakumar0384@gmail.com';
      this.phone = `${PHONE_CONSTANTS.INDIA_CODE} 9193116659`;
    }
  }

  get emailHref(): string {
    return `mailto:${this.email}`;
  }

  get phoneHref(): string {
    // Remove spaces and use clean format for tel: link
    return `tel:${this.phone.replace(/\s/g, '')}`;
  }

  async copyEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.email);
      this.emailCopied = true;
      setTimeout(() => {
        this.emailCopied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
      // Fallback for older browsers
      this.fallbackCopyToClipboard(this.email);
    }
  }

  async copyPhone(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.phone);
      this.phoneCopied = true;
      setTimeout(() => {
        this.phoneCopied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy phone:', err);
      // Fallback for older browsers
      this.fallbackCopyToClipboard(this.phone);
    }
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      // Show copied state for fallback too
      if (text === this.email) {
        this.emailCopied = true;
        setTimeout(() => this.emailCopied = false, 2000);
      } else {
        this.phoneCopied = true;
        setTimeout(() => this.phoneCopied = false, 2000);
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
