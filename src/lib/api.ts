// Real bug found live 2026-09-05: NEXT_PUBLIC_API_URL was set on Vercel with
// a trailing slash (".../onrender.com/"), and every call below appends a
// path that already starts with "/" — producing a double slash
// (".../onrender.com//api/...") that the browser's fetch() can't resolve at
// all (fails before even reaching CORS, surfacing as a generic "Failed to
// fetch"). Stripping any trailing slash here means a trailing slash in the
// env var can never break this again, regardless of how it gets set.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

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
 * Same as fetchWithAuth but for non-JSON responses (e.g. ?format=xml) —
 * returns the raw text body instead of parsing it as JSON.
 */
async function fetchTextWithAuth(url: string, getToken: () => Promise<string | null>): Promise<string> {
  const token = await getToken();
  const response = await fetch(`${API_BASE}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`API error (${response.status}): ${response.statusText}`);
  return response.text();
}

/** Triggers a browser "Save As" for text content — used by CBOM XML export. */
export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
    readinessScore: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/readiness-score`, getToken),
    quantumPosture: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/quantum-posture`, getToken),
    policyViolations: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/policy-violations`, getToken),
    alerts: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/alerts`, getToken),
    executiveReport: (wid: string, getToken: () => Promise<string | null>) =>
      fetchTextWithAuth(`/api/workspaces/${wid}/reports/executive`, getToken),
    technicalReport: (wid: string, getToken: () => Promise<string | null>) =>
      fetchTextWithAuth(`/api/workspaces/${wid}/reports/technical`, getToken),
    evidence: (
      wid: string,
      getToken: () => Promise<string | null>,
      params?: {
        source_id?: string;
        algorithm?: string;
        source_type?: string;
        detector?: string;
        min_confidence?: number;
        search?: string;
        limit?: number;
        offset?: number;
      }
    ) => {
      const query = new URLSearchParams();
      if (params?.source_id) query.set("source_id", params.source_id);
      if (params?.algorithm) query.set("algorithm", params.algorithm);
      if (params?.source_type) query.set("source_type", params.source_type);
      if (params?.detector) query.set("detector", params.detector);
      if (params?.min_confidence !== undefined) query.set("min_confidence", String(params.min_confidence));
      if (params?.search) query.set("search", params.search);
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.offset) query.set("offset", String(params.offset));
      const qs = query.toString();
      return fetchWithAuth(`/api/workspaces/${wid}/evidence${qs ? `?${qs}` : ""}`, getToken);
    },
  },

  sources: {
    list: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/sources`, getToken),
    create: (wid: string, name: string, url: string, getToken: () => Promise<string | null>) =>
      createSource(wid, name, url, getToken),
    update: (
      wid: string,
      sourceId: string,
      changes: { name?: string; ai_excluded?: boolean },
      getToken: () => Promise<string | null>
    ) =>
      fetchWithAuth(`/api/workspaces/${wid}/sources/${sourceId}`, getToken, {
        method: "PATCH",
        body: JSON.stringify(changes),
      }),
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
        source_id?: string;
        limit?: number;
        offset?: number;
      }
    ) => {
      const query = new URLSearchParams();
      if (params?.family) query.set("family", params.family);
      if (params?.quantum_vulnerable !== undefined) query.set("quantum_vulnerable", String(params.quantum_vulnerable));
      if (params?.classical_vulnerable !== undefined) query.set("classical_vulnerable", String(params.classical_vulnerable));
      if (params?.search) query.set("search", params.search);
      if (params?.source_id) query.set("source_id", params.source_id);
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.offset) query.set("offset", String(params.offset));
      const qs = query.toString();
      return fetchWithAuth(`/api/workspaces/${wid}/assets${qs ? `?${qs}` : ""}`, getToken);
    },
    get: (assetId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/assets/${assetId}`, getToken),
    evidence: (assetId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/assets/${assetId}/evidence`, getToken),
    updateMigrationStatus: (assetId: string, status: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/assets/${assetId}/migration-status`, getToken, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    verifyMigration: (assetId: string, jobId: string, sourceId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/assets/${assetId}/verify-migration?job_id=${jobId}&source_id=${sourceId}`, getToken),
    blastRadiusLite: (assetId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/assets/${assetId}/blast-radius-lite`, getToken),
  },

  risk: {
    summary: (wid: string, getToken: () => Promise<string | null>, sourceId?: string) =>
      fetchWithAuth(`/api/workspaces/${wid}/risk/summary${sourceId ? `?source_id=${sourceId}` : ""}`, getToken),
    list: (wid: string, getToken: () => Promise<string | null>, sourceId?: string) =>
      fetchWithAuth(`/api/workspaces/${wid}/risk${sourceId ? `?source_id=${sourceId}` : ""}`, getToken),
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
    list: (wid: string, getToken: () => Promise<string | null>, sourceId?: string) =>
      fetchWithAuth(`/api/workspaces/${wid}/recommendations${sourceId ? `?source_id=${sourceId}` : ""}`, getToken),
    get: (assetId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/assets/${assetId}/recommendation`, getToken),
    generate: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/recommendations/generate`, getToken, {
        method: "POST",
      }),
  },

  cbom: {
    getLatest: (wid: string, getToken: () => Promise<string | null>, sourceId?: string) =>
      fetchWithAuth(`/api/workspaces/${wid}/cbom${sourceId ? `?source_id=${sourceId}` : ""}`, getToken),
    getLatestXml: (wid: string, getToken: () => Promise<string | null>, sourceId?: string) =>
      fetchTextWithAuth(`/api/workspaces/${wid}/cbom?format=xml${sourceId ? `&source_id=${sourceId}` : ""}`, getToken),
    generate: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/cbom/generate`, getToken, {
        method: "POST",
      }),
    history: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/cbom/history`, getToken),
    getSnapshot: (snapshotId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/cbom/${snapshotId}`, getToken),
    getSnapshotXml: (snapshotId: string, getToken: () => Promise<string | null>) =>
      fetchTextWithAuth(`/api/cbom/${snapshotId}?format=xml`, getToken),
  },

  analyst: {
    status: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/analyst/status`, getToken),
    query: (wid: string, question: string, getToken: () => Promise<string | null>, sourceId?: string, sessionId?: string) =>
      fetchWithAuth(`/api/workspaces/${wid}/analyst/query`, getToken, {
        method: "POST",
        body: JSON.stringify({ question, source_id: sourceId, session_id: sessionId }),
      }),
    sessions: (wid: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/analyst/sessions`, getToken),
    session: (wid: string, sessionId: string, getToken: () => Promise<string | null>) =>
      fetchWithAuth(`/api/workspaces/${wid}/analyst/sessions/${sessionId}`, getToken),
  },

  activity: {
    list: (wid: string, getToken: () => Promise<string | null>, params?: { limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.offset) query.set("offset", String(params.offset));
      const qs = query.toString();
      return fetchWithAuth(`/api/workspaces/${wid}/activity${qs ? `?${qs}` : ""}`, getToken);
    },
  },
};
