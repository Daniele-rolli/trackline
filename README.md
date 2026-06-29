# Trackline

Self-hosted Apple Music now-playing API for your website.

[![Docker](https://github.com/Daniele-rolli/trackline/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/Daniele-rolli/trackline/actions/workflows/docker-publish.yml)

The service polls Apple Music `recently played` and exposes:
- `GET /` (browser landing page: endpoints + now-playing preview)
- `GET /now-playing` — current track with synced lyrics
- `GET /health`
- `GET /dev-token` (setup helper, can be protected)
- `GET /config-status` (setup/runtime state, can be protected)
- `GET /setup` (guided onboarding page, can be protected)

## Security defaults

- Service bind host defaults to `127.0.0.1` (`HOST` env var).
- Docker Compose publishes port on localhost only: `127.0.0.1:${PORT}:3000`.
- Docker runs the app with `HOST=0.0.0.0` internally so published ports work correctly.
- CORS is disabled by default (`ALLOWED_ORIGIN=`). Set a specific origin only when needed.
- Optional host allow-list via `ALLOWED_HOSTS=your.domain.com`.
- HTTPS enforcement toggle via `REQUIRE_HTTPS` (auto-enabled when `HOST` is not `127.0.0.1`).
- `SETUP_AUTH_TOKEN` protects: `/`, `/setup`, `/config-status`, `/dev-token`, `/setup/save-env`.
- `NOW_PLAYING_AUTH_TOKEN` can protect `/now-playing`.
- `SETUP_AUTH_REQUIRED` defaults to auto (`true` for non-localhost/public-host mode).
- In production, send tokens via `Authorization: Bearer ...` (query tokens are supported for convenience but can appear in logs).
- Setup routes can be fully disabled via `SETUP_ENABLED=false`.
- Per-IP fixed-window limits:
  - `RATE_LIMIT_NOW_PLAYING`
  - `RATE_LIMIT_SETUP`
  - `RATE_LIMIT_DEV_TOKEN`
  - `RATE_LIMIT_WINDOW_MS`
- Secrets are ignored in git via `.gitignore` (`.env`, `runtime/.env`).

## Public Domain profile

When exposing behind a domain + reverse proxy:

1. Keep app bound internally and proxied:
- Docker publishes on host loopback `127.0.0.1:${PORT}:3000` while app binds `0.0.0.0` inside the container.
- Ensure proxy forwards `Host` and `X-Forwarded-Proto`.

2. Set strict host/protocol controls:
- `ALLOWED_HOSTS=your.domain.com`
- `REQUIRE_HTTPS=true`

3. Lock setup down:
- set `SETUP_AUTH_TOKEN=<long random token>`
- complete onboarding
- set `SETUP_ENABLED=false`

4. Protect read endpoint if needed:
- set `NOW_PLAYING_AUTH_TOKEN=<long random token>`

5. Keep CORS minimal:
- if browser client needs direct API access, set exact origin in `ALLOWED_ORIGIN`
- otherwise leave it empty

## Docker Image + Compose Snippet

A pre-built image is published to **GitHub Container Registry** on every push to `main` and each version tag:

```bash
docker pull ghcr.io/daniele-rolli/trackline:latest
```

To build locally instead:

```bash
yarn docker:build
# or: docker build -t trackline:latest .
```

2. In your Docker stack folder, create files:

```bash
mkdir -p trackline/runtime
cp /path/to/this/repo/.env.example trackline/.env
touch trackline/runtime/.env
```

3. Paste this service into your own `docker-compose.yml` (also in [docker-compose.snippet.yml](./docker-compose.snippet.yml)):

```yaml
services:
  trackline:
    image: ghcr.io/daniele-rolli/trackline:latest
    container_name: trackline
    init: true
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      HOST: 0.0.0.0
      PORT: 3000
    env_file:
      - ./trackline/.env
      - ./trackline/runtime/.env
    volumes:
      - ./trackline/runtime:/app/runtime
      # Optional when using APPLE_PRIVATE_KEY_PATH:
      # - ./trackline/AuthKey_XXXXXXXXXX.p8:/run/secrets/apple/AuthKey.p8:ro
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
```

4. Fill base values in `trackline/.env`:
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- one private key source:
  - `APPLE_PRIVATE_KEY` (single line with `\n` escaped newlines), or
  - `APPLE_PRIVATE_KEY_PATH` (path to mounted `.p8` file inside container)
- recommended:
  - `SETUP_AUTH_TOKEN` (long random token)
  - `NOW_PLAYING_AUTH_TOKEN` (if `/now-playing` should not be public)
  - `ALLOWED_HOSTS` and `REQUIRE_HTTPS=true` when using a public domain

5. Start container:

```bash
docker compose up -d
```

## Setup Flow (container-first)

1. Open setup page:
- If setup auth is disabled:
  - [http://localhost:3000/setup](http://localhost:3000/setup)
- If setup auth is enabled:
  - `http://localhost:3000/setup?token=YOUR_SETUP_AUTH_TOKEN`

2. In `/setup`:
- Generate a complete `.env` block from the form
- Save env directly to `runtime/.env`
- Generate a developer JWT from `/dev-token`
- Authorize with Apple and copy `APPLE_MUSIC_USER_TOKEN`

3. Restart to apply latest env values:

```bash
docker compose up -d --force-recreate
```

4. (Recommended for production) disable setup endpoints:
- set `SETUP_ENABLED=false` in `runtime/.env`
- restart container

After this one-time flow, open `/` to see available endpoints and a browser preview of `/now-playing`.

## Optional local setup helper

```bash
yarn setup
```

It installs dependencies, creates `.env` if missing, and prints the Docker-first next steps.

## Environment example

```env
APPLE_TEAM_ID=ABC1234567
APPLE_KEY_ID=XYZ9876543
# Option A: inline key
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# Option B: file path inside container
APPLE_PRIVATE_KEY_PATH=/run/secrets/apple/AuthKey.p8
APPLE_MUSIC_USER_TOKEN=
HOST=127.0.0.1
ALLOWED_ORIGIN=
ALLOWED_HOSTS=
POLL_INTERVAL_MS=10000
IS_PLAYING_GRACE_MS=15000
PORT=3000
SETUP_AUTH_TOKEN=your-long-random-token
NOW_PLAYING_AUTH_TOKEN=
# Leave empty for auto: false on HOST=127.0.0.1, true otherwise.
REQUIRE_HTTPS=
SETUP_ENABLED=true
# Leave empty for auto: false on localhost-only mode, true otherwise.
SETUP_AUTH_REQUIRED=
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_NOW_PLAYING=120
RATE_LIMIT_SETUP=30
RATE_LIMIT_DEV_TOKEN=10
```

## API example

`GET /now-playing`

If `NOW_PLAYING_AUTH_TOKEN` is set, include it:

```bash
curl -H "Authorization: Bearer $NOW_PLAYING_AUTH_TOKEN" http://localhost:3000/now-playing
```

```json
{
  "track": {
    "name": "Song Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "albumArt": "https://is1-ssl.mzstatic.com/...",
    "isPlaying": true,
    "source": "recently-played"
  },
  "lyrics": [
    { "time": 13.42, "text": "This is the first lyric line" },
    { "time": 17.88, "text": "This is the second lyric line" }
  ],
  "fetchedAt": 1712345678901,
  "error": null
}
```

Lyrics are fetched from [LRCLib](https://lrclib.net/) when a new track is detected and cached in-memory so each unique song is fetched at most once per server lifetime.

## Notes

- Apple MusicKit REST does not expose a reliable real-time "currently playing now" flag.
- `isPlaying` is best-effort and inferred after this service observes a track transition, then timing that track window against duration.
- Tune `IS_PLAYING_GRACE_MS` to control how long after expected track end `isPlaying` may stay `true` (default `15000`).

## License

MIT. See [LICENSE](./LICENSE).
