import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface OrderProcessingStage {
  stage:
    | 'validating'
    | 'creating'
    | 'processing'
    | 'confirming'
    | 'completed'
    | 'error';
  message: string;
  progress: number;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrderProcessingService {
  private processingSubject = new BehaviorSubject<OrderProcessingStage>({
    stage: 'validating',
    message: 'Preparing order...',
    progress: 0,
  });

  public processing$ = this.processingSubject.asObservable();

  private stages: Record<
    OrderProcessingStage['stage'],
    { message: string; progress: number }
  > = {
    validating: { message: 'Validating order details...', progress: 20 },
    creating: { message: 'Creating your order...', progress: 40 },
    processing: { message: 'Processing payment information...', progress: 60 },
    confirming: {
      message: 'Confirming order with restaurant...',
      progress: 80,
    },
    completed: { message: 'Order placed successfully!', progress: 100 },
    error: { message: 'Order processing failed', progress: 0 },
  };

  startProcessing(): void {
    this.updateStage('validating');
  }

  updateStage(
    stage: OrderProcessingStage['stage'],
    customMessage?: string,
    error?: string,
  ): void {
    const stageInfo = this.stages[stage];
    this.processingSubject.next({
      stage,
      message: customMessage || stageInfo.message,
      progress: stageInfo.progress,
      error,
    });
  }

  async processStageWithDelay(
    stage: OrderProcessingStage['stage'],
    minDelay = 1000,
  ): Promise<void> {
    this.updateStage(stage);
    // Add minimum delay to make the process feel more natural
    await this.delay(minDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  reset(): void {
    this.processingSubject.next({
      stage: 'validating',
      message: 'Preparing order...',
      progress: 0,
    });
  }

  getCurrentStage(): OrderProcessingStage {
    return this.processingSubject.value;
  }
}
