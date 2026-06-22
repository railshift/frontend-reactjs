import { getToken } from 'firebase/messaging';
import { messaging } from '../lib/firebaseMessaging';
import api from './api';

export const setupNotifications = async () => {
  try {
    console.log('Requesting permission...');
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      return null;
    }
    console.log('Permission:', permission);

    const token = await getToken(
      messaging,
      {
        vapidKey:
          import.meta.env.VITE_FIREBASE_VAPID_KEY,
      }
    );

    // console.log('FCM Token:', token);

    if (token) {
      await api.post(
        '/api/v1/fcm/register-token',
        { token }
      );
    }

    console.log('Token saved');

    return token;

  } catch (error) {
    console.error(
      'Notification setup failed',
      error
    );
    return null;
  }
};