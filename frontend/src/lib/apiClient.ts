const getAuthToken = (): string | null => {
  // Ensure this runs only on the client-side
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json'); // Default content type

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Try to parse error response from backend
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // Ignore if response is not JSON
    }
    console.error("API Error Response:", errorData);
    throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
  }

  // Handle cases with no content (e.g., 204 No Content for DELETE)
  if (response.status === 204) {
    return null as T; // Or handle appropriately based on expected return type
  }

  return response.json() as Promise<T>;
};

// Export specific methods
export const apiClient = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body: any, options?: RequestInit) => request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: any, options?: RequestInit) => request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'DELETE' }),
  // Add PUT if needed
};
