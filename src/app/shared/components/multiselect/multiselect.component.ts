import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
  Component,
  ComponentRef,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectOption, SelectPanelComponent } from '../select/select.component';

@Component({
  selector: 'app-multiselect',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayModule],
  template: `
    <div class="form-control w-full">
      <label class="label" *ngIf="label">
        <span class="label-text">{{ label }}</span>
      </label>
      <div class="relative w-full">
        <div
          #trigger
          tabindex="0"
          role="button"
          class="input input-bordered w-full flex justify-between items-center"
          [class.cursor-pointer]="!disabled"
          [class.cursor-not-allowed]="disabled"
          [class.border-none]="disabled"
          [class.input-disabled]="disabled"
          [class.bg-base-200]="disabled"
          [class.text-gray-300]="disabled"
          (click)="toggleDropdown()"
          (keydown)="onKeydown($event)"
          [class.input-error]="error"
        >
          <span class="truncate">{{ getSelectedText() }}</span>
          <div class="flex items-center gap-1">
            <svg
              *ngIf="selectedValues && selectedValues.length > 0 && !disabled && clearable"
              class="h-4 w-4 opacity-50 hover:opacity-100 hover:text-error"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              (click)="clearSelection($event)"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <svg
              class="h-4 w-4 opacity-50"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>
      <label class="label" *ngIf="error">
        <span class="label-text-alt text-error">{{ error }}</span>
      </label>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiselectComponent),
      multi: true,
    },
  ],
})
export class MultiselectComponent implements OnChanges, OnDestroy, ControlValueAccessor {
  @Input() label: string = '';
  @Input() options: any[] = [];
  @Input() error: string = '';
  @Input() placeholder: string = 'Select options';
  @Input() clearable: boolean = true;

  private _values: any[] = [];
  private _disabled: boolean = false;

  @Input()
  get selectedValues(): any[] {
    return this._values;
  }
  set selectedValues(values: any[]) {
    this._values = Array.isArray(values) ? values : [];
  }

  @Input()
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    if (value !== this._disabled) {
      this._disabled = value;
      if (this._disabled) {
        this.closeDropdown();
      }
    }
  }

  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() onDropdownToggle = new EventEmitter<void>();
  @ViewChild('trigger') triggerElement!: ElementRef;

  private onChange = (_: any) => {};
  private onTouched = () => {};

  private overlayRef: OverlayRef | null = null;
  private selectPanelRef: ComponentRef<SelectPanelComponent> | null = null;

  constructor(private overlay: Overlay) {}

  writeValue(values: any[]): void {
    this.selectedValues = values;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.selectPanelRef && changes['options']) {
      this.selectPanelRef.instance.options = this.options;
      this.selectPanelRef.instance.filteredOptions = this.options;
    }
    if (changes['disabled'] && this.disabled && this.overlayRef) {
      this.closeDropdown();
    }
  }

  ngOnDestroy() {
    this.closeDropdown();
  }

  toggleDropdown() {
    if (this.disabled) {
      return;
    }
    if (this.overlayRef) {
      this.closeDropdown();
    } else {
      this.onDropdownToggle.emit();
      this.openDropdown();
    }
  }

  private openDropdown() {
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.triggerElement)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
      ])
      .withViewportMargin(8);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      width: this.triggerElement.nativeElement.offsetWidth,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
    });

    const portal = new ComponentPortal(SelectPanelComponent);
    this.selectPanelRef = this.overlayRef.attach(portal);

    this.selectPanelRef.instance.options = this.options;
    this.selectPanelRef.instance.selectedValues = [...this._values];
    this.selectPanelRef.instance.multiple = true;

    this.selectPanelRef.instance.closePanel.subscribe(() => this.closeDropdown());
    this.selectPanelRef.instance.optionSelected.subscribe((option: any) => {
      if (option.selectAll) {
        this.updateValues([...option.values]);
      } else {
        this.toggleIndividualSelection(option);
      }
    });

    this.overlayRef.backdropClick().subscribe(() => this.closeDropdown());
  }

  private closeDropdown() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.triggerElement.nativeElement.focus();
      this.onTouched();
    }
  }

  private updateValues(values: any[]): void {
    this.selectedValues = values;
    this.onChange(this._values);
    this.selectionChange.emit(this._values);
  }

  private toggleIndividualSelection(option: SelectOption): void {
    const value = option.value;
    const newSelectedValues = [...this._values];
    const index = newSelectedValues.indexOf(value);

    if (index === -1) {
      newSelectedValues.push(value);
    } else {
      newSelectedValues.splice(index, 1);
    }
    this.updateValues(newSelectedValues);
  }

  getSelectedText(): string {
    if (!this._values?.length) return this.placeholder;

    const selectedOptions = this.options.filter((opt) => this._values.includes(opt.value));
    if (selectedOptions.length === 0) return this.placeholder;
    if (selectedOptions.length === 1) return selectedOptions[0].label;

    return `${selectedOptions.length} items selected`;
  }

  clearSelection(event?: Event): void {
    if (this.disabled) {
      return;
    }
    if (event) {
      event.stopPropagation();
    }
    this.updateValues([]);
  }

  onKeydown(event: KeyboardEvent) {
    if (this.disabled) {
      return;
    }
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.toggleDropdown();
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
      case 'Delete':
      case 'Backspace':
        if (this._values && this._values.length > 0) {
          event.preventDefault();
          this.clearSelection();
        }
        break;
    }
  }
}
