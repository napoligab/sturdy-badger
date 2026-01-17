import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, merge, of, timer } from 'rxjs';
import { catchError, exhaustMap, map } from 'rxjs/operators';

import { MockApiService } from './shared/mock-api/mock-api.service';
import { AppHeaderComponent } from './components/header/app-header.component';
import { DeviceSelectorComponent } from './components/device-selector/device-selector.component';
import { CommandsViewerComponent } from './components/commands-viewer/commands-viewer.component';
import { CommandSchedulerComponent } from './components/command-scheduler/command-scheduler.component';
import {
  Device,
  DeviceCommand,
  LoadState,
  StatusFilter,
} from './shared/models';
import { formatError } from './shared/format-error';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AppHeaderComponent,
    DeviceSelectorComponent,
    CommandsViewerComponent,
    CommandSchedulerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  devices: Device[] = [];
  devicesState: LoadState = 'idle';
  devicesError: string | null = null;

  selectedDeviceId: string | null = null;
  statusFilter: StatusFilter = 'ALL';

  commands: DeviceCommand[] = [];
  commandsState: LoadState = 'idle';
  commandsError: string | null = null;
  commandsRefreshing = false;
  lastUpdatedAt: Date | null = null;
  forceErrors = false;

  private commandsPollingSubscription?: Subscription;

  private readonly refreshCommands$ = new Subject<void>();

  constructor(private readonly api: MockApiService) {}

  ngOnInit(): void {
    this.loadDevices();
  }

  ngOnDestroy(): void {
    this.stopCommandsPolling();
  }

  onDeviceIdChange(deviceId: string | null): void {
    this.selectedDeviceId = deviceId;
    this.startCommandsPolling();
  }

  onStatusFilterChange(filter: StatusFilter): void {
    this.statusFilter = filter;
  }

  loadDevices(): void {
    this.devicesState = 'loading';
    this.devicesError = null;

    this.api.getDevices().subscribe({
      next: (devices) => {
        this.devices = devices;
        this.devicesState = 'ready';
      },
      error: (err) => {
        this.devicesError = formatError(err);
        this.devicesState = 'error';
      },
    });
  }

  setForceErrors(force: boolean): void {
    this.forceErrors = force;
    this.api.setForceError(force);
  }

  refreshCommands(): void {
    this.refreshCommands$.next();
  }

  private stopCommandsPolling(): void {
    this.commandsPollingSubscription?.unsubscribe();
    this.commandsPollingSubscription = undefined;
  }

  private startCommandsPolling(): void {
    this.stopCommandsPolling();
    this.commands = [];
    this.commandsError = null;
    this.lastUpdatedAt = null;

    const deviceId = this.selectedDeviceId;
    if (!deviceId) {
      this.commandsState = 'idle';
      return;
    }

    this.commandsState = 'loading';

    this.commandsPollingSubscription = merge(
      timer(0, 5000),
      this.refreshCommands$,
    )
      .pipe(
        exhaustMap(() => {
          const isInitial = this.commandsState === 'loading';
          this.commandsRefreshing = !isInitial;

          return this.api.getCommands(deviceId).pipe(
            map((commands) => ({ kind: 'success' as const, commands })),
            catchError((err) => of({ kind: 'error' as const, error: err })),
          );
        }),
      )
      .subscribe((result) => {
        this.commandsRefreshing = false;

        if (result.kind === 'success') {
          this.commands = result.commands;
          this.commandsError = null;
          this.commandsState = 'ready';
          this.lastUpdatedAt = new Date();
          return;
        }

        this.commandsError = formatError(result.error);
        this.commandsState = this.commands.length ? 'ready' : 'error';
      });
  }
}
