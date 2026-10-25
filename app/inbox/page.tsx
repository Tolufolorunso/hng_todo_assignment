import type { Metadata } from "next";
import { Suspense } from "react";
import InboxScreen from "@/components/inbox/InboxScreen";

export const metadata: Metadata = {
  title: "Capture Inbox",
  description:
    "Frictionless offline capture for text and links with instant conversion into tasks, notes, or follow-ups.",
  alternates: {
    canonical: "/inbox",
  },
};

interface InboxPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const params = await searchParams;

  const capture = params.capture === "true";
  const title = typeof params.title === "string" ? params.title : "";
  const text = typeof params.text === "string" ? params.text : "";
  const url = typeof params.url === "string" ? params.url : "";

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      }
    >
      <InboxScreen
        initialCapture={capture}
        initialTitle={title}
        initialText={text}
        initialUrl={url}
      />
    </Suspense>
  );
}
