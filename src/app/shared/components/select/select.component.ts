import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ComponentRef,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  label: string;
  value: any;
}

@Component({
  selector: 'app-select-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="bg-base-100 w-full max-h-[20rem] overflow-auto rounded-lg shadow-lg"
      (keydown)="onKeydown($event)"
    >
      <div class="sticky z-1 top-0 bg-base-100 p-2">
        <div class="relative">
          <input
            #searchInput
            type="text"
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearch()"
            placeholder="Search..."
            class="input input-sm md:input-md input-bordered w-full pr-8"
          />
          <svg
            class="h-4 w-4 absolute right-2 top-1/2 transform -translate-y-1/2 opacity-50"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
      <ul class="menu menu-compact w-full p-2 gap-1">
        <li *ngIf="multiple && filteredOptions.length > 0">
          <label
            tabindex="0"
            class="flex items-center px-4 py-2 hover:bg-base-300 hover:text-primary rounded-lg cursor-pointer font-medium border-b border-base-300 mb-1"
            (click)="toggleSelectAll()"
          >
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              [checked]="areAllSelected()"
              (change)="toggleSelectAll()"
            />
            <span class="ml-2 w-full">
              {{ areAllSelected() ? 'Unselect All' : 'Select All' }}
            </span>
          </label>
        </li>
        <li *ngFor="let option of filteredOptions; let i = index">
          <label
            #optionLabel
            tabindex="0"
            class="flex items-center px-4 py-2 hover:bg-base-300 hover:text-primary rounded-lg cursor-pointer"
            [class.bg-primary]="isSelected(option)"
            [class.text-primary-content]="isSelected(option)"
            (keydown.enter)="onOptionSelect($event, option)"
            (click)="onOptionSelect($event, option)"
          >
            <ng-container *ngIf="multiple; else singleSelect">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                [checked]="isSelected(option)"
                (change)="toggleSelection(option)"
              />
              <span class="ml-2 w-full">{{ option.label }}</span>
            </ng-container>
            <ng-template #singleSelect>
              <span class="w-full">{{ option.label }}</span>
            </ng-template>
          </label>
        </li>
      </ul>
    </div>
  `,
})
export class SelectPanelComponent implements OnInit, AfterViewInit {
  @Input() options: SelectOption[] = [];
  @Input() selectedValues: any[] = [];
  @Input() multiple: boolean = false;
  @Output() optionSelected = new EventEmitter<any>();
  @Output() closePanel = new EventEmitter<void>();
  @Output() selectAll = new EventEmitter<void>();
  @Output() unselectAll = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChildren('optionLabel') optionLabels!: QueryList<ElementRef>;

  searchTerm: string = '';
  filteredOptions: any[] = [];
  focusedIndex: number = -1;

  ngOnInit() {
    this.filteredOptions = [...this.options];
  }

  ngAfterViewInit() {
    this.searchInput?.nativeElement?.focus();
  }

  isSelected(option: SelectOption): boolean {
    const value = option.value;
    return this.multiple ? this.selectedValues.includes(value) : this.selectedValues[0] === value;
  }

  toggleSelection(option: SelectOption): void {
    const value = option.value;
    if (this.isSelected(option)) {
      this.selectedValues = this.selectedValues.filter((selectedValue) => selectedValue !== value);
    } else {
      this.selectedValues.push(value);
    }
    this.optionSelected.emit(option);
  }

  areAllSelected(): boolean {
    if (!this.filteredOptions.length) return false;
    return this.filteredOptions.every((option) => this.selectedValues.includes(option.value));
  }

  toggleSelectAll(): void {
    if (this.areAllSelected()) {
      this.selectedValues = this.selectedValues.filter(
        (value) => !this.filteredOptions.some((option) => option.value === value),
      );
      this.unselectAll.emit();
    } else {
      const valuesToAdd = this.filteredOptions
        .filter((option) => !this.selectedValues.includes(option.value))
        .map((option) => option.value);
      this.selectedValues = [...this.selectedValues, ...valuesToAdd];
      this.selectAll.emit();
    }
    this.optionSelected.emit({ selectAll: true, values: this.selectedValues });
  }

  onSearch(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredOptions = this.options.filter((option) =>
      option.label.toLowerCase().includes(term),
    );
    this.focusedIndex = -1;
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closePanel.emit();
    }
  }

  onOptionSelect(event: Event, option: SelectOption) {
    if (this.multiple) {
      event.preventDefault();
      event.stopPropagation();
      this.toggleSelection(option);
    } else {
      this.optionSelected.emit(option);
      this.closePanel.emit();
    }
  }
}

@Component({
  selector: 'app-select',
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
          class="input input-sm md:input-md input-bordered w-full flex justify-between items-center"
          [class.cursor-pointer]="!disabled"
          [class.cursor-not-allowed]="disabled"
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
              *ngIf="selectedValue !== null && !disabled && clearable"
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
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements OnDestroy, OnChanges, ControlValueAccessor {
  @Input() label: string = '';
  @Input() options: SelectOption[] = [];
  @Input() error: string = '';
  @Input() placeholder: string = 'Select an option';
  @Input() clearable: boolean = true;

  private _value: any = null;
  private _disabled: boolean = false;

  @Input()
  get selectedValue(): any {
    return this._value;
  }
  set selectedValue(value: any) {
    if (value !== this._value) {
      this._value = value;
    }
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

  @Output() selectionChange = new EventEmitter<any>();
  @Output() onDropdownToggle = new EventEmitter<void>();
  @ViewChild('trigger') triggerElement!: ElementRef;

  private onChange = (_: any) => {};
  private onTouched = () => {};

  private overlayRef: OverlayRef | null = null;
  private selectPanelRef: ComponentRef<SelectPanelComponent> | null = null;

  constructor(private overlay: Overlay) {}

  writeValue(value: any): void {
    this.selectedValue = value;
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
    this.selectPanelRef.instance.selectedValues = this._value ? [this._value] : [];
    this.selectPanelRef.instance.multiple = false;

    this.selectPanelRef.instance.closePanel.subscribe(() => this.closeDropdown());
    this.selectPanelRef.instance.optionSelected.subscribe((option: SelectOption) => {
      this.updateValue(option.value);
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

  private updateValue(value: any): void {
    this.selectedValue = value;
    this.onChange(this._value);
    this.selectionChange.emit(this._value);
  }

  getSelectedText(): string {
    if (this._value === null || this._value === undefined) return this.placeholder;
    const selectedOption = this.options.find((opt) => opt.value === this._value);
    return selectedOption ? selectedOption.label : this.placeholder;
  }

  clearSelection(event?: Event): void {
    if (this.disabled) {
      return;
    }
    if (event) {
      event.stopPropagation();
    }
    this.updateValue(null);
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
        if (this._value !== null) {
          event.preventDefault();
          this.clearSelection();
        }
        break;
    }
  }
}
