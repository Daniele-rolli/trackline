import { readFileSync, writeFileSync } from "fs";
import { SignJWT, importPKCS8 } from "jose";

for (const line of readFileSync(new URL("./runtime/.env", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}

// Fall back to the shell env (which holds the working credentials).
const teamId = process.env.APPLE_TEAM_ID;
const keyId = process.env.APPLE_KEY_ID;
const privKey = (process.env.APPLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

if (!teamId || !keyId || !privKey) {
  console.log("missing credentials");
  process.exit(0);
}

const privateKey = await importPKCS8(privKey, "ES256");

const origins = (process.env.TEST_ORIGINS ?? "https://daniele-rolli.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const token = await new SignJWT({ origin: origins })
  .setProtectedHeader({ alg: "ES256", kid: keyId })
  .setIssuer(teamId)
  .setIssuedAt()
  .setExpirationTime("12h")
  .sign(privateKey);

writeFileSync(new URL("./dev-token-with-origin.txt", import.meta.url), token);
console.log(`wrote dev token (with origin=${JSON.stringify(origins)}) to dev-token-with-origin.txt, length=${token.length}, segments=${token.split(".").length}`);
