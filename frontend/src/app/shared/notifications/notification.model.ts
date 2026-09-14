export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  duration?: number;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  removing: boolean;
}
