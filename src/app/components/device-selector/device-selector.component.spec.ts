import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

import { DeviceSelectorComponent } from './device-selector.component';

describe('DeviceSelectorComponent', () => {
  const createComponent = createComponentFactory(DeviceSelectorComponent);

  it('normalizes empty selection to null', () => {
    const spectator: Spectator<DeviceSelectorComponent> = createComponent({
      props: {
        deviceId: 'd1',
        devices: [{ deviceId: 'd1' }, { deviceId: 'd2' }],
        devicesState: 'ready'
      }
    });

    let emitted: string | null | undefined;
    spectator.component.deviceIdChange.subscribe((v) => (emitted = v));

    spectator.component.onDeviceIdChange('   ');

    expect(emitted).toBeNull();
  });

  it('emits a selected device id as-is', () => {
    const spectator: Spectator<DeviceSelectorComponent> = createComponent({
      props: { devicesState: 'ready' }
    });

    let emitted: string | null | undefined;
    spectator.component.deviceIdChange.subscribe((v) => (emitted = v));

    spectator.component.onDeviceIdChange('d2');

    expect(emitted).toBe('d2');
  });

  it('disables controls and shows status/error messages based on state', () => {
    const spectator: Spectator<DeviceSelectorComponent> = createComponent({
      props: {
        deviceId: null,
        devices: [{ deviceId: 'd1' }],
        devicesState: 'loading'
      }
    });

    const select = spectator.query<HTMLSelectElement>('#device-select');
    const button = spectator.query<HTMLButtonElement>('button');

    expect(select?.disabled).toBe(true);
    expect(button?.disabled).toBe(true);
    expect(spectator.query('p.muted')?.textContent).toContain('Loading devices');

    spectator.setInput({ devicesState: 'error', devicesError: 'boom' });
    spectator.detectChanges();

    expect(spectator.query('.error')?.textContent).toContain('boom');
  });

  it('emits reload when clicking Reload devices', () => {
    const spectator: Spectator<DeviceSelectorComponent> = createComponent({
      props: { devicesState: 'ready' }
    });

    let emitted = 0;
    spectator.component.reload.subscribe(() => emitted++);

    spectator.click('button');

    expect(emitted).toBe(1);
  });
});
