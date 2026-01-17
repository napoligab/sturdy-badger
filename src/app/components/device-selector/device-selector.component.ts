import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Device, LoadState } from '../../shared/models';

@Component({
  selector: 'app-device-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './device-selector.component.html',
  styleUrls: ['./device-selector.component.css'],
})
export class DeviceSelectorComponent {
  @Input() deviceId: string | null = null;

  @Input() devices: Device[] = [];
  @Input() devicesState: LoadState = 'idle';
  @Input() devicesError: string | null = null;

  @Output() deviceIdChange = new EventEmitter<string | null>();

  @Output() reload = new EventEmitter<void>();

  onDeviceIdChange(rawValue: string): void {
    const normalized = rawValue.trim() === '' ? null : rawValue;
    this.deviceIdChange.emit(normalized);
  }

  onReload(): void {
    this.reload.emit();
  }
}
