import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, HostListener, NgZone, OnDestroy, OnInit, signal } from '@angular/core';
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
  isCollapsed = false;
  private destroy$ = new Subject<void>();

  isSidebarCollapsed = signal(false);

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

  /** Breakpoint aligned with Tailwind lg (1024px): mobile when width < 1024px */
  private static readonly MOBILE_BREAKPOINT = '(max-width: 1023.98px)';

  @HostListener('window:resize')
  onWindowResize(): void {
    this.applyBreakpointState(window.matchMedia(ShellComponent.MOBILE_BREAKPOINT).matches);
  }

  private applyBreakpointState(isMobile: boolean): void {
    this.ngZone.run(() => {
      if (isMobile) {
        this.sidenavMode = 'over';
        this.visibleDrawer = false;
        this.isCollapsed = false;
      } else {
        this.sidenavMode = 'side';
        this.visibleDrawer = true;
        this.isCollapsed = false;
      }
      this.isSidebarCollapsed.set(this.isCollapsed);
    });
  }

  private handleResize(): void {
    this.applyBreakpointState(window.matchMedia(ShellComponent.MOBILE_BREAKPOINT).matches);

    this.breakpointObserver
      .observe([ShellComponent.MOBILE_BREAKPOINT])
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => this.applyBreakpointState(result.matches));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
