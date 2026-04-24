import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { SignJWT, importPKCS8 } from "jose";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { isAbsolute, resolve } from "path";
import { HOME_PAGE } from "./home-page.js";
import { SETUP_PAGE } from "./setup-page.js";
function loadEnvFile(filepath) {
    try {
        const raw = readFileSync(filepath, "utf8");
        const re = /^([A-Z_][A-Z0-9_]*)=("[\s\S]*?(?<!\\)"|[^\n]*)/gm;
        let m;
        while ((m = re.exec(raw)) !== null) {
            const key = m[1];
            let value = m[2];
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            process.env[key] ??= value;
        }
    }
    catch {
        // Ignore missing local env files.
    }
}
// Load env files for local runs (runtime/.env takes precedence).
// In Docker, env vars are passed at runtime.
try {
    const envFiles = [resolve(process.cwd(), "runtime/.env"), resolve(process.cwd(), ".env")];
    for (const filepath of envFiles) {
        loadEnvFile(filepath);
    }
}
catch {
    // Ignore local env loading errors.
}
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID ?? "";
const APPLE_KEY_ID = process.env.APPLE_KEY_ID ?? "";
const APPLE_PRIVATE_KEY_INLINE = process.env.APPLE_PRIVATE_KEY ?? "";
const APPLE_PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH ?? "";
const APPLE_MUSIC_USER_TOKEN = process.env.APPLE_MUSIC_USER_TOKEN ?? "";
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 10_000);
const IS_PLAYING_GRACE_MS = Number(process.env.IS_PLAYING_GRACE_MS ?? 15_000);
const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 3000);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "";
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
const SETUP_AUTH_REQUIRED_RAW = process.env.SETUP_AUTH_REQUIRED;
const SETUP_AUTH_REQUIRED_VALUE = SETUP_AUTH_REQUIRED_RAW && SETUP_AUTH_REQUIRED_RAW.trim().length > 0
    ? SETUP_AUTH_REQUIRED_RAW
    : HOST === "127.0.0.1" && ALLOWED_HOSTS.length === 0
        ? "false"
        : "true";
const SETUP_AUTH_REQUIRED = SETUP_AUTH_REQUIRED_VALUE.trim().toLowerCase() === "true";
const SETUP_AUTH_TOKEN = process.env.SETUP_AUTH_TOKEN ?? "";
const NOW_PLAYING_AUTH_TOKEN = process.env.NOW_PLAYING_AUTH_TOKEN ?? "";
const REQUIRE_HTTPS_RAW = process.env.REQUIRE_HTTPS;
const REQUIRE_HTTPS_VALUE = REQUIRE_HTTPS_RAW && REQUIRE_HTTPS_RAW.trim().length > 0
    ? REQUIRE_HTTPS_RAW
    : HOST === "127.0.0.1"
        ? "false"
        : "true";
