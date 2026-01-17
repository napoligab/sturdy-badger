import { fakeAsync, tick } from '@angular/core/testing';

import { MockApiService } from './mock-api.service';

describe('MockApiService', () => {
  let service: MockApiService;

  beforeEach(() => {
    service = new MockApiService();
    service.setLatencyMs(0);
    service.setForceError(false);
  });

  it('normalizes latency (floors + clamps at 0)', fakeAsync(() => {
    service.setLatencyMs(-10.7);

    let got = false;
    service.getDevices().subscribe({
      next: () => {
        got = true;
      },
    });
    tick(0);
    expect(got).toBe(true);

    service.setLatencyMs(10.9);

    got = false;
    service.getDevices().subscribe({
      next: () => {
        got = true;
      },
    });
    tick(10);
    expect(got).toBe(true);
  }));

  it('forces errors when configured', fakeAsync(() => {
    service.setForceError(true);

    let message: string | null = null;
    service.getDevices().subscribe({
      next: () => {
        throw new Error('Expected error');
      },
      error: (err: unknown) => {
        message = err instanceof Error ? err.message : String(err);
      },
    });
    tick(0);

    expect(message).toContain('Mock API error');
  }));

  it('returns devices as a clone (callers cannot mutate store)', fakeAsync(() => {
    let first: any[] = [];
    service.getDevices().subscribe({
      next: (devices) => {
        first = devices as any[];
      },
    });
    tick(0);

    expect(first.length).toBeGreaterThan(0);
    first.push({ deviceId: 'mutated' });

    let second: any[] = [];
    service.getDevices().subscribe({
      next: (devices) => {
        second = devices as any[];
      },
    });
    tick(0);

    expect(second.find((d) => d.deviceId === 'mutated')).toBeUndefined();
  }));

  it('supports scheduling commands and advances statuses over time (SUCCEEDED path)', fakeAsync(() => {
    const randomSpy = jest.spyOn(Math, 'random').mockImplementation(() => 0.5);

    let createdId = '';
    service
      .createCommand('d_custom', { type: 'PING', params: { a: 1 } })
      .subscribe({
        next: (cmd) => {
          createdId = cmd.commandId;
        },
      });
    tick(0);

    expect(createdId).toMatch(/^c_\d+$/);

    let list: any[] = [];
    service.getCommands('d_custom').subscribe({
      next: (commands) => {
        list = commands as any[];
      },
    });
    tick(0);

    expect(list.length).toBe(1);
    expect(list[0].commandId).toBe(createdId);
    expect(list[0].status).toBe('PENDING');
    tick(2000);
    service.getCommands('d_custom').subscribe({
      next: (commands) => {
        list = commands as any[];
      },
    });
    tick(0);

    expect(list[0].status).toBe('LEASED');
    expect(list[0].leaseExpiresAt).toEqual(expect.any(String));

    tick(3000);
    service.getCommands('d_custom').subscribe({
      next: (commands) => {
        list = commands as any[];
      },
    });
    tick(0);

    expect(list[0].status).toBe('SUCCEEDED');
    expect(list[0].completedAt).toEqual(expect.any(String));

    randomSpy.mockRestore();
  }));

  it('advances to FAILED when willFail is true', fakeAsync(() => {
    const randomSpy = jest.spyOn(Math, 'random').mockImplementation(() => 0.1);

    let createdId = '';
    service.createCommand('d_fail', { type: 'REBOOT', params: {} }).subscribe({
      next: (cmd) => {
        createdId = cmd.commandId;
      },
    });
    tick(0);

    expect(createdId).toBeTruthy();

    tick(2000);
    tick(3000);

    let list: any[] = [];
    service.getCommands('d_fail').subscribe({
      next: (commands) => {
        list = commands as any[];
      },
    });
    tick(0);

    expect(list.length).toBe(1);
    expect(list[0].status).toBe('FAILED');
    expect(list[0].completedAt).toEqual(expect.any(String));

    randomSpy.mockRestore();
  }));

  it('reset clears runtime data and reseeds', fakeAsync(() => {
    service.createCommand('d_new', { type: 'PING', params: {} }).subscribe();
    tick(0);

    let list: any[] = [];
    service.getCommands('d_new').subscribe({
      next: (commands) => {
        list = commands as any[];
      },
    });
    tick(0);
    expect(list.length).toBe(1);

    service.reset();

    service.getCommands('d_new').subscribe({
      next: (commands) => {
        list = commands as any[];
      },
    });
    tick(0);

    expect(list).toEqual([]);
  }));

  it('falls back when structuredClone is unavailable', fakeAsync(() => {
    const original = (globalThis as any).structuredClone;
    (globalThis as any).structuredClone = undefined;

    let devices: any[] = [];
    service.getDevices().subscribe({
      next: (d) => {
        devices = d as any[];
      },
    });
    tick(0);

    expect(devices.length).toBeGreaterThan(0);

    (globalThis as any).structuredClone = original;
  }));
});
