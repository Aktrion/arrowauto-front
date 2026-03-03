function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Static utility functions for vehicle status display and progress
 */
export class VehicleStatusUtils {
  static formatStatus(status?: string | unknown): string {
    if (status == null || typeof status !== 'string') return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  static getStatusBadgeClass(status?: string): string {
    if (!status) return 'status-pending';
    const classes: Record<string, string> = {
      checked_in: 'status-pending',
      pending_inspection: 'status-inspection',
      pending_estimation: 'status-in-progress',
      pending_approval: 'status-awaiting',
      pending_operations: 'status-in-progress',
      ready_for_pickup: 'status-completed',
      checked_out: 'status-completed',
      pending: 'status-pending',
      scheduled: 'status-in-progress',
      in_progress: 'status-in-progress',
      inspection: 'status-inspection',
      awaiting_approval: 'status-awaiting',
      approved: 'status-completed',
      completed: 'status-completed',
      invoiced: 'status-completed',
      cancelled: 'status-error',
      sent: 'status-awaiting',
    };
    return classes[status] || 'status-pending';
  }

  /** Returns HTML for a standardized status badge (for data-grid cellRenderer) */
  static statusBadge(value: string | null | undefined): string {
    const text = value != null && typeof value === 'string'
      ? this.formatStatus(value)
      : 'Pending';
    const badgeClass = this.getStatusBadgeClass(value ?? 'pending');
    return `<span class="status-badge ${badgeClass}">${escapeHtml(text)}</span>`;
  }

  static getProgressStep(status?: string): number {
    const progress: Record<string, number> = {
      checked_in: 1,
      pending_inspection: 2,
      pending_estimation: 2,
      pending_approval: 3,
      pending_operations: 3,
      ready_for_pickup: 4,
      checked_out: 5,
      pending: 1,
      inspection: 2,
      awaiting_approval: 2,
      in_progress: 3,
      approved: 3,
      completed: 4,
      invoiced: 4,
    };
    return progress[status || ''] || 0;
  }

  static getProgressPercent(status?: string): number {
    const step = VehicleStatusUtils.getProgressStep(status);
    return step > 0 ? Math.min(100, step * 20) : 0;
  }
}
