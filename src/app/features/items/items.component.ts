import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BaseListDirective } from '@core/directives/base-list.directive';
import { ToastService } from '@core/services/toast.service';
import { ItemsApiService } from '@features/items/services/items-api.service';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { ColumnDef } from '@shared/components/data-grid/data-grid.interface';
import { ICONS } from '@shared/icons';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, TranslateModule, DataGridComponent],
  templateUrl: './items.component.html',
})
export class ItemsComponent extends BaseListDirective<any, any, any> {
  icons = ICONS;
  private notificationService = inject(ToastService);
  private translate = inject(TranslateService);

  newItem = {
    partCategory: '',
    partNumber: '',
    partDescription: '',
    price: 0,
  };

  editItem = {
    id: '',
    partCategory: '',
    partNumber: '',
    partDescription: '',
    price: 0,
  };

  constructor(private itemsApiService: ItemsApiService) {
    super(itemsApiService);
    this.gridConfig = {
      ...this.gridConfig,
      titleIcon: 'ShoppingCart',
      showNewButton: true,
      showEditButton: true,
      showDeleteButton: true,
      selectable: false,
      storageKey: 'items-grid',
    };
  }

  protected override getTitle(): string {
    return 'ITEMS.TITLE';
  }

  protected override getStorageKey(): string {
    return 'items-grid';
  }

  protected override getColumnDefinitions(): ColumnDef[] {
    return [
      {
        field: 'partCategory',
        headerName: 'ITEMS.MODAL.PART_CATEGORY',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        field: 'partNumber',
        headerName: 'ITEMS.MODAL.PART_NUMBER',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        field: 'partDescription',
        headerName: 'ITEMS.MODAL.PART_DESCRIPTION',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        field: 'price',
        headerName: 'ITEMS.MODAL.PRICE',
        type: 'string',
        sortable: true,
        filterable: false,
      },
    ];
  }

  protected override onCreate(): void {
    this.openNewItemModal();
  }

  protected override onEdit(item: any): void {
    this.openEditItemModal(item);
  }

  protected override onDelete(item: any): void {
    const id = item._id || item.id;
    if (!id) return;
    this.itemsApiService.deleteOne(id).subscribe({
      next: () => {
        this.notificationService.success(this.translate.instant('ITEMS.TOAST.DELETED'));
        this.loadItems();
      },
      error: () => this.notificationService.error(this.translate.instant('ITEMS.TOAST.DELETE_FAILED')),
    });
  }

  openNewItemModal(): void {
    this.resetNewItem();
    (document.getElementById('new_item_modal') as HTMLDialogElement)?.showModal();
  }

  createItem(): void {
    if (!this.newItem.partNumber || !this.newItem.partDescription || this.newItem.price == null) return;

    this.itemsApiService
      .create({
        partCategory: this.newItem.partCategory || undefined,
        partNumber: this.newItem.partNumber,
        partDescription: this.newItem.partDescription,
        price: this.newItem.price,
      })
      .subscribe({
        next: () => {
          this.loadItems();
          (document.getElementById('new_item_modal') as HTMLDialogElement)?.close();
          this.notificationService.success(this.translate.instant('ITEMS.TOAST.CREATED'));
        },
        error: () => this.notificationService.error(this.translate.instant('ITEMS.TOAST.CREATE_FAILED')),
      });
  }

  openEditItemModal(item: any): void {
    this.editItem = {
      id: item._id || item.id,
      partCategory: item.partCategory || '',
      partNumber: item.partNumber || '',
      partDescription: item.partDescription || '',
      price: item.price ?? 0,
    };
    (document.getElementById('edit_item_modal') as HTMLDialogElement)?.showModal();
  }

  saveEditItem(): void {
    if (!this.editItem.id || !this.editItem.partNumber || !this.editItem.partDescription) {
      return;
    }

    this.itemsApiService
      .update(this.editItem.id, {
        partCategory: this.editItem.partCategory || undefined,
        partNumber: this.editItem.partNumber,
        partDescription: this.editItem.partDescription,
        price: this.editItem.price,
      })
      .subscribe({
        next: () => {
          this.loadItems();
          (document.getElementById('edit_item_modal') as HTMLDialogElement)?.close();
          this.notificationService.success(this.translate.instant('ITEMS.TOAST.UPDATED'));
        },
        error: () => this.notificationService.error(this.translate.instant('ITEMS.TOAST.UPDATE_FAILED')),
      });
  }

  resetNewItem(): void {
    this.newItem = {
      partCategory: '',
      partNumber: '',
      partDescription: '',
      price: 0,
    };
  }
}
