import { describe, it, expect } from "vitest";
import {
  buildLauncherUri,
  validateLauncherTarget,
  cleanPhoneNumber,
  launchAction,
  createMailtoUri,
  createTelUri,
  createWhatsAppUri,
} from "./launchers.js";

describe("Mobile Communication Launchers", () => {
  it("cleans phone numbers and preserves leading plus sign", () => {
    expect(cleanPhoneNumber("+1 (555) 123-4567")).toBe("+15551234567");
    expect(cleanPhoneNumber("080-1234-5678")).toBe("08012345678");
  });

  it("builds valid email mailto URI with optional subject", () => {
    const uri1 = buildLauncherUri("email", "client@example.com");
    expect(uri1).toBe("mailto:client@example.com");

    const uri2 = buildLauncherUri("email", "client@example.com", { subject: "Follow up commitment" });
    expect(uri2).toBe("mailto:client@example.com?subject=Follow%20up%20commitment");
    expect(createMailtoUri("client@example.com")).toBe("mailto:client@example.com");
  });

  it("builds valid tel URI for phone calls", () => {
    const uri = buildLauncherUri("phone", "+1 (800) 555-0199");
    expect(uri).toBe("tel:+18005550199");
    expect(createTelUri("+1 (800) 555-0199")).toBe("tel:+18005550199");
  });

  it("builds valid WhatsApp deep link with optional text", () => {
    const uri1 = buildLauncherUri("whatsapp", "+15551234567");
    expect(uri1).toBe("https://wa.me/15551234567");

    const uri2 = buildLauncherUri("whatsapp", "+15551234567", { body: "Hi Alice, following up on our project!" });
    expect(uri2).toBe("https://wa.me/15551234567?text=Hi%20Alice%2C%20following%20up%20on%20our%20project!");
    expect(createWhatsAppUri("+15551234567")).toBe("https://wa.me/15551234567");
  });

  it("validates targets according to action type", () => {
    expect(validateLauncherTarget("email", "valid@domain.com")).toBe(true);
    expect(validateLauncherTarget("email", "invalid-email")).toBe(false);

    expect(validateLauncherTarget("phone", "+15551234567")).toBe(true);
    expect(validateLauncherTarget("phone", "123")).toBe(false);

    expect(validateLauncherTarget("whatsapp", "+2348012345678")).toBe(true);
  });

  it("successfully invokes native launchAction", async () => {
    const resultEmail = await launchAction("email", "test@example.com");
    expect(resultEmail).toBe(true);

    const resultPhone = await launchAction("phone", "+15551234567");
    expect(resultPhone).toBe(true);

    const resultWhatsApp = await launchAction("whatsapp", "+15551234567", { body: "Hello" });
    expect(resultWhatsApp).toBe(true);
  });
});
