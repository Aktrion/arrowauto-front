import { ChangeDetectorRef, Directive, inject, OnDestroy, OnInit } from '@angular/core';
import { SearchRequestResponse } from '@core/models/request.model';
import { finalize, Subject, Subscription, switchMap, take } from 'rxjs';
import { BaseCrudService } from '@core/services/base-crud.service';
import { SearchRequest } from '@shared/utils/search-request.class';
import { ColumnDef, DataGridConfig, GridState } from '@shared/components/data-grid/data-grid.interface';
import { Observable } from 'rxjs';

@Directive()
export abstract class BaseListDirective<T extends Record<string, any>, CreateDTO, UpdateDTO>
  implements OnInit, OnDestroy
{
  gridConfig: DataGridConfig<T>;
  searchRequest: SearchRequest;
  selectedItems: T[] = [];

  private readonly loadItems$ = new Subject<void>();
  private readonly subscription = new Subscription();
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    protected service: BaseCrudService<T, CreateDTO, UpdateDTO>,
    customPaginationGetter?: (params: any) => Observable<SearchRequestResponse<T>>,
  ) {
    const paginationGetter =
      customPaginationGetter || this.service.findByPagination.bind(this.service);
    this.searchRequest = new SearchRequest(paginationGetter);
    this.searchRequest.limit = 15;
    this.searchRequest.page = 1;

    this.gridConfig = {
      title: this.getTitle(),
      columnDefs: this.getColumnDefinitions(),
      rowData: [],
      pageSize: 15,
      total: 0,
      currentPage: 0,
      totalPages: 0,
      loading: false,
      selectable: true,
      showNewButton: false,
      showEditButton: false,
      showDeleteButton: false,
      showViewButton: false,
      storageKey: this.getStorageKey(),
    };
  }

  ngOnInit(): void {
    this.subscription.add(
      this.loadItems$
        .pipe(
          switchMap(() => {
            this.gridConfig.loading = true;
            this.searchRequest.reload();
            return this.searchRequest.loadData().pipe(
              take(1),
              finalize(() => {
                this.gridConfig.loading = false;
              }),
            );
          }),
        )
        .subscribe({
          next: (response) => {
            this.gridConfig = {
              ...this.gridConfig,
              title: this.getTitle(),
              columnDefs: this.getColumnDefinitions(),
              rowData: response.data || [],
              total: response.total ?? 0,
              currentPage: Math.max((response.page || 1) - 1, 0),
              totalPages: response.totalPages ?? 0,
              pageSize: response.limit || this.searchRequest.limit,
              loading: false,
            };
            this.cdr.detectChanges();
          },
          error: () => {
            this.gridConfig = { ...this.gridConfig, loading: false };
            this.cdr.detectChanges();
          },
        }),
    );

    this.loadItems();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  protected loadItems(): void {
    this.loadItems$.next();
  }

  handleGridStateChange(state: GridState): void {
    this.searchRequest.page = state.currentPage + 1;
    this.searchRequest.limit = state.pageSize;
    this.searchRequest.search = state.quickFilter || '';

    if (state.sortField && state.sortDirection) {
      this.searchRequest.updateSort(state.sortField, state.sortDirection === 'asc' ? 1 : -1);
    }

    this.searchRequest.clearFilters();
    Object.entries(state.filters || {}).forEach(([field, filter]) => {
      if (filter.value === null || filter.value === undefined || filter.value === '') return;
      this.searchRequest.addFilter(field, {
        value: filter.value,
        operator: filter.operator || 'contains',
      });
    });

    this.loadItems();
  }

  handleSelectionChanged(selectedRows: T[]): void {
    this.selectedItems = selectedRows;
  }

  handleCreate(): void {
    this.onCreate();
  }

  handleEdit(item: T): void {
    this.onEdit(item);
  }

  handleDelete(item: T): void {
    this.onDelete(item);
  }

  protected onCreate(): void {}

  protected onEdit(_item: T): void {}

  protected onDelete(item: T): void {
    const id = (item as any)._id || (item as any).id;
    if (!id) return;
    this.service.deleteOne(id).subscribe(() => this.loadItems());
  }

  protected getStorageKey(): string | undefined {
    return undefined;
  }

  protected abstract getColumnDefinitions(): ColumnDef[];
  protected abstract getTitle(): string;
}
