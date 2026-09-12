import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { faGithub, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { icon as renderFontAwesomeIcon } from '@fortawesome/fontawesome-svg-core';

type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-auth-button',
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
          <i [attr.data-lucide]="icon()" aria-hidden="true"></i>
        }
        @if (brandSvg()) {
          <span class="brand-icon" [innerHTML]="brandSvg()" aria-hidden="true"></span>
        }
        {{ label() }}
      </button>
    </div>
  `,
  styles: `
    :host { display: block; }
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
      transition: transform 120ms ease, background-color 120ms ease;
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
  private readonly sanitizer = inject(DomSanitizer);
  readonly label = input.required<string>();
  readonly icon = input('');
  readonly brandIcon = input<'google' | 'github' | ''>('');
  readonly type = input<ButtonType>('button');
  readonly width = input('170px');
  readonly height = input('39px');
  readonly borderRadius = input('9px');
  readonly baseColor = input('#ffdd00');
  readonly hoverColor = input('#f2d000');
  readonly layerColor = input('#f5d200');
  readonly layerBorderColor = input('transparent');
  readonly textColor = input('#111');
  readonly disabled = input(false);
  protected readonly pressed = signal(false);
  protected readonly brandSvg = computed(() => {
    const brand = this.brandIcon();
    if (brand === 'google') {
      return this.sanitizer.bypassSecurityTrustHtml(renderFontAwesomeIcon(faGoogle).html.join(''));
    }
    if (brand === 'github') {
      return this.sanitizer.bypassSecurityTrustHtml(renderFontAwesomeIcon(faGithub).html.join(''));
    }
    return null;
  });
}
