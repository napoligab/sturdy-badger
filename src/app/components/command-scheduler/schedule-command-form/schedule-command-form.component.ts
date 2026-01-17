import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MockApiService } from '../../../shared/mock-api/mock-api.service';
import { CommandType, ScheduleCommandRequest } from '../../../shared/models';
import { formatError } from '../../../shared/format-error';
import { jsonTextValidator } from '../../../shared/json-text-validator/json-text.validator';

@Component({
  selector: 'app-schedule-command-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './schedule-command-form.component.html',
  styleUrls: ['./schedule-command-form.component.css']
})
export class ScheduleCommandFormComponent {
  @Input() deviceId: string | null = null;
  @Output() scheduled = new EventEmitter<void>();

  readonly commandTypes: CommandType[] = ['PING', 'REBOOT', 'COLLECT_LOGS'];
  readonly paramsPlaceholder = '{ "reason": "manual_recovery" }';

  readonly form = new FormGroup({
    type: new FormControl<CommandType>('PING', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    params: new FormControl<string>('', {
      nonNullable: true,
      validators: [jsonTextValidator]
    })
  });

  submitting = false;
  submitError: string | null = null;

  constructor(private readonly api: MockApiService) { }

  onSubmit(): void {
    this.submitError = null;

    if (!this.deviceId) {
      this.submitError = 'Select a device first.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const type = this.form.controls.type.value;
    const rawParams = this.form.controls.params.value;

    let parsedParams: unknown = {};
    if (rawParams.trim() !== '') {
      parsedParams = JSON.parse(rawParams);
    }

    const request: ScheduleCommandRequest = { type, params: parsedParams };

    this.submitting = true;

    this.api.createCommand(this.deviceId, request).subscribe({
      next: () => {
        this.submitting = false;
        this.submitError = null;
        this.form.controls.params.setValue('');
        this.form.controls.params.markAsPristine();
        this.form.controls.params.markAsUntouched();

        this.scheduled.emit();
      },
      error: (err: unknown) => {
        this.submitting = false;
        this.submitError = formatError(err);
      }
    });
  }
}
