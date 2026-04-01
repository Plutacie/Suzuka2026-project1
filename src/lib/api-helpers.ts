const SITE_PW_SESSION = "oc_site_password";

export function getSitePassword(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(SITE_PW_SESSION) ?? "";
}

export function setSitePassword(value: string): void {
  if (typeof window === "undefined") return;
  if (value) sessionStorage.setItem(SITE_PW_SESSION, value);
  else sessionStorage.removeItem(SITE_PW_SESSION);
}

export function sitePasswordHeaders(): HeadersInit {
  const pw = getSitePassword();
  if (!pw) return {};
  return { "x-site-password": pw };
}
