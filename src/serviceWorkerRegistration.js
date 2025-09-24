// serviceWorkerRegistration.js
// Simple placeholder if you don't need custom service worker logic

// Change to `register()` to enable offline/PWA features
export function register() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("ServiceWorker registered: ", registration);
        })
        .catch((error) => {
          console.log("ServiceWorker registration failed: ", error);
        });
    });
  }
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
