import { getToken } from 'firebase/messaging';
import { messaging } from './firebaseMessaging';

export const setupNotifications = async () => {

  const permission =
    await Notification.requestPermission();

  if (permission !== 'granted') {
    return null;
  }

  const token =
    await getToken(
      messaging,
      {
        vapidKey:
          import.meta.env.VITE_FIREBASE_VAPID_KEY,
      }
    );

  console.log('FCM TOKEN:', token);

  return token;
};