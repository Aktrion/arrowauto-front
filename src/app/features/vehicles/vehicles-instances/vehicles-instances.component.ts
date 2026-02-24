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
import { Product } from '@features/vehicles/models/vehicle.model';
import { SearchRequest } from '@shared/utils/search-request.class';

@Component({
  selector: 'app-vehicles-instances',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, LucideAngularModule, TranslateModule],
  templateUrl: './vehicles-instances.component.html',
})
export class VehiclesInstancesComponent implements OnInit {
  icons = ICONS;
  private instanceApi = inject(VehicleInstancesApiService);
  private clientService = inject(ClientService);
  private router = inject(Router);

  // SearchRequest manages state, pagination and fetching
  searchRequest = new SearchRequest((params) => this.instanceApi.findByPagination(params));

  vehicles = signal<Product[]>([]);
  clients = signal<any[]>([]);
  isLoading = this.searchRequest.isLoading$;
  totalItems = signal(0);
  totalPages = signal(1);
  isTableView = signal(true);

  // Search and Filter state (now mapped to SearchRequest)
  searchField: 'all' | 'plate' | 'make' | 'model' | 'client' | 'job' = 'all';
  statusFilter = signal('');

  constructor() {}

  ngOnInit() {
    this.clientService.fetchClients().subscribe((c) => this.clients.set(c));
    // SearchRequest handles its own reload/fetch cycle
    this.searchRequest.loadData().subscribe((response) => {
      this.vehicles.set(response.data ?? []);
      this.totalItems.set(response.total);
      this.totalPages.set(response.totalPages);
    });
  }

  toggleView(isTable: boolean): void {
    this.isTableView.set(isTable);
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
    if (status) {
      this.searchRequest.addFilter('statusId', { value: status, operator: 'equals' });
    } else {
      this.searchRequest.removeFilter('statusId');
    }
    this.searchRequest.setPage(1);
    this.searchRequest.reload();
  }

  onSearch(query: string) {
    this.searchRequest.search = query;
    this.searchRequest.setPage(1);
    this.searchRequest.reload();
  }

  setSearchField(field: 'all' | 'plate' | 'make' | 'model' | 'client' | 'job') {
    this.searchField = field;
    // In a real paginated API, we might need to adjust the backend filters
    // For now, we use the general search property of SearchRequest
    this.searchRequest.reload();
  }

  nextPage() {
    if (this.searchRequest.page >= this.totalPages()) return;
    this.searchRequest.setPage(this.searchRequest.page + 1);
    this.searchRequest.reload();
  }

  prevPage() {
    if (this.searchRequest.page <= 1) return;
    this.searchRequest.setPage(this.searchRequest.page - 1);
    this.searchRequest.reload();
  }

  openNewVehicleModal(): void {
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
