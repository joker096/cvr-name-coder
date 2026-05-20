export function isError(e: unknown): e is Error {
  return e instanceof Error;
}

export function getErrorMessage(e: unknown): string {
  if (isError(e)) return e.message;
  if (typeof e === "string") return e;
  return "Unknown error";
}

export function isErrorWithMessage(e: unknown): e is { message: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  );
}
