export async function GET() {
  return Response.json({
    status: "ok",
    service: "humanet-values",
    timestamp: new Date().toISOString(),
  });
}