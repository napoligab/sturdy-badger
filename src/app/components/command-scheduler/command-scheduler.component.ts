import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ScheduleCommandFormComponent } from './schedule-command-form/schedule-command-form.component';

@Component({
  selector: 'app-command-scheduler',
  standalone: true,
  imports: [CommonModule, ScheduleCommandFormComponent],
  templateUrl: './command-scheduler.component.html',
  styleUrls: ['./command-scheduler.component.css'],
})
export class CommandSchedulerComponent {
  @Input() deviceId: string | null = null;
  @Output() scheduled = new EventEmitter<void>();

  onScheduled(): void {
    this.scheduled.emit();
  }
}
