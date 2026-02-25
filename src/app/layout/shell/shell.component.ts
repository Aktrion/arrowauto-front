import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FootbarComponent } from '@layout/components/footbar/footbar.component';
import { HeaderComponent } from '@layout/components/header/header.component';
import { SidebarComponent } from '@layout/components/sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, FootbarComponent],
  templateUrl: './shell.component.html',
  styles: [
    `
      .sidebar-transition {
        transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
    `,
  ],
})
export class ShellComponent implements OnInit, OnDestroy {
  sidenavMode: 'side' | 'over' = 'side';
  visibleDrawer = true;
  isCollapsed = true;
  private destroy$ = new Subject<void>();

  isSidebarCollapsed = signal(true);

  constructor(
    private breakpointObserver: BreakpointObserver,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.handleResize();
  }

  handleSidenavToggle(): void {
    if (this.sidenavMode === 'over') {
      this.visibleDrawer = !this.visibleDrawer;
    } else {
      this.isCollapsed = !this.isCollapsed;
    }
    this.isSidebarCollapsed.set(this.isCollapsed);
  }

  private handleResize(): void {
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.ngZone.run(() => {
          if (result.matches) {
            this.sidenavMode = 'over';
            this.visibleDrawer = false;
            this.isCollapsed = false;
          } else {
            this.sidenavMode = 'side';
            this.visibleDrawer = true;
            this.isCollapsed = true;
          }
          this.isSidebarCollapsed.set(this.isCollapsed);
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
