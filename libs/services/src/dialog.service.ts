import {
  Injectable,
  ComponentRef,
  ViewContainerRef,
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  inject,
} from '@angular/core';

export interface DialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);

  private dialogRef: ComponentRef<any> | null = null;

  /**
   * Show a confirmation dialog
   */
  async showConfirmation(data: DialogData): Promise<boolean> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      try {
        // For now, use browser confirm but with better styling
        const title = data.title || 'Confirm';
        const message = data.message;
        const confirmText = data.confirmText || 'OK';
        const cancelText = data.cancelText || 'Cancel';

        // Create a more styled confirmation using a custom approach
        const userChoice = await this.showNativeStyleConfirm(
          title,
          message,
          confirmText,
          cancelText,
        );
        resolve(userChoice);
      } catch (error) {
        console.error('Error showing confirmation dialog:', error);
        // Fallback to basic confirm
        const userChoice = confirm(`${data.title}\n\n${data.message}`);
        resolve(userChoice);
      }
    });
  }

  private async showNativeStyleConfirm(
    title: string,
    message: string,
    confirmText: string,
    cancelText: string,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Create a temporary overlay for the confirmation
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        border-radius: 16px;
        max-width: 320px;
        width: 90%;
        margin: 20px;
        box-shadow: 0 24px 38px 3px rgba(0, 0, 0, 0.14);
        overflow: hidden;
        animation: dialogSlideIn 0.3s ease;
      `;

      dialog.innerHTML = `
        <style>
          @keyframes dialogSlideIn {
            from { transform: scale(0.7); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .dialog-header { padding: 24px 24px 16px; border-bottom: 1px solid #e0e0e0; }
          .dialog-header h3 { margin: 0; font-size: 20px; font-weight: 600; color: #1a1a1a; text-align: center; }
          .dialog-body { padding: 16px 24px 24px; }
          .dialog-body p { margin: 0; font-size: 16px; line-height: 1.5; color: #666; text-align: center; }
          .dialog-actions { display: flex; border-top: 1px solid #e0e0e0; }
          .dialog-btn { flex: 1; padding: 16px 24px; border: none; font-size: 16px; font-weight: 500; cursor: pointer; transition: background-color 0.2s; }
          .dialog-btn:first-child { border-right: 1px solid #e0e0e0; }
          .cancel-btn { background: white; color: #666; }
          .cancel-btn:hover { background: #f5f5f5; }
          .confirm-btn { background: white; color: #FF3B30; font-weight: 600; }
          .confirm-btn:hover { background: #fff5f5; }
        </style>
        <div class="dialog-header">
          <h3>${title}</h3>
        </div>
        <div class="dialog-body">
          <p>${message}</p>
        </div>
        <div class="dialog-actions">
          <button class="dialog-btn cancel-btn">${cancelText}</button>
          <button class="dialog-btn confirm-btn">${confirmText}</button>
        </div>
      `;

      const cancelBtn = dialog.querySelector(
        '.cancel-btn',
      ) as HTMLButtonElement;
      const confirmBtn = dialog.querySelector(
        '.confirm-btn',
      ) as HTMLButtonElement;

      const cleanup = () => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      };

      cancelBtn.onclick = () => {
        cleanup();
        resolve(false);
      };

      confirmBtn.onclick = () => {
        cleanup();
        resolve(true);
      };

      // Close on overlay click
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      };

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Focus the confirm button for accessibility
      setTimeout(() => confirmBtn.focus(), 100);
    });
  }

  /**
   * Show an info dialog
   */
  async showInfo(message: string, title = 'Information'): Promise<void> {
    return new Promise((resolve) => {
      const dialogMessage = `${title}\n\n${message}`;
      alert(dialogMessage);
      resolve();
    });
  }
}
