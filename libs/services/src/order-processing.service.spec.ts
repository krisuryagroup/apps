import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OrderProcessingService } from './order-processing.service';

describe('OrderProcessingService', () => {
  let service: OrderProcessingService;

  beforeEach(() => {
    service = new OrderProcessingService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with validating stage', () => {
      const stage = service.getCurrentStage();
      
      expect(stage.stage).toBe('validating');
      expect(stage.progress).toBe(0);
    });
  });

  describe('startProcessing', () => {
    it('should set stage to validating', () => {
      service.startProcessing();
      
      const stage = service.getCurrentStage();
      expect(stage.stage).toBe('validating');
    });
  });

  describe('updateStage', () => {
    it.each([
      ['validating', 20, 'Validating order details...'],
      ['creating', 40, 'Creating your order...'],
      ['processing', 60, 'Processing payment information...'],
      ['confirming', 80, 'Confirming order with restaurant...'],
      ['completed', 100, 'Order placed successfully!'],
      ['error', 0, 'Order processing failed']
    ])('should update to stage: %s', (stage: any, progress, message) => {
      service.updateStage(stage);
      
      const current = service.getCurrentStage();
      expect(current.stage).toBe(stage);
      expect(current.progress).toBe(progress);
      expect(current.message).toBe(message);
    });

    it('should use custom message when provided', () => {
      service.updateStage('validating', 'Custom validation message');
      
      const stage = service.getCurrentStage();
      expect(stage.message).toBe('Custom validation message');
    });

    it('should include error message when provided', () => {
      service.updateStage('error', undefined, 'Payment failed');
      
      const stage = service.getCurrentStage();
      expect(stage.error).toBe('Payment failed');
    });
  });

  describe('processStageWithDelay', () => {
    it('should process stage after delay', async () => {
      vi.useFakeTimers();
      
      const promise = service.processStageWithDelay('creating', 1000);
      
      expect(service.getCurrentStage().stage).toBe('creating');
      
      vi.advanceTimersByTime(1000);
      await promise;
      
      expect(service.getCurrentStage().stage).toBe('creating');
      
      vi.useRealTimers();
    });

    it('should use default delay when not specified', async () => {
      vi.useFakeTimers();
      
      const promise = service.processStageWithDelay('creating');
      
      vi.advanceTimersByTime(1000);
      await promise;
      
      expect(service.getCurrentStage().stage).toBe('creating');
      
      vi.useRealTimers();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      service.updateStage('completed');
      
      service.reset();
      
      const stage = service.getCurrentStage();
      expect(stage.stage).toBe('validating');
      expect(stage.progress).toBe(0);
      expect(stage.message).toBe('Preparing order...');
    });
  });

  describe('getCurrentStage', () => {
    it('should return current stage', () => {
      service.updateStage('processing');
      
      const stage = service.getCurrentStage();
      
      expect(stage).toHaveProperty('stage');
      expect(stage).toHaveProperty('message');
      expect(stage).toHaveProperty('progress');
    });
  });

  describe('processing$ observable', () => {
    it('should emit stage updates', async () => {
      const promise = new Promise<void>(resolve => {
        let emissionCount = 0;
        
        service.processing$.subscribe(stage => {
          emissionCount++;
          if (emissionCount === 2) {
            expect(stage.stage).toBe('creating');
            resolve();
          }
        });
      });
      
      service.updateStage('creating');
      await promise;
    });

    it('should emit multiple stage updates in sequence', async () => {
      const stages: string[] = [];
      const promise = new Promise<void>(resolve => {
        service.processing$.subscribe(stage => {
          stages.push(stage.stage);
          if (stages.length === 4) { // Initial + 3 updates
            expect(stages).toContain('validating');
            expect(stages).toContain('creating');
            expect(stages).toContain('completed');
            resolve();
          }
        });
      });
      
      service.updateStage('validating');
      service.updateStage('creating');
      service.updateStage('completed');
      await promise;
    });
  });

  describe('Stage progression', () => {
    it('should progress through all stages', async () => {
      const stages: any[] = ['validating', 'creating', 'processing', 'confirming', 'completed'];
      
      for (const stage of stages) {
        service.updateStage(stage);
        expect(service.getCurrentStage().stage).toBe(stage);
      }
    });

    it('should track progress correctly through stages', () => {
      service.updateStage('validating');
      expect(service.getCurrentStage().progress).toBe(20);
      
      service.updateStage('creating');
      expect(service.getCurrentStage().progress).toBe(40);
      
      service.updateStage('processing');
      expect(service.getCurrentStage().progress).toBe(60);
      
      service.updateStage('confirming');
      expect(service.getCurrentStage().progress).toBe(80);
      
      service.updateStage('completed');
      expect(service.getCurrentStage().progress).toBe(100);
    });
  });
});
