import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import {
  CommandStatus,
  DeviceCommand,
  LoadState,
  StatusFilter
} from '../../shared/models';

@Component({
  selector: 'app-commands-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './commands-viewer.component.html',
  styleUrls: ['./commands-viewer.component.css']
})
export class CommandsViewerComponent {
  @Input() selectedDeviceId: string | null = null;
  @Input() statusFilter: StatusFilter = 'ALL';
  @Output() statusFilterChange = new EventEmitter<StatusFilter>();

  @Input() commandsState: LoadState = 'idle';
  @Input() commandsError: string | null = null;
  @Input() commandsRefreshing = false;
  @Input() lastUpdatedAt: Date | null = null;

  @Input() commands: DeviceCommand[] = [];

  @Output() refresh = new EventEmitter<void>();

  onRefresh(): void {
    this.refresh.emit();
  }

  onStatusFilterChange(rawValue: string): void {
    this.statusFilterChange.emit(rawValue as StatusFilter);
  }

  get visibleCommands(): DeviceCommand[] {
    const sorted = [...this.commands].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );

    switch (this.statusFilter) {
      case 'PENDING':
        return sorted.filter((c) => c.status === 'PENDING');
      case 'LEASED':
        return sorted.filter((c) => c.status === 'LEASED');
      case 'TERMINAL':
        return sorted.filter((c) => this.isTerminal(c.status));
      case 'ALL':
      default:
        return sorted;
    }
  }

  statusBadgeClass(status: CommandStatus): string {
    switch (status) {
      case 'PENDING':
        return 'badge badge--warn';
      case 'LEASED':
        return 'badge badge--info';
      case 'SUCCEEDED':
        return 'badge badge--ok';
      case 'FAILED':
        return 'badge badge--danger';
      default:
        return 'badge';
    }
  }

  private isTerminal(status: CommandStatus): boolean {
    return status === 'SUCCEEDED' || status === 'FAILED';
  }
}
