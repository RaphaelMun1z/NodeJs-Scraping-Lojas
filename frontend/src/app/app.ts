import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthApiService } from './core/auth/auth-api.service';
import { HeaderComponent } from './layout/header/header';
import { NotificationComponent } from './shared/notifications/notification.component';

@Component({
  imports: [RouterOutlet, HeaderComponent, NotificationComponent],
  selector: 'app-root',
  template: `<app-header /><app-notifications /><router-outlet />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly auth = inject(AuthApiService);
  constructor() {
    this.auth.session().subscribe();
  }
}
