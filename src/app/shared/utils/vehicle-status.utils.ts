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
      pending: 'status-pending',
      in_progress: 'status-in-progress',
      inspection: 'status-inspection',
      awaiting_approval: 'status-awaiting',
      approved: 'status-completed',
      completed: 'status-completed',
      invoiced: 'status-completed',
    };
    return classes[status] || 'status-pending';
  }

  static getProgressStep(status?: string): number {
    const progress: Record<string, number> = {
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
    return VehicleStatusUtils.getProgressStep(status) * 25;
  }
}
