import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Validates that the control's value is either empty or valid JSON.
 *
 * We keep this logic in a small helper to make it easy to unit test.
 */
export function jsonTextValidator(
  control: AbstractControl<string>
): ValidationErrors | null {
  const raw = control.value;
  if (!raw || raw.trim() === '') return null;

  try {
    JSON.parse(raw);
    return null;
  } catch {
    return { invalidJson: true };
  }
}
