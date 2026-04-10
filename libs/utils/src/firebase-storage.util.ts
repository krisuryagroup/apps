/**
 * Utility functions for Firebase Storage operations
 */
export class FirebaseStorageUtil {
  
  /**
   * Converts Firebase Storage gs:// URLs to downloadable HTTPS URLs
   * @param gsUrl - The Firebase Storage gs:// URL
   * @returns Downloadable HTTPS URL
   */
  static convertStorageUrlToHttps(gsUrl: string): string {
    try {
      // Convert gs://bucket-name/path/to/file.jpg 
      // to https://firebasestorage.googleapis.com/v0/b/bucket-name/o/path%2Fto%2Ffile.jpg?alt=media
      
      if (!gsUrl || !gsUrl.startsWith('gs://')) {
        return gsUrl; // Return as-is if not a gs:// URL
      }

      // Extract bucket and path from gs://bucket-name/path/to/file
      const withoutGs = gsUrl.substring(5); // Remove 'gs://'
      const firstSlashIndex = withoutGs.indexOf('/');
      
      if (firstSlashIndex === -1) {
        console.error('Invalid Firebase Storage URL:', gsUrl);
        return gsUrl;
      }

      const bucket = withoutGs.substring(0, firstSlashIndex);
      const filePath = withoutGs.substring(firstSlashIndex + 1);
      
      // Encode the file path for URL
      const encodedPath = encodeURIComponent(filePath);
      
      // Construct the downloadable HTTPS URL
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
    } catch (error) {
      console.error('Error converting Firebase Storage URL:', error, gsUrl);
      return gsUrl; // Return original URL if conversion fails
    }
  }

  /**
   * Processes an array of items to convert their Firebase Storage URLs
   * @param items - Array of objects with imageURL property
   * @returns Array with converted URLs
   */
  static processImageUrls<T extends { imageURL: string }>(items: T[]): T[] {
    return items.map(item => ({
      ...item,
      imageURL: this.convertStorageUrlToHttps(item.imageURL)
    }));
  }
}
