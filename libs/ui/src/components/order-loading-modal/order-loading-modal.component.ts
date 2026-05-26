import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderProcessingStage } from '@zitro/services';
import { UI_TEXT } from '@zitro/utils';
import { AppSettingsService } from '@zitro/services';

@Component({
  selector: 'app-order-loading-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-loading-modal.component.html',
  styleUrls: ['./order-loading-modal.component.scss'],
})
export class OrderLoadingModalComponent implements OnInit {
  @Input() isVisible = false;
  @Input() stage: OrderProcessingStage | null = null;

  private appSettingsService = inject(AppSettingsService);
  policyNoticeMessage = '';

  async ngOnInit() {
    // Load policy notice message from Firebase config
    this.policyNoticeMessage =
      await this.appSettingsService.getPolicyNoticeMessage();
  }

  getStageTitle(): string {
    if (!this.stage) return UI_TEXT.PROCESSING_ORDER;

    switch (this.stage.stage) {
      case 'validating':
        return UI_TEXT.VALIDATING + ' Order';
      case 'creating':
        return UI_TEXT.CREATING + ' Order';
      case 'processing':
        return UI_TEXT.PROCESSING + ' Payment';
      case 'confirming':
        return UI_TEXT.CONFIRMING + ' Order';
      case 'completed':
        return UI_TEXT.ORDER_COMPLETED;
      case 'error':
        return UI_TEXT.ORDER_FAILED;
      default:
        return UI_TEXT.PROCESSING_ORDER;
    }
  }

  async isCancellationPolicyEnabled(): Promise<boolean> {
    return await this.appSettingsService.isOrderCancellationEnabled();
  }

  isStageActive(stage: string): boolean {
    return this.stage?.stage === stage;
  }

  isStageCompleted(stage: string): boolean {
    if (!this.stage) return false;

    const stages = [
      'validating',
      'creating',
      'processing',
      'confirming',
      'completed',
    ];
    const currentIndex = stages.indexOf(this.stage.stage);
    const targetIndex = stages.indexOf(stage);

    return currentIndex > targetIndex;
  }
}
