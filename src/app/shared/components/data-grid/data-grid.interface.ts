import { FilterOperatorTypes } from '@shared/utils/search-request.class';

export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'custom';

export interface FilterValue {
  value: any;
  operator?: FilterOperatorTypes;
}

export interface ColumnDef {
  field: string;
  headerName: string;
  type?: ColumnType;
  sortable?: boolean;
  filterable?: boolean;
  dontTranslate?: boolean;
  hide?: boolean;
  cellRenderer?: (params: { value: any; data: any }) => string;
}

export interface CustomAction {
  /** Lucide icon key (e.g. 'Pencil', 'Trash2', 'Eye') - displayed as icon */
  icon?: string;
  /** Fallback label for tooltip when no icon, or tooltip text */
  iconLabel?: string;
  tooltip?: string;
  action: (row: any) => void;
  visible?: (row: any) => boolean;
}

export interface CustomHeaderButton {
  label: string;
  class?: string;
  loading?: boolean;
  disabled?: boolean;
  action: () => void;
}

export interface DataGridConfig<T> {
  title?: string;
  titleIcon?: string;
  rowData: T[];
  columnDefs: ColumnDef[];
  pageSize?: number;
  total?: number;
  currentPage?: number;
  totalPages?: number;
  loading?: boolean;
  selectable?: boolean;
  customActions?: CustomAction[];
  customHeaderButtons?: CustomHeaderButton[];
  showNewButton?: boolean;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  showViewButton?: boolean;
  storageKey?: string;
}

export interface GridState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filters: Record<string, FilterValue>;
  quickFilter?: string;
}
