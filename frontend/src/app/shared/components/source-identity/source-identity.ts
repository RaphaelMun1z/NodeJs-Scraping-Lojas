import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-source-identity',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="source-identity" [class.large]="large()">
      @if (logo()) {
        <img [src]="logo()" [alt]="name()" (error)="hide($event)" />
      }
      <svg class="source-fallback" lucideIcon="store" aria-hidden="true"></svg>
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
      font-size: 16px;
      font-weight: 600;
      line-height: 1.2;
      gap: 8px;
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
