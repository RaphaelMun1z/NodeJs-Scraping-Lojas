import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-auth-button',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="button-layer"
      [style.width]="width()"
      [style.height]="height()"
      [class.is-pressed]="pressed()"
    >
      <button
        [class.is-pressed]="pressed()"
        [disabled]="disabled()"
        [attr.aria-disabled]="disabled()"
        [attr.type]="type()"
        [style.width]="width()"
        [style.height]="height()"
        [style.borderRadius]="borderRadius()"
        [style.backgroundColor]="baseColor()"
        [style.color]="textColor()"
        (pointerdown)="pressed.set(true)"
        (pointerup)="pressed.set(false)"
        (pointerleave)="pressed.set(false)"
        (pointercancel)="pressed.set(false)"
      >
        @if (icon()) {
          @if (iconName()) {
            <svg [lucideIcon]="iconName()" aria-hidden="true"></svg>
          }
        }
        {{ label() }}
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .button-layer {
      position: relative;
      z-index: 0;
      height: var(--auth-button-height);
      isolation: isolate;
    }
    .button-layer::after {
      content: '';
      position: absolute;
      z-index: -1;
      inset: 0;
      border-radius: var(--auth-button-radius);
      background: var(--auth-button-layer-color);
      border: 2px solid var(--auth-button-layer-border-color);
      transform: translate(4px, 4px);
    }
    button {
      height: var(--auth-button-height);
      padding: 0 8px;
      border: 2px solid #292929;
      border-radius: var(--auth-button-radius);
      font: inherit;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      transition:
        transform 120ms ease,
        background-color 120ms ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    button svg {
      width: 16px;
      height: 16px;
      stroke-width: 2.5;
    }
    .brand-icon,
    .brand-icon svg {
      display: inline-flex;
      width: 16px;
      height: 16px;
    }
    button:hover {
      background: var(--auth-button-hover-color) !important;
    }
    button:focus-visible {
      outline: 3px solid rgb(36 86 223 / 28%);
      outline-offset: 2px;
    }
    button:active,
    button.is-pressed {
      transform: translate(4px, 4px);
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 1;
    }
  `,
  host: {
    '[style.--auth-button-layer-color]': 'layerColor()',
    '[style.--auth-button-hover-color]': 'hoverColor()',
    '[style.--auth-button-height]': 'height()',
    '[style.--auth-button-radius]': 'borderRadius()',
    '[style.--auth-button-layer-border-color]': 'layerBorderColor()',
  },
})
export class AuthButtonComponent {
  readonly label = input.required<string>();
  readonly icon = input('');
  readonly brandIcon = input<'google' | 'github' | ''>('');
  readonly type = input<ButtonType>('button');
  readonly width = input('170px');
  readonly height = input('var(--action-button-height)');
  readonly borderRadius = input('var(--action-button-radius)');
  readonly baseColor = input('var(--action-button-primary-background)');
  readonly hoverColor = input('var(--action-button-primary-hover)');
  readonly layerColor = input('var(--action-button-primary-layer)');
  readonly layerBorderColor = input('transparent');
  readonly textColor = input('#111');
  readonly disabled = input(false);
  protected readonly pressed = signal(false);
  protected iconName(): string {
    return this.icon() || (this.brandIcon() === 'google' ? 'globe-2' : this.brandIcon() === 'github' ? 'code-2' : '');
  }
}
