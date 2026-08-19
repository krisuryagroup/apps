import { TestBed } from '@angular/core/testing';
import { provideI18nForTests } from '@zitro/i18n';
import { FormFieldComponent } from './form-field.component';

describe('FormFieldComponent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({
      imports: [FormFieldComponent],
      providers: [...provideI18nForTests()],
    });
    const fixture = TestBed.createComponent(FormFieldComponent);
    fixture.componentRef.setInput('labelKey', 'coupon.code');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the error message when set', () => {
    TestBed.configureTestingModule({
      imports: [FormFieldComponent],
      providers: [...provideI18nForTests()],
    });
    const fixture = TestBed.createComponent(FormFieldComponent);
    fixture.componentRef.setInput('labelKey', 'coupon.code');
    fixture.componentRef.setInput('error', 'validation.required');
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector(
      '[data-testid="form-field-error"]',
    );
    expect(error).toBeTruthy();
  });
});
