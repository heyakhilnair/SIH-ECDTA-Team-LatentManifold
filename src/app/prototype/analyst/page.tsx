"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { useWorkspace } from "@/components/WorkspaceWrapper";
import { motion } from "framer-motion";
import "../prototype.css";

interface Message {
  role: "user" | "assistant";
  text: string;
  confidence?: number;
  evidenceCitations?: string[];
  assetCitations?: string[];
  unknowns?: string[];
  isError?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "What should I fix first?",
  "Which findings are quantum vulnerable?",
  "Summarize my classically broken algorithms.",
  "What PQC migration would you recommend and why?",
];

export default function AiAnalystPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoaded || !userId || !workspace) return;
    api.analyst.status(workspace.id, getToken)
      .then((res) => setConfigured(!!res.configured))
      .catch(() => setConfigured(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const ask = async (question: string) => {
    if (!question.trim() || !workspace || asking) return;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setAsking(true);
    try {
      const res = await api.analyst.query(workspace.id, question, getToken);
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: res.answer,
        confidence: res.confidence,
        evidenceCitations: res.evidence_citations || [],
        assetCitations: res.asset_citations || [],
        unknowns: res.unknowns || [],
      }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: err.message || "Something went wrong asking the AI Analyst.",
        isError: true,
      }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="ecdat-container">
      <motion.header
        className="ecdat-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 style={{ fontSize: "2.25rem", marginBottom: "0.25rem" }}>AI Analyst</h1>
          <p>Ask about your real scan results — every answer is grounded in your workspace's actual evidence, risk, and recommendation data. No source code is ever sent to the model.</p>
        </div>
      </motion.header>

      {configured === false && (
        <div className="ecdat-card" style={{ borderLeft: "3px solid var(--color-danger, #B91C1C)", marginBottom: "1.5rem" }}>
          <strong>AI Analyst isn't configured yet.</strong>
          <p style={{ marginTop: "0.4rem", color: "var(--color-secondary)", fontSize: "0.9rem" }}>
            No <code>GEMINI_API_KEY</code> is set on the backend. Add one to <code>ecdat-backend/.env</code> and restart the backend to enable this page.
          </p>
        </div>
      )}

      <div className="ecdat-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "560px" }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {messages.length === 0 && (
            <div style={{ margin: "auto", textAlign: "center", maxWidth: "420px" }}>
              <p style={{ color: "var(--color-secondary)", marginBottom: "1rem" }}>
                Ask a question about your cryptographic findings, or try one of these:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    className="ecdat-btn"
                    style={{ backgroundColor: "#faf9f6", color: "var(--color-primary)", textAlign: "left" }}
                    onClick={() => ask(q)}
                    disabled={configured === false}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "75%",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  backgroundColor: m.role === "user" ? "var(--color-primary)" : m.isError ? "#FEE2E2" : "#faf9f6",
                  color: m.role === "user" ? "white" : m.isError ? "#B91C1C" : "var(--color-primary)",
                  fontSize: "0.9rem",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
                {m.role === "assistant" && !m.isError && (
                  <div style={{ marginTop: "0.6rem", display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                    {typeof m.confidence === "number" && (
                      <span className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.7rem" }}>
                        confidence {(m.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {(m.evidenceCitations?.length ?? 0) > 0 && (
                      <span className="ecdat-badge ecdat-badge-success" style={{ fontSize: "0.7rem" }}>
                        {m.evidenceCitations!.length} evidence citation{m.evidenceCitations!.length === 1 ? "" : "s"}
                      </span>
                    )}
                    {(m.unknowns?.length ?? 0) > 0 && (
                      <span className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.7rem" }} title={m.unknowns!.join(", ")}>
                        {m.unknowns!.length} unknown{m.unknowns!.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {asking && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "0.75rem 1rem", borderRadius: "10px", backgroundColor: "#faf9f6", fontSize: "0.9rem", color: "var(--color-secondary)" }}>
                Thinking…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); ask(input); }}
          style={{ display: "flex", gap: "0.75rem", padding: "1rem 1.5rem", borderTop: "var(--border-thin)", backgroundColor: "#faf9f6" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={configured === false ? "AI Analyst not configured" : "Ask about your findings…"}
            disabled={configured === false || asking}
            className="ecdat-input"
            style={{ flex: 1 }}
          />
          <button type="submit" className="ecdat-btn" disabled={configured === false || asking || !input.trim()}>
            {asking ? "ASKING…" : "ASK"}
          </button>
        </form>
      </div>
    </div>
  );
}
