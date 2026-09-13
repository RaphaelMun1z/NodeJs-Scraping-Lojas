import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

type ButtonType = 'button' | 'submit' | 'reset';
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonState = 'default' | 'active' | 'inactive';

@Component({
  selector: 'app-ui-button',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      [class]="
        'button-layer ' +
        variantClass() +
        (iconOnly() ? ' icon-only' : '') +
        (pressed() ? ' is-pressed' : '')
      "
    >
      <button
        [attr.type]="type()"
        [attr.aria-label]="iconOnly() ? ariaLabel() : null"
        [attr.title]="title() || null"
        [disabled]="disabled() || loading()"
        [class.is-pressed]="pressed()"
        (pointerdown)="pressed.set(true)"
        (pointerup)="pressed.set(false)"
        (pointerleave)="pressed.set(false)"
        (pointercancel)="pressed.set(false)"
      >
        @if (imageUrl()) {
          <img class="button-image" [src]="imageUrl()" alt="" aria-hidden="true" />
        } @else if (loading()) {
          <span class="spinner" aria-hidden="true"></span>
        } @else if (icon()) {
          <svg [lucideIcon]="icon()" aria-hidden="true"></svg>
        }
        @if (!iconOnly()) {
          {{ loading() ? loadingLabel() : label() }}
        }
      </button>
    </span>
  `,
  styles: `
    :host {
      display: inline-block;
      vertical-align: middle;
    }
    .button-layer {
      position: relative;
      z-index: 0;
      display: inline-block;
      min-width: 40px;
      height: var(--ui-button-height);
      isolation: isolate;
    }
    .button-layer::after {
      position: absolute;
      z-index: -1;
      inset: 0;
      border: 2px solid var(--ui-button-layer);
      border-radius: var(--ui-button-radius);
      background: var(--ui-button-layer);
      content: '';
      pointer-events: none;
      transform: translate(4px, 4px);
    }
    button {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      min-width: 100%;
      height: var(--ui-button-height);
      gap: 8px;
      padding: 0 14px;
      border: 2px solid #292929;
      border-radius: var(--ui-button-radius);
      background: var(--ui-button-background);
      color: var(--ui-button-text);
      font: inherit;
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
      cursor: pointer;
      transition:
        transform 120ms ease,
        background-color 120ms ease;
    }
    button:hover:not(:disabled) {
      background: var(--ui-button-hover);
    }
    button:active:not(:disabled),
    button.is-pressed {
      transform: translate(2px, 2px);
    }
    button:focus-visible {
      outline: 3px solid rgb(36 86 223 / 28%);
      outline-offset: 2px;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .variant-ghost button {
      border-color: transparent;
      background: transparent;
      color: #26354e;
    }
    .variant-ghost::after {
      border-color: transparent;
      background: transparent;
    }
    .variant-ghost button:hover:not(:disabled) {
      background: #f1f4f9;
    }
    .icon-only,
    .icon-only button {
      width: var(--ui-button-icon-size);
      min-width: var(--ui-button-icon-size);
    }
    .icon-only button {
      padding: 0;
    }
    button svg {
      width: 17px;
      height: 17px;
      stroke-width: 2.5;
    }
    .button-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: calc(var(--ui-button-radius) - 2px);
    }
    .spinner {
      width: 15px;
      height: 15px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 700ms linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
  host: {
    '[style.--ui-button-height]': 'height()',
    '[style.--ui-button-radius]': 'radius()',
    '[style.--ui-button-icon-size]': 'iconSize()',
    '[style.--ui-button-background]': 'background()',
    '[style.--ui-button-hover]': 'hover()',
    '[style.--ui-button-layer]': 'layer()',
    '[style.--ui-button-text]': 'textColor()',
  },
})
export class UiButtonComponent {
  readonly label = input('');
  readonly icon = input('');
  readonly imageUrl = input('');
  readonly iconOnly = input(false);
  readonly ariaLabel = input('');
  readonly title = input('');
  readonly type = input<ButtonType>('button');
  readonly variant = input<ButtonVariant>('primary');
  readonly state = input<ButtonState>('default');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly loadingLabel = input('Carregando…');
  readonly height = input('var(--action-button-height)');
  readonly radius = input('var(--action-button-radius)');
  readonly iconSize = input('40px');
  protected readonly pressed = signal(false);

  protected variantClass(): string {
    return `variant-${this.variant()}`;
  }

  protected background(): string {
    if (this.state() === 'active') return '#2f9e5b';
    if (this.state() === 'inactive') return '#c93636';
    return this.variant() === 'primary'
      ? 'var(--action-button-primary-background)'
      : this.variant() === 'danger'
        ? 'var(--action-button-danger-background)'
        : 'var(--action-button-secondary-background)';
  }

  protected hover(): string {
    if (this.state() === 'active') return '#25834a';
    if (this.state() === 'inactive') return '#a92d2d';
    return this.variant() === 'primary'
      ? 'var(--action-button-primary-hover)'
      : this.variant() === 'danger'
        ? 'var(--action-button-danger-hover)'
        : '#f1f4f9';
  }

  protected layer(): string {
    if (this.state() === 'active') return '#1f6f3e';
    if (this.state() === 'inactive') return '#842525';
    return this.variant() === 'primary'
      ? 'var(--action-button-primary-layer)'
      : this.variant() === 'danger'
        ? 'var(--action-button-danger-layer)'
        : 'var(--action-button-secondary-layer)';
  }

  protected textColor(): string {
    return this.variant() === 'danger' ? '#fff' : '#111';
  }
}
