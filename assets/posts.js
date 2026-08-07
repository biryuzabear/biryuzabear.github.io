// Reads posts.json (newest entry first) and renders it into the blog index,
// the homepage's latest-dispatches strip, and each post's older/newer links.
// One file backs all three so a new entry only has to be added once.

async function fetchPosts(jsonUrl) {
  const res = await fetch(jsonUrl);
  return res.json();
}

function formatPostDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function entryMarkup(post, hrefPrefix) {
  return `
    <a class="entry plate" href="${hrefPrefix}${post.slug}.html">
      <span class="date"><time datetime="${post.date}">${formatPostDate(post.date)}</time></span>
      <h3>${post.title}</h3>
      <span class="dek">${post.dek}</span>
    </a>`;
}

async function renderEntries(container, { jsonUrl, hrefPrefix = "", limit } = {}) {
  if (!container) return;
  const posts = await fetchPosts(jsonUrl);
  const list = limit ? posts.slice(0, limit) : posts;
  container.innerHTML = list.length
    ? list.map((p) => entryMarkup(p, hrefPrefix)).join("")
    : '<p class="empty plate">Nothing etched yet — first post lands here.</p>';
}

async function renderPostNav(container, { jsonUrl, slug, hrefPrefix = "", indexHref = "index.html" } = {}) {
  if (!container) return;
  const posts = await fetchPosts(jsonUrl);
  const i = posts.findIndex((p) => p.slug === slug);
  const older = i >= 0 && i < posts.length - 1 ? posts[i + 1] : null;
  container.innerHTML = `
    <a href="${indexHref}">&larr; All entries</a>
    ${older ? `<a href="${hrefPrefix}${older.slug}.html">Older: ${older.title} &rarr;</a>` : ""}`;
}

window.Cindersmith = window.Cindersmith || {};
Object.assign(window.Cindersmith, { renderEntries, renderPostNav });