const REQUIRE_HTTPS = REQUIRE_HTTPS_VALUE.trim().toLowerCase() === "true";
const SETUP_ENABLED = (process.env.SETUP_ENABLED ?? "true").trim().toLowerCase() !== "false";
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const RATE_LIMIT_NOW_PLAYING = Number(process.env.RATE_LIMIT_NOW_PLAYING ?? 120);
const RATE_LIMIT_SETUP = Number(process.env.RATE_LIMIT_SETUP ?? 30);
const RATE_LIMIT_DEV_TOKEN = Number(process.env.RATE_LIMIT_DEV_TOKEN ?? 10);
const RUNTIME_DIR = resolve(process.cwd(), "runtime");
const RUNTIME_ENV_PATH = resolve(RUNTIME_DIR, ".env");
const rateLimitWindows = new Map();
function resolvePrivateKeyConfig() {
    const inline = APPLE_PRIVATE_KEY_INLINE.trim();
    if (inline.length > 0) {
        return {
            value: inline.replace(/\\n/g, "\n"),
            source: "env",
            resolvedPath: null,
            error: null,
        };
    }
    const fromPath = APPLE_PRIVATE_KEY_PATH.trim();
    if (fromPath.length === 0) {
        return {
            value: "",
            source: "missing",
            resolvedPath: null,
            error: null,
        };
    }
    const resolvedPath = isAbsolute(fromPath) ? fromPath : resolve(process.cwd(), fromPath);
    try {
        const value = readFileSync(resolvedPath, "utf8").trim();
        if (!value) {
            return {
                value: "",
                source: "file",
                resolvedPath,
                error: `APPLE_PRIVATE_KEY_PATH points to an empty file: ${resolvedPath}`,
            };
        }
        return {
            value,
            source: "file",
            resolvedPath,
            error: null,
        };
    }
    catch (err) {
        return {
            value: "",
            source: "file",
            resolvedPath,
            error: `Could not read APPLE_PRIVATE_KEY_PATH (${resolvedPath}): ${String(err)}`,
        };
    }
}
const privateKeyConfig = resolvePrivateKeyConfig();
const APPLE_PRIVATE_KEY = privateKeyConfig.value;
function missingForDevToken() {
    const missing = [];
    if (!APPLE_TEAM_ID.trim()) {
        missing.push("APPLE_TEAM_ID");
    }
    if (!APPLE_KEY_ID.trim()) {
        missing.push("APPLE_KEY_ID");
    }
    if (!APPLE_PRIVATE_KEY.trim()) {
        missing.push("APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH");
    }
    return missing;
}
function missingForPolling() {
    const missing = missingForDevToken();
    if (!APPLE_MUSIC_USER_TOKEN.trim()) {
        missing.push("APPLE_MUSIC_USER_TOKEN");
    }
    return missing;
}
function setupErrorMessage(missing) {
    const base = `Missing required env: ${missing.join(", ")}. Open /setup to complete onboarding.`;
    if (privateKeyConfig.error) {
        return `${base} ${privateKeyConfig.error}`;
    }
    return base;
}
function requestToken(c) {
    const authHeader = c.req.header("authorization") ?? "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
        return authHeader.slice(7).trim();
    }
    const explicitHeader = c.req.header("x-access-token") ?? c.req.header("x-setup-token") ?? "";
    if (explicitHeader.trim()) {
        return explicitHeader.trim();
    }
    return (c.req.query("token") ?? "").trim();
}
function clientIp(c) {
    const xForwardedFor = c.req.header("x-forwarded-for");
    if (xForwardedFor) {
        return xForwardedFor.split(",")[0].trim();
    }
    const xRealIp = c.req.header("x-real-ip");
    if (xRealIp) {
        return xRealIp.trim();
    }
    const cfConnectingIp = c.req.header("cf-connecting-ip");
    if (cfConnectingIp) {
        return cfConnectingIp.trim();
    }
    return "unknown";
}
function requestHost(c) {
    const xForwardedHost = c.req.header("x-forwarded-host");
    const hostHeader = xForwardedHost?.split(",")[0].trim() || c.req.header("host") || "";
    return hostHeader.toLowerCase().replace(/:\d+$/, "");
}
function isLocalHost(host) {
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
function requestProto(c) {
    const xForwardedProto = c.req.header("x-forwarded-proto");
    if (xForwardedProto) {
        return xForwardedProto.split(",")[0].trim().toLowerCase();
    }
    try {
        return new URL(c.req.url).protocol.replace(":", "").toLowerCase();
    }
    catch {
        return "http";
    }
}
function requireAllowedHost(c) {
    if (ALLOWED_HOSTS.length === 0) {
        return null;
    }
    const host = requestHost(c);
    if (ALLOWED_HOSTS.includes(host)) {
        return null;
    }
    return c.json({ error: "Host is not allowed." }, 403);
}
function requireHttps(c) {
    if (!REQUIRE_HTTPS) {
        return null;
    }
    if (requestProto(c) === "https") {
        return null;
    }
    return c.json({ error: "HTTPS is required." }, 426);
}
function requireSetupEnabled(c) {
    if (SETUP_ENABLED) {
        return null;
    }
    return c.json({ error: "Setup routes are disabled. Set SETUP_ENABLED=true to enable onboarding endpoints." }, 404);
}
function normalizeLimit(input, fallback) {
    if (!Number.isFinite(input) || input < 0) {
        return fallback;
    }
    return Math.floor(input);
}
function pruneRateWindows(now) {
    if (rateLimitWindows.size < 5_000) {
        return;
    }
    for (const [key, window] of rateLimitWindows) {
        if (window.resetAt <= now) {
            rateLimitWindows.delete(key);
        }
    }
}
function enforceRateLimit(c, bucket, limitInput) {
    const limit = normalizeLimit(limitInput, 0);
    if (limit <= 0) {
        return null;
    }
    const now = Date.now();
    const windowMs = normalizeLimit(RATE_LIMIT_WINDOW_MS, 60_000);
    const key = `${bucket}:${clientIp(c)}`;
    const existing = rateLimitWindows.get(key);
    if (!existing || existing.resetAt <= now) {
        rateLimitWindows.set(key, {
            count: 1,
            resetAt: now + windowMs,
        });
        pruneRateWindows(now);
        return null;
    }
    existing.count += 1;
    if (existing.count <= limit) {
        return null;
    }
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1_000));
    c.header("Retry-After", String(retryAfterSec));
    return c.json({ error: "Too many requests. Try again later." }, 429);
}
function requireSetupAuth(c) {
    const host = requestHost(c);
    const publicRequestWithoutToken = !SETUP_AUTH_TOKEN.trim() && host.length > 0 && !isLocalHost(host);
    if ((SETUP_AUTH_REQUIRED || publicRequestWithoutToken) && !SETUP_AUTH_TOKEN.trim()) {
        return c.json({
            error: "SETUP_AUTH_TOKEN is required for setup routes in this deployment mode. Configure it in runtime/.env.",
        }, 403);
    }
    if (!SETUP_AUTH_TOKEN.trim()) {
        return null;
    }
    if (requestToken(c) === SETUP_AUTH_TOKEN) {
        return null;
    }
    return c.json({
        error: "Unauthorized. Provide setup token using Authorization: Bearer <token> or ?token=<token>.",
    }, 401);
}
function requireNowPlayingAuth(c) {
    if (!NOW_PLAYING_AUTH_TOKEN.trim()) {
        return null;
    }
    if (requestToken(c) === NOW_PLAYING_AUTH_TOKEN) {
        return null;
    }
    return c.json({
        error: "Unauthorized. Provide now-playing token using Authorization: Bearer <token> or ?token=<token>.",
    }, 401);
}
let devTokenCache = null;
async function getDeveloperToken() {
    const missing = missingForDevToken();
    if (missing.length) {
        throw new Error(setupErrorMessage(missing));
    }
    if (privateKeyConfig.error) {
        throw new Error(privateKeyConfig.error);
    }
    const now = Date.now();
    if (devTokenCache && devTokenCache.expiresAt - now > 60_000) {
        return devTokenCache.token;
    }
    const privateKey = await importPKCS8(APPLE_PRIVATE_KEY, "ES256");
    const expiresInSeconds = 43_200;
    const token = await new SignJWT({})
        .setProtectedHeader({ alg: "ES256", kid: APPLE_KEY_ID })
        .setIssuer(APPLE_TEAM_ID)
        .setIssuedAt()
        .setExpirationTime(`${expiresInSeconds}s`)
        .sign(privateKey);
    devTokenCache = { token, expiresAt: now + expiresInSeconds * 1_000 };
    return token;
}
let cache = {
    track: null,
    fetchedAt: Date.now(),
    error: missingForPolling().length ? setupErrorMessage(missingForPolling()) : null,
};
let playbackHeuristic = {
    currentTrackId: null,
    currentTrackTransitionAt: null,
};
function artUrl(raw, size = 300) {
    return raw.replace("{w}", String(size)).replace("{h}", String(size));
}
function inferIsPlaying(params) {
    const { trackId, durationInMillis, now } = params;
    if (!durationInMillis || durationInMillis <= 0) {
        return false;
    }
    // First seen track after boot is only a baseline; do not assume it is actively playing.
    if (playbackHeuristic.currentTrackId === null) {
        playbackHeuristic = {
            currentTrackId: trackId,
            currentTrackTransitionAt: null,
        };
        return false;
    }
    if (playbackHeuristic.currentTrackId !== trackId) {
        playbackHeuristic = {
            currentTrackId: trackId,
            currentTrackTransitionAt: now,
        };
    }
    const transitionAt = playbackHeuristic.currentTrackTransitionAt;
    if (transitionAt === null) {
        return false;
    }
    const elapsedSinceTransition = now - transitionAt;
    const byObservedWindow = elapsedSinceTransition <= durationInMillis + IS_PLAYING_GRACE_MS;
    return byObservedWindow;
}
async function poll() {
    const missing = missingForPolling();
    if (missing.length) {
        cache = {
            ...cache,
            fetchedAt: Date.now(),
            error: setupErrorMessage(missing),
            track: null,
        };
        return;
    }
    try {
        const devToken = await getDeveloperToken();
        const res = await fetch("https://api.music.apple.com/v1/me/recent/played/tracks?limit=1", {
            headers: {
                Authorization: `Bearer ${devToken}`,
                "Music-User-Token": APPLE_MUSIC_USER_TOKEN,
            },
        });
        if (!res.ok) {
            throw new Error(`Apple API ${res.status}: ${await res.text()}`);
        }
        const data = await res.json();
        const item = data?.data?.[0];
        if (!item) {
            playbackHeuristic = {
                currentTrackId: null,
                currentTrackTransitionAt: null,
            };
            cache = { track: null, fetchedAt: Date.now(), error: null };
            return;
        }
        const attrs = item.attributes;
        const now = Date.now();
        const trackId = String(item.id ?? "");
        const durationCandidate = attrs?.durationInMillis;
        const durationInMillis = typeof durationCandidate === "number" && Number.isFinite(durationCandidate)
            ? durationCandidate
            : null;
        const isPlaying = trackId.length > 0
            ? inferIsPlaying({
                trackId,
                durationInMillis,
                now,
            })
            : false;
        const artwork = attrs?.artwork;
        const rawArt = typeof artwork?.url === "string" ? artwork.url : "";
        cache = {
            track: {
                name: String(attrs?.name ?? "Unknown"),
                artist: String(attrs?.artistName ?? "Unknown"),
                album: String(attrs?.albumName ?? ""),
                albumArt: rawArt ? artUrl(rawArt) : "",
                isPlaying,
                source: "recently-played",
            },
            fetchedAt: now,
            error: null,
        };
    }
    catch (err) {
        console.error("[poll]", err);
        cache = { ...cache, fetchedAt: Date.now(), error: String(err) };
    }
}
void poll();
setInterval(() => {
    void poll();
}, POLL_INTERVAL_MS);
const app = new Hono();
app.use("*", async (c, next) => {
    const hostError = requireAllowedHost(c);
    if (hostError) {
        return hostError;
    }
    const httpsError = requireHttps(c);
    if (httpsError) {
        return httpsError;
    }
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "no-referrer");
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (c.req.path !== "/health") {
        c.header("Cache-Control", "no-store");
    }
    if (REQUIRE_HTTPS) {
        c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
});
if (ALLOWED_ORIGIN.trim().length > 0) {
    app.use("/now-playing", cors({ origin: ALLOWED_ORIGIN }));
}
app.get("/", (c) => {
    const setupEnabledError = requireSetupEnabled(c);
    if (setupEnabledError) {
        return c.json({
            service: "trackline",
            endpoints: ["/now-playing", "/health"],
            setupEnabled: false,
        });
    }
    const rateError = enforceRateLimit(c, "setup-root", RATE_LIMIT_SETUP);
    if (rateError) {
        return rateError;
    }
    const authError = requireSetupAuth(c);
    if (authError) {
        return authError;
    }
    const accept = c.req.header("accept") ?? "";
    if (accept.includes("text/html")) {
        return c.html(HOME_PAGE);
    }
    const endpoints = SETUP_ENABLED
        ? ["/now-playing", "/health", "/dev-token", "/config-status", "/setup"]
        : ["/now-playing", "/health"];
    return c.json({
        service: "trackline",
        endpoints,
    });
});
app.get("/setup", (c) => {
    const setupEnabledError = requireSetupEnabled(c);
    if (setupEnabledError) {
        return setupEnabledError;
    }
    const rateError = enforceRateLimit(c, "setup-page", RATE_LIMIT_SETUP);
    if (rateError) {
        return rateError;
    }
    const authError = requireSetupAuth(c);
    if (authError) {
        return authError;
    }
    return c.html(SETUP_PAGE);
});
app.get("/config-status", (c) => {
    const setupEnabledError = requireSetupEnabled(c);
    if (setupEnabledError) {
        return setupEnabledError;
    }
    const rateError = enforceRateLimit(c, "setup-status", RATE_LIMIT_SETUP);
    if (rateError) {
        return rateError;
    }
    const authError = requireSetupAuth(c);
    if (authError) {
        return authError;
    }
    const pollMissing = missingForPolling();
    const devTokenMissing = missingForDevToken();
    return c.json({
        readyForPolling: pollMissing.length === 0,
        readyForDevToken: devTokenMissing.length === 0,
        missingForPolling: pollMissing,
        missingForDevToken: devTokenMissing,
        expectedEnv: {
            APPLE_TEAM_ID: !!APPLE_TEAM_ID,
            APPLE_KEY_ID: !!APPLE_KEY_ID,
            APPLE_PRIVATE_KEY: !!APPLE_PRIVATE_KEY_INLINE,
            APPLE_PRIVATE_KEY_PATH: !!APPLE_PRIVATE_KEY_PATH,
            APPLE_PRIVATE_KEY_RESOLVED: !!APPLE_PRIVATE_KEY,
            APPLE_MUSIC_USER_TOKEN: !!APPLE_MUSIC_USER_TOKEN,
            HOST: !!HOST,
            ALLOWED_HOSTS: ALLOWED_HOSTS.length > 0,
            REQUIRE_HTTPS,
            SETUP_ENABLED,
            SETUP_AUTH_REQUIRED,
            SETUP_AUTH_TOKEN: !!SETUP_AUTH_TOKEN,
            NOW_PLAYING_AUTH_TOKEN: !!NOW_PLAYING_AUTH_TOKEN,
        },
        privateKey: {
            source: privateKeyConfig.source,
            path: privateKeyConfig.resolvedPath,
            error: privateKeyConfig.error,
        },
        current: {
            ALLOWED_ORIGIN,
            POLL_INTERVAL_MS,
            IS_PLAYING_GRACE_MS,
            HOST,
            ALLOWED_HOSTS,
            REQUIRE_HTTPS,
            SETUP_ENABLED,
            SETUP_AUTH_REQUIRED,
            PORT,
        },
        security: {
            setupAuthRequired: SETUP_AUTH_REQUIRED,
            setupAuthConfigured: !!SETUP_AUTH_TOKEN,
            setupAuthEnabled: !!SETUP_AUTH_TOKEN,
            nowPlayingAuthEnabled: !!NOW_PLAYING_AUTH_TOKEN,
            corsEnabled: ALLOWED_ORIGIN.trim().length > 0,
            allowedOrigin: ALLOWED_ORIGIN || null,
            allowedHosts: ALLOWED_HOSTS,
            requireHttps: REQUIRE_HTTPS,
            setupEnabled: SETUP_ENABLED,
            rateLimitWindowMs: normalizeLimit(RATE_LIMIT_WINDOW_MS, 60_000),
            rateLimitNowPlaying: normalizeLimit(RATE_LIMIT_NOW_PLAYING, 120),
            rateLimitSetup: normalizeLimit(RATE_LIMIT_SETUP, 30),
            rateLimitDevToken: normalizeLimit(RATE_LIMIT_DEV_TOKEN, 10),
        },
        runtimeEnv: {
            path: RUNTIME_ENV_PATH,
            exists: existsSync(RUNTIME_ENV_PATH),
        },
    });
});
app.get("/now-playing", (c) => {
    const rateError = enforceRateLimit(c, "now-playing", RATE_LIMIT_NOW_PLAYING);
    if (rateError) {
        return rateError;
    }
    const authError = requireNowPlayingAuth(c);
    if (authError) {
        return authError;
    }
    return c.json({ track: cache.track, fetchedAt: cache.fetchedAt, error: cache.error });
});
app.get("/dev-token", async (c) => {
    const setupEnabledError = requireSetupEnabled(c);
    if (setupEnabledError) {
        return setupEnabledError;
    }
    const rateError = enforceRateLimit(c, "dev-token", RATE_LIMIT_DEV_TOKEN);
    if (rateError) {
        return rateError;
    }
    const authError = requireSetupAuth(c);
    if (authError) {
        return authError;
    }
    try {
        const token = await getDeveloperToken();
        return c.json({ token });
    }
    catch (err) {
        return c.json({ error: String(err) }, 400);
    }
});
app.get("/health", (c) => c.json({ ok: true }));
app.post("/setup/save-env", async (c) => {
    const setupEnabledError = requireSetupEnabled(c);
    if (setupEnabledError) {
        return setupEnabledError;
    }
    const rateError = enforceRateLimit(c, "setup-save-env", RATE_LIMIT_SETUP);
    if (rateError) {
        return rateError;
    }
    const authError = requireSetupAuth(c);
    if (authError) {
        return authError;
    }
    try {
        const body = await c.req.json();
        const content = typeof body.content === "string" ? body.content : "";
        if (!content.trim()) {
            return c.json({ error: "Missing env content." }, 400);
        }
        if (content.length > 100_000) {
            return c.json({ error: "Env content too large." }, 400);
        }
        mkdirSync(RUNTIME_DIR, { recursive: true });
        writeFileSync(RUNTIME_ENV_PATH, content.endsWith("\n") ? content : `${content}\n`, "utf8");
        return c.json({
            ok: true,
            path: RUNTIME_ENV_PATH,
            message: "Saved runtime env file. Restart service/container to apply updated values.",
        });
    }
    catch (err) {
        return c.json({ error: String(err) }, 400);
    }
});
serve({ fetch: app.fetch, port: PORT, hostname: HOST }, () => {
    console.log(`trackline listening on ${HOST}:${PORT}`);
});
