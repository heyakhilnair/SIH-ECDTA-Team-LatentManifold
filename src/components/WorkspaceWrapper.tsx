"use client";

import { useEffect, useState, createContext, useContext, useRef } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { fetchWithAuth } from "../lib/api";
import { motion } from "framer-motion";

export const WorkspaceContext = createContext<any>(null);

export default function WorkspaceWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [bootSequence, setBootSequence] = useState<string[]>([]);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user) {
      if (isLoaded && !user) setLoading(false);
      return;
    }
    
    // Prevent re-running if already done
    if (workspace || !loading) return;
    
    let isMounted = true;
    
    // If it was already started by a strict mode run, don't restart, just let the original finish.
    // Actually, in strict mode, the original interval was cleared if we had cleanup.
    // Let's reset hasStartedRef if it's unmounted.

    const sequence = [
      "[SYS] Authenticating Clerk JWT...",
      "[SYS] Identity verified.",
      "[SYS] Querying Supabase for active workspaces...",
    ];
    
    let i = 0;
    setBootSequence([]);
    
    const interval = setInterval(() => {
      if (!isMounted) return;
      if (i < sequence.length) {
        setBootSequence(prev => {
          if (prev.includes(sequence[i])) return prev;
          return [...prev, sequence[i]];
        });
        i++;
      } else {
        clearInterval(interval);
        
        fetchWithAuth("/api/workspaces/me", getToken)
          .then(data => {
            if (!isMounted) return;
            if (data?.id) {
              setBootSequence(prev => [...prev, "[SYS] Workspace found. Decrypting environment..."]);
              setTimeout(() => setWorkspace(data), 800);
            } else {
              setBootSequence(prev => [...prev, "[WARN] No active workspace detected. Manual initialization required."]);
            }
          })
          .catch(err => {
            if (!isMounted) return;
            console.error("Error fetching workspace", err);
            if (err.message && err.message.includes("404")) {
               setBootSequence(prev => [...prev, "[WARN] No active workspace detected. Manual initialization required."]);
            } else {
               setBootSequence(prev => [...prev, "[ERR] Connection refused."]);
            }
          })
          .finally(() => {
            if (!isMounted) return;
            setTimeout(() => setLoading(false), 500);
          });
      }
    }, 400);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoaded]); // Omitting getToken to prevent infinite loops from Clerk's re-renders

  const handleCreateWorkspace = async () => {
    setCreating(true);
    setBootSequence(prev => [...prev, "[SYS] Provisioning secure enclave...", "[SYS] Generating canonical CBOM schemas..."]);
    try {
      const data = await fetchWithAuth("/api/workspaces", getToken, {
        method: "POST",
        body: JSON.stringify({ name: `${user?.firstName || user?.username || 'My'} Workspace` })
      });
      if (data?.id) {
        setBootSequence(prev => [...prev, "[OK] Enclave established. Redirecting to LatentManifold..."]);
        setTimeout(() => {
          setWorkspace(data);
        }, 1200);
      } else {
        setBootSequence(prev => [...prev, `[ERR] Enclave generation failed: Unknown error`]);
        setCreating(false);
      }
    } catch (err: any) {
      console.error("Error creating workspace", err);
      setBootSequence(prev => [...prev, `[ERR] Enclave generation failed: ${err.message}`]);
      setCreating(false);
    }
  };

  if (!isLoaded || (loading && bootSequence.length === 0)) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--color-base)", fontFamily: "var(--font-mono)", color: "var(--color-primary)" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          [SYS] ESTABLISHING SECURE CONNECTION...
        </motion.div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--color-base)", padding: "2rem" }}>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{ width: "100%", maxWidth: "600px", background: "#fff", border: "1px solid var(--color-stone)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.05)" }}
        >
          {/* Tech Header */}
          <div style={{ borderBottom: "1px solid var(--color-stone)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(24, 25, 23, 0.02)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "var(--color-primary)" }}>ECDAT // WORKSPACE_INIT</span>
            <div style={{ display: "flex", gap: "6px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-accent)" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-sage)" }} />
            </div>
          </div>

          <div style={{ padding: "40px" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, marginBottom: "12px", color: "var(--color-primary)" }}>
              INITIALIZE YOUR SECURE ENCLAVE
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", color: "#666", lineHeight: 1.6, marginBottom: "32px" }}>
              Welcome to LatentManifold. Before accessing the cryptographic discovery engine, you must provision an isolated workspace. This will act as the boundary for your source scans and CBOM models.
            </p>

            {/* Terminal Boot Sequence */}
            <div style={{ background: "#111", borderRadius: "8px", padding: "16px", marginBottom: "32px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "#00FF41", minHeight: "140px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {bootSequence.map((log, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  style={{ color: typeof log === 'string' && log.includes("[ERR]") ? "#ff3333" : typeof log === 'string' && log.includes("[WARN]") ? "#D3A248" : "#00FF41" }}
                >
                  {log}
                </motion.div>
              ))}
              {loading && (
                <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>_</motion.div>
              )}
            </div>

            <button 
              onClick={handleCreateWorkspace} 
              disabled={creating || loading}
              style={{ 
                width: "100%",
                padding: "16px 24px", 
                background: (creating || loading) ? "var(--color-stone)" : "var(--color-accent)", 
                color: (creating || loading) ? "var(--color-primary)" : "white", 
                border: "none", 
                borderRadius: "8px", 
                cursor: (creating || loading) ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.05em",
                transition: "all 0.2s ease"
              }}
            >
              {creating ? "PROVISIONING WORKSPACE..." : "INITIALIZE NEW WORKSPACE"}
            </button>
          </div>
        </motion.div>

      </div>
    );
  }

  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
