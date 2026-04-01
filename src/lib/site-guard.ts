/**
 * 可选整站简单门禁：设置 SITE_PASSWORD 后，所有写操作需在请求头 x-site-password 中携带相同值。
 */
export function assertSitePassword(request: Request): void {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return;
  const provided = request.headers.get("x-site-password") ?? "";
  if (provided !== expected) {
    throw new SitePasswordError();
  }
}

export class SitePasswordError extends Error {
  constructor() {
    super("站点访问密码不正确或未提供");
    this.name = "SitePasswordError";
  }
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
