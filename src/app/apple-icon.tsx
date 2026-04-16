import { ImageResponse } from "next/og";
import { AppIcon } from "@/lib/app-icon";
import { getAbsoluteLogoUrl } from "@/lib/icon-url";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const logoUrl = await getAbsoluteLogoUrl();

  return new ImageResponse(<AppIcon size={180} logoUrl={logoUrl} />, size);
}
