/* CampusShield Service Worker
 * - Shows notifications for intercepted messages
 * - Shows/updates a persistent "Guardian Active" status notification (best-effort)
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function closeByTag(tag) {
  try {
    const notifs = await self.registration.getNotifications({ tag });
    notifs.forEach(n => n.close());
  } catch (e) {
    // ignore
  }
}

async function showStatus(active) {
  const tag = 'campusshield-status';
  if (!active) {
    await closeByTag(tag);
    return;
  }
  await self.registration.showNotification('CampusShield', {
    body: 'Guardian Protocol is active — scanning for scams in the background.',
    tag,
    renotify: false,
    silent: true,
    requireInteraction: true,
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  });
}

async function showAlert(payload) {
  const { title, body, riskScore, content } = payload || {};
  const tag = 'campusshield-alert';
  await self.registration.showNotification(title || 'CampusShield Alert', {
    body: body || 'Potential scam intercepted.',
    tag: `${tag}-${Date.now()}`,
    renotify: true,
    silent: false,
    requireInteraction: false,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: '/',
      content: content || '',
      riskScore: typeof riskScore === 'number' ? riskScore : undefined
    }
  });
}

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'STATUS') {
    event.waitUntil(showStatus(!!msg.active));
  }
  if (msg.type === 'ALERT') {
    event.waitUntil(showAlert(msg.payload));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = allClients.find(c => 'focus' in c);
    if (client) {
      await client.focus();
      // best-effort: pass along data
      if (event.notification.data) {
        client.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data });
      }
      return;
    }
    await self.clients.openWindow(url);
  })());
});
