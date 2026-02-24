import { SearchRequestResponse } from '@core/models/request.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { finalize, switchMap, take } from 'rxjs/operators';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}
export type FilterOperatorTypes =
  | 'contains'
  | 'equals'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'in';

export class SearchRequest {
  page: number = 1;
  limit: number = 15;
  sortBy: string = 'createdAt';
  sortOrder: SortOrder = SortOrder.DESC;
  search: string = '';
  filters: Record<string, { value: any; operator?: FilterOperatorTypes }> = {};

  private reloadSubject = new BehaviorSubject<void>(undefined);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();

  constructor(
    private getAllPaginatedItems: (params: any) => Observable<SearchRequestResponse<any>>,
  ) {
    // Initial reload
    this.reload();
  }

  public loadData(): Observable<SearchRequestResponse<any>> {
    return this.reloadSubject.pipe(
      switchMap(() => {
        this.isLoadingSubject.next(true);
        return this.getAllPaginatedItems(this.toJSON()).pipe(
          finalize(() => this.isLoadingSubject.next(false)),
        );
      }),
    );
  }

  public reload(): void {
    this.reloadSubject.next();
  }

  private toJSON(): any {
    return {
      page: Math.max(1, this.page), // Ensure page is at least 1
      limit: Math.max(1, this.limit), // Ensure limit is at least 1
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      search: this.search,
      filters: this.filters,
    };
  }

  public addFilter(key: string, value: any): void {
    this.filters[key] = value;
  }

  public removeFilter(key: string): void {
    delete this.filters[key];
  }

  public clearFilters(): void {
    this.filters = {};
  }

  public updateSort(sortBy: string, order: number): void {
    this.sortBy = sortBy;
    this.sortOrder = order === 1 ? SortOrder.ASC : SortOrder.DESC;
  }

  public setPage(page: number): void {
    this.page = Math.max(1, page);
  }

  public setLimit(limit: number): void {
    this.limit = Math.max(1, limit);
    this.page = 1; // Reset to first page when changing limit
  }
}
