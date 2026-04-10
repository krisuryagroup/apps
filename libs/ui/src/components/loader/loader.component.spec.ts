import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoaderComponent } from './loader.component';

describe('LoaderComponent', () => {
  let component: LoaderComponent;
  let fixture: ComponentFixture<LoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display loader when isLoading is true', () => {
    component.isLoading = true;
    fixture.detectChanges();
    const loader = fixture.nativeElement.querySelector('.loader-wrapper');
    expect(loader).toBeTruthy();
  });

  it('should hide loader when isLoading is false', () => {
    component.isLoading = false;
    fixture.detectChanges();
    const loader = fixture.nativeElement.querySelector('.loader-wrapper');
    expect(loader).toBeFalsy();
  });

  it('should render spinner by default', () => {
    component.type = 'spinner';
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('.spinner');
    expect(spinner).toBeTruthy();
  });

  it('should render skeleton when type is skeleton', () => {
    component.type = 'skeleton';
    fixture.detectChanges();
    const skeleton = fixture.nativeElement.querySelector('.skeleton');
    expect(skeleton).toBeTruthy();
  });

  it('should apply custom size', () => {
    component.size = 64;
    component.type = 'spinner';
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('.spinner');
    expect(spinner.getAttribute('width')).toBe('64');
  });

  it('should apply custom color', () => {
    component.color = '#ff0000';
    component.type = 'spinner';
    fixture.detectChanges();
    const path = fixture.nativeElement.querySelector('.spinner-path');
    expect(path.getAttribute('stroke')).toBe('#ff0000');
  });
});
