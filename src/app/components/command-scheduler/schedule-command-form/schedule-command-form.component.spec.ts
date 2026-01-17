import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { throwError, of, Subject } from 'rxjs';

import { ScheduleCommandFormComponent } from './schedule-command-form.component';
import { MockApiService } from '../../../shared/mock-api/mock-api.service';

describe('ScheduleCommandFormComponent', () => {
  const createComponent = createComponentFactory({
    component: ScheduleCommandFormComponent,
    providers: [
      {
        provide: MockApiService,
        useValue: {
          createCommand: jest.fn()
        }
      }
    ]
  });

  it('shows an error when no device is selected', () => {
    const spectator: Spectator<ScheduleCommandFormComponent> = createComponent({
      props: { deviceId: null }
    });

    const api = spectator.inject(MockApiService) as unknown as {
      createCommand: jest.Mock;
    };

    spectator.component.onSubmit();

    expect(api.createCommand).not.toHaveBeenCalled();
    expect(spectator.component.submitting).toBe(false);
    expect(spectator.component.submitError).toContain('Select a device');
  });

  it('marks the form as touched when invalid', () => {
    const spectator: Spectator<ScheduleCommandFormComponent> = createComponent({
      props: { deviceId: 'd1' }
    });

    const api = spectator.inject(MockApiService) as unknown as {
      createCommand: jest.Mock;
    };

    spectator.component.form.controls.params.setValue('{');
    spectator.component.form.controls.params.updateValueAndValidity();

    spectator.component.onSubmit();

    expect(api.createCommand).not.toHaveBeenCalled();
    expect(spectator.component.form.controls.params.touched).toBe(true);
  });

  it('submits with empty params as {} and emits scheduled on success', () => {
    const spectator: Spectator<ScheduleCommandFormComponent> = createComponent({
      props: { deviceId: 'd1' }
    });

    const api = spectator.inject(MockApiService) as unknown as {
      createCommand: jest.Mock;
    };

    api.createCommand.mockReturnValue(of(void 0));

    let scheduledCount = 0;
    spectator.component.scheduled.subscribe(() => scheduledCount++);

    spectator.component.form.controls.params.setValue('   ');

    spectator.component.onSubmit();

    expect(api.createCommand).toHaveBeenCalledWith('d1', { type: 'PING', params: {} });
    expect(spectator.component.submitting).toBe(false);
    expect(spectator.component.submitError).toBeNull();
    expect(spectator.component.form.controls.params.value).toBe('');
    expect(spectator.component.form.controls.params.pristine).toBe(true);
    expect(spectator.component.form.controls.params.untouched).toBe(true);
    expect(scheduledCount).toBe(1);
  });

  it('submits with JSON params parsed into an object', () => {
    const spectator: Spectator<ScheduleCommandFormComponent> = createComponent({
      props: { deviceId: 'd1' }
    });

    const api = spectator.inject(MockApiService) as unknown as {
      createCommand: jest.Mock;
    };

    api.createCommand.mockReturnValue(of(void 0));

    spectator.component.form.controls.type.setValue('REBOOT');
    spectator.component.form.controls.params.setValue('{"reason":"manual"}');

    spectator.component.onSubmit();

    expect(api.createCommand).toHaveBeenCalledWith('d1', {
      type: 'REBOOT',
      params: { reason: 'manual' }
    });
  });

  it('formats Error and string errors from the API', () => {
    const spectator: Spectator<ScheduleCommandFormComponent> = createComponent({
      props: { deviceId: 'd1' }
    });

    const api = spectator.inject(MockApiService) as unknown as {
      createCommand: jest.Mock;
    };

    api.createCommand.mockReturnValueOnce(throwError(() => new Error('boom')));

    spectator.component.onSubmit();
    expect(spectator.component.submitting).toBe(false);
    expect(spectator.component.submitError).toBe('boom');

    api.createCommand.mockReturnValueOnce(throwError(() => 'nope'));

    spectator.component.onSubmit();
    expect(spectator.component.submitError).toBe('nope');
  });

  it('formats unknown errors defensively', () => {
    const spectator: Spectator<ScheduleCommandFormComponent> = createComponent({
      props: { deviceId: 'd1' }
    });

    const api = spectator.inject(MockApiService) as unknown as {
      createCommand: jest.Mock;
    };

    const circular: any = { a: 1 };
    circular.self = circular;

    api.createCommand.mockReturnValueOnce(throwError(() => circular));

    spectator.component.onSubmit();

    expect(spectator.component.submitError).toBe('Unknown error');
  });

  it('sets submitting=true while request is in-flight', () => {
    const spectator: Spectator<ScheduleCommandFormComponent> = createComponent({
      props: { deviceId: 'd1' }
    });

    const api = spectator.inject(MockApiService) as unknown as {
      createCommand: jest.Mock;
    };

    const subject = new Subject<void>();
    api.createCommand.mockReturnValue(subject.asObservable());

    spectator.component.onSubmit();
    expect(spectator.component.submitting).toBe(true);

    subject.next();
    subject.complete();

    expect(spectator.component.submitting).toBe(false);
  });
});
