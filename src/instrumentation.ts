export function register() {
  if (process.env.NODE_ENV === "production" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[gatherup:startup] SUPABASE_SERVICE_ROLE_KEY is not configured. " +
        "Cross-instance rate limiting will fall back to in-memory limiting, and server-side admin checks will be unavailable."
    );
  }
}
