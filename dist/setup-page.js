export const SETUP_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Trackline Setup</title>
  <script src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"></script>
  <style>
    :root {
      --bg: #f4f1ea;
      --card: #ffffff;
      --text: #141414;
      --muted: #666;
      --line: #ddd3c4;
      --accent: #0f766e;
      --accent-2: #0b5b55;
      --ok: #0f7a3e;
      --warn: #9a3412;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif;
      background: radial-gradient(circle at top right, #fef6ea, var(--bg));
      color: var(--text);
      line-height: 1.45;
    }

    .wrap {
      max-width: 920px;
      margin: 36px auto;
      padding: 0 20px 46px;
      display: grid;
      gap: 18px;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 22px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.03);
    }

    h1, h2, h3 { margin: 0 0 12px; line-height: 1.2; }
    h1 { font-size: 28px; }
    h2 { font-size: 21px; }
    h3 { font-size: 16px; margin-bottom: 10px; }
    p, li { font-size: 15px; margin: 0; }
    ol { margin: 10px 0 0; padding-left: 20px; display: grid; gap: 8px; }

    .grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .full { grid-column: 1 / -1; }

    label {
      display: grid;
      gap: 8px;
      font-size: 14px;
      color: var(--muted);
      font-weight: 600;
    }

    input, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 14px;
      background: #fff;
      color: var(--text);
      font-family: inherit;
    }

    textarea {
      min-height: 96px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    .radio-row {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fffaf2;
    }

    .radio-row label {
      display: inline-flex;
      gap: 7px;
      align-items: center;
      margin: 0;
      color: var(--text);
      font-weight: 600;
      cursor: pointer;
    }

    .radio-row input { width: auto; margin: 0; }

    .status {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--line);
      font-size: 14px;
      background: #fffaf2;
      white-space: pre-wrap;
    }

    .status.ok { border-color: #9ed8b1; background: #ecfff4; color: var(--ok); }
    .status.warn { border-color: #f1c3a8; background: #fff3ed; color: var(--warn); }

    .actions { display: flex; gap: 12px; flex-wrap: wrap; }

    button {
      background: var(--accent);
      border: 0;
      color: #fff;
      padding: 11px 16px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }

    button:hover { background: var(--accent-2); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    code {
      background: #f9f5ef;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 2px 6px;
      font-size: 13px;
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
      max-height: 320px;
      overflow: auto;
    }

    .small { color: var(--muted); font-size: 13px; }
    .mt-8 { margin-top: 8px; }
    .mt-12 { margin-top: 12px; }
    .mt-14 { margin-top: 14px; }
    .hidden { display: none; }

    @media (max-width: 720px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <h1>Trackline Setup</h1>
      <p>Use this page to generate your <code>.env</code>, create tokens, and finish onboarding in one flow.</p>
      <div id="configStatus" class="status">Checking current runtime config...</div>
      <p id="setupTokenNotice" class="small mt-8 hidden"></p>
    </section>

    <section class="card">
      <h2>1. Apple MusicKit key</h2>
      <ol>
        <li>Open <a href="https://developer.apple.com/account/resources/authkeys/list" target="_blank" rel="noreferrer">Apple Developer Keys</a>.</li>
        <li>Create a key with <strong>Media Services (MusicKit)</strong> enabled.</li>
        <li>Download <code>AuthKey_XXXXXXXXXX.p8</code> (one-time download).</li>
        <li>Collect your <code>APPLE_TEAM_ID</code> and <code>APPLE_KEY_ID</code>.</li>
      </ol>
    </section>

    <section class="card">
      <h2>2. Build your .env</h2>
      <p class="small">Use an inline private key or a mounted <code>.p8</code> path. Keep auth tokens long and random.</p>

      <div class="grid mt-12">
        <label>
          APPLE_TEAM_ID
          <input id="teamId" placeholder="ABC1234567" />
        </label>
        <label>
          APPLE_KEY_ID
          <input id="keyId" placeholder="XYZ9876543" />
        </label>

        <div class="full">
          <label>Private key mode</label>
          <div class="radio-row">
            <label><input type="radio" name="keyMode" value="inline" checked /> Inline <code>APPLE_PRIVATE_KEY</code></label>
            <label><input type="radio" name="keyMode" value="path" /> File path <code>APPLE_PRIVATE_KEY_PATH</code></label>
          </div>
        </div>

        <label id="inlineKeyWrap" class="full">
          APPLE_PRIVATE_KEY (paste full key)
          <textarea id="privateKey" placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"></textarea>
        </label>

        <label id="pathKeyWrap" class="full hidden">
          APPLE_PRIVATE_KEY_PATH (inside service runtime)
          <input id="privateKeyPath" placeholder="/run/secrets/apple/AuthKey.p8" value="/run/secrets/apple/AuthKey.p8" />
        </label>

        <label class="full">
          APPLE_MUSIC_USER_TOKEN
          <textarea id="userToken" placeholder="Will be filled after Apple authorization"></textarea>
        </label>

        <label>
          HOST
          <input id="host" value="127.0.0.1" />
        </label>
        <label>
          PORT
          <input id="port" value="3000" />
        </label>
        <label>
          ALLOWED_ORIGIN
          <input id="allowedOrigin" value="" placeholder="https://yourdomain.com (leave empty to disable CORS)" />
        </label>
        <label>
          ALLOWED_HOSTS
          <input id="allowedHosts" value="" placeholder="music.example.com,www.music.example.com" />
        </label>
        <label>
          POLL_INTERVAL_MS
          <input id="pollMs" value="10000" />
        </label>
        <label>
          IS_PLAYING_GRACE_MS
          <input id="graceMs" value="15000" />
        </label>
        <label class="full">
          SETUP_AUTH_TOKEN (protects setup endpoints)
          <input id="setupAuthToken" placeholder="long-random-token" />
        </label>
        <label class="full">
          NOW_PLAYING_AUTH_TOKEN (optional protection for /now-playing)
          <input id="nowPlayingAuthToken" placeholder="long-random-token" />
        </label>
        <label>
          REQUIRE_HTTPS
          <input id="requireHttps" value="true" />
        </label>
        <label>
          SETUP_ENABLED
          <input id="setupEnabled" value="true" />
        </label>
        <label>
          SETUP_AUTH_REQUIRED
          <input id="setupAuthRequired" value="true" />
        </label>
        <label>
          RATE_LIMIT_WINDOW_MS
          <input id="rateLimitWindowMs" value="60000" />
        </label>
        <label>
          RATE_LIMIT_NOW_PLAYING
          <input id="rateLimitNowPlaying" value="120" />
        </label>
        <label>
          RATE_LIMIT_SETUP
          <input id="rateLimitSetup" value="30" />
        </label>
        <label>
          RATE_LIMIT_DEV_TOKEN
          <input id="rateLimitDevToken" value="10" />
        </label>
      </div>

      <div class="actions mt-12">
        <button onclick="generateOutputs()">Generate .env</button>
        <button onclick="copyEnvOutput()">Copy .env</button>
        <button onclick="saveEnvToServer()">Save to runtime/.env</button>
      </div>

      <h3 class="mt-14">Generated .env</h3>
      <pre id="envOut">Click "Generate .env".</pre>
      <div id="saveStatus" class="status mt-12">Not saved yet.</div>
      <p class="small mt-8">This saves env to <code>runtime/.env</code>. Docker Compose can read that file directly.</p>
    </section>

    <section class="card">
      <h2>3. Generate developer token</h2>
      <p>After env values are loaded in the running service, this endpoint should work:</p>
      <div class="actions mt-12">
        <button id="fetchDevTokenBtn" onclick="fetchDevToken()">Generate from /dev-token</button>
        <button onclick="copyDevToken()">Copy developer token</button>
      </div>
      <textarea id="devToken" placeholder="Developer JWT will appear here or paste one manually"></textarea>
    </section>

    <section class="card">
      <h2>4. Authorize Apple account</h2>
      <p>Use the developer token above, then authorize to obtain <code>APPLE_MUSIC_USER_TOKEN</code>.</p>
      <div class="actions mt-12">
        <button id="authBtn" onclick="authorize()">Authorize with Apple</button>
        <button onclick="copyUserToken()">Copy user token</button>
      </div>
      <pre id="tokenOut">No user token yet.</pre>
    </section>

    <section class="card">
      <h2>5. Finalize</h2>
      <ol>
        <li>Save env from this page to <code>runtime/.env</code>.</li>
        <li>If setup auth is enabled, open setup as <code>/setup?token=SETUP_AUTH_TOKEN</code>.</li>
        <li>For public domain mode: set <code>ALLOWED_HOSTS</code>, <code>REQUIRE_HTTPS=true</code>, then set <code>SETUP_ENABLED=false</code> after onboarding.</li>
        <li>Open <a href="/">/</a> (or <code>/?token=SETUP_AUTH_TOKEN</code>) for endpoint list and now-playing preview.</li>
      </ol>
    </section>
  </main>

  <script>
    const $ = (id) => document.getElementById(id);
    const search = new URLSearchParams(window.location.search);
    const setupToken = search.get('token') || '';

    function withSetupToken(path) {
      if (!setupToken) {
        return path;
      }
      const url = new URL(path, window.location.origin);
      url.searchParams.set('token', setupToken);
      return url.pathname + url.search;
    }

    function getKeyMode() {
      const selected = document.querySelector('input[name="keyMode"]:checked');
      return selected ? selected.value : 'inline';
    }

    function escapeEnv(value) {
      return String(value).replace(/"/g, '\\"');
    }

    function normalizeInlinePrivateKey(value) {
      const trimmed = String(value).trim();
      if (!trimmed) {
        return '';
      }
      return trimmed.replace(/\\r\\n/g, '\\n').replace(/\\n/g, '\\\\n');
    }

    function toggleKeyMode() {
      const mode = getKeyMode();
      $('inlineKeyWrap').classList.toggle('hidden', mode !== 'inline');
      $('pathKeyWrap').classList.toggle('hidden', mode !== 'path');
      generateOutputs();
    }

    function envLine(key, value) {
      return key + '=' + value;
    }

    function buildEnvOutput() {
      const mode = getKeyMode();
      const lines = [];

      lines.push(envLine('APPLE_TEAM_ID', $('teamId').value.trim()));
      lines.push(envLine('APPLE_KEY_ID', $('keyId').value.trim()));

      if (mode === 'inline') {
        const privateKey = normalizeInlinePrivateKey($('privateKey').value);
        lines.push(envLine('APPLE_PRIVATE_KEY', '"' + escapeEnv(privateKey) + '"'));
      } else {
        lines.push(envLine('APPLE_PRIVATE_KEY_PATH', $('privateKeyPath').value.trim()));
      }

      lines.push(envLine('APPLE_MUSIC_USER_TOKEN', $('userToken').value.trim()));
      lines.push(envLine('HOST', $('host').value.trim() || '127.0.0.1'));
      lines.push(envLine('PORT', $('port').value.trim() || '3000'));
      lines.push(envLine('ALLOWED_ORIGIN', $('allowedOrigin').value.trim()));
      lines.push(envLine('ALLOWED_HOSTS', $('allowedHosts').value.trim()));
      lines.push(envLine('POLL_INTERVAL_MS', $('pollMs').value.trim() || '10000'));
      lines.push(envLine('IS_PLAYING_GRACE_MS', $('graceMs').value.trim() || '15000'));
      lines.push(envLine('SETUP_AUTH_TOKEN', $('setupAuthToken').value.trim()));
      lines.push(envLine('NOW_PLAYING_AUTH_TOKEN', $('nowPlayingAuthToken').value.trim()));
      lines.push(envLine('REQUIRE_HTTPS', $('requireHttps').value.trim() || 'true'));
      lines.push(envLine('SETUP_ENABLED', $('setupEnabled').value.trim() || 'true'));
      lines.push(envLine('SETUP_AUTH_REQUIRED', $('setupAuthRequired').value.trim() || 'true'));
      lines.push(envLine('RATE_LIMIT_WINDOW_MS', $('rateLimitWindowMs').value.trim() || '60000'));
      lines.push(envLine('RATE_LIMIT_NOW_PLAYING', $('rateLimitNowPlaying').value.trim() || '120'));
      lines.push(envLine('RATE_LIMIT_SETUP', $('rateLimitSetup').value.trim() || '30'));
      lines.push(envLine('RATE_LIMIT_DEV_TOKEN', $('rateLimitDevToken').value.trim() || '10'));
      return lines.join('\\n');
    }

    function generateOutputs() {
      $('envOut').textContent = buildEnvOutput();
    }

    async function copyText(value, successMsg) {
      await navigator.clipboard.writeText(value);
      alert(successMsg);
    }

    async function copyEnvOutput() {
      await copyText($('envOut').textContent, 'Copied .env block.');
    }

    async function saveEnvToServer() {
      const saveStatus = $('saveStatus');
      const content = $('envOut').textContent || '';

      if (!content.trim()) {
        saveStatus.className = 'status warn mt-12';
        saveStatus.textContent = 'Generate env before saving.';
        return;
      }
      if (!content.includes('APPLE_TEAM_ID=') || !content.includes('APPLE_KEY_ID=')) {
        saveStatus.className = 'status warn mt-12';
        saveStatus.textContent = 'Generated env looks incomplete. Click "Generate .env" first.';
        return;
      }

      saveStatus.className = 'status';
      saveStatus.textContent = 'Saving runtime/.env...';

      try {
        const res = await fetch(withSetupToken('/setup/save-env'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to save runtime env file.');
        }

        saveStatus.className = 'status ok mt-12';
        saveStatus.textContent = 'Saved to ' + data.path;
      } catch (err) {
        saveStatus.className = 'status warn mt-12';
        saveStatus.textContent = 'Save failed: ' + err.message;
      }
    }

    async function copyDevToken() {
      const value = $('devToken').value.trim();
      if (!value) {
        alert('No developer token to copy.');
        return;
      }
      await copyText(value, 'Copied developer token.');
    }

    async function copyUserToken() {
      const value = $('tokenOut').textContent;
      if (!value || value === 'No user token yet.') {
        alert('No user token to copy yet.');
        return;
      }
      await copyText(value, 'Copied user token.');
    }

    async function refreshStatus() {
      const statusEl = $('configStatus');
      try {
        const res = await fetch(withSetupToken('/config-status'));
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load config status.');
        }

        if (data.current) {
          $('host').value = String(data.current.HOST || '127.0.0.1');
          $('port').value = String(data.current.PORT || 3000);
          $('allowedOrigin').value = String(data.current.ALLOWED_ORIGIN || '');
          $('allowedHosts').value = String((data.current.ALLOWED_HOSTS || []).join(','));
          $('pollMs').value = String(data.current.POLL_INTERVAL_MS || 10000);
          $('graceMs').value = String(data.current.IS_PLAYING_GRACE_MS || 15000);
          $('requireHttps').value = String(data.current.REQUIRE_HTTPS ?? true);
          $('setupEnabled').value = String(data.current.SETUP_ENABLED ?? true);
          $('setupAuthRequired').value = String(data.current.SETUP_AUTH_REQUIRED ?? true);
        }

        if (data.security) {
          $('rateLimitWindowMs').value = String(data.security.rateLimitWindowMs || 60000);
          $('rateLimitNowPlaying').value = String(data.security.rateLimitNowPlaying || 120);
          $('rateLimitSetup').value = String(data.security.rateLimitSetup || 30);
          $('rateLimitDevToken').value = String(data.security.rateLimitDevToken || 10);
        }

        if (data.privateKey && data.privateKey.source === 'file') {
          const pathMode = document.querySelector('input[name="keyMode"][value="path"]');
          if (pathMode) {
            pathMode.checked = true;
          }
          toggleKeyMode();
        }

        const missing = (data.missingForPolling || []).join(', ');
        if (data.readyForPolling) {
          statusEl.className = 'status ok';
          statusEl.textContent = 'Runtime status: ready for polling.';
        } else {
          statusEl.className = 'status warn';
          let message = 'Runtime status: setup required. Missing: ' + missing;
          if (data.privateKey && data.privateKey.error) {
            message += '\\n' + data.privateKey.error;
          }
          statusEl.textContent = message;
        }

        if (data.runtimeEnv && data.runtimeEnv.exists) {
          $('saveStatus').className = 'status ok mt-12';
          $('saveStatus').textContent = 'runtime env found at ' + data.runtimeEnv.path;
        }

        if (setupToken) {
          $('setupTokenNotice').classList.remove('hidden');
          $('setupTokenNotice').textContent = 'Setup token is active from URL query.';
        } else if (data.security && data.security.setupAuthEnabled) {
          $('setupTokenNotice').classList.remove('hidden');
          $('setupTokenNotice').textContent = 'Setup auth is enabled. Reopen with ?token=SETUP_AUTH_TOKEN.';
        }

        generateOutputs();
      } catch (err) {
        statusEl.className = 'status warn';
        statusEl.textContent = 'Could not load /config-status: ' + err.message;
      }
    }

    async function fetchDevToken() {
      const btn = $('fetchDevTokenBtn');
      btn.disabled = true;
      try {
        const res = await fetch(withSetupToken('/dev-token'));
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to generate token');
        }
        $('devToken').value = data.token || '';
      } catch (err) {
        alert(err.message);
      } finally {
        btn.disabled = false;
      }
    }

    async function authorize() {
      const devToken = $('devToken').value.trim();
      if (!devToken) {
        alert('Generate or paste a developer JWT first.');
        return;
      }

      const authBtn = $('authBtn');
      authBtn.disabled = true;

      try {
        await MusicKit.configure({
          developerToken: devToken,
          app: { name: 'trackline-auth', build: '1.0' }
        });

        const music = MusicKit.getInstance();
        const userToken = await music.authorize();
        $('tokenOut').textContent = userToken;
        $('userToken').value = userToken;
        generateOutputs();
      } catch (err) {
        alert('Authorization failed: ' + err.message);
      } finally {
        authBtn.disabled = false;
      }
    }

    document.querySelectorAll('input[name="keyMode"]').forEach((el) => {
      el.addEventListener('change', toggleKeyMode);
    });

    [
      'teamId',
      'keyId',
      'privateKey',
      'privateKeyPath',
      'userToken',
      'host',
      'port',
      'allowedOrigin',
      'allowedHosts',
      'pollMs',
      'graceMs',
      'setupAuthToken',
      'nowPlayingAuthToken',
      'requireHttps',
      'setupEnabled',
      'setupAuthRequired',
      'rateLimitWindowMs',
      'rateLimitNowPlaying',
      'rateLimitSetup',
      'rateLimitDevToken'
    ].forEach((id) => {
      const el = $(id);
      el.addEventListener('input', generateOutputs);
    });

    toggleKeyMode();
    refreshStatus();
  </script>
</body>
</html>`;
