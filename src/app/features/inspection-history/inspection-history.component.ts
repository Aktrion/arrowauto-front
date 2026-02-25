import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { ColumnDef, DataGridConfig, GridState } from '@shared/components/data-grid/data-grid.interface';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface InspectionHistoryItem {
  vehicleId: string;
  vehicleInstanceId: string;
  plate: string;
  makeModel: string;
  pointsCount: number;
  okCount: number;
  warningCount: number;
  defectCount: number;
  totalCost: number;
  updatedAt?: Date;
}

@Component({
  selector: 'app-inspection-history',
  standalone: true,
  imports: [DataGridComponent],
  template: `
    <app-data-grid
      [config]="gridConfig"
      (stateChange)="handleGridStateChange($event)"
      (edit)="openInspection($event)"
    />
  `,
})
export class InspectionHistoryComponent implements OnInit, OnDestroy {
  private readonly instanceApi = inject(VehicleInstancesApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly load$ = new Subject<GridState>();
  private subscription?: Subscription;

  gridConfig: DataGridConfig<InspectionHistoryItem> = {
    title: 'INSPECTION_HISTORY.TITLE',
    titleIcon: 'Clock',
    columnDefs: this.getColumnDefinitions(),
    rowData: [],
    pageSize: 15,
    total: 0,
    currentPage: 0,
    totalPages: 0,
    loading: false,
    selectable: false,
    showNewButton: false,
    showEditButton: true,
    showDeleteButton: false,
    storageKey: 'inspection_history_grid',
  };

  ngOnInit(): void {
    this.subscription = this.load$
      .pipe(
        switchMap((state) => {
          this.gridConfig = { ...this.gridConfig, loading: true };
          this.cdr.detectChanges();
          const page = (state.currentPage ?? 0) + 1;
          const limit = state.pageSize ?? 15;
          const sortBy = state.sortField || 'updatedAt';
          const sortOrder = state.sortDirection === 'asc' ? 'asc' : 'desc';
          const search = (state.quickFilter || '').trim();

          return this.instanceApi.searchInspectionHistory({
            page,
            limit,
            sortBy,
            sortOrder,
            search: search || undefined,
          }).pipe(
            catchError(() =>
              of({
                data: [],
                total: 0,
                totalPages: 0,
                page: 1,
                limit,
              }),
            ),
            finalize(() => {
              this.gridConfig = { ...this.gridConfig, loading: false };
              this.cdr.detectChanges();
            }),
          );
        }),
      )
      .subscribe({
        next: (res) => {
          const data = (res.data ?? []).map((d: Record<string, unknown>): InspectionHistoryItem => ({
            vehicleId: String(d['vehicleId'] ?? ''),
            vehicleInstanceId: String(d['vehicleInstanceId'] ?? ''),
            plate: String(d['plate'] ?? 'N/A'),
            makeModel: String(d['makeModel'] ?? 'Unknown'),
            pointsCount: Number(d['pointsCount'] ?? 0),
            okCount: Number(d['okCount'] ?? 0),
            warningCount: Number(d['warningCount'] ?? 0),
            defectCount: Number(d['defectCount'] ?? 0),
            totalCost: Number(d['totalCost'] ?? 0),
            updatedAt: d['updatedAt'] ? new Date(d['updatedAt'] as string) : undefined,
          }));
          this.gridConfig = {
            ...this.gridConfig,
            rowData: data,
            total: res.total ?? 0,
            totalPages: res.totalPages ?? 0,
            currentPage: Math.max(0, (res.page ?? 1) - 1),
            pageSize: res.limit ?? 15,
            loading: false,
          };
          this.cdr.detectChanges();
        },
        error: () => {
          this.gridConfig = {
            ...this.gridConfig,
            rowData: [],
            total: 0,
            totalPages: 1,
            currentPage: 0,
            loading: false,
          };
          this.cdr.detectChanges();
        },
      });

    setTimeout(() => {
      this.load$.next({
        currentPage: 0,
        pageSize: 15,
        totalItems: 0,
        filters: {},
        quickFilter: '',
      });
    }, 0);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  handleGridStateChange(state: GridState): void {
    this.load$.next(state);
  }

  openInspection(item?: InspectionHistoryItem): void {
    const id = item?.vehicleInstanceId;
    if (!id) return;
    this.router.navigate(['/inspection', id]);
  }

  private getColumnDefinitions(): ColumnDef[] {
    return [
      { field: 'plate', headerName: 'VEHICLES.TABLE.LICENSE_PLATE', type: 'string', sortable: true, filterable: true },
      { field: 'makeModel', headerName: 'VEHICLES.TABLE.VEHICLE', type: 'string', sortable: true, filterable: true },
      { field: 'pointsCount', headerName: 'INSPECTION_HISTORY.POINTS', type: 'number', sortable: true, filterable: false },
      { field: 'okCount', headerName: 'INSPECTION_HISTORY.OK', type: 'number', sortable: true, filterable: false },
      { field: 'warningCount', headerName: 'INSPECTION_HISTORY.WARNING', type: 'number', sortable: true, filterable: false },
      { field: 'defectCount', headerName: 'INSPECTION_HISTORY.DEFECT', type: 'number', sortable: true, filterable: false },
      {
        field: 'totalCost',
        headerName: 'INSPECTION_HISTORY.TOTAL_COST',
        type: 'number',
        sortable: true,
        filterable: false,
        cellRenderer: ({ value }) => `${Number(value || 0).toFixed(2)}`,
      },
      { field: 'updatedAt', headerName: 'COMMON.UPDATED_AT', type: 'date', sortable: true, filterable: false },
    ];
  }
}
