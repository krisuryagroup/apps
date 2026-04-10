import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { APP_SETTINGS_CACHE } from '../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class BusinessSelectionGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean {
    const selectedRestaurantId = localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID);
    
    if (!selectedRestaurantId) {
      // No restaurant/store selected, redirect to business selection
      this.router.navigate(['/business-selection']);
      return false;
    }
    
    return true;
  }
}
