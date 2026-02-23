import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'vehicles-instances',
        loadComponent: () =>
          import('./features/vehicles/vehicles-instances/vehicles-instances.component').then(
            (m) => m.VehiclesInstancesComponent,
          ),
      },
      {
        path: 'vehicles-database',
        loadComponent: () =>
          import('./features/vehicles/vehicles-database/vehicles-database.component').then(
            (m) => m.VehiclesDatabaseComponent,
          ),
      },
      {
        path: 'vehicles-instances/:id',
        loadComponent: () =>
          import('./features/vehicles/vehicles-instances/vehicle-instances-detail/vehicle-instance-detail.component').then(
            (m) => m.VehicleInstanceDetailComponent,
          ),
      },
      {
        path: 'inspection',
        loadComponent: () =>
          import('./features/inspection/inspection-list.component').then(
            (m) => m.InspectionListComponent,
          ),
      },
      {
        path: 'inspection/:vehicleInstanceId',
        loadComponent: () =>
          import('./features/inspection/inspection.component').then((m) => m.InspectionComponent),
      },
      {
        path: 'inspection-history',
        loadComponent: () =>
          import('./features/inspection-history/inspection-history.component').then(
            (m) => m.InspectionHistoryComponent,
          ),
      },
      {
        path: 'scheduling',
        loadComponent: () =>
          import('./features/scheduling/scheduling.component').then((m) => m.SchedulingComponent),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/tasks/tasks.component').then((m) => m.TasksComponent),
      },
      {
        path: 'pending-operations',
        loadComponent: () =>
          import('./features/pending-operations/pending-operations.component').then(
            (m) => m.PendingOperationsComponent,
          ),
      },
      {
        path: 'invoicing',
        loadComponent: () =>
          import('./features/invoicing/invoicing.component').then((m) => m.InvoicingComponent),
      },
      {
        path: 'estimation',
        loadComponent: () =>
          import('./features/estimation/estimation.component').then((m) => m.EstimationComponent),
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/clients/clients.component').then((m) => m.ClientsComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'customer-approvals',
        loadComponent: () =>
          import('./features/customer-approvals/customer-approvals.component').then(
            (m) => m.CustomerApprovalsComponent,
          ),
      },
    ],
  },
  {
    path: 'customer-portal',
    loadComponent: () =>
      import('./features/customer-portal/customer-portal.component').then(
        (m) => m.CustomerPortalComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
