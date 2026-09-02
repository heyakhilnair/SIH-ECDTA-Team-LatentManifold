const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Helper to fetch data with the Clerk JWT automatically injected.
 */
export async function fetchWithAuth(url: string, getToken: () => Promise<string | null>, options: RequestInit = {}) {
  const token = await getToken();
  
  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorText = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson.detail) errorText = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
    } catch (e) {}
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Creates a discovery job in the backend.
 */
export async function createDiscoveryJob(wid: string, source_ids: string[], getToken: () => Promise<string | null>) {
  return fetchWithAuth(`/api/workspaces/${wid}/jobs`, getToken, {
    method: "POST",
    body: JSON.stringify({
      source_ids: source_ids,
    }),
  });
}

/**
 * Adds a source to the workspace.
 */
export async function createSource(wid: string, name: string, url: string, getToken: () => Promise<string | null>) {
  return fetchWithAuth(`/api/workspaces/${wid}/sources`, getToken, {
    method: "POST",
    body: JSON.stringify({
      name: name,
      source_type: "git",
      configuration: { url: url }
    }),
  });
}
