export type NotificationAlertPayload = {
  title: string;
  body: string;
  riskScore?: number;
  content?: string;
};

let cachedReg: ServiceWorkerRegistration | null = null;

function isServiceWorkerAllowedHere(): boolean {
  // Service workers require a secure context (https) OR localhost.
  // On Android emulators, http://10.0.2.2 is NOT treated as localhost.
  // Use adb reverse and open http://localhost:5173 inside emulator Chrome.
  return (
    typeof window !== "undefined" &&
    (window.isSecureContext || location.hostname === "localhost")
  );
}

/**
 * Register the service worker. Safe to call multiple times.
 */
export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  if (!isServiceWorkerAllowedHere()) {
    console.warn(
      "[CampusShield] Service Worker blocked: open on https or localhost (not 10.0.2.2)."
    );
    return null;
  }
  if (cachedReg) return cachedReg;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    cachedReg = reg;
    return reg;
  } catch (e) {
    console.warn("[CampusShield] Service Worker registration failed", e);
    return null;
  }
}

/**
 * Ensure SW is registered and return a worker that can be messaged.
 */
async function getWorker(): Promise<ServiceWorker | null> {
  const reg = await registerSW();
  if (!reg) return null;

  // Prefer active worker (can receive postMessage even before controlling the page)
  if (reg.active) return reg.active;

  // Fallback to controller if present
  if (navigator.serviceWorker.controller) return navigator.serviceWorker.controller;

  // As a last resort, wait briefly for activation
  await navigator.serviceWorker.ready.catch(() => null);
  return reg.active || navigator.serviceWorker.controller;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

async function postToSW(message: any): Promise<boolean> {
  const worker = await getWorker();
  if (!worker) return false;
  worker.postMessage(message);
  return true;
}

/**
 * Shows/hides the "Guardian Active" status notification.
 */
export async function setGuardianStatusNotification(active: boolean): Promise<boolean> {
  const perm = await requestNotificationPermission();
  if (perm !== "granted") {
    console.warn("[CampusShield] Notifications not granted.");
    return false;
  }
  return await postToSW({ type: "STATUS", active });
}

/**
 * Push an alert notification (when a scam is detected).
 */
export async function pushAlertNotification(
  payload: NotificationAlertPayload
): Promise<boolean> {
  const perm = await requestNotificationPermission();
  if (perm !== "granted") {
    console.warn("[CampusShield] Notifications not granted.");
    return false;
  }
  return await postToSW({ type: "ALERT", payload });
}
