const storagePrefix = "site-hodoki:v1";
const sessionKey = `${storagePrefix}:session`;
const firstSeenKey = `${storagePrefix}:first-seen`;

const createSessionId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replaceAll(/[018]/g, (value) =>
        (
          Number(value) ^
          (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(value) / 4)))
        ).toString(16),
      );

export const sessionId = (() => {
  const saved = localStorage.getItem(sessionKey);
  if (saved) return saved;
  const created = createSessionId();
  localStorage.setItem(sessionKey, created);
  return created;
})();

export const isAutomatedQa =
  new URLSearchParams(location.search).get("qa") === "1" || navigator.webdriver === true;

export const apiJson = async (path, options = {}) => {
  const headers = new Headers(options.headers);
  if (isAutomatedQa) headers.set("x-automated-qa", "1");
  const response = await fetch(path, { ...options, headers });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "request_failed");
    error.status = response.status;
    throw error;
  }
  return data;
};

export const setStatus = (target, message = "", state = "") => {
  if (!target) return;
  target.textContent = message;
  target.dataset.state = state;
};

export const track = (name, context = "") => {
  if (isAutomatedQa) return;
  void apiJson("/api/telemetry", {
    body: JSON.stringify({ context, name, sessionId }),
    headers: { "content-type": "application/json" },
    keepalive: true,
    method: "POST",
  }).catch(() => {});
};

export const trackVisit = () => {
  track("visited", "home");
  const today = new Date().toISOString().slice(0, 10);
  const firstSeen = localStorage.getItem(firstSeenKey);
  if (firstSeen && firstSeen !== today) track("returned", "home");
  else if (!firstSeen) localStorage.setItem(firstSeenKey, today);
};
