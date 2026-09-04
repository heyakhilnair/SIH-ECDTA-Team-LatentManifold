"use client";

/**
 * Real, data-driven 3D dependency graph. Replaces the old flat "Tier 1 / Tier 2"
 * box rows in prototype/graph/page.tsx, which never actually computed edges —
 * it just rendered every source and every asset as two static rows with no
 * real connection data at all.
 *
 * Nodes: one per Source (project) and one per CryptoAsset (algorithm).
 * Edges: Source → Asset wherever that asset's real evidence came from that
 * project — i.e. `asset.projects` (from serialize_asset() in assets.py, the
 * same field the Crypto Assets page's "Found in: 📁 X" badges already use).
 * No fabricated relationships: an asset with projects: ["Test"] only ever
 * gets one edge, to the "Test" source — not one to every registered source.
 *
 * Layout is a lightweight custom force simulation (repulsion + spring edges +
 * centering), not a static geometric layout — it settles into whatever shape
 * the real connectivity produces, then freezes (OrbitControls autoRotate
 * takes over) so it's cheap to keep rendering.
 */
import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Sphere, Box, Html } from "@react-three/drei";
import * as THREE from "three";

export interface GraphSourceInput {
  id: string;
  name: string;
}

export interface GraphAssetInput {
  id: string;
  algorithm_canonical: string;
  algorithm_family?: string | null;
  quantum_vulnerable?: boolean;
  classical_vulnerable?: boolean;
  projects?: string[];
  risk?: { composite_risk_level?: string } | null;
}

type NodeKind = "source" | "asset";

interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  color: string;
  size: number;
  raw: GraphSourceInput | GraphAssetInput;
}

interface GraphEdge {
  a: string;
  b: string;
}

const COLOR = {
  source: "#181917",
  danger: "#D63939",
  warning: "#D3A248",
  safe: "#2B7A4B",
  accent: "#B95532",
};

function nodeColor(asset: GraphAssetInput): string {
  if (asset.quantum_vulnerable) return COLOR.danger;
  if (asset.classical_vulnerable) return COLOR.warning;
  return COLOR.safe;
}

function buildGraph(sources: GraphSourceInput[], assets: GraphAssetInput[]) {
  const byName = new Map(sources.map((s) => [s.name, s]));
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const s of sources) {
    nodes.push({ id: `src:${s.id}`, kind: "source", label: s.name, color: COLOR.source, size: 0.34, raw: s });
  }
  for (const a of assets) {
    const blast = (a.projects || []).length;
    nodes.push({
      id: `ast:${a.id}`,
      kind: "asset",
      label: a.algorithm_canonical,
      color: nodeColor(a),
      // real blast radius drives visual weight — an algorithm used in more
      // projects renders as a bigger node, not a decorative random size
      size: 0.16 + Math.min(blast, 6) * 0.045,
      raw: a,
    });
    for (const projectName of a.projects || []) {
      const src = byName.get(projectName);
      if (src) edges.push({ a: `src:${src.id}`, b: `ast:${a.id}` });
    }
  }
  return { nodes, edges };
}

/** Deterministic starting layout: sources on an inner shell, assets on an outer shell. */
function initialPosition(index: number, total: number, radius: number): [number, number, number] {
  const t = total <= 1 ? 0 : index / total;
  const phi = Math.acos(1 - 2 * t);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index; // golden angle spiral, even coverage
  return [radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi)];
}

