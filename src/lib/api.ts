const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Core helper to fetch data from ECDAT backend with the Clerk JWT automatically injected.
 */
export async function fetchWithAuth(
  url: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {}
) {
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
      if (errJson.detail) {
        errorText = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch (e) {}
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Creates a discovery job in the backend.
 */
export async function createDiscoveryJob(
  wid: string,
  source_ids: string[],
  getToken: () => Promise<string | null>
) {
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
export async function createSource(
  wid: string,
  name: string,
  url: string,
  getToken: () => Promise<string | null>
) {
  return fetchWithAuth(`/api/workspaces/${wid}/sources`, getToken, {
    method: "POST",
    body: JSON.stringify({
      name: name,
      source_type: "git",
      configuration: { url: url },
    }),
  });
}

/**
 * Strongly-typed ECDAT Enterprise API Client
 */
export const api = {
  workspace: {
    getMe: (getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/me`, getToken),
    updateSettings: (threatHorizonYears: number, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/me/settings`, getToken, {
        method: "PATCH",
        body: JSON.stringify({ threat_horizon_years: threatHorizonYears }),
      }),
  },

  sources: {
    list: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/sources`, getToken),
    create: (wid: string, name: string, url: string, getToken: () => Promise<string | null>) =>
      createSource(wid, name, url, getToken),
  },

  jobs: {
    list: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/jobs`, getToken),
    create: (wid: string, sourceIds: string[], getToken: () => Promise<string | null>) =>
      createDiscoveryJob(wid, sourceIds, getToken),
    get: (jobId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/jobs/${jobId}`, getToken),
    getEvidence: (jobId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/jobs/${jobId}/evidence`, getToken),
  },

  assets: {
    list: (
      wid: string,
      getToken: () => Promise<string | null>,
      params?: {
        family?: string;
        quantum_vulnerable?: boolean;
        classical_vulnerable?: boolean;
        search?: string;
        limit?: number;
        offset?: number;
      }
    ) => {
      const query = new URLSearchParams();
      if (params?.family) query.set("family", params.family);
      if (params?.quantum_vulnerable !== undefined) query.set("quantum_vulnerable", String(params.quantum_vulnerable));
      if (params?.classical_vulnerable !== undefined) query.set("classical_vulnerable", String(params.classical_vulnerable));
      if (params?.search) query.set("search", params.search);
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.offset) query.set("offset", String(params.offset));
      const qs = query.toString();
      return fetchWithAuth(`/api/workspaces/${wid}/assets${qs ? `?${qs}` : ""}`, getToken);
    },
    get: (assetId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/assets/${assetId}`, getToken),
    evidence: (assetId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/assets/${assetId}/evidence`, getToken),
  },

  risk: {
    summary: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/risk/summary`, getToken),
    list: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/risk`, getToken),
    get: (assetId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/assets/${assetId}/risk`, getToken),
    recalculate: (
      assetId: string,
      params: {
        data_lifetime_years?: number;
        business_criticality?: string;
        exposure?: string;
        threat_horizon_years?: number;
      },
      getToken: () => Promise<string | null>
    ) =>
      fetchWithAuth(`/api/assets/${assetId}/risk/recalculate`, getToken, {
        method: "POST",
        body: JSON.stringify(params),
      }),
  },

  recommendations: {
    list: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/recommendations`, getToken),
    get: (assetId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/assets/${assetId}/recommendation`, getToken),
    generate: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/recommendations/generate`, getToken, {
        method: "POST",
      }),
  },

  cbom: {
    getLatest: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/cbom`, getToken),
    generate: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/cbom/generate`, getToken, {
        method: "POST",
      }),
  },
};
