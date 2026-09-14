import { Injectable, signal } from '@angular/core';
import { NotificationItem, NotificationOptions, NotificationType } from './notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly items = signal<NotificationItem[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private lastMessage = '';
  private lastMessageAt = 0;
  readonly notifications = this.items.asReadonly();

  success(message: string, options?: NotificationOptions): void { this.add('success', message, options); }
  error(message: string, options?: NotificationOptions): void { this.add('error', message, options); }
  warning(message: string, options?: NotificationOptions): void { this.add('warning', message, options); }
  info(message: string, options?: NotificationOptions): void { this.add('info', message, options); }

  dismiss(id: string): void {
    if (!this.items().some((item) => item.id === id && !item.removing)) return;
    this.items.update((items) => items.map((item) => item.id === id ? { ...item, removing: true } : item));
    const timer = setTimeout(() => {
      this.items.update((items) => items.filter((item) => item.id !== id));
      this.timers.delete(id);
    }, 260);
    this.timers.set(id, timer);
  }

  private add(type: NotificationType, message: string, options?: NotificationOptions): void {
    const text = message.trim();
    if (!text) return;
    const now = Date.now();
    if (this.lastMessage === `${type}:${text}` && now - this.lastMessageAt < 900) return;
    this.lastMessage = `${type}:${text}`;
    this.lastMessageAt = now;
    const id = crypto.randomUUID();
    const item: NotificationItem = { id, type, message: text, removing: false };
    this.items.update((items) => [...items, item].slice(-5));
    const duration = options?.duration ?? (type === 'success' ? 3000 : type === 'info' ? 4000 : type === 'warning' ? 5000 : 6000);
    this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
  }
}
