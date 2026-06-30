// pwa.js — registers the service worker. Kept as an external file (not inline)
// so its </script> can't terminate the bundler's JSON template tag.
// Service workers require a secure context: https:// or http://localhost.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("SW registered:", reg.scope))
      .catch((err) => console.warn("SW registration failed:", err));
  });
}
