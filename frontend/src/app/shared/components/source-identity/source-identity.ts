import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-source-identity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="source-identity" [class.large]="large()" [class.detail]="detail()">
      @if (logo()) {
        <img [src]="logo()" [alt]="name()" (error)="hide($event)" />
      }
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
    img {
      width: 24px;
      height: 24px;
      border-radius: 0;
      object-fit: contain;
      background: #fff;
      border: 0;
      padding: 0;
    }
    .source-identity.large {
      color: #171717;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.2;
      gap: 8px;
    }
    .source-identity.large img {
      width: 30px;
      height: 30px;
    }
    .source-identity.detail {
      font-size: 13px;
      line-height: 1.2;
    }
    .source-identity.detail img {
      width: 24px;
      height: 24px;
    }
  `,
})
export class SourceIdentityComponent {
  readonly name = input.required<string>();
  readonly logo = input<string>('');
  readonly large = input(false);
  readonly detail = input(false);
  protected hide(event: Event): void {
    (event.target as HTMLImageElement).hidden = true;
  }
}
