import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { NotificationService } from './notification.service';
import { NotificationType } from './notification.model';

@Component({
  selector: 'app-notifications',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="notifications" aria-label="Notificações do sistema">
      @for (notification of service.notifications(); track notification.id) {
        <article
          [class]="'notification ' + notification.type"
          [class.removing]="notification.removing"
          [attr.role]="notification.type === 'error' || notification.type === 'warning' ? 'alert' : 'status'"
          [attr.aria-live]="notification.type === 'error' || notification.type === 'warning' ? 'assertive' : 'polite'"
        >
          <svg [lucideIcon]="icon(notification.type)" aria-hidden="true"></svg>
          <span>{{ notification.message }}</span>
          <button type="button" aria-label="Fechar notificação" (click)="service.dismiss(notification.id)">
            <svg lucideIcon="x" aria-hidden="true"></svg>
          </button>
        </article>
      }
    </section>
  `,
  styles: `
    .notifications {
      position: fixed;
      z-index: 1100;
      top: 20px;
      left: 50%;
      display: flex;
      width: min(600px, calc(100vw - 32px));
      flex-direction: column;
      align-items: center;
      gap: 10px;
      transform: translateX(-50%);
      pointer-events: none;
    }
    .notification {
      display: grid;
      width: fit-content;
      min-width: 280px;
      max-width: 100%;
      box-sizing: border-box;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 11px;
      padding: 12px 13px;
      border: 1px solid;
      border-radius: 9px;
      box-shadow: 0 8px 22px rgb(15 23 42 / 18%);
      color: #172033;
      font-size: 13px;
      line-height: 1.35;
      pointer-events: auto;
      animation: notification-in 260ms ease both;
    }
    .notification.success { border-color: #b7e2c6; background: #effaf2; }
    .notification.error { border-color: #f0b7b7; background: #fff4f4; }
    .notification.warning { border-color: #f1d69b; background: #fff9e9; }
    .notification.info { border-color: #b9d2f5; background: #f1f7ff; }
    .notification > .lucide { width: 19px; height: 19px; flex: 0 0 19px; }
    .notification.success > .lucide { color: #21864b; }
    .notification.error > .lucide { color: #c53030; }
    .notification.warning > .lucide { color: #a66a00; }
    .notification.info > .lucide { color: #2563b9; }
    .notification button { display: grid; width: 25px; height: 25px; place-items: center; padding: 0; border: 0; border-radius: 5px; background: transparent; color: #64748b; cursor: pointer; }
    .notification button:hover { background: rgb(15 23 42 / 8%); color: #172033; }
    .notification button .lucide { width: 16px; height: 16px; }
    .notification.removing { animation: notification-out 260ms ease forwards; }
    @keyframes notification-in { from { opacity: 0; transform: translateY(-16px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes notification-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }
    @media (max-width: 600px) { .notification { width: 100%; min-width: 0; } }
  `,
})
export class NotificationComponent {
  protected readonly service = inject(NotificationService);
  protected icon(type: NotificationType): string {
    return type === 'success' ? 'circle-check' : type === 'error' ? 'circle-x' : type === 'warning' ? 'triangle-alert' : 'info';
  }
}
