export async function GET() {
  return Response.json({
    status: "ok",
    service: "tallerpro",
    timestamp: new Date().toISOString(),
  });
}
