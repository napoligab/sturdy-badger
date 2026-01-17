import { fakeAsync, tick } from '@angular/core/testing';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { AppComponent } from './app.component';
import { MockApiService } from './shared/mock-api/mock-api.service';
import { DeviceCommand } from './shared/models';

const createComponent = createComponentFactory({
  component: AppComponent,
  detectChanges: false
});

function makeApiStub(overrides: Partial<MockApiService> = {}): Partial<MockApiService> {
  return {
    getDevices: jest.fn(() => of([])),
    getCommands: jest.fn(() => of([])),
    createCommand: jest.fn(),
    setForceError: jest.fn(),
    ...overrides
  };
}

function createWithApi(apiStub: Partial<MockApiService>): Spectator<AppComponent> {
  const spectator = createComponent({
    providers: [{ provide: MockApiService, useValue: apiStub }]
  });
  spectator.detectChanges();
  return spectator;
}

describe('AppComponent', () => {
  it('loads devices on init (success path)', () => {
    const apiStub = makeApiStub({
      getDevices: jest.fn(() => of([{ deviceId: 'd1' }]))
    });

    const spectator = createWithApi(apiStub);

    expect(apiStub.getDevices).toHaveBeenCalledTimes(1);
    expect(spectator.component.devicesState).toBe('ready');
    expect(spectator.component.devices).toEqual([{ deviceId: 'd1' }]);
  });

  it('handles device load errors and formats them', () => {
    const circular: any = { a: 1 };
    circular.self = circular;

    const apiStub = makeApiStub({
      getDevices: jest.fn(() => throwError(() => circular))
    });

    const spectator = createWithApi(apiStub);

    expect(spectator.component.devicesState).toBe('error');
    expect(spectator.component.devicesError).toBe('Unknown error');
  });

  it('passes forceErrors into the API', () => {
    const apiStub = makeApiStub();
    const spectator = createWithApi(apiStub);

    spectator.component.setForceErrors(true);
    expect(spectator.component.forceErrors).toBe(true);
    expect(apiStub.setForceError).toHaveBeenCalledWith(true);
  });

  it('updates statusFilter when changed', () => {
    const spectator = createWithApi(makeApiStub());

    spectator.component.onStatusFilterChange('TERMINAL');
    expect(spectator.component.statusFilter).toBe('TERMINAL');
  });

  it('resets commands to idle when deviceId becomes null', () => {
    const spectator = createWithApi(makeApiStub());

    spectator.component.commands = [
      {
        commandId: 'c1',
        deviceId: 'd1',
        type: 'PING',
        params: {},
        status: 'PENDING',
        createdAt: '2026-01-01T00:00:00Z',
        leaseExpiresAt: null,
        completedAt: null
      }
    ];

    spectator.component.onDeviceIdChange(null);

    expect(spectator.component.selectedDeviceId).toBeNull();
    expect(spectator.component.commandsState).toBe('idle');
    expect(spectator.component.commands).toEqual([]);
    expect(spectator.component.lastUpdatedAt).toBeNull();
  });

  it('prevents stale results when switching devices quickly', fakeAsync(() => {
    const d1Commands: DeviceCommand[] = [
      {
        commandId: 'c_d1',
        deviceId: 'd1',
        type: 'PING',
        params: {},
        status: 'PENDING',
        createdAt: '2026-01-01T00:00:00Z',
        leaseExpiresAt: null,
        completedAt: null
      }
    ];

    const d2Commands: DeviceCommand[] = [
      {
        commandId: 'c_d2',
        deviceId: 'd2',
        type: 'REBOOT',
        params: {},
        status: 'LEASED',
        createdAt: '2026-01-01T00:00:00Z',
        leaseExpiresAt: '2026-01-01T00:00:10Z',
        completedAt: null
      }
    ];

    const apiStub = makeApiStub({
      getDevices: jest.fn(() => of([{ deviceId: 'd1' }, { deviceId: 'd2' }])),
      getCommands: jest.fn((deviceId: string) =>
        deviceId === 'd1' ? of(d1Commands).pipe(delay(1000)) : of(d2Commands)
      )
    });

    const spectator = createWithApi(apiStub);

    spectator.component.onDeviceIdChange('d1');
    tick(0);

    spectator.component.onDeviceIdChange('d2');
    tick(0);

    expect(spectator.component.commands).toEqual(d2Commands);

    tick(1000);
    expect(spectator.component.commands).toEqual(d2Commands);

    expect(apiStub.getCommands).toHaveBeenCalledWith('d1');
    expect(apiStub.getCommands).toHaveBeenCalledWith('d2');

    spectator.fixture.destroy();
  }));

  it('sets commandsState=error if initial load fails with no cached commands', fakeAsync(() => {
    const apiStub = makeApiStub({
      getDevices: jest.fn(() => of([{ deviceId: 'd1' }])),
      getCommands: jest.fn(() => throwError(() => new Error('boom')))
    });

    const spectator = createWithApi(apiStub);

    spectator.component.onDeviceIdChange('d1');
    tick(0);

    expect(spectator.component.commandsState).toBe('error');
    expect(spectator.component.commandsError).toBe('boom');

    spectator.fixture.destroy();
  }));

  it('keeps commandsState=ready if refresh fails but commands already exist', fakeAsync(() => {
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
      }
    ];

    const getCommands = jest
      .fn()
      .mockReturnValueOnce(of(commands))
      .mockReturnValueOnce(throwError(() => 'nope'));

    const apiStub = makeApiStub({
      getDevices: jest.fn(() => of([{ deviceId: 'd1' }])),
      getCommands
    });

    const spectator = createWithApi(apiStub);

    spectator.component.onDeviceIdChange('d1');
    tick(0);

    expect(spectator.component.commandsState).toBe('ready');
    expect(spectator.component.commands.length).toBe(1);

    spectator.component.refreshCommands();
    tick(0);

    expect(spectator.component.commandsState).toBe('ready');
    expect(spectator.component.commandsError).toBe('nope');

    spectator.fixture.destroy();
  }));
});
