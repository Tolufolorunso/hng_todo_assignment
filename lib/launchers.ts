export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  // Allows digits, optional leading +, spaces, hyphens, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^\+?\d{7,15}$/.test(cleaned);
}

export function isValidWhatsAppNumber(number: string): boolean {
  return isValidPhoneNumber(number);
}

export function getEmailLauncherUri(
  email: string,
  commitment: string,
  personName?: string
): string {
  const subject = `Follow up: ${commitment}`;
  const greeting = personName ? `Hi ${personName},\n\n` : "Hello,\n\n";
  const body = `${greeting}Following up regarding our commitment: "${commitment}".\n\nSent via TaskFlow`;

  const params = new URLSearchParams({
    subject,
    body,
  });

  return `mailto:${encodeURIComponent(email.trim())}?${params.toString().replace(/\+/g, "%20")}`;
}

export function getWhatsAppLauncherUri(
  whatsAppNumber: string,
  commitment: string,
  personName?: string
): string {
  // Strip all non-numeric characters for WhatsApp international format
  const cleanNumber = whatsAppNumber.replace(/\D/g, "");
  const greeting = personName ? `Hi ${personName}, ` : "Hello, ";
  const text = `${greeting}following up on: "${commitment}"`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}

export function getPhoneLauncherUri(phoneNumber: string): string {
  // Keep only digits and optional leading plus sign
  const trimmed = phoneNumber.trim();
  const hasPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");
  const formatted = hasPlus ? `+${digitsOnly}` : digitsOnly;

  return `tel:${formatted}`;
}

export function buildEmailUri(
  options: { to: string; subject?: string; body?: string } | string,
  commitment?: string,
  personName?: string
): string {
  if (typeof options === "string") {
    return getEmailLauncherUri(options, commitment || "", personName);
  }
  const email = options.to;
  const params = new URLSearchParams();
  if (options.subject) params.set("subject", options.subject);
  if (options.body) params.set("body", options.body);
  const query = params.toString() ? `?${params.toString().replace(/\+/g, "%20")}` : "";
  return `mailto:${encodeURIComponent(email.trim())}${query}`;
}

export function buildWhatsAppUri(
  options: { phone: string; message?: string } | string,
  commitment?: string,
  personName?: string
): string {
  if (typeof options === "string") {
    return getWhatsAppLauncherUri(options, commitment || "", personName);
  }
  const cleanNumber = options.phone.replace(/\D/g, "");
  const textQuery = options.message ? `?text=${encodeURIComponent(options.message)}` : "";
  return `https://wa.me/${cleanNumber}${textQuery}`;
}

export function buildPhoneUri(phoneNumber: string): string {
  return getPhoneLauncherUri(phoneNumber);
}

