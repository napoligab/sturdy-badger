import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

import { CommandSchedulerComponent } from './command-scheduler.component';

describe('CommandSchedulerComponent', () => {
  const createComponent = createComponentFactory(CommandSchedulerComponent);

  it('emits scheduled when onScheduled is called', () => {
    const spectator: Spectator<CommandSchedulerComponent> = createComponent({
      props: { deviceId: 'd1' }
    });

    let count = 0;
    spectator.component.scheduled.subscribe(() => count++);

    spectator.component.onScheduled();

    expect(count).toBe(1);
  });
});
