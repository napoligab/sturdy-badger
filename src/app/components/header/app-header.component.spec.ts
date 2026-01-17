import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

import { AppHeaderComponent } from './app-header.component';

describe('AppHeaderComponent', () => {
  const createComponent = createComponentFactory(AppHeaderComponent);

  it('renders and emits forceErrorsChange on toggle', () => {
    const spectator: Spectator<AppHeaderComponent> = createComponent({
      props: { forceErrors: true }
    });

    const checkbox = spectator.query<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
    expect(checkbox?.checked).toBe(true);

    let emitted: boolean | undefined;
    spectator.component.forceErrorsChange.subscribe((v) => (emitted = v));

    spectator.click(checkbox!);

    expect(emitted).toBe(false);
  });
});
