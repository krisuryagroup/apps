import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CachedImageDirective } from './cached-image.directive';
import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ImageCacheService } from '../../core/services/image-cache.service';

describe('CachedImageDirective', () => {
  let directive: CachedImageDirective;
  let mockImageCacheService: any;
  let mockElementRef: ElementRef<HTMLImageElement>;
  let mockElement: any;

  beforeEach(() => {
    mockElement = {
      src: '',
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      },
      onload: null,
      onerror: null
    };

    mockElementRef = { nativeElement: mockElement } as ElementRef<HTMLImageElement>;

    mockImageCacheService = {
      getImage: vi.fn().mockResolvedValue('blob:mock-url')
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ElementRef, useValue: mockElementRef },
        { provide: ImageCacheService, useValue: mockImageCacheService }
      ]
    });

    directive = TestBed.runInInjectionContext(() => new CachedImageDirective());
  });

  describe('ngOnInit', () => {
    it('should load image on initialization', async () => {
      directive.cachedSrc = 'test-image.jpg';

      await directive.ngOnInit();

      expect(mockImageCacheService.getImage).toHaveBeenCalledWith('test-image.jpg');
      expect(mockElement.classList.add).toHaveBeenCalledWith('image-loading');
    });

    it('should set fallback image when cachedSrc is empty', async () => {
      directive.cachedSrc = '';
      directive.fallbackSrc = 'assets/default.png';

      await directive.ngOnInit();

      expect(mockElement.src).toBe('assets/default.png');
      expect(mockElement.classList.remove).toHaveBeenCalledWith('image-loading');
      expect(mockImageCacheService.getImage).not.toHaveBeenCalled();
    });

    it('should handle image loading success', async () => {
      directive.cachedSrc = 'test.jpg';
      mockImageCacheService.getImage.mockResolvedValue('blob:success');

      await directive.ngOnInit();
      
      expect(mockElement.src).toBe('blob:success');
      if (mockElement.onload) {
        mockElement.onload();
      }

      expect(mockElement.classList.remove).toHaveBeenCalledWith('image-loading');
    });

    it('should handle image loading error', async () => {
      directive.cachedSrc = 'test.jpg';
      directive.fallbackSrc = 'assets/fallback.png';
      mockImageCacheService.getImage.mockRejectedValue(new Error('Load failed'));

      await directive.ngOnInit();

      expect(mockElement.src).toBe('assets/fallback.png');
      expect(mockElement.classList.remove).toHaveBeenCalledWith('image-loading');
    });
  });

  describe('ngOnChanges', () => {
    it('should reload image when cachedSrc changes', async () => {
      const changes = {
        cachedSrc: {
          currentValue: 'new-image.jpg',
          previousValue: 'old-image.jpg',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      directive.cachedSrc = 'new-image.jpg';
      URL.revokeObjectURL = vi.fn();

      await directive.ngOnChanges(changes);

      expect(mockImageCacheService.getImage).toHaveBeenCalledWith('new-image.jpg');
    });

    it('should not reload image on first change', async () => {
      const changes = {
        cachedSrc: {
          currentValue: 'image.jpg',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      };

      directive.cachedSrc = 'image.jpg';

      await directive.ngOnChanges(changes);

      expect(mockImageCacheService.getImage).not.toHaveBeenCalled();
    });

    it('should revoke previous blob URL when changing image', async () => {
      (directive as any).currentBlobUrl = 'blob:old-url';
      const revokeURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      const changes = {
        cachedSrc: {
          currentValue: 'new-image.jpg',
          previousValue: 'old-image.jpg',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      directive.cachedSrc = 'new-image.jpg';

      await directive.ngOnChanges(changes);

      expect(revokeURLSpy).toHaveBeenCalledWith('blob:old-url');
    });
  });

  describe('ngOnDestroy', () => {
    it('should revoke blob URL on destroy', () => {
      (directive as any).currentBlobUrl = 'blob:test-url';
      const revokeURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      directive.ngOnDestroy();

      expect(revokeURLSpy).toHaveBeenCalledWith('blob:test-url');
    });

    it('should not call revokeObjectURL when no blob URL exists', () => {
      (directive as any).currentBlobUrl = null;
      const revokeURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      directive.ngOnDestroy();

      expect(revokeURLSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should set fallback image when image loading fails', async () => {
      directive.cachedSrc = 'broken-image.jpg';
      directive.fallbackSrc = 'assets/fallback.png';
      mockImageCacheService.getImage.mockResolvedValue('blob:test');

      await directive.ngOnInit();

      if (mockElement.onerror) {
        mockElement.onerror();
      }

      expect(mockElement.src).toBe('assets/fallback.png');
      expect(mockElement.classList.remove).toHaveBeenCalledWith('image-loading');
    });
  });

  describe('Custom Loading Class', () => {
    it('should use custom loading class', async () => {
      directive.cachedSrc = 'test.jpg';
      directive.loadingClass = 'custom-loading';

      await directive.ngOnInit();

      expect(mockElement.classList.add).toHaveBeenCalledWith('custom-loading');
    });
  });
});
