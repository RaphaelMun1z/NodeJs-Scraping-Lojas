import { Injectable } from '@angular/core';
import Swal, { type SweetAlertIcon } from 'sweetalert2';

export interface PopupInputOptions {
  title: string;
  text?: string;
  inputType?: 'text' | 'password';
  inputPlaceholder?: string;
  confirmButtonText?: string;
}

export interface PopupConfirmOptions {
  title: string;
  text?: string;
  confirmButtonText?: string;
  destructive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PopupService {
  success(message: string, title = 'Sucesso'): Promise<void> {
    return this.show('success', title, message);
  }

  error(message: string, title = 'Erro'): Promise<void> {
    return this.show('error', title, message);
  }

  warning(message: string, title = 'Atenção'): Promise<void> {
    return this.show('warning', title, message);
  }

  info(message: string, title = 'Informação'): Promise<void> {
    return this.show('info', title, message);
  }

  confirm(options: PopupConfirmOptions): Promise<boolean> {
    return Swal.fire({
      icon: options.destructive ? 'warning' : 'question',
      title: options.title,
      text: options.text,
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText ?? 'Confirmar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        confirmButton: options.destructive ? 'popup-confirm-danger' : 'popup-confirm',
      },
    }).then((result) => result.isConfirmed);
  }

  confirmDelete(title: string, text?: string): Promise<boolean> {
    return this.confirm({ title, text, confirmButtonText: 'Excluir', destructive: true });
  }

  input(options: PopupInputOptions): Promise<string | null> {
    return Swal.fire({
      icon: 'warning',
      title: options.title,
      text: options.text,
      input: options.inputType ?? 'text',
      inputPlaceholder: options.inputPlaceholder,
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText ?? 'Continuar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: true,
    }).then((result) => (result.isConfirmed ? (result.value ?? '') : null));
  }

  private show(icon: SweetAlertIcon, title: string, text: string): Promise<void> {
    return Swal.fire({
      icon,
      title,
      text,
      confirmButtonText: 'Fechar',
    }).then(() => undefined);
  }
}
