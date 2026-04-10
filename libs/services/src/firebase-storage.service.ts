import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FirebaseConfigService } from './firebase-config.service';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface StorageItem {
  name: string;
  fullPath: string;
  downloadURL?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseStorageService {
  private isLoading = new BehaviorSubject<boolean>(false);
  public loading$ = this.isLoading.asObservable();

  constructor(private firebaseConfig: FirebaseConfigService) {}

  /**
   * Upload an image to Firebase Storage
   */
  uploadImage(file: File, path: string): Observable<ImageUploadResult> {
    this.isLoading.next(true);
    
    return new Observable(observer => {
      try {
        // For development, we'll implement a fallback approach
        // In production, this should connect to Firebase Storage properly
        
        // Simulate upload for development
        setTimeout(() => {
          this.isLoading.next(false);
          
          // Create a mock result for development
          const mockResult: ImageUploadResult = {
            success: true,
            url: `assets/placeholder/${file.name}`
          };
          
          observer.next(mockResult);
          observer.complete();
        }, 2000);
        
      } catch (error) {
        this.isLoading.next(false);
        observer.next({
          success: false,
          error: 'Upload failed: ' + (error as Error).message
        });
        observer.complete();
      }
    });
  }

  /**
   * List all images in a Firebase Storage path
   */
  listImages(path: string): Observable<StorageItem[]> {
    this.isLoading.next(true);
    
    return new Observable(observer => {
      try {
        // For development, return mock data
        // In production, implement Firebase Storage listAll
        
        setTimeout(() => {
          this.isLoading.next(false);
          
          // Mock data for development
          const mockItems: StorageItem[] = [
            {
              name: 'placeholder1.jpg',
              fullPath: `${path}/placeholder1.jpg`,
              downloadURL: 'assets/placeholder/placeholder1.jpg'
            },
            {
              name: 'placeholder2.jpg', 
              fullPath: `${path}/placeholder2.jpg`,
              downloadURL: 'assets/placeholder/placeholder2.jpg'
            }
          ];
          
          observer.next(mockItems);
          observer.complete();
        }, 1000);
        
      } catch (error) {
        this.isLoading.next(false);
        observer.next([]);
        observer.complete();
      }
    });
  }

  /**
   * Delete an image from Firebase Storage
   */
  deleteImage(fullPath: string): Observable<boolean> {
    this.isLoading.next(true);
    
    return new Observable(observer => {
      try {
        // For development, simulate deletion
        setTimeout(() => {
          this.isLoading.next(false);
          observer.next(true);
          observer.complete();
        }, 1000);
        
      } catch (error) {
        this.isLoading.next(false);
        observer.next(false);
        observer.complete();
      }
    });
  }

  /**
   * Get download URL for a file
   */
  getDownloadURL(fullPath: string): Observable<string> {
    return new Observable(observer => {
      try {
        // For development, return placeholder URL
        observer.next(`assets/placeholder/${fullPath.split('/').pop()}`);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Handle CORS issues by using alternative methods
   */
  private handleCORSError(error: any): Observable<any> {
    console.warn('CORS error detected, using fallback method:', error);
    
    // Implement fallback logic here
    // This could involve using a proxy server or alternative storage method
    
    return new Observable(observer => {
      observer.next(null);
      observer.complete();
    });
  }
}
