export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  token?: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      ...options,
      headers,
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error(
      "No se pudo conectar con la API. Comprueba que esté ejecutándose e inténtalo de nuevo.",
    );
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "Revisa los datos ingresados.",
      401:
        path === "auth/login"
          ? "Usuario o contraseña incorrectos."
          : "Tu sesión venció. Inicia sesión nuevamente.",
      403: "Tu cuenta no tiene permiso para consultar estos datos.",
      404: "El recurso solicitado no está disponible.",
      502: "La API no está disponible. Inicia el backend y vuelve a intentar.",
      503: "La API no está disponible. Inténtalo nuevamente.",
    };
    throw new ApiError(
      response.status,
      messages[response.status] ||
        `No se pudo completar la consulta (HTTP ${response.status}).`,
    );
  }
  return response.json() as Promise<T>;
}
