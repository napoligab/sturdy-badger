import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.css']
})
export class AppHeaderComponent {
  @Input() forceErrors = false;
  @Output() forceErrorsChange = new EventEmitter<boolean>();

  onForceErrorsChange(value: boolean): void {
    this.forceErrorsChange.emit(value);
  }
}
