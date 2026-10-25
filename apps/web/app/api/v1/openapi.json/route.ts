import { openApiSpecification } from "@/server/openapi";
import { apiSuccess } from "@/server/errors";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  return apiSuccess(openApiSpecification, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
