import { TestBed } from '@angular/core/testing';
import { provideI18nForTests } from '@zitro/i18n';
import { DataTableComponent } from './data-table.component';

interface Row {
  id: string;
  name: string;
}

describe('DataTableComponent', () => {
  it('renders rows using the format function when provided', () => {
    TestBed.configureTestingModule({
      imports: [DataTableComponent],
      providers: [...provideI18nForTests()],
    });
    const fixture = TestBed.createComponent(DataTableComponent<Row>);
    fixture.componentRef.setInput('columns', [
      {
        key: 'name',
        labelKey: 'common.name',
        format: (r: Row) => r.name.toUpperCase(),
      },
    ]);
    fixture.componentRef.setInput('rows', [{ id: '1', name: 'coupon' }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('COUPON');
  });

  it('shows the empty state when there are no rows', () => {
    TestBed.configureTestingModule({
      imports: [DataTableComponent],
      providers: [...provideI18nForTests()],
    });
    const fixture = TestBed.createComponent(DataTableComponent);
    fixture.componentRef.setInput('columns', [
      { key: 'name', labelKey: 'common.name' },
    ]);
    fixture.componentRef.setInput('rows', []);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="data-table"]')
        .textContent,
    ).toContain('No results found');
  });

  it('emits pageChange when the next-page button is clicked', () => {
    TestBed.configureTestingModule({
      imports: [DataTableComponent],
      providers: [...provideI18nForTests()],
    });
    const fixture = TestBed.createComponent(DataTableComponent);
    fixture.componentRef.setInput('columns', [
      { key: 'name', labelKey: 'common.name' },
    ]);
    fixture.componentRef.setInput('rows', [{ name: 'a' }]);
    fixture.componentRef.setInput('pagination', {
      page: 1,
      pageSize: 10,
      total: 25,
    });
    fixture.detectChanges();

    let emittedPage: number | undefined;
    fixture.componentInstance.pageChange.subscribe(
      (p: number) => (emittedPage = p),
    );
    fixture.nativeElement
      .querySelector('[data-testid="data-table-next-page"]')
      .click();

    expect(emittedPage).toBe(2);
  });
});
