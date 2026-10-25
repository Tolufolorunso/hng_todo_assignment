export default function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TaskFlow",
    url: "https://taskflow-assignment.vercel.app",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    description:
      "A fast, single-user, offline-capable productivity suite featuring task management with drag-and-drop reordering, interactive calendar scheduling, Microsoft Word-style rich text notes, and productivity analytics.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Person",
      name: "Tolulope Folorunso",
      url: "https://linkedin.com/in/tolulopebuilds/",
    },
    featureList: [
      "Task management with drag-and-drop reordering",
      "Microsoft Word-style WYSIWYG rich text formatting for tasks and notes",
      "Interactive monthly calendar and schedule view",
      "Productivity metrics, velocity, and completion trends",
      "Offline-first PWA architecture with browser IndexedDB storage",
      "Distraction-free standalone note document reader with print and PDF export",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
