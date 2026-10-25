/** An HTTP error from the sync server, keeping the status code so callers can branch on it. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Build an ApiError from a failed response, preferring the server's `detail` message. */
export async function errorFromResponse(res: Response): Promise<ApiError> {
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    const detail = body?.detail;
    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') {
      message = detail[0].msg;
    }
  } catch {
    // keep the status line
  }
  return new ApiError(res.status, message);
}
