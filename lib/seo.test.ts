import { describe, it, expect } from "vitest";
import sitemap, { BASE_URL as SITEMAP_BASE } from "@/app/sitemap";
import robots, { BASE_URL as ROBOTS_BASE } from "@/app/robots";

describe("SEO Routes", () => {
  describe("sitemap()", () => {
    it("returns all primary workspace routes with correct priorities", () => {
      const items = sitemap();
      expect(items).toHaveLength(4);

      const urls = items.map((item) => item.url);
      expect(urls).toContain(`${SITEMAP_BASE}/`);
      expect(urls).toContain(`${SITEMAP_BASE}/notes`);
      expect(urls).toContain(`${SITEMAP_BASE}/calendar`);
      expect(urls).toContain(`${SITEMAP_BASE}/analytics`);

      const rootItem = items.find((item) => item.url === `${SITEMAP_BASE}/`);
      expect(rootItem?.priority).toBe(1.0);
      expect(rootItem?.changeFrequency).toBe("daily");
      expect(rootItem?.lastModified).toBeInstanceOf(Date);

      const analyticsItem = items.find((item) => item.url === `${SITEMAP_BASE}/analytics`);
      expect(analyticsItem?.priority).toBe(0.7);
      expect(analyticsItem?.changeFrequency).toBe("weekly");
    });
  });

  describe("robots()", () => {
    it("allows indexing for all user agents and points to sitemap.xml", () => {
      const config = robots();
      expect(config.rules).toEqual({
        userAgent: "*",
        allow: "/",
      });
      expect(config.sitemap).toBe(`${ROBOTS_BASE}/sitemap.xml`);
    });
  });
});
