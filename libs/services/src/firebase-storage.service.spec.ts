import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FirebaseStorageService } from './firebase-storage.service';
import { FirebaseConfigService } from './firebase-config.service';
import { firstValueFrom } from 'rxjs';

describe('FirebaseStorageService', () => {
  let service: FirebaseStorageService;
  let mockFirebaseConfig: FirebaseConfigService;

  beforeEach(() => {
    mockFirebaseConfig = {} as any;

    vi.spyOn(console, 'warn').mockImplementation(() => {});

    service = new FirebaseStorageService(mockFirebaseConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(service).toBeDefined();
    });

    it('should initialize loading$ observable', async () => {
      const promise = new Promise<void>(resolve => {
        service.loading$.subscribe(loading => {
          expect(typeof loading).toBe('boolean');
          resolve();
        });
      });
      await promise;
    });
  });

  describe('uploadImage', () => {
    it('should return success result for mock upload', async () => {
      vi.useFakeTimers();
      
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const resultPromise = firstValueFrom(service.uploadImage(mockFile, 'test/path'));
      
      vi.advanceTimersByTime(2000);
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      
      vi.useRealTimers();
    });

    it('should set loading state during upload', async () => {
      vi.useFakeTimers();
      
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const loadingStates: boolean[] = [];
      
      service.loading$.subscribe(loading => loadingStates.push(loading));
      
      const uploadPromise = firstValueFrom(service.uploadImage(mockFile, 'test/path'));
      
      expect(loadingStates).toContain(true);
      
      vi.advanceTimersByTime(2000);
      await uploadPromise;
      
      expect(loadingStates).toContain(false);
      
      vi.useRealTimers();
    });

    it('should include file name in result URL', async () => {
      vi.useFakeTimers();
      
      const mockFile = new File(['test'], 'my-image.jpg', { type: 'image/jpeg' });
      const resultPromise = firstValueFrom(service.uploadImage(mockFile, 'test/path'));
      
      vi.advanceTimersByTime(2000);
      const result = await resultPromise;
      
      expect(result.url).toContain('my-image.jpg');
      
      vi.useRealTimers();
    });
  });

  describe('listImages', () => {
    it('should return mock images', async () => {
      vi.useFakeTimers();
      
      const resultPromise = firstValueFrom(service.listImages('test/path'));
      
      vi.advanceTimersByTime(1000);
      const result = await resultPromise;
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('fullPath');
      
      vi.useRealTimers();
    });

    it('should set loading state during list operation', async () => {
      vi.useFakeTimers();
      
      const loadingStates: boolean[] = [];
      service.loading$.subscribe(loading => loadingStates.push(loading));
      
      const listPromise = firstValueFrom(service.listImages('test/path'));
      
      expect(loadingStates).toContain(true);
      
      vi.advanceTimersByTime(1000);
      await listPromise;
      
      expect(loadingStates).toContain(false);
      
      vi.useRealTimers();
    });
  });

  describe('deleteImage', () => {
    it('should return success for mock deletion', async () => {
      vi.useFakeTimers();
      
      const resultPromise = firstValueFrom(service.deleteImage('test/path/image.jpg'));
      
      vi.advanceTimersByTime(1000);
      const result = await resultPromise;
      
      expect(result).toBe(true);
      
      vi.useRealTimers();
    });

    it('should set loading state during delete', async () => {
      vi.useFakeTimers();
      
      const loadingStates: boolean[] = [];
      service.loading$.subscribe(loading => loadingStates.push(loading));
      
      const deletePromise = firstValueFrom(service.deleteImage('test/path/image.jpg'));
      
      expect(loadingStates).toContain(true);
      
      vi.advanceTimersByTime(1000);
      await deletePromise;
      
      expect(loadingStates).toContain(false);
      
      vi.useRealTimers();
    });
  });

  describe('getDownloadURL', () => {
    it('should return placeholder URL', async () => {
      const result = await firstValueFrom(service.getDownloadURL('test/path/image.jpg'));
      
      expect(result).toContain('assets/placeholder');
      expect(result).toContain('image.jpg');
    });

    it('should extract filename from full path', async () => {
      const result = await firstValueFrom(service.getDownloadURL('very/long/path/to/my-file.png'));
      
      expect(result).toContain('my-file.png');
    });
  });

  describe('Loading state management', () => {
    it('should initialize with loading false', async () => {
      const promise = new Promise<void>(resolve => {
        service.loading$.subscribe(loading => {
          expect(loading).toBe(false);
          resolve();
        });
      });
      await promise;
    });

    it('should handle multiple operations correctly', async () => {
      vi.useFakeTimers();
      
      const loadingStates: boolean[] = [];
      service.loading$.subscribe(loading => loadingStates.push(loading));
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const upload1 = firstValueFrom(service.uploadImage(file, 'path1'));
      
      vi.advanceTimersByTime(2000);
      await upload1;
      
      const upload2 = firstValueFrom(service.uploadImage(file, 'path2'));
      vi.advanceTimersByTime(2000);
      await upload2;
      
      // Should have multiple true/false cycles
      expect(loadingStates.filter(s => s === true).length).toBeGreaterThan(1);
      
      vi.useRealTimers();
    });
  });
});
