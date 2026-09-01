"use client";

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';

function LatentNodes() {
  const group = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.Group>(null);

  // Generate 50 random nodes in a sphere
  const nodes = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 50; i++) {
      const phi = Math.acos(-1 + (2 * i) / 50);
      const theta = Math.sqrt(50 * Math.PI) * phi;
      const radius = 3 + Math.random();
      temp.push(new THREE.Vector3(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi)
      ));
    }
    return temp;
  }, []);

  // Generate connections between close nodes
  const lines = useMemo(() => {
    const temp = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < 2.5) {
          temp.push([nodes[i], nodes[j]]);
        }
      }
    }
    return temp;
  }, [nodes]);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y += 0.002;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;
    }
    if (linesRef.current) {
      // Pulse effect on lines
      linesRef.current.children.forEach((child, i) => {
        if ((child as any).material) {
          (child as any).material.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.2;
        }
      });
    }
  });

  return (
    <group ref={group}>
      {/* Nodes */}
      {nodes.map((pos, i) => (
        <Sphere key={i} position={pos} args={[0.08, 16, 16]}>
          <meshBasicMaterial color="#B95532" />
        </Sphere>
      ))}
      
      {/* Connections */}
      <group ref={linesRef}>
        {lines.map((pts, i) => (
          <Line
            key={i}
            points={pts}
            color="#D3A248"
            lineWidth={1}
            transparent
            opacity={0.3}
          />
        ))}
      </group>
    </group>
  );
}

export default function ThreeManifold() {
  return (
    <div style={{ width: '100%', height: '500px', position: 'relative', background: 'transparent' }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#B95532" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#D3A248" />
        <LatentNodes />
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          autoRotate 
          autoRotateSpeed={0.5}
        />
      </Canvas>
      
      {/* Overlay UI to make it look technical */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#B95532', pointerEvents: 'none' }}>
        <div style={{ fontWeight: 700 }}>[SYS] MANIFOLD_RENDER_ENGINE_ONLINE</div>
        <div>[SYS] NODE_COUNT: 50</div>
        <div>[SYS] VECTOR_SPACE: R^3</div>
        <div style={{ marginTop: 8, opacity: 0.7, color: '#666' }}>Initializing cryptographic topological scan...</div>
      </div>
    </div>
  );
}
