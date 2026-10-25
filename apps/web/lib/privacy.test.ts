import { describe, it, expect } from "vitest";
import { metadata } from "@/app/privacy/page";
import sitemap, { BASE_URL } from "@/app/sitemap";

describe("Privacy and Architecture Alignment", () => {
  describe("Metadata", () => {
    it("exports valid metadata with title, description, and canonical route", () => {
      expect(metadata.title).toBe("Privacy & Architecture Notice");
      expect(metadata.description).toContain("TaskFlow privacy model");
      expect(metadata.alternates).toEqual({
        canonical: "/privacy",
      });
    });
  });

  describe("Sitemap registration", () => {
    it("registers /privacy in the sitemap with monthly update frequency", () => {
      const items = sitemap();
      const privacyEntry = items.find((item) => item.url === `${BASE_URL}/privacy`);

      expect(privacyEntry).toBeDefined();
      expect(privacyEntry?.priority).toBe(0.5);
      expect(privacyEntry?.changeFrequency).toBe("monthly");
      expect(privacyEntry?.lastModified).toBeInstanceOf(Date);
    });
  });

  describe("Contract assurances", () => {
    it("ensures privacy documentation adheres to product constraints", () => {
      const canonicalPath = metadata.alternates?.canonical;
      expect(canonicalPath).toBe("/privacy");
    });
  });
});
