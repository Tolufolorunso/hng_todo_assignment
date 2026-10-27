import { Linking } from "react-native";
import type { PreferredAction } from "../types/followup";

export function cleanPhoneNumber(raw: string): string {
  return raw.replace(/[^0-9+]/g, "");
}

export function buildLauncherUri(
  action: NonNullable<PreferredAction>,
  target: string,
  options?: { subject?: string; body?: string }
): string {
  const cleanedTarget = target.trim();
  if (!cleanedTarget) {
    throw new Error("Target is required to build launcher URI");
  }

  switch (action) {
    case "email": {
      const subject = options?.subject ? `?subject=${encodeURIComponent(options.subject)}` : "";
      return `mailto:${cleanedTarget}${subject}`;
    }
    case "phone": {
      const phone = cleanPhoneNumber(cleanedTarget);
      return `tel:${phone}`;
    }
    case "whatsapp": {
      const phone = cleanPhoneNumber(cleanedTarget).replace(/^\+/, "");
      const text = options?.body ? `?text=${encodeURIComponent(options.body)}` : "";
      return `https://wa.me/${phone}${text}`;
    }
  }
}

export function validateLauncherTarget(
  action: NonNullable<PreferredAction>,
  target: string
): boolean {
  const cleaned = target.trim();
  if (!cleaned) return false;

  switch (action) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
    case "phone":
    case "whatsapp":
      return /^\+?[0-9]{7,15}$/.test(cleanPhoneNumber(cleaned));
  }
}

export function createMailtoUri(email: string, options?: { subject?: string; body?: string }): string {
  return buildLauncherUri("email", email, options);
}

export function createTelUri(phone: string): string {
  return buildLauncherUri("phone", phone);
}

export function createWhatsAppUri(phone: string, text?: string): string {
  return buildLauncherUri("whatsapp", phone, { body: text });
}

export async function launchAction(
  action: NonNullable<PreferredAction>,
  target: string,
  options?: { subject?: string; body?: string }
): Promise<boolean> {
  const uri = buildLauncherUri(action, target, options);
  try {
    const supported = await Linking.canOpenURL(uri);
    if (supported) {
      await Linking.openURL(uri);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
