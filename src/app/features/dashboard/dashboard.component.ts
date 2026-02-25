import { AfterViewInit, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { licensePlateBadge } from '@shared/utils/license-plate.utils';
import { VehicleStatusUtils } from '@shared/utils/vehicle-status.utils';
import { UserService } from '@core/services/user.service';
import { Client } from '@features/clients/models/client.model';
import { ClientService } from '@features/clients/services/client.service';
import { DashboardService } from '@features/dashboard/services/dashboard.service';
import { ICONS } from '@shared/icons';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import {
  ColumnDef,
  DataGridConfig,
  GridState,
} from '@shared/components/data-grid/data-grid.interface';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DecimalPipe,
    LucideAngularModule,
    TranslateModule,
    FormsModule,
    DataGridComponent,
    SelectComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, AfterViewInit {
  icons = ICONS;
  private userService = inject(UserService);
  private clientService = inject(ClientService);
  private dashboardService = inject(DashboardService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  private vehiclesSignal = signal<any[]>([]);
  private statsSignal = signal<any>({
    activeVehicles: 0,
    pendingInspections: 0,
    awaitingApproval: 0,
    completedToday: 0,
    totalRevenue: 0,
    operatorsAvailable: 0,
  });

  ngOnInit(): void {
    this.dashboardService.fetchDashboard().subscribe((data) => {
      this.vehiclesSignal.set(data.vehicles);
      this.statsSignal.set(data.stats);
      this.gridConfig = {
        ...this.gridConfig,
        rowData: (data.vehicles || []).slice(0, 5),
        total: Math.min((data.vehicles || []).length, 5),
        currentPage: 0,
        totalPages: 1,
        loading: false,
      };
    });
    this.clientService.fetchClients().subscribe((c) => this.clients.set(c));
    this.userService.fetchUsers().subscribe((u) => this.users.set(u));
  }

  searchQuery = '';
  searchField = 'plate';
  get searchFieldOptions(): SelectOption[] {
    return [
      { label: this.translate.instant('DASHBOARD.PLATE_VIN'), value: 'plate' },
      { label: this.translate.instant('DASHBOARD.JOB_NUMBER'), value: 'job' },
    ];
  }
  isSearching = false;

  readonly vehicles = this.vehiclesSignal.asReadonly();
  users = signal<any[]>([]);
  operators = computed(() => this.userService.getOperators(this.users()));
  readonly stats = this.statsSignal.asReadonly();

  private clients = signal<Client[]>([]);
  gridConfig: DataGridConfig<any> = {
    title: 'DASHBOARD.RECENT_VEHICLES.TITLE',
    titleIcon: 'Car',
    columnDefs: [],
    rowData: [],
    pageSize: 5,
    total: 0,
    currentPage: 0,
    totalPages: 1,
    loading: true,
    selectable: false,
    showNewButton: false,
    showEditButton: false,
    showDeleteButton: false,
    storageKey: 'dashboard_recent_vehicles_grid',
  };

  getClientName(clientId?: string): string {
    if (!clientId) return this.translate.instant('DASHBOARD.UNASSIGNED');
    return this.clientService.getClientById(this.clients(), clientId)?.name ?? this.translate.instant('DASHBOARD.UNKNOWN');
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatStatus = (s: string) => VehicleStatusUtils.formatStatus(s);
  getStatusBadgeClass = (s: string) => VehicleStatusUtils.getStatusBadgeClass(s);
  getProgress = (s: string) => VehicleStatusUtils.getProgressStep(s);

  quickSearch(): void {
    if (!this.searchQuery.trim()) return;
    this.isSearching = true;

    // Simulate search delay for UX
    setTimeout(() => {
      this.isSearching = false;
      const lowerQuery = this.searchQuery.trim().toLowerCase();

      const found = this.vehicles().find((v) => {
        if (this.searchField === 'plate') {
          return (
            v.vehicle?.licensePlate?.toLowerCase().includes(lowerQuery) ||
            v.vehicle?.vin?.toLowerCase().includes(lowerQuery)
          );
        } else {
          return v.code?.toLowerCase().includes(lowerQuery);
        }
      });

      if (found) {
        this.router.navigate(['/vehicles-instances', found._id]);
      } else {
        // Just navigate to the list with query params
        this.router.navigate(['/vehicles-instances'], { queryParams: { q: lowerQuery } });
      }
    }, 400);
  }

  handleRecentStateChange(_state: GridState): void {}

  ngAfterViewInit(): void {
    this.gridConfig = {
      ...this.gridConfig,
      columnDefs: this.getRecentColumns(),
    };
  }

  private getRecentColumns(): ColumnDef[] {
    return [
      {
        field: 'vehicle.licensePlate',
        headerName: 'DASHBOARD.TABLE.VEHICLE',
        type: 'string',
        sortable: false,
        filterable: false,
        cellRenderer: ({ data }) => {
          const plate = data?.vehicle?.licensePlate || '';
          const makeModel = `${data?.vehicle?.make || ''} ${data?.vehicle?.model || ''}`.trim();
          const plateBadge = licensePlateBadge(plate);
          const parts = [plateBadge, makeModel].filter(Boolean);
          return parts.length ? parts.join(' ') : '-';
        },
      },
      {
        field: 'customerId',
        headerName: 'DASHBOARD.TABLE.CLIENT',
        type: 'string',
        sortable: false,
        filterable: false,
        cellRenderer: ({ data }) => this.getClientName(data?.customerId),
      },
      {
        field: 'status',
        headerName: 'DASHBOARD.TABLE.STATUS',
        type: 'string',
        sortable: false,
        filterable: false,
        cellRenderer: ({ value }) => VehicleStatusUtils.statusBadge(value),
      },
      {
        field: 'status',
        headerName: 'DASHBOARD.TABLE.PROGRESS',
        type: 'number',
        sortable: false,
        filterable: false,
        cellRenderer: ({ value }) => `${this.getProgress(value)}/4`,
      },
    ];
  }
}
