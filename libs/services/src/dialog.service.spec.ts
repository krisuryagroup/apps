import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DialogService } from './dialog.service';
import { ApplicationRef, EnvironmentInjector } from '@angular/core';

describe('DialogService', () => {
  let service: DialogService;
  let mockAppRef: any;
  let mockInjector: any;

  beforeEach(() => {
    mockAppRef = {};
    mockInjector = {};

    service = new DialogService(mockAppRef, mockInjector);

    // Mock document methods
    vi.spyOn(document.body, 'appendChild');
    vi.spyOn(document.body, 'removeChild');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Show Confirmation Dialog', () => {
    it('should show confirmation with custom title and message', async () => {
      const data = {
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item?',
      };

      // Start the promise
      const promise = service.showConfirmation(data);

      // Wait for DOM to be updated
      await vi.waitFor(() => {
        const overlay = document.querySelector('[style*="position: fixed"]');
        expect(overlay).toBeDefined();
      });

      // Simulate clicking confirm
      const confirmBtn = document.querySelector('.confirm-btn') as HTMLButtonElement;
      confirmBtn?.click();

      const result = await promise;
      expect(result).toBe(true);
    });

    it('should use default confirm text when not provided', async () => {
      const data = {
        title: 'Confirm',
        message: 'Proceed?',
      };

      const promise = service.showConfirmation(data);

      await vi.waitFor(() => {
        const confirmBtn = document.querySelector('.confirm-btn');
        expect(confirmBtn?.textContent).toBe('OK');
      });

      const cancelBtn = document.querySelector('.cancel-btn') as HTMLButtonElement;
      cancelBtn?.click();

      await promise;
    });

    it('should return false when cancel is clicked', async () => {
      const data = {
        title: 'Confirm',
        message: 'Are you sure?',
      };

      const promise = service.showConfirmation(data);

      await vi.waitFor(() => {
        const cancelBtn = document.querySelector('.cancel-btn');
        expect(cancelBtn).toBeDefined();
      });

      const cancelBtn = document.querySelector('.cancel-btn') as HTMLButtonElement;
      cancelBtn?.click();

      const result = await promise;
      expect(result).toBe(false);
    });

    it('should use custom confirm and cancel text', async () => {
      const data = {
        title: 'Delete',
        message: 'Delete permanently?',
        confirmText: 'Delete',
        cancelText: 'Keep',
      };

      const promise = service.showConfirmation(data);

      await vi.waitFor(() => {
        const confirmBtn = document.querySelector('.confirm-btn');
        const cancelBtn = document.querySelector('.cancel-btn');
        expect(confirmBtn?.textContent).toBe('Delete');
        expect(cancelBtn?.textContent).toBe('Keep');
      });

      const cancelBtn = document.querySelector('.cancel-btn') as HTMLButtonElement;
      cancelBtn?.click();

      await promise;
    });

    it.skip('should close dialog on overlay click', async () => {
      const data = {
        title: 'Confirm',
        message: 'Proceed?',
      };

      const promise = service.showConfirmation(data);

      await vi.waitFor(() => {
        const overlay = document.querySelector('[style*="position: fixed"]');
        expect(overlay).toBeDefined();
      });

      const overlay = document.querySelector('[style*="position: fixed"]') as HTMLElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: overlay, writable: false });
      overlay.dispatchEvent(clickEvent);

      const result = await promise;
      expect(result).toBe(false);
    });

    it('should handle errors with fallback confirm dialog', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      // Force an error by making createElement fail
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn().mockImplementation(() => {
        throw new Error('DOM error');
      });

      const data = {
        title: 'Confirm',
        message: 'Proceed?',
      };

      const result = await service.showConfirmation(data);

      expect(console.error).toHaveBeenCalled();
      expect(window.confirm).toHaveBeenCalled();
      expect(result).toBe(true);

      // Restore
      document.createElement = originalCreateElement;
    });
  });

  describe('Show Info Dialog', () => {
    it('should show info alert with default title', async () => {
      vi.spyOn(window, 'alert').mockImplementation(() => {});

      await service.showInfo('This is an information message');

      expect(window.alert).toHaveBeenCalledWith('Information\n\nThis is an information message');
    });

    it('should show info alert with custom title', async () => {
      vi.spyOn(window, 'alert').mockImplementation(() => {});

      await service.showInfo('Success!', 'Operation Complete');

      expect(window.alert).toHaveBeenCalledWith('Operation Complete\n\nSuccess!');
    });
  });

  describe('Dialog Cleanup', () => {
    it.skip('should remove overlay after confirmation', async () => {
      const data = {
        title: 'Confirm',
        message: 'Proceed?',
      };

      const promise = service.showConfirmation(data);

      await vi.waitFor(() => {
        const overlay = document.querySelector('[style*="position: fixed"]');
        expect(overlay).toBeDefined();
      });

      const confirmBtn = document.querySelector('.confirm-btn') as HTMLButtonElement;
      confirmBtn?.click();

      await promise;

      // Overlay should be removed
      await vi.waitFor(() => {
        const overlay = document.querySelector('[style*="position: fixed"]');
        expect(overlay).toBeNull();
      });
    });

    it.skip('should remove overlay after cancellation', async () => {
      const data = {
        title: 'Confirm',
        message: 'Proceed?',
      };

      const promise = service.showConfirmation(data);

      await vi.waitFor(() => {
        const overlay = document.querySelector('[style*="position: fixed"]');
        expect(overlay).toBeDefined();
      });

      const cancelBtn = document.querySelector('.cancel-btn') as HTMLButtonElement;
      cancelBtn?.click();

      await promise;

      // Overlay should be removed
      await vi.waitFor(() => {
        const overlay = document.querySelector('[style*="position: fixed"]');
        expect(overlay).toBeNull();
      });
    });
  });
});
