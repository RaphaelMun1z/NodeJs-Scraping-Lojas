import { Injectable, TemplateRef, inject } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(MatDialog);

  open<T>(template: TemplateRef<T>, config: MatDialogConfig = {}): MatDialogRef<T> {
    return this.dialog.open(template, {
      width: 'min(900px, calc(100vw - 32px))',
      maxWidth: 'calc(100vw - 20px)',
      maxHeight: '90vh',
      autoFocus: false,
      restoreFocus: true,
      closeOnNavigation: true,
      panelClass: 'app-dialog-panel',
      ...config,
    });
  }
}
