export type PushSupportStatus =
  | { supported: true }
  | { supported: false; reason: string };

type PushSubscriptionJSONShape = {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export function getPushSupportStatus(): PushSupportStatus {
  if (typeof window === 'undefined') return { supported: false, reason: 'Not in a browser context.' };
  if (!('serviceWorker' in navigator)) return { supported: false, reason: 'Service workers are not supported.' };
  if (!('PushManager' in window)) return { supported: false, reason: 'Push messaging is not supported.' };
  if (!('Notification' in window)) return { supported: false, reason: 'Notifications are not supported.' };
  return { supported: true };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  const support = getPushSupportStatus();
  if (!support.supported) return null;

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
  const support = getPushSupportStatus();
  if (support.supported === false) throw new Error(support.reason);
  if (!vapidPublicKey) throw new Error('Push notifications are not configured for this project.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notifications permission not granted.');
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return true;
  return subscription.unsubscribe();
}

export function serializePushSubscription(subscription: PushSubscription) {
  return subscription.toJSON();
}

export async function savePushSubscriptionToBackend(subscription: PushSubscription) {
  const { supabase } = await import('./supabase');
  const payload = serializePushSubscription(subscription) as PushSubscriptionJSONShape;

  const { error } = await supabase.functions.invoke('push', {
    body: {
      action: 'upsert',
      subscription: payload,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
  });

  if (error) throw error;
}

export async function removePushSubscriptionFromBackend(endpoint: string) {
  const { supabase } = await import('./supabase');

  const { error } = await supabase.functions.invoke('push', {
    body: {
      action: 'remove',
      endpoint,
    },
  });

  if (error) throw error;
}

export async function sendTestPushToMe(options?: { title?: string; body?: string; url?: string }) {
  const { supabase } = await import('./supabase');

  const { error } = await supabase.functions.invoke('push', {
    body: {
      action: 'send_test',
      title: options?.title,
      body: options?.body,
      url: options?.url,
    },
  });

  if (error) throw error;
}
