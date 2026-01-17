export interface Device {
  deviceId: string;
}

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export type CommandType = 'PING' | 'REBOOT' | 'COLLECT_LOGS';

export type CommandStatus = 'PENDING' | 'LEASED' | 'SUCCEEDED' | 'FAILED';

export interface DeviceCommand {
  commandId: string;
  deviceId: string;
  type: CommandType;
  params: unknown;
  status: CommandStatus;
  createdAt: string;
  leaseExpiresAt: string | null;
  completedAt: string | null;
}

export interface ScheduleCommandRequest {
  type: CommandType;
  params?: unknown;
}

export type StatusFilter = 'ALL' | 'PENDING' | 'LEASED' | 'TERMINAL';
