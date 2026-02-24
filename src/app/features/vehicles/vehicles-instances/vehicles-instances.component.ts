import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '../../../shared/icons';
import { VehicleService } from '../services/vehicle.service';
import { ClientService } from '../../clients/services/client.service';
import { VehicleInstance, Product } from '../models/vehicle.model';
import { SearchRequest, FilterOperatorTypes } from '../../../shared/utils/search-request.class';

@Component({
  selector: 'app-vehicles-instances',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, LucideAngularModule, TranslateModule],
  templateUrl: './vehicles-instances.component.html',
})
export class VehiclesInstancesComponent implements OnInit {
  icons = ICONS;
  private vehicleService = inject(VehicleService);
  private clientService = inject(ClientService);
  private router = inject(Router);

  // SearchRequest manages state, pagination and fetching
  searchRequest = new SearchRequest((params) => this.vehicleService.searchVehicles(params));

  // State from Service
  vehicles = this.vehicleService.vehicles;
  isLoading = this.searchRequest.isLoading$;
  totalItems = signal(0);
  totalPages = signal(1);

  clients = this.clientService.clients;
  isTableView = signal(true);

  // Search and Filter state (now mapped to SearchRequest)
  searchField: 'all' | 'plate' | 'make' | 'model' | 'client' | 'job' = 'all';
  statusFilter = signal('');

  constructor() {}

  ngOnInit() {
    this.vehicleService.getStatusSteps().subscribe();

    // SearchRequest handles its own reload/fetch cycle
    this.searchRequest.loadData().subscribe((response) => {
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

  // Bridge to Service Helpers
  formatStatus = (s: string) => this.vehicleService.formatStatus(s);
  getStatusBadgeClass = (s: string) => this.vehicleService.getStatusBadgeClass(s);
  getProgress = (s: string) => this.vehicleService.getProgressStep(s);
  getProgressPercent = (s: string) => this.vehicleService.getProgressPercent(s);

  getClientName(clientId?: string): string {
    if (!clientId) return 'Unassigned';
    return this.clientService.getClientById(clientId)?.name ?? 'Unknown';
  }
}
