export const HOME_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Trackline</title>
  <style>
    :root {
      --bg: #f6f2e9;
      --card: #ffffff;
      --text: #101418;
      --muted: #5f6772;
      --line: #d8d2c4;
      --accent: #0d766e;
      --ok: #0f7a3e;
      --warn: #9a3412;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif;
      background: radial-gradient(circle at top right, #fff5e8, var(--bg));
      color: var(--text);
    }

    .wrap {
      max-width: 860px;
      margin: 38px auto;
      padding: 0 20px 44px;
      display: grid;
      gap: 18px;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.03);
    }

    h1, h2 { margin: 0 0 12px; line-height: 1.2; }
    h1 { font-size: 28px; }
    h2 { font-size: 18px; }
    p, li { margin: 0; line-height: 1.45; }
    ul { margin: 4px 0 0; padding-left: 18px; display: grid; gap: 10px; }

    .status {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: #fffaf2;
      font-size: 14px;
    }

    .status.ok { border-color: #9ed8b1; background: #ecfff4; color: var(--ok); }
    .status.warn { border-color: #f1c3a8; background: #fff3ed; color: var(--warn); }

    a { color: var(--accent); text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }

    code {
      font-size: 13px;
      background: #f9f5ef;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 2px 6px;
    }

    pre {
      margin: 0;
      padding: 14px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: #f9f5ef;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 13px;
    }

    .muted { color: var(--muted); font-size: 13px; }
    .top-note { margin-top: 14px; }
    .top-note code { margin-left: 4px; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <h1>Trackline</h1>
      <p>Apple Music now-playing API.</p>
      <div id="status" class="status">Checking configuration...</div>
      <p class="muted top-note">Need onboarding? Open <a href="/setup">/setup</a>.</p>
      <p id="tokenHint" class="muted top-note hidden"></p>
    </section>

    <section class="card">
      <h2>Endpoints</h2>
      <ul>
        <li><a href="/now-playing"><code>GET /now-playing</code></a></li>
        <li><a href="/health"><code>GET /health</code></a></li>
        <li><a href="/dev-token"><code>GET /dev-token</code></a></li>
        <li><a href="/config-status"><code>GET /config-status</code></a></li>
        <li><a href="/setup"><code>GET /setup</code></a></li>
      </ul>
    </section>

    <section class="card">
      <h2>Now Playing Preview</h2>
      <pre id="nowPlaying">Waiting for configuration...</pre>
    </section>
  </main>

  <script>
    const statusEl = document.getElementById('status');
    const nowPlayingEl = document.getElementById('nowPlaying');
    const tokenHintEl = document.getElementById('tokenHint');
    const search = new URLSearchParams(window.location.search);
    const setupToken = search.get('token') || '';
    const nowPlayingToken = search.get('np_token') || setupToken;

    function withToken(path, token) {
      if (!token) {
        return path;
      }
      const url = new URL(path, window.location.origin);
      url.searchParams.set('token', token);
      return url.pathname + url.search;
    }

    if (setupToken) {
      tokenHintEl.classList.remove('hidden');
      tokenHintEl.innerHTML = 'Setup token active from URL query.';
      const setupLink = document.querySelector('a[href="/setup"]');
      if (setupLink) {
        setupLink.href = withToken('/setup', setupToken);
      }
      document.querySelectorAll('a[href="/dev-token"], a[href="/config-status"]').forEach((link) => {
        link.href = withToken(link.getAttribute('href'), setupToken);
      });
    }
    if (nowPlayingToken) {
      const nowPlayingLink = document.querySelector('a[href="/now-playing"]');
      if (nowPlayingLink) {
        nowPlayingLink.href = withToken('/now-playing', nowPlayingToken);
      }
    }

    async function refreshStatus() {
      try {
        const res = await fetch(withToken('/config-status', setupToken));
        const data = await res.json();

        if (data.readyForPolling) {
          statusEl.className = 'status ok';
          statusEl.textContent = 'Ready. Polling is configured.';
          await refreshNowPlaying();
          return;
        }

        statusEl.className = 'status warn';
        statusEl.textContent = 'Setup required: ' + data.missingForPolling.join(', ');
        nowPlayingEl.textContent = 'Configuration missing. Open /setup.';
      } catch (err) {
        statusEl.className = 'status warn';
        statusEl.textContent = 'Could not load status: ' + err.message;
      }
    }

    async function refreshNowPlaying() {
      try {
        const res = await fetch(withToken('/now-playing', nowPlayingToken));
        const data = await res.json();
        nowPlayingEl.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        nowPlayingEl.textContent = 'Could not fetch /now-playing: ' + err.message;
      }
    }

    refreshStatus();
    setInterval(refreshStatus, 15_000);
    setInterval(refreshNowPlaying, 15_000);
  </script>
</body>
</html>`;
