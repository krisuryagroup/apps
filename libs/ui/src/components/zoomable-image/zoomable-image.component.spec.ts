import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ZoomableImageComponent } from './zoomable-image.component';

describe('ZoomableImageComponent', () => {
  let component: ZoomableImageComponent;
  let fixture: ComponentFixture<ZoomableImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZoomableImageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ZoomableImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply default config', () => {
    expect(component.mergedConfig.width).toBe('100%');
    expect(component.mergedConfig.height).toBe('300px');
    expect(component.mergedConfig.minZoom).toBe(1);
    expect(component.mergedConfig.maxZoom).toBe(3);
  });

  it('should zoom in', () => {
    const initialZoom = component.zoomLevel;
    component.zoomIn();
    expect(component.zoomLevel).toBeGreaterThan(initialZoom);
  });

  it('should zoom out', () => {
    component.zoomLevel = 2;
    const initialZoom = component.zoomLevel;
    component.zoomOut();
    expect(component.zoomLevel).toBeLessThan(initialZoom);
  });

  it('should reset zoom', () => {
    component.zoomLevel = 2;
    component.imageZoomed = true;
    component.resetZoom();
    expect(component.zoomLevel).toBe(1);
    expect(component.imageZoomed).toBeFalsy();
  });

  it('should toggle zoom', () => {
    component.toggleImageZoom();
    expect(component.imageZoomed).toBeTruthy();
    expect(component.zoomLevel).toBe(2);
    
    component.toggleImageZoom();
    expect(component.imageZoomed).toBeFalsy();
    expect(component.zoomLevel).toBe(1);
  });

  it('should merge custom config with defaults', () => {
    component.config = { maxZoom: 5, showControls: false };
    component.ngOnChanges({ config: { currentValue: component.config, previousValue: {}, firstChange: false, isFirstChange: () => false } });
    
    expect(component.mergedConfig.maxZoom).toBe(5);
    expect(component.mergedConfig.showControls).toBe(false);
    expect(component.mergedConfig.width).toBe('100%'); // Should still have default
  });
});
