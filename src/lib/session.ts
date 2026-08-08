import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "maximum_extra_device";

export async function getDeviceIdentity() {
  const jar = await cookies();
  let token = jar.get(COOKIE_NAME)?.value;
  if (!token || token.length < 32) {
    token = randomBytes(32).toString("base64url");
    jar.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return {
    ownerHash: createHash("sha256").update(token).digest("hex"),
    safetyIdentifier: createHash("sha256").update(`sea-lion:${token}`).digest("hex").slice(0, 32),
  };
}
