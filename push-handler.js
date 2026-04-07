 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/push-handler.js b/push-handler.js
index 6d185ceb67956f62df0d1d126d3467d593000a31..a19f7cc1e931010f349a999fe5714d679ced248f 100644
--- a/push-handler.js
+++ b/push-handler.js
@@ -185,40 +185,43 @@ async function initPush() {
         const sub = await reg.pushManager.getSubscription();
         if (sub) saveSubscriptionToWorker(sub).catch(() => {});
       }
     }
 
     PushHandler.fetchStats().catch(() => {});
   } catch (e) {
     console.error('[Push] initPush error:', e);
   }
 }
 
 initPush();
 // ─────────────────────────────────────
 // Auto ask notification permission
 // 3 second delay after site open
 // ─────────────────────────────────────
 setTimeout(async () => {
 
   if (!("Notification" in window)) return;
 
   if (Notification.permission === "default") {
 
     const permission = await Notification.requestPermission();
 
     if (permission === "granted") {
+      const reg = await getServiceWorkerRegistration();
+      let sub = await reg.pushManager.getSubscription();
+      if (!sub) {
+        sub = await reg.pushManager.subscribe({
+          userVisibleOnly: true,
+          applicationServerKey: urlBase64ToUint8Array(PUSH_VAPID_PUBLIC_KEY)
+        });
+      }
 
-      const reg = await navigator.serviceWorker.ready;
-
-      const sub = await reg.pushManager.subscribe({
-        userVisibleOnly: true,
-        applicationServerKey: urlBase64ToUint8Array(PUSH_VAPID_PUBLIC_KEY)
-      });
-
-      console.log("Push subscription created:", sub);
+      await saveSubscriptionToWorker(sub);
+      localStorage.setItem(VAPID_LS_KEY, PUSH_VAPID_PUBLIC_KEY);
+      console.log("[Push] Permission granted and subscription saved:", sub);
 
     }
 
   }
 
 }, 3000);
 
EOF
)
