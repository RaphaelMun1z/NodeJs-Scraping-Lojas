import { ChangeDetectionStrategy, Component, EventEmitter, input, Output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-selector-slot',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="slot" [class.is-configured]="configured()" [class.is-active]="active()" type="button" [attr.aria-label]="ariaLabel()" [attr.title]="configured() ? 'Seletor configurado' : 'Configurar ' + label().toLocaleLowerCase('pt-BR')" (click)="activated.emit()">
      <svg [lucideIcon]="configured() ? 'check' : icon()" aria-hidden="true"></svg>
      @if (showLabel()) { <span>{{ label() }}</span> }<ng-content />
    </button>
  `,
  styles: `
    :host { display: block; }
    .slot { display: flex; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; width: 100%; min-height: 100%; padding: 8px; border: 1px solid #e3e7ee; border-radius: 8px; background: #fbfcfd; color: #98a2b3; font: inherit; font-size: 10px; cursor: pointer; transition: border-color .15s, background-color .15s, color .15s, box-shadow .15s; }
    .slot:hover { border-color: #9aaee6; background: #f8faff; color: var(--primary); }
    .slot:focus-visible { outline: 3px solid rgb(36 86 223 / 25%); outline-offset: 2px; }
    .slot.is-configured { border-color: #b7d9c2; background: #f7fcf8; color: #21824b; }
    .slot.is-active { border-color: var(--primary); background: #eef3ff; color: var(--primary); box-shadow: 0 0 0 3px rgb(36 86 223 / 12%); }
    .slot svg { width: 17px; height: 17px; flex: 0 0 17px; }
  `,
})
export class SelectorSlotComponent {
  readonly label = input.required<string>();
  readonly icon = input.required<string>();
  readonly configured = input(false);
  readonly active = input(false);
  readonly showLabel = input(true);
  readonly ariaLabel = input('');
  @Output() readonly activated = new EventEmitter<void>();
}
