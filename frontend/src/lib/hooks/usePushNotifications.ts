'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth, getApiUrl } from '@/components/providers/AuthProvider';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;

export function usePushNotifications() {
  const { token, isAuthenticated } = useAuth();
  const subscribedRef = useRef(false);

  const subscribe = useCallback(async () => {
    if (subscribedRef.current || !isAuthenticated || !token) {
      return;
    }
    if (typeof g.window === 'undefined' || !('serviceWorker' in g.navigator)) {
      return;
    }
    if (!('PushManager' in g.window)) {
      return;
    }

    try {
      // Check if already subscribed
      const alreadySubscribed = g.localStorage?.getItem('bb_push_subscribed');
      if (alreadySubscribed === 'true') {
        subscribedRef.current = true;
        return;
      }

      const permission = await g.Notification?.requestPermission();
      if (permission !== 'granted') {
        return;
      }

      const registration = await g.navigator.serviceWorker.ready;

      // Get the VAPID public key from the API
      const apiUrl = getApiUrl();
      const configRes = await fetch(`${apiUrl}/notifications/vapid-key`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!configRes.ok) {
        return;
      }
      const { publicKey } = await configRes.json();
      if (!publicKey) {
        return;
      }

      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        const rawData = atob(base64);
        return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
      };

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to backend
      const subJson = subscription.toJSON();
      await fetch(`${apiUrl}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      g.localStorage?.setItem('bb_push_subscribed', 'true');
      subscribedRef.current = true;
    } catch (err) {
      console.warn('Push subscription failed:', err);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    // Delay subscription request to not interrupt login flow
    const timer = setTimeout(() => {
      subscribe();
    }, 3000);
    return () => clearTimeout(timer);
  }, [subscribe]);
}
