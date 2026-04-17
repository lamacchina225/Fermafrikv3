import { ImageResponse } from "next/og";
import { AppIcon } from "@/lib/app-icon";
import { getAbsoluteLogoUrl } from "@/lib/icon-url";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const logoUrl = await getAbsoluteLogoUrl();

  return new ImageResponse(<AppIcon size={32} logoUrl={logoUrl} logoScale={1.55} />, size);
}