function Scene({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const sourceNodes = useMemo(() => nodes.filter((n) => n.kind === "source"), [nodes]);
  const assetNodes = useMemo(() => nodes.filter((n) => n.kind === "asset"), [nodes]);

  const positions = useRef<Map<string, THREE.Vector3>>(new Map());
  const velocities = useRef<Map<string, THREE.Vector3>>(new Map());
  const settled = useRef(false);
  const [, forceTick] = useState(0);

  // (Re)initialize positions whenever the node set changes (new scan / project switch)
  const nodeKey = nodes.map((n) => n.id).join("|");
  const initialized = useRef<string>("");
  if (initialized.current !== nodeKey) {
    initialized.current = nodeKey;
    positions.current = new Map();
    velocities.current = new Map();
    sourceNodes.forEach((n, i) => {
      positions.current.set(n.id, new THREE.Vector3(...initialPosition(i, sourceNodes.length, 1.8)));
      velocities.current.set(n.id, new THREE.Vector3());
    });
    assetNodes.forEach((n, i) => {
      positions.current.set(n.id, new THREE.Vector3(...initialPosition(i, assetNodes.length, 3.6)));
      velocities.current.set(n.id, new THREE.Vector3());
    });
    settled.current = false;
  }

  const meshRefs = useRef<Map<string, THREE.Object3D>>(new Map());
  const lineRef = useRef<any>(null);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
    if (!settled.current) {
      let maxSpeed = 0;
      const pos = positions.current;
      const vel = velocities.current;
      const force = new Map<string, THREE.Vector3>();
      nodes.forEach((n) => force.set(n.id, new THREE.Vector3()));

      // repulsion — every pair pushes apart (node counts here are small, O(n^2) is fine)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i].id;
          const b = nodes[j].id;
          const pa = pos.get(a)!;
          const pb = pos.get(b)!;
          const diff = pa.clone().sub(pb);
          const distSq = Math.max(diff.lengthSq(), 0.05);
          const strength = 0.9 / distSq;
          diff.normalize().multiplyScalar(strength);
          force.get(a)!.add(diff);
          force.get(b)!.sub(diff);
        }
      }
      // spring attraction along real edges only
      for (const e of edges) {
        const pa = pos.get(e.a);
        const pb = pos.get(e.b);
        if (!pa || !pb) continue;
        const diff = pb.clone().sub(pa);
        const dist = Math.max(diff.length(), 0.001);
        const rest = 2.1;
        const k = 0.045;
        diff.normalize().multiplyScalar((dist - rest) * k);
        force.get(e.a)!.add(diff);
        force.get(e.b)!.sub(diff);
      }
      // gentle centering so the whole graph doesn't drift
      nodes.forEach((n) => {
        force.get(n.id)!.add(pos.get(n.id)!.clone().multiplyScalar(-0.012));
      });

      nodes.forEach((n) => {
        const v = vel.get(n.id)!;
        v.add(force.get(n.id)!.multiplyScalar(delta * 12));
        v.multiplyScalar(0.82); // damping
        pos.get(n.id)!.add(v.clone().multiplyScalar(delta * 6));
        maxSpeed = Math.max(maxSpeed, v.length());
      });

      nodes.forEach((n) => {
        const obj = meshRefs.current.get(n.id);
        const p = pos.get(n.id)!;
        if (obj) obj.position.set(p.x, p.y, p.z);
      });
      if (lineRef.current) forceTick((t) => t + 1);

      if (maxSpeed < 0.004) settled.current = true;
    }
  });

  return (
    <group>
      {nodes.map((n) => {
        const isSelected = n.id === selectedId;
        const p = positions.current.get(n.id)!;
        return (
          <group
            key={n.id}
            ref={(o) => {
              if (o) meshRefs.current.set(n.id, o);
            }}
            position={p}
          >
            {n.kind === "source" ? (
              <Box
                args={[n.size, n.size, n.size]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(n.id);
                }}
              >
                <meshStandardMaterial color={n.color} emissive={isSelected ? COLOR.accent : "#000000"} emissiveIntensity={isSelected ? 0.5 : 0} />
              </Box>
            ) : (
              <Sphere
                args={[n.size, 20, 20]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(n.id);
                }}
              >
                <meshStandardMaterial
                  color={n.color}
                  emissive={isSelected ? n.color : "#000000"}
                  emissiveIntensity={isSelected ? 0.9 : 0}
                  transparent
                  opacity={isSelected || !selectedId ? 1 : 0.45}
                />
              </Sphere>
            )}
            {(n.kind === "source" || isSelected) && (
              <Html center distanceFactor={9} style={{ pointerEvents: "none" }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: n.kind === "source" ? "#F3F0E8" : "#181917",
                    background: n.kind === "source" ? "#181917" : "#FFFFFF",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: `1px solid ${n.kind === "source" ? "#333" : "#ddd"}`,
                    whiteSpace: "nowrap",
                    transform: "translateY(18px)",
                  }}
                >
                  {n.kind === "source" ? "📦 " : ""}
                  {n.label}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {edges.map((e, i) => {
        const pa = positions.current.get(e.a);
        const pb = positions.current.get(e.b);
        if (!pa || !pb) return null;
        const touchesSelected = selectedId && (e.a === selectedId || e.b === selectedId);
        return (
          <Line
            key={i}
            points={[pa, pb]}
            color={touchesSelected ? COLOR.accent : "#B7B2A5"}
            lineWidth={touchesSelected ? 2 : 1}
            transparent
            opacity={!selectedId || touchesSelected ? 0.8 : 0.15}
          />
        );
      })}
    </group>
  );
}

export default function CryptoGraph3D({
  sources,
  assets,
  selectedId,
  onSelectNode,
}: {
  sources: GraphSourceInput[];
  assets: GraphAssetInput[];
  selectedId: string | null;
  onSelectNode: (asset: GraphAssetInput | null) => void;
}) {
  const { nodes, edges } = useMemo(() => buildGraph(sources, assets), [sources, assets]);

  const handleSelect = useCallback(
    (id: string) => {
      const node = nodes.find((n) => n.id === id);
      if (node?.kind === "asset") onSelectNode(node.raw as GraphAssetInput);
    },
    [nodes, onSelectNode]
  );

  if (nodes.length === 0) return null;

  return (
    <div style={{ width: "100%", height: "460px", position: "relative" }}>
      <Canvas camera={{ position: [0, 1.5, 7], fov: 55 }} onPointerMissed={() => onSelectNode(null)}>
        <ambientLight intensity={0.65} />
        <pointLight position={[8, 8, 8]} intensity={1} color="#B95532" />
        <pointLight position={[-8, -6, -8]} intensity={0.4} color="#D3A248" />
        <Scene nodes={nodes} edges={edges} selectedId={selectedId ? `ast:${selectedId}` : null} onSelect={handleSelect} />
        <OrbitControls enableZoom enablePan autoRotate autoRotateSpeed={0.6} minDistance={2.5} maxDistance={14} />
      </Canvas>
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 16,
          display: "flex",
          gap: "12px",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "10px",
          color: "#687563",
          pointerEvents: "none",
        }}
      >
        <span><span style={{ color: COLOR.danger }}>●</span> Quantum vulnerable</span>
        <span><span style={{ color: COLOR.warning }}>●</span> Classically weak</span>
        <span><span style={{ color: COLOR.safe }}>●</span> Safe</span>
        <span><span style={{ color: COLOR.source }}>■</span> Source repository</span>
      </div>
    </div>
  );
}
