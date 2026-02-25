import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '@shared/icons';
import { GridStateStorageService } from '@shared/services/grid-state-storage.service';
import { FilterOperatorTypes } from '@shared/utils/search-request.class';
import {
  ColumnDef,
  ColumnType,
  CustomAction,
  CustomHeaderButton,
  DataGridConfig,
  GridState,
} from '@shared/components/data-grid/data-grid.interface';
import { Subject, debounceTime, distinctUntilChanged, map, merge, takeUntil } from 'rxjs';

@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './data-grid.component.html',
})
export class DataGridComponent implements OnInit, OnChanges, OnDestroy {
  @Input() config!: DataGridConfig<any>;
  @Output() stateChange = new EventEmitter<GridState>();
  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() create = new EventEmitter<void>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();

  icons = ICONS;
  selectedItems: any[] = [];
  allSelected = false;
  showFilterSidebar = false;

  currentPage = 0;
  pageSize = 15;
  totalItems = 0;
  totalPages = 0;

  sortField?: string;
  sortDirection?: 'asc' | 'desc';

  quickFilter = '';
  filters: Record<string, { value: any; operator?: FilterOperatorTypes }> = {};

  private searchSubject = new Subject<string>();
  private filterSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private gridStateStorage: GridStateStorageService,
  ) {
    this.setupDebounce();
  }

  ngOnInit(): void {
    this.initializeFilters();
    this.updateFromConfig();
    this.restoreQuickFilter();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.updateFromConfig();
      this.initializeFilters();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get displayedRows(): any[] {
    return this.config?.rowData ?? [];
  }

  get skeletonRows(): number[] {
    return Array.from({ length: 12 }, (_, i) => i);
  }

  get startIndex(): number {
    return this.currentPage * this.pageSize;
  }

  get endIndex(): number {
    const end = (this.currentPage + 1) * this.pageSize;
    return this.totalItems ? Math.min(end, this.totalItems) : 0;
  }

  get activeFilterCount(): number {
    return Object.values(this.filters).filter((filter) => {
      const value = filter.value;
      return value !== null && value !== undefined && value !== '';
    }).length;
  }

  onQuickFilterInput(value: string): void {
    this.searchSubject.next(value);
  }

  clearQuickFilter(): void {
    this.quickFilter = '';
    this.currentPage = 0;
    this.saveQuickFilter();
    this.emitState();
  }

  toggleFilterSidebar(event?: MouseEvent): void {
    event?.stopPropagation();
    this.showFilterSidebar = !this.showFilterSidebar;
  }

  onFilterChange(): void {
    this.filterSubject.next();
  }

  clearFilters(): void {
    Object.keys(this.filters).forEach((key) => {
      this.filters[key].value = null;
    });
    this.emitState();
  }

  onSort(field: string): void {
    if (this.sortField === field) {
      if (this.sortDirection === 'asc') {
        this.sortDirection = 'desc';
      } else if (this.sortDirection === 'desc') {
        this.sortField = undefined;
        this.sortDirection = undefined;
      } else {
        this.sortDirection = 'asc';
      }
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.emitState();
  }

  onPageChange(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.emitState();
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.emitState();
  }

  onPageSizeSelection(value: number): void {
    this.pageSize = value;
    this.onPageSizeChange();
  }

  toggleSelectAll(): void {
    this.allSelected = !this.allSelected;
    this.selectedItems = this.allSelected ? [...this.displayedRows] : [];
    this.selectionChange.emit(this.selectedItems);
  }

  toggleSelect(row: any): void {
    const rowId = row?._id || row?.id;
    const index = this.selectedItems.findIndex((item) => (item?._id || item?.id) === rowId);
    if (index === -1) {
      this.selectedItems.push(row);
    } else {
      this.selectedItems.splice(index, 1);
    }
    this.allSelected = this.selectedItems.length === this.displayedRows.length;
    this.selectionChange.emit(this.selectedItems);
  }

  isSelected(row: any): boolean {
    const rowId = row?._id || row?.id;
    return this.selectedItems.some((item) => (item?._id || item?.id) === rowId);
  }

  onCreate(): void {
    this.create.emit();
  }

  onEdit(row: any): void {
    this.edit.emit(row);
  }

  onDelete(row: any): void {
    this.delete.emit(row);
  }

  onCustomAction(action: CustomAction, row: any): void {
    action.action(row);
  }

  getActionIcon(action: CustomAction): unknown {
    if (!action.icon) return null;
    const icon = (this.icons as Record<string, unknown>)[action.icon];
    return icon ?? null;
  }

  getTitleIcon(): unknown {
    if (!this.config?.titleIcon) return null;
    return (this.icons as Record<string, unknown>)[this.config.titleIcon] ?? null;
  }

  getHeaderButtonIcon(button: CustomHeaderButton): unknown {
    if (!button.icon) return null;
    return (this.icons as Record<string, unknown>)[button.icon] ?? null;
  }

  onCustomHeaderButtonClick(button: CustomHeaderButton): void {
    button.action();
  }

  formatValue(row: any, col: ColumnDef): string {
    const value = this.getNestedValue(row, col.field);
    if (value === null || value === undefined) return '';

    switch (col.type) {
      case 'date':
        return new Date(value).toLocaleDateString('en-GB');
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  }

  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  private updateFromConfig(): void {
    if (!this.config) return;
    this.pageSize = this.config.pageSize || 15;
    this.totalItems = this.config.total ?? this.totalItems;
    this.currentPage = this.config.currentPage ?? this.currentPage;
    this.totalPages = this.config.totalPages ?? this.totalPages;
  }

  private setupDebounce(): void {
    merge(
      this.searchSubject.pipe(map((value) => ({ type: 'search' as const, value }))),
      this.filterSubject.pipe(map(() => ({ type: 'filter' as const }))),
    )
      .pipe(takeUntil(this.destroy$), debounceTime(350), distinctUntilChanged())
      .subscribe((change) => {
        this.currentPage = 0;
        if (change.type === 'search') {
          this.quickFilter = change.value;
          this.saveQuickFilter();
        }
        this.emitState();
      });
  }

  private initializeFilters(): void {
    if (!this.config?.columnDefs?.length) return;
    this.config.columnDefs.forEach((col) => {
      if (col.filterable && !this.filters[col.field]) {
        this.filters[col.field] = {
          value: null,
          operator: this.getDefaultOperator(col.type),
        };
      }
    });
  }

  private getDefaultOperator(type?: ColumnType): FilterOperatorTypes {
    if (type === 'number') return 'equals';
    if (type === 'boolean') return 'equals';
    if (type === 'date') return 'equals';
    return 'contains';
  }

  private emitState(): void {
    this.stateChange.emit({
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      totalItems: this.totalItems,
      sortField: this.sortField,
      sortDirection: this.sortDirection,
      filters: this.filters,
      quickFilter: this.quickFilter,
    });
  }

  private get storageKey(): string | undefined {
    return this.config?.storageKey;
  }

  private saveQuickFilter(): void {
    if (!this.storageKey) return;
    this.gridStateStorage.saveQuickFilter(this.storageKey, this.quickFilter);
  }

  private restoreQuickFilter(): void {
    if (!this.storageKey) return;
    const saved = this.gridStateStorage.getQuickFilter(this.storageKey);
    if (!saved) return;
    this.quickFilter = saved;
    this.emitState();
  }
}
