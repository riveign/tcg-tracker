/**
 * Wraps a promise and returns a tuple of [data, error]
 * This prevents unhandled promise rejections and enforces explicit error handling
 *
 * @example
 * const { data, error } = await handlePromise(db.query.users.findFirst(...));
 * if (error) {
 *   throw new TRPCError({ message: 'Failed to fetch user', code: 'INTERNAL_SERVER_ERROR' });
 * }
 * return data;
 */
export async function handlePromise<T>(
  promise: Promise<T>
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
