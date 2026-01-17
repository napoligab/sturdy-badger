import { FormControl } from '@angular/forms';

import { jsonTextValidator } from './json-text.validator';

describe('jsonTextValidator', () => {
  it('allows empty text', () => {
    const control = new FormControl<string>('', { nonNullable: true });
    expect(jsonTextValidator(control)).toBeNull();
  });

  it('allows valid JSON', () => {
    const control = new FormControl<string>('{ "ok": true }', {
      nonNullable: true
    });
    expect(jsonTextValidator(control)).toBeNull();
  });

  it('rejects invalid JSON', () => {
    const control = new FormControl<string>('{ "oops": }', {
      nonNullable: true
    });
    expect(jsonTextValidator(control)).toEqual({ invalidJson: true });
  });
});
