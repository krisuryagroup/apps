import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delivery-range-dialog',
  template: `
    <div class="delivery-range-dialog">
      <div class="icon">⚠️</div>
      <h2>Delivery Range Notice</h2>
      <p>
        We currently deliver within <b>3 km</b> of the restaurant.<br />
        If your address is beyond this range, your order may be cancelled.
      </p>
      <p class="contact">
        👉 Please contact the restaurant directly if you need delivery outside 3
        km.
      </p>
      <div class="actions">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onProceed()">
          Proceed
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .delivery-range-dialog {
        text-align: center;
        padding: 2rem;
      }
      .icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }
      h2 {
        color: #ff9800;
        margin-bottom: 1rem;
      }
      .contact {
        color: #666;
        margin: 1rem 0;
      }
      .actions {
        display: flex;
        justify-content: center;
        gap: 1.5rem;
        margin-top: 2rem;
      }
      button {
        min-width: 100px;
      }
    `,
  ],
})
export class DeliveryRangeDialogComponent {
  dialogRef = inject<MatDialogRef<DeliveryRangeDialogComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);

  onCancel() {
    this.dialogRef.close(false);
  }
  onProceed() {
    this.dialogRef.close(true);
  }
}
