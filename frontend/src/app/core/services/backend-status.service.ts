import { Injectable, computed, signal } from '@angular/core';

export type BackendStatus = 'unknown' | 'online' | 'offline';

@Injectable({ providedIn: 'root' })
export class BackendStatusService {
  private readonly state = signal<BackendStatus>('unknown');
  readonly status = this.state.asReadonly();
  readonly unavailable = computed(() => this.state() === 'offline');

  markOnline(): void { this.state.set('online'); }
  markUnavailable(): void { this.state.set('offline'); }
}
