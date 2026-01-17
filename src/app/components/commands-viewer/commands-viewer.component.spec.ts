import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

import { CommandsViewerComponent } from './commands-viewer.component';
import { DeviceCommand } from '../../shared/models';

describe('CommandsViewerComponent', () => {
  const createComponent = createComponentFactory(CommandsViewerComponent);

  const commands: DeviceCommand[] = [
    {
      commandId: 'c1',
      deviceId: 'd1',
      type: 'PING',
      params: {},
      status: 'PENDING',
      createdAt: '2026-01-01T00:00:00Z',
      leaseExpiresAt: null,
      completedAt: null
    },
    {
      commandId: 'c2',
      deviceId: 'd1',
      type: 'REBOOT',
      params: {},
      status: 'SUCCEEDED',
      createdAt: '2026-01-02T00:00:00Z',
      leaseExpiresAt: null,
      completedAt: '2026-01-02T00:00:01Z'
    },
    {
      commandId: 'c3',
      deviceId: 'd1',
      type: 'COLLECT_LOGS',
      params: {},
      status: 'LEASED',
      createdAt: '2026-01-03T00:00:00Z',
      leaseExpiresAt: '2026-01-03T00:00:10Z',
      completedAt: null
    },
    {
      commandId: 'c4',
      deviceId: 'd1',
      type: 'PING',
      params: {},
      status: 'FAILED',
      createdAt: '2026-01-04T00:00:00Z',
      leaseExpiresAt: null,
      completedAt: '2026-01-04T00:00:05Z'
    }
  ];

  it('computes visibleCommands with sorting + filtering', () => {
    const spectator: Spectator<CommandsViewerComponent> = createComponent({
      props: {
        selectedDeviceId: 'd1',
        commands,
        commandsState: 'ready'
      }
    });

    spectator.setInput({ statusFilter: 'ALL' });
    expect(spectator.component.visibleCommands.map((c) => c.commandId)).toEqual([
      'c4',
      'c3',
      'c2',
      'c1'
    ]);

    spectator.setInput({ statusFilter: 'PENDING' });
    expect(spectator.component.visibleCommands.map((c) => c.commandId)).toEqual(['c1']);

    spectator.setInput({ statusFilter: 'LEASED' });
    expect(spectator.component.visibleCommands.map((c) => c.commandId)).toEqual(['c3']);

    spectator.setInput({ statusFilter: 'TERMINAL' });
    expect(spectator.component.visibleCommands.map((c) => c.commandId)).toEqual(['c4', 'c2']);
  });

  it('maps statuses to badge classes (including default)', () => {
    const spectator: Spectator<CommandsViewerComponent> = createComponent();

    expect(spectator.component.statusBadgeClass('PENDING')).toBe('badge badge--warn');
    expect(spectator.component.statusBadgeClass('LEASED')).toBe('badge badge--info');
    expect(spectator.component.statusBadgeClass('SUCCEEDED')).toBe('badge badge--ok');
    expect(spectator.component.statusBadgeClass('FAILED')).toBe('badge badge--danger');
    expect(spectator.component.statusBadgeClass('UNKNOWN' as any)).toBe('badge');
  });

  it('disables filter/refresh when no device is selected', () => {
    const spectator: Spectator<CommandsViewerComponent> = createComponent({
      props: { selectedDeviceId: null }
    });

    const statusSelect = spectator.query<HTMLSelectElement>('#status-filter');
    const refreshButton = spectator.query<HTMLButtonElement>('button[type="button"]');

    expect(statusSelect?.disabled).toBe(true);
    expect(refreshButton?.disabled).toBe(true);
    expect(spectator.query('p.muted')?.textContent).toContain('Select a device');
  });

  it('emits refresh and statusFilterChange from user actions', () => {
    const spectator: Spectator<CommandsViewerComponent> = createComponent({
      props: {
        selectedDeviceId: 'd1',
        commandsState: 'ready',
        commands
      }
    });

    let refreshCount = 0;
    spectator.component.refresh.subscribe(() => refreshCount++);

    let filter: string | undefined;
    spectator.component.statusFilterChange.subscribe((v) => (filter = v));

    spectator.click('button[type="button"]');
    spectator.component.onStatusFilterChange('PENDING');

    expect(refreshCount).toBe(1);
    expect(filter).toBe('PENDING');
  });

  it('shows error state and retry button when commandsState is error', () => {
    const spectator: Spectator<CommandsViewerComponent> = createComponent({
      props: {
        selectedDeviceId: 'd1',
        commandsState: 'error',
        commandsError: 'boom'
      }
    });

    expect(spectator.query('.error')?.textContent).toContain('boom');

    let refreshCount = 0;
    spectator.component.refresh.subscribe(() => refreshCount++);

    spectator.click('.error button');

    expect(refreshCount).toBe(1);
  });

  it('renders meta info when selectedDeviceId is set', () => {
    const spectator: Spectator<CommandsViewerComponent> = createComponent({
      props: {
        selectedDeviceId: 'd1',
        commandsState: 'ready',
        lastUpdatedAt: new Date('2026-01-01T00:00:00Z'),
        commandsRefreshing: true,
        commands: []
      }
    });

    expect(spectator.query('.meta')?.textContent).toContain('Refreshing');
    expect(spectator.query('.meta')?.textContent).toContain('Last updated');
  });
});
