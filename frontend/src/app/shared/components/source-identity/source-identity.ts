import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-source-identity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="source-identity" [class.large]="large()">
      @if (logo()) {
        <img [src]="logo()" [alt]="name()" (error)="hide($event)" />
      }
      <i class="source-fallback" data-lucide="store" aria-hidden="true"></i>
      <span>{{ name() }}</span>
    </span>
  `,
  styles: `
    .source-identity {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      color: var(--blue);
      font-weight: 600;
      font-size: 10px;
    }
    img,
    .source-fallback {
      width: 24px;
      height: 24px;
      border-radius: 0;
      object-fit: contain;
      background: #fff;
      border: 0;
      padding: 0;
    }
    .source-fallback {
      width: 30px;
      height: 30px;
      display: inline-grid;
      place-items: center;
      background: #eef2ff;
      color: var(--primary);
      padding: 0;
    }
    img:not([hidden]) + .source-fallback {
      display: none;
    }
    .source-identity.large {
      color: #171717;
      font-size: 20px;
      font-weight: 700;
      gap: 9px;
    }
    .source-identity.large img,
    .source-identity.large .source-fallback {
      width: 30px;
      height: 30px;
    }
  `,
})
export class SourceIdentityComponent {
  readonly name = input.required<string>();
  readonly logo = input<string>('');
  readonly large = input(false);
  protected hide(event: Event): void {
    (event.target as HTMLImageElement).hidden = true;
  }
}
