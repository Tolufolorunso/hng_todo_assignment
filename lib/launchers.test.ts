import { describe, expect, it } from "vitest";
import {
  getEmailLauncherUri,
  getWhatsAppLauncherUri,
  getPhoneLauncherUri,
  isValidEmail,
  isValidPhoneNumber,
  isValidWhatsAppNumber,
} from "@/lib/launchers";

describe("Communication Launchers", () => {
  describe("Validators", () => {
    it("validates standard email addresses correctly", () => {
      expect(isValidEmail("alice@example.com")).toBe(true);
      expect(isValidEmail("user.name+tag@domain.co.uk")).toBe(true);
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });

    it("validates phone and WhatsApp numbers correctly", () => {
      expect(isValidPhoneNumber("+1234567890")).toBe(true);
      expect(isValidPhoneNumber("+1 (555) 123-4567")).toBe(true);
      expect(isValidPhoneNumber("123456789")).toBe(true);
      expect(isValidPhoneNumber("abc1234")).toBe(false);
      expect(isValidPhoneNumber("123")).toBe(false); // too short
      expect(isValidWhatsAppNumber("+2348012345678")).toBe(true);
    });
  });

  describe("URI Generation", () => {
    it("generates correctly formatted and encoded mailto: URI", () => {
      const email = "client@example.com";
      const commitment = "Send Q4 strategic proposal";
      const personName = "Dr. Jane Doe";

      const uri = getEmailLauncherUri(email, commitment, personName);
      expect(uri).toContain("mailto:client%40example.com");
      expect(uri).toContain("subject=Follow%20up%3A%20Send%20Q4%20strategic%20proposal");
      expect(uri).toContain("body=Hi%20Dr.%20Jane%20Doe");
    });

    it("generates WhatsApp wa.me URI with stripped non-numeric characters", () => {
      const phone = "+1 (555) 987-6543";
      const commitment = "Confirm demo appointment";
      const personName = "Marcus";

      const uri = getWhatsAppLauncherUri(phone, commitment, personName);
      expect(uri).toContain("https://wa.me/15559876543?text=");
      expect(uri).toContain("Confirm%20demo%20appointment");
    });

    it("generates tel: URI with formatted digits and plus prefix", () => {
      const phone = "+1 (800) 555-0199";
      const uri = getPhoneLauncherUri(phone);
      expect(uri).toBe("tel:+18005550199");
    });
  });
});
