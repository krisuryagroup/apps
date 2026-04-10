import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  
  footerLinks = {
    company: [
      { label: 'About Us', route: '/about' },
      { label: 'Contact Us', route: '/contact' }
    ],
    support: [
      { label: 'Help Center', route: '/help' },
      { label: 'Privacy Policy', route: '/privacy' },
      { label: 'Terms of Service', route: '/terms' }
    ],
    quickLinks: [
      { label: 'My Orders', route: '/orders' },
      { label: 'My Account', route: '/account' },
      { label: 'Addresses', route: '/addresses' }
    ]
  };
  
  socialLinks = [
    { icon: 'facebook', url: '#', label: 'Facebook' },
    { icon: 'alternate_email', url: '#', label: 'Twitter' },
    { icon: 'camera_alt', url: '#', label: 'Instagram' },
    { icon: 'smart_display', url: '#', label: 'YouTube' }
  ];
}
