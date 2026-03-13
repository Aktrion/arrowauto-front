import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '@shared/icons';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { VehicleStatusUtils } from '@shared/utils/vehicle-status.utils';
import { ClientService } from '@features/clients/services/client.service';
import { map, startWith, switchMap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-vehicles-instances',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, LucideAngularModule, TranslateModule],
  templateUrl: './vehicles-instances.component.html',
})
export class VehiclesInstancesComponent {
  icons = ICONS;

  private instanceApi = inject(VehicleInstancesApiService);
  private clientService = inject(ClientService);
  private router = inject(Router);

  searchQuery = signal('');
  searchField = signal<'all' | 'plate' | 'make' | 'model' | 'client' | 'job'>('all');
  statusFilter = signal('');
  page = signal(1);
  isTableView = signal(true);

  params = computed(() => ({
    page: this.page(),
    search: this.searchQuery(),
    searchField: this.searchField(),
    filters: this.statusFilter()
      ? [{ field: 'statusId', value: this.statusFilter(), operator: 'equals' }]
      : [],
  }));

  private vehiclesInstances = toSignal(
    toObservable(this.params).pipe(
      switchMap((params) =>
        this.instanceApi.findByPagination(params).pipe(
          map((data) => ({
            loading: false,
            data,
          })),
          startWith({
            loading: true,
            data: undefined,
          }),
        ),
      ),
    ),
    { requireSync: false },
  );
  vehicles = computed(() => this.vehiclesInstances()?.data?.data ?? []);
  totalItems = computed(() => this.vehiclesInstances()?.data?.total ?? 0);
  totalPages = computed(() => this.vehiclesInstances()?.data?.totalPages ?? 1);
  isLoading = computed(() => this.vehiclesInstances()?.loading ?? true);

  clients = toSignal(this.clientService.fetchClients(), { initialValue: [] });

  toggleView(isTable: boolean) {
    this.isTableView.set(isTable);
  }

  setStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.page.set(1);
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
    this.page.set(1);
  }

  setSearchField(field: 'all' | 'plate' | 'make' | 'model' | 'client' | 'job') {
    this.searchField.set(field);
    this.page.set(1);
  }

  nextPage() {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
    }
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
    }
  }

  openNewVehicleModal() {
    this.router.navigate(['/vehicles-instances/new']);
  }

  formatStatus = (s: string) => VehicleStatusUtils.formatStatus(s);
  getStatusBadgeClass = (s: string) => VehicleStatusUtils.getStatusBadgeClass(s);
  getProgress = (s: string) => VehicleStatusUtils.getProgressStep(s);
  getProgressPercent = (s: string) => VehicleStatusUtils.getProgressPercent(s);

  getClientName(clientId?: string): string {
    if (!clientId) return 'Unassigned';
    return this.clientService.getClientById(this.clients(), clientId)?.name ?? 'Unknown';
  }
}
