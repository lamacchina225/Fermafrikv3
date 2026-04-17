import { headers } from "next/headers";

export const ICON_VERSION = "20260416-5";

export async function getAbsoluteLogoUrl() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");

  if (!host) {
    return `/logo.png?v=${ICON_VERSION}`;
  }

  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProto ??
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}/logo.png?v=${ICON_VERSION}`;
}
