import { Injectable } from '@angular/core';
import { Observable, defer, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import {
  CommandType,
  Device,
  DeviceCommand,
  ScheduleCommandRequest,
} from '../models';

interface CommandRuntimeInfo {
  createdAtMs: number;
  willFail: boolean;
}

// These are the fixed timings for how a command moves through statuses.
// I hard-coded these so behavior is predictable and tests are stable.
const LEASE_AFTER_MS = 2_000;
const COMPLETE_AFTER_LEASE_MS = 3_000;
const LEASE_DURATION_MS = 60_000;

// Returns a deep copy of a value.
// I made every API response a clone so the UI can't accidentally mutate the in-memory data store.
function deepClone<T>(value: T): T {
  if (typeof (globalThis as any).structuredClone === 'function') {
    return (globalThis as any).structuredClone(value) as T;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

@Injectable({
  providedIn: 'root',
})
export class MockApiService {
  //Our pretend “devices table”.
  // I made this a fixed list so the UI can show a dropdown immediately.
  private readonly devices: Device[] = [
    { deviceId: 'd_001' },
    { deviceId: 'd_002' },
    { deviceId: 'd_003' },
  ];

  // Where commands live in memory.
  // Key = deviceId, value = list of commands for that device.
  private readonly commandsByDeviceId = new Map<string, DeviceCommand[]>();

  // Extra internal state that the UI doesn't need to see.
  // Key = commandId, value = created time + whether this command will fail.
  private readonly commandInfoByCommandId = new Map<
    string,
    CommandRuntimeInfo
  >();

  // Simple ID generator.
  // This is standing in for a DB auto-increment / UUID.
  private nextCommandNumber = 120;

  // “Network” knobs.
  // I tweaked these to demo loading states and error handling.
  private latencyMs = 200;
  private alwaysFail = false;

  // On construction, we seed some starter data.
  // This keeps the demo UI interesting immediately.
  constructor() {
    this.seedInitialData();
  }

  // Flip this on to force every request to fail.
  // Checks error UI quickly.
  setForceError(force: boolean): void {
    this.alwaysFail = force;
  }

  // Sets artificial latency in milliseconds.
  // Tests set this to 0; demos can set it higher to show spinners.
  setLatencyMs(ms: number): void {
    this.latencyMs = Math.max(0, Math.floor(ms));
  }

  // Reset everything back to the initial seeded state.
  // Usage: tests call this to get a known clean starting point.
  reset(): void {
    this.commandsByDeviceId.clear();
    this.commandInfoByCommandId.clear();
    this.nextCommandNumber = 120;
    this.seedInitialData();
  }

  // Simulates GET /devices.
  // Usage: called to populate the device dropdown.
  getDevices(): Observable<Device[]> {
    return this.simulateNetwork(() => deepClone(this.devices));
  }

  // Simulates GET /devices/:deviceId/commands.
  // Interview version: this is intentionally time-based so the UI can "watch" commands move from PENDING -> LEASED -> SUCCEEDED/FAILED.
  getCommands(deviceId: string): Observable<DeviceCommand[]> {
    return this.simulateNetwork(() => {
      this.updateCommandStatuses(deviceId);
      const list = this.commandsByDeviceId.get(deviceId) ?? [];
      return deepClone(list);
    });
  }

  // Simulates POST /devices/:deviceId/commands.
  // Usage: called when the user schedules a new command.
  createCommand(
    deviceId: string,
    request: ScheduleCommandRequest,
  ): Observable<DeviceCommand> {
    return this.simulateNetwork(() => {
      const command = this.createCommandInternal({
        deviceId,
        type: request.type,
        params: request.params ?? {},
        createdAtMs: Date.now(),
      });
      return deepClone(command);
    });
  }

  // Wraps a synchronous function with "fake network" behavior.
  // This is the single place where I add delay + random errors.
  private simulateNetwork<T>(factory: () => T): Observable<T> {
    const delayMs = this.latencyMs;

    return defer(() => {
      if (this.alwaysFail) {
        return throwError(() => new Error('Mock API error (simulated)'));
      }
      return of(factory());
    }).pipe(delay(delayMs));
  }

  // Makes sure a device has a command list in the map.
  // Usage: called before we push a new command.
  private ensureCommandList(deviceId: string): DeviceCommand[] {
    const existing = this.commandsByDeviceId.get(deviceId);
    if (existing) return existing;

    const list: DeviceCommand[] = [];
    this.commandsByDeviceId.set(deviceId, list);
    return list;
  }

  // Generates a new command ID.
  // Real life would use DB IDs or UUIDs.
  private createCommandId(): string {
    this.nextCommandNumber += 1;
    return `c_${this.nextCommandNumber}`;
  }

  // Creates a command and stores it.
  // This is the "write" path of the fake backend.
  private createCommandInternal(input: {
    deviceId: string;
    type: CommandType;
    params: unknown;
    createdAtMs: number;
  }): DeviceCommand {
    const commandId = this.createCommandId();

    const command: DeviceCommand = {
      commandId,
      deviceId: input.deviceId,
      type: input.type,
      params: input.params,
      status: 'PENDING',
      createdAt: new Date(input.createdAtMs).toISOString(),
      leaseExpiresAt: null,
      completedAt: null,
    };

    const list = this.ensureCommandList(input.deviceId);
    list.push(command);

    this.commandInfoByCommandId.set(commandId, {
      createdAtMs: input.createdAtMs,
      willFail: Math.random() < 0.15,
    });

    return command;
  }

  // Updates command statuses based on time.
  // Interview version: this simulates a backend workflow without background jobs.
  private updateCommandStatuses(deviceId: string): void {
    const list = this.commandsByDeviceId.get(deviceId);
    if (!list) return;

    const nowMs = Date.now();

    for (const cmd of list) {
      const info = this.commandInfoByCommandId.get(cmd.commandId);
      if (!info) continue;

      const leaseAtMs = info.createdAtMs + LEASE_AFTER_MS;
      const completesAtMs =
        info.createdAtMs + LEASE_AFTER_MS + COMPLETE_AFTER_LEASE_MS;

      if (cmd.status === 'PENDING' && nowMs >= leaseAtMs) {
        cmd.status = 'LEASED';
        cmd.leaseExpiresAt = new Date(
          leaseAtMs + LEASE_DURATION_MS,
        ).toISOString();
      }

      if (cmd.status === 'LEASED' && nowMs >= completesAtMs) {
        cmd.status = info.willFail ? 'FAILED' : 'SUCCEEDED';
        cmd.completedAt = new Date(completesAtMs).toISOString();
      }
    }
  }

  // Seeds the mock with a few commands per device.
  // I created a mix of "old" and "recent" commands so the first screen already shows different statuses.
  private seedInitialData(): void {
    const now = Date.now();

    for (const device of this.devices) {
      this.createCommandInternal({
        deviceId: device.deviceId,
        type: 'PING',
        params: { seeded: true },
        createdAtMs: now - 90_000,
      });

      this.createCommandInternal({
        deviceId: device.deviceId,
        type: 'COLLECT_LOGS',
        params: { window: 'last_5m' },
        createdAtMs: now - 25_000,
      });

      this.createCommandInternal({
        deviceId: device.deviceId,
        type: 'REBOOT',
        params: { reason: 'seeded_demo' },
        createdAtMs: now - 2_000,
      });
    }
  }
}
