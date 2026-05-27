export function getSupabaseErrorMessage(error: unknown) {
  if (!error) return "Da xay ra loi khong xac dinh.";

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "Da xay ra loi khong xac dinh.";
}

export function throwSupabaseError(error: unknown): never {
  throw new Error(getSupabaseErrorMessage(error));
}
