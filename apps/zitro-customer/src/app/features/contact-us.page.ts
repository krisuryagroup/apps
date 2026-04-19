import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import { AppSettingsService } from '@zitro/services';
import { PHONE_CONSTANTS } from '../core/constants/app.constants';

@Component({
  selector: 'app-contact-us-page',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './contact-us.page.html',
  styleUrl: './contact-us.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactUsPage implements OnInit {
  private readonly appSettings = inject(AppSettingsService);

  readonly email = signal('Loading...');
  readonly phone = signal('Loading...');
  readonly emailCopied = signal(false);
  readonly phoneCopied = signal(false);

  readonly emailHref = computed(() => `mailto:${this.email()}`);
  readonly phoneHref = computed(() => `tel:${this.phone().replace(/\s/g, '')}`);

  async ngOnInit(): Promise<void> {
    try {
      const info = await this.appSettings.getContactInfo();
      this.email.set(info.contactEmail);
      this.phone.set(`${PHONE_CONSTANTS.INDIA_CODE} ${info.contactPhone}`);
    } catch {
      this.email.set('mahendrakumar0384@gmail.com');
      this.phone.set(`${PHONE_CONSTANTS.INDIA_CODE} 9193116659`);
    }
  }

  async copyEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.email());
      this.emailCopied.set(true);
      setTimeout(() => this.emailCopied.set(false), 2000);
    } catch {
      this.fallbackCopy(this.email(), 'email');
    }
  }

  async copyPhone(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.phone());
      this.phoneCopied.set(true);
      setTimeout(() => this.phoneCopied.set(false), 2000);
    } catch {
      this.fallbackCopy(this.phone(), 'phone');
    }
  }

  private fallbackCopy(text: string, type: 'email' | 'phone'): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-999999px';
    ta.style.top = '-999999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      if (type === 'email') {
        this.emailCopied.set(true);
        setTimeout(() => this.emailCopied.set(false), 2000);
      } else {
        this.phoneCopied.set(true);
        setTimeout(() => this.phoneCopied.set(false), 2000);
      }
    } finally {
      document.body.removeChild(ta);
    }
  }
}
