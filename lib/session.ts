export function readSessionKey(request: Request) {
  const value = request.headers.get("x-session-key") ?? "";
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(value)) throw new Error("Invalid session key");
  return value;
}
