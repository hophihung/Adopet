import { Platform } from 'react-native';

let Notifications: any = null;
try {
  // Lazy require to avoid breaking if module not installed yet
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
} catch (e) {
  // Module not installed yet
}

export type ScheduleParams = {
  id?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  hour: number;
  minute: number;
  repeats?: boolean;
};

export const NotificationService = {
  async requestPermissions() {
    if (!Notifications) return { granted: false };
    const { status } = await Notifications.requestPermissionsAsync();
    return { granted: status === 'granted' };
  },

  async scheduleLocal(params: ScheduleParams): Promise<string | null> {
    if (!Notifications) return null;

    await Notifications.setNotificationChannelAsync?.('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
      sound: true,
      vibrationPattern: [250, 250, 250, 250],
      lightColor: '#FF5A75',
    });

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: params.data ?? {},
      },
      trigger: Platform.select({
        android: { hour: params.hour, minute: params.minute, repeats: !!params.repeats },
        ios: { hour: params.hour, minute: params.minute, repeats: !!params.repeats },
        default: { seconds: 5 },
      }) as any,
    });

    return identifier;
  },

  async cancel(identifier: string) {
    if (!Notifications) return;
    await Notifications.cancelScheduledNotificationAsync(identifier);
  },
};
