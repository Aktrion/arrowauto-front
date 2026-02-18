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
        path: 'vehicles',
        loadComponent: () =>
          import('./features/vehicles/vehicles.component').then((m) => m.VehiclesComponent),
      },
      {
        path: 'vehicles/:id',
        loadComponent: () =>
          import('./features/vehicles/vehicle-detail/vehicle-detail.component').then(
            (m) => m.VehicleDetailComponent,
          ),
      },
      {
        path: 'inspection',
        loadComponent: () =>
          import('./features/inspection/inspection.component').then((m) => m.InspectionComponent),
      },
      {
        path: 'inspection/:productId',
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
        path: 'invoicing',
        loadComponent: () =>
          import('./features/invoicing/invoicing.component').then((m) => m.InvoicingComponent),
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
