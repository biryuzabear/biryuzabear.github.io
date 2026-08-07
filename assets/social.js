// Reads social.json and renders it as compact icon buttons — used in the
// nav on every page. Hrefs are "#" until real accounts are wired in —
// that's a content edit to social.json, not a markup change.

const SOCIAL_ICONS = {
  x: '<path d="M5 5 L19 19 M19 5 L5 19"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="16.2" cy="7.8" r="0.9" fill="currentColor" stroke="none"/>',
  linkedin: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.3" cy="8.4" r="1" fill="currentColor" stroke="none"/><path d="M8.3 11 L8.3 16.5 M12 16.5 L12 12.6 C12 10.9 15.5 10.9 15.5 12.6 L15.5 16.5"/>',
  bluesky: '<path d="M12 10.5 C10.5 5.5 4.5 4.5 4.2 8 C4 10.8 8.5 11.8 12 17 C15.5 11.8 20 10.8 19.8 8 C19.5 4.5 13.5 5.5 12 10.5 Z"/>',
};

function iconSvg(key) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${SOCIAL_ICONS[key] || ""}</svg>`;
}

async function fetchSocial(jsonUrl) {
  const res = await fetch(jsonUrl);
  return res.json();
}

async function renderSocial(container, { jsonUrl } = {}) {
  if (!container) return;
  const links = await fetchSocial(jsonUrl);
  container.innerHTML = links
    .map((s) => `<a class="icon-btn" href="${s.href}" aria-label="${s.name}">${iconSvg(s.icon)}</a>`)
    .join("");
}

window.Cindersmith = window.Cindersmith || {};
Object.assign(window.Cindersmith, { renderSocial });
