import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppSettingsService } from '@zitro/services';

@Component({
  selector: 'app-whatsapp-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whatsapp-button.component.html',
  styleUrls: ['./whatsapp-button.component.scss'],
})
export class WhatsappButtonComponent implements OnInit {
  private appSettingsService = inject(AppSettingsService);

  whatsappLink = 'https://wa.me/919193116659?text=Hi'; // Default fallback
  private readonly defaultLink = 'https://wa.me/919193116659?text=Hi';

  async ngOnInit() {
    try {
      // Fetch WhatsApp link from Firebase
      const fetchedLink = await this.appSettingsService.getWhatsAppLink();

      // Validate the fetched link
      if (this.isValidWhatsAppLink(fetchedLink)) {
        this.whatsappLink = fetchedLink;
      } else {
        console.error(
          '❌ Invalid WhatsApp link received from Firebase:',
          fetchedLink,
          '- Using default link',
        );
        this.whatsappLink = this.defaultLink;
      }
    } catch (error) {
      console.error(
        '❌ Error fetching WhatsApp link from Firebase:',
        error,
        '- Using default link',
      );
      this.whatsappLink = this.defaultLink;
    }
  }

  /**
   * Validate if the link is a proper WhatsApp link
   */
  private isValidWhatsAppLink(link: string): boolean {
    if (!link || typeof link !== 'string') {
      return false;
    }

    // Check if it's a valid WhatsApp link format
    const whatsappPattern = /^https?:\/\/(wa\.me|api\.whatsapp\.com)\/\d+/i;
    return whatsappPattern.test(link.trim());
  }
}
