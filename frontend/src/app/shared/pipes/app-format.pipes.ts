import { DatePipe, DecimalPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'brl', standalone: true })
export class BrlPipe implements PipeTransform {
  private readonly decimal = new DecimalPipe('pt-BR');
  transform(value: number | null | undefined): string {
    return typeof value === 'number'
      ? `R$ ${this.decimal.transform(value, '1.2-2') ?? '0,00'}`
      : 'Preço indisponível';
  }
}

@Pipe({ name: 'appDate', standalone: true })
export class AppDatePipe implements PipeTransform {
  private readonly date = new DatePipe('pt-BR');
  transform(value: string | Date | null | undefined, format = 'dd/MM/yyyy HH:mm'): string {
    return value ? (this.date.transform(value, format) ?? '—') : '—';
  }
}

@Pipe({ name: 'duration', standalone: true })
export class DurationPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === undefined || value === null) return '—';
    const seconds = Math.round(value / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}min ${seconds % 60}s`;
  }
}
