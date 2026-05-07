'use client';

/**
 * Company Intelligence Nexus — Executive Skyline View™
 *
 * Three.js + React Three Fiber implementation.
 * 12 stylized London towers with emissive-edge materials, bloom post-processing,
 * floating HTML labels, hover dimming, click side-panel, and mode toggle.
 *
 * Aesthetic: Tron meets Bloomberg — dark, architectural, precise, alive.
 */

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  Suspense,
  Component,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const Canvas = dynamic(
  () => import('@react-three/fiber').then(mod => mod.Canvas),
  { ssr: false }
);
import type {
  ValuationMethodResult,
  MonteCarloResult,
  BuyerType,
} from '@/lib/valuation/types';

/* ═══════════════════════════════════════════════════════════════════════════
   Props (unchanged — drop-in replacement)
   ═══════════════════════════════════════════════════════════════════════════ */

export interface NexusProps {
  companyName: string;
  sector: string;
  stage: string;
  confidence: number;
  evLow: number | null;
  evBase: number | null;
  evHigh: number | null;
  methods: ValuationMethodResult[];
  mcResult: MonteCarloResult | null;
  buyerType: BuyerType;
  risks: string[];
  opportunities: string[];
  ruleOf40: number | null;
  clockState?: 'fresh' | 'amber' | 'red';
}

/* ═══════════════════════════════════════════════════════════════════════════
   Constants & Types
   ═══════════════════════════════════════════════════════════════════════════ */

type ViewMode = 'ranked' | 'fixed';

interface BuildingTemplate {
  id: string;
  name: string;
  realHeightM: number;
  cluster: 'southwark' | 'city' | 'canary';
  /** Shape generator: returns a Three.js geometry */
  shape: 'shard' | 'rect' | 'rect-crown' | 'wedge' | 'bullet' | 'tower' | 'trapezoid' | 'rounded';
  xPosition: number; // layout position (-6 to +6)
}

interface MetricTower {
  templateId: string;
  template: BuildingTemplate;
  methodId: string;
  label: string;
  score: number;
  value: string;
  weight: number;
  rank: number;
  enabled: boolean;
  displayHeight: number;
  color: THREE.Color;
  emissiveColor: THREE.Color;
}

/* 12 London buildings — real heights, clustered geographically */
const BUILDING_TEMPLATES: BuildingTemplate[] = [
  { id: 'shard', name: 'The Shard', realHeightM: 306, cluster: 'southwark', shape: 'shard', xPosition: -5.5 },
  { id: 'bishopsgate22', name: '22 Bishopsgate', realHeightM: 278.2, cluster: 'city', shape: 'rect-crown', xPosition: -2.5 },
  { id: 'canada-sq', name: 'One Canada Square', realHeightM: 236, cluster: 'canary', shape: 'rect-crown', xPosition: 3.0 },
  { id: 'pinnacle', name: 'Landmark Pinnacle', realHeightM: 233.2, cluster: 'canary', shape: 'rect', xPosition: 4.2 },
  { id: 'heron', name: 'Heron Tower', realHeightM: 230, cluster: 'city', shape: 'rect', xPosition: -1.2 },
  { id: 'leadenhall', name: '122 Leadenhall St', realHeightM: 224.5, cluster: 'city', shape: 'wedge', xPosition: -0.2 },
  { id: 'newfoundland', name: 'Newfoundland', realHeightM: 219.7, cluster: 'canary', shape: 'rect', xPosition: 5.3 },
  { id: 'aspen', name: 'Aspen at Consort Place', realHeightM: 215.8, cluster: 'canary', shape: 'rect', xPosition: 6.2 },
  { id: 'south-quay', name: 'South Quay Plaza 1', realHeightM: 214.5, cluster: 'canary', shape: 'rect', xPosition: 2.0 },
  { id: 'one-park', name: 'One Park Drive', realHeightM: 204.9, cluster: 'canary', shape: 'rounded', xPosition: 7.0 },
  { id: 'bishopsgate8', name: '8 Bishopsgate', realHeightM: 203.7, cluster: 'city', shape: 'rect', xPosition: 0.8 },
  { id: 'canada25', name: '25 Canada Square', realHeightM: 201, cluster: 'canary', shape: 'rect-crown', xPosition: 1.0 },
];

/* Fixed mode: default metric → building mapping */
const FIXED_MAPPING: Record<string, string> = {
  revenue_multiple: 'shard',
  ebitda_multiple: 'bishopsgate22',
  dcf: 'canada-sq',
  vc_method: 'pinnacle',
  cost_to_duplicate: 'heron',
  scorecard: 'leadenhall',
  liquidation: 'newfoundland',
  strategic_synergy: 'aspen',
  precedent_transactions: 'south-quay',
  strategic_adjustment: 'one-park',
  real_options: 'bishopsgate8',
};

/* ═══════════════════════════════════════════════════════════════════════════
   Formatting Utilities
   ═══════════════════════════════════════════════════════════════════════════ */

function fmtCompact(v: number): string {
  if (v >= 1e9) return `£${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `£${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `£${(v / 1e3).toFixed(0)}K`;
  return `£${v.toFixed(0)}`;
}

function methodLabel(m: string): string {
  const map: Record<string, string> = {
    revenue_multiple: 'Revenue Multiple',
    ebitda_multiple: 'EBITDA Multiple',
    dcf: 'DCF',
    vc_method: 'VC Method',
    cost_to_duplicate: 'Cost to Duplicate',
    scorecard: 'Scorecard',
    liquidation: 'Liquidation',
    strategic_synergy: 'Strategic Synergy',
    precedent_transactions: 'Precedent Txns',
    strategic_adjustment: 'Strategic Adj.',
    real_options: 'Real Options',
  };
  return map[m] || m;
}

function agreementScore(evBase: number, methodEv: number): number {
  if (evBase <= 0 || methodEv <= 0) return 40;
  const ratio = Math.max(evBase / methodEv, methodEv / evBase);
  return Math.max(0, Math.min(100, Math.round(100 - ((ratio - 1) / 2) * 100)));
}

/* ═══════════════════════════════════════════════════════════════════════════
   Rank → Color Mapping
   Rank 1 = Green, 2 = Blue, 3 = Yellow, 4-8 = Orange gradient, 9-12 = Red
   ═══════════════════════════════════════════════════════════════════════════ */

function rankToColor(rank: number, total: number): { main: THREE.Color; emissive: THREE.Color; hex: string } {
  if (rank === 1) return { main: new THREE.Color(0x0a3d1a), emissive: new THREE.Color(0x34d466), hex: '#34D466' };
  if (rank === 2) return { main: new THREE.Color(0x0d1e36), emissive: new THREE.Color(0x4d99f2), hex: '#4D99F2' };
  if (rank === 3) return { main: new THREE.Color(0x2e2a0d), emissive: new THREE.Color(0xf2d140), hex: '#F2D140' };
  if (rank <= 8) {
    // Orange gradient: deeper orange as rank increases
    const t = (rank - 4) / 4;
    const emissive = new THREE.Color(0xf28c33).lerp(new THREE.Color(0xd45a1a), t);
    return { main: new THREE.Color(0x2e1a0d), emissive, hex: `#${emissive.getHexString()}` };
  }
  // Red gradient
  const t = (rank - 9) / Math.max(1, total - 9);
  const emissive = new THREE.Color(0xe84855).lerp(new THREE.Color(0x991122), t);
  return { main: new THREE.Color(0x2e0d10), emissive, hex: `#${emissive.getHexString()}` };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Building Geometry Generators
   ═══════════════════════════════════════════════════════════════════════════ */

function createBuildingGeometry(shape: BuildingTemplate['shape'], height: number, width: number = 0.6): THREE.BufferGeometry {
  const depth = width * 0.7;

  switch (shape) {
    case 'shard': {
      // Pyramidal tapered tower
      const geo = new THREE.ConeGeometry(width * 0.5, height, 4);
      geo.rotateY(Math.PI / 4);
      geo.translate(0, height / 2, 0);
      return geo;
    }
    case 'wedge': {
      // Cheesegrater — tapered on one side
      const vertices = new Float32Array([
        // Front face (full height left, short right)
        -width/2, 0, depth/2,
        width/2, 0, depth/2,
        width/2, height * 0.4, depth/2,
        -width/2, height, depth/2,
        // Back face
        -width/2, 0, -depth/2,
        width/2, 0, -depth/2,
        width/2, height * 0.4, -depth/2,
        -width/2, height, -depth/2,
      ]);
      const indices = [
        0,1,2, 0,2,3,  // front
        5,4,7, 5,7,6,  // back
        4,0,3, 4,3,7,  // left
        1,5,6, 1,6,2,  // right
        3,2,6, 3,6,7,  // top
        4,5,1, 4,1,0,  // bottom
      ];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    }
    case 'bullet': {
      // Gherkin — cylinder with dome top
      const geo = new THREE.CapsuleGeometry(width * 0.4, height * 0.7, 8, 16);
      geo.translate(0, height / 2, 0);
      return geo;
    }
    case 'tower': {
      // BT Tower style — thin shaft with wider observation section
      const group = new THREE.BoxGeometry(width * 0.4, height, depth * 0.4);
      group.translate(0, height / 2, 0);
      return group;
    }
    case 'trapezoid': {
      // Walkie-Talkie — wider at top
      const topW = width * 1.3;
      const vertices = new Float32Array([
        -width/2, 0, depth/2,
        width/2, 0, depth/2,
        topW/2, height, depth/2,
        -topW/2, height, depth/2,
        -width/2, 0, -depth/2,
        width/2, 0, -depth/2,
        topW/2, height, -depth/2,
        -topW/2, height, -depth/2,
      ]);
      const indices = [
        0,1,2, 0,2,3,
        5,4,7, 5,7,6,
        4,0,3, 4,3,7,
        1,5,6, 1,6,2,
        3,2,6, 3,6,7,
        4,5,1, 4,1,0,
      ];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    }
    case 'rounded': {
      // Cylindrical tower
      const geo = new THREE.CylinderGeometry(width * 0.4, width * 0.4, height, 16);
      geo.translate(0, height / 2, 0);
      return geo;
    }
    case 'rect-crown': {
      // Rectangle with slight stepped crown
      const geo = new THREE.BoxGeometry(width, height, depth);
      geo.translate(0, height / 2, 0);
      return geo;
    }
    case 'rect':
    default: {
      const geo = new THREE.BoxGeometry(width, height, depth);
      geo.translate(0, height / 2, 0);
      return geo;
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Wireframe Edge Geometry — creates the emissive architectural edges
   ═══════════════════════════════════════════════════════════════════════════ */

function BuildingEdges({ geometry, color, opacity = 0.6 }: { geometry: THREE.BufferGeometry; color: THREE.Color; opacity?: number }) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 15), [geometry]);
  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Single 3D Tower Component
   ═══════════════════════════════════════════════════════════════════════════ */

function Tower3D({
  tower,
  isHovered,
  isActive,
  isDimmed,
  onHover,
  onClick,
}: {
  tower: MetricTower;
  isHovered: boolean;
  isActive: boolean;
  isDimmed: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetOpacity = isDimmed ? 0.3 : 1;
  const targetEmissiveIntensity = isHovered || isActive ? 2.5 : 1.2;

  const geometry = useMemo(
    () => createBuildingGeometry(tower.template.shape, tower.displayHeight, 0.55),
    [tower.template.shape, tower.displayHeight]
  );

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 4);
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetEmissiveIntensity, delta * 4);
  });

  return (
    <group position={[tower.template.xPosition, 0, tower.template.cluster === 'canary' ? 1.5 : tower.template.cluster === 'southwark' ? -1.5 : 0]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerEnter={(e) => { e.stopPropagation(); onHover(tower.methodId); }}
        onPointerLeave={() => onHover(null)}
        onClick={(e) => { e.stopPropagation(); onClick(tower.methodId); }}
      >
        <meshStandardMaterial
          color={tower.color}
          emissive={tower.emissiveColor}
          emissiveIntensity={1.2}
          transparent
          opacity={1}
          metalness={0.8}
          roughness={0.2}
          toneMapped={false}
        />
      </mesh>
      <BuildingEdges geometry={geometry} color={tower.emissiveColor} opacity={isHovered ? 1 : 0.4} />

      {/* Ground glow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial
          color={tower.emissiveColor}
          transparent
          opacity={isHovered ? 0.3 : 0.1}
        />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Ground Grid — subtle architectural grid plane
   ═══════════════════════════════════════════════════════════════════════════ */

function GroundGrid() {
  return (
    <group>
      {/* Main ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[24, 12]} />
        <meshStandardMaterial color="#050810" metalness={0.9} roughness={0.8} />
      </mesh>
      {/* Grid lines */}
      <gridHelper args={[24, 48, 0x111828, 0x0a1020]} position={[0, 0, 0]} />
      {/* Thames strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 3.5]}>
        <planeGeometry args={[24, 2]} />
        <meshStandardMaterial
          color="#0a1628"
          emissive="#1a3a6e"
          emissiveIntensity={0.15}
          metalness={0.95}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Ambient Particles — subtle floating specs for atmosphere
   ═══════════════════════════════════════════════════════════════════════════ */

function Particles() {
  const count = 80;
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = Math.random() * 8 + 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.01;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.03} color="#4d99f2" transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Camera Controller — slow auto-orbit, no drei dependency
   ═══════════════════════════════════════════════════════════════════════════ */

function CameraRig() {
  const { camera } = useThree();
  const angle = useRef(0);

  useFrame((_, delta) => {
    angle.current += delta * 0.05; // slow orbit
    const radius = 14;
    const height = 6;
    camera.position.set(
      Math.sin(angle.current) * radius,
      height,
      Math.cos(angle.current) * radius
    );
    camera.lookAt(0, 2.5, 0);
  });

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Scene (combines all 3D elements)
   ═══════════════════════════════════════════════════════════════════════════ */

function Scene({
  towers,
  hoveredId,
  activeId,
  onHover,
  onClick,
}: {
  towers: MetricTower[];
  hoveredId: string | null;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 10, 5]} intensity={0.4} color="#c4a96a" />
      <directionalLight position={[-3, 8, -2]} intensity={0.2} color="#4d99f2" />
      <pointLight position={[0, 12, 0]} intensity={0.3} color="#ffffff" distance={20} />

      <GroundGrid />
      <Particles />

      {towers.map((t) => (
        <Tower3D
          key={t.methodId}
          tower={t}
          isHovered={hoveredId === t.methodId}
          isActive={activeId === t.methodId}
          isDimmed={hoveredId !== null && hoveredId !== t.methodId}
          onHover={onHover}
          onClick={onClick}
        />
      ))}

      <CameraRig />

      {/* Bloom removed — emissive materials provide glow without postprocessing dependency */}

      <fog attach="fog" args={['#050810', 12, 28]} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Side Insight Panel (DOM overlay — slides in from right)
   ═══════════════════════════════════════════════════════════════════════════ */

function InsightPanel({
  tower,
  onClose,
}: {
  tower: MetricTower | null;
  onClose: () => void;
}) {
  if (!tower) return null;

  const tierLabel = tower.rank <= 1 ? 'Exceptional' : tower.rank <= 3 ? 'Very Strong' : tower.rank <= 6 ? 'Strong' : tower.rank <= 9 ? 'Moderate' : 'Needs Attention';

  return (
    <div
      className="absolute top-0 right-0 h-full z-[50] flex"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Panel */}
      <div
        className="w-[340px] h-full overflow-y-auto border-l"
        style={{
          background: 'rgba(6,8,14,0.97)',
          borderColor: `${tower.emissiveColor.getStyle()}30`,
          backdropFilter: 'blur(12px)',
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-bold" style={{ color: tower.emissiveColor.getStyle() }}>
                {tower.template.name}
              </p>
              <p className="text-white text-[15px] font-semibold mt-0.5">{tower.label}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white transition-colors"
              aria-label="Close panel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Score section */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/40 mb-2">Score & Ranking</p>
          <div className="flex items-baseline gap-3">
            <span className="text-[28px] font-bold text-white">{tower.score}</span>
            <span className="text-white/40 text-[13px]">/ 100</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
              style={{ background: `${tower.emissiveColor.getStyle()}20`, color: tower.emissiveColor.getStyle() }}>
              Rank #{tower.rank}
            </span>
            <span className="text-white/50 text-[11px]">{tierLabel}</span>
          </div>
        </div>

        {/* Value section */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/40 mb-2">Enterprise Value</p>
          <p className="text-white text-[18px] font-semibold">{tower.value}</p>
        </div>

        {/* Weight section */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/40 mb-2">Weighted Contribution</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${tower.weight * 100}%`, background: tower.emissiveColor.getStyle() }}
              />
            </div>
            <span className="text-white/70 text-[12px] font-medium">{(tower.weight * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Agreement detail */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/40 mb-2">Agreement with Consensus</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${tower.score}%`, background: tower.emissiveColor.getStyle() }}
              />
            </div>
            <span className="text-white/70 text-[12px] font-medium">{tower.score}%</span>
          </div>
        </div>

        {/* Building info */}
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/40 mb-2">Tower Assignment</p>
          <p className="text-white/70 text-[12px]">{tower.template.name}</p>
          <p className="text-white/40 text-[11px] mt-0.5">{tower.template.realHeightM}m · {tower.template.cluster === 'city' ? 'City of London' : tower.template.cluster === 'canary' ? 'Canary Wharf' : 'Southwark'}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Header Strip
   ═══════════════════════════════════════════════════════════════════════════ */

function HeaderStrip({ data }: { data: NexusProps }) {
  const { companyName, sector, stage, buyerType, ruleOf40, mcResult, evLow, evHigh, confidence } = data;

  const stats: { label: string; value: string; className?: string }[] = [];
  if (evLow != null && evHigh != null) {
    stats.push({ label: 'EV Range', value: `${fmtCompact(evLow)} — ${fmtCompact(evHigh)}` });
  }
  if (mcResult) {
    stats.push({ label: 'MC Median', value: fmtCompact(mcResult.p50) });
  }
  if (ruleOf40 != null) {
    stats.push({
      label: 'Rule of 40',
      value: `${ruleOf40.toFixed(0)}%`,
      className: ruleOf40 >= 40 ? 'text-green-400' : 'text-amber-400',
    });
  }
  if (confidence > 0) {
    stats.push({ label: 'Confidence', value: `${confidence}%` });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 px-5 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-white leading-tight truncate">{companyName}</p>
        <p className="text-[11px] text-white/40 leading-tight mt-0.5">
          {stage?.replace(/_/g, ' ')} · {sector} · {buyerType?.replace(/_/g, ' ')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {stats.map(s => (
          <div key={s.label} className="text-right">
            <p className="text-[9px] uppercase tracking-[0.12em] text-white/40 leading-none mb-1">{s.label}</p>
            <p className={`text-[12px] font-semibold leading-none ${s.className ?? 'text-white'}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Mode Toggle Bar
   ═══════════════════════════════════════════════════════════════════════════ */

function ModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="absolute top-3 left-4 z-[20] flex items-center gap-1 p-1 rounded-lg"
      style={{ background: 'rgba(6,8,14,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {(['ranked', 'fixed'] as ViewMode[]).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
            mode === m
              ? 'bg-white/[0.1] text-white'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          {m === 'ranked' ? 'Ranked' : 'Fixed'}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Skyline Bar View — WCAG 2.1 AA, responsive, with clamped tooltips
   Works as fallback AND as the primary 2D visualization mode.
   ═══════════════════════════════════════════════════════════════════════════ */

function SkylineBarView({ towers }: { towers: MetricTower[] }) {
  const maxRank = towers.length || 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTower, setActiveTower] = useState<MetricTower | null>(null);
  const [dimmedExcept, setDimmedExcept] = useState<string | null>(null);

  const handleBarInteraction = useCallback((tower: MetricTower) => {
    setActiveTower(tower);
    setDimmedExcept(tower.methodId);
  }, []);

  const clearInteraction = useCallback(() => {
    setActiveTower(null);
    setDimmedExcept(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden flex flex-col"
      role="figure"
      aria-label={`Executive Skyline: ${towers.length} valuation methods ranked by agreement score`}
    >
      {/* Skyline bars — flex-1 so buildings expand to fill available space */}
      <div
        className="flex items-end justify-center gap-[3px] sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-4 relative flex-1"
        style={{ minHeight: 200, paddingTop: 16 }}
        aria-hidden="true"
      >
        {towers.map(t => {
          // Max 85% (was 95), min 22% (was 25), gentler spread so Shard doesn't clip
          const heightPct = 85 - ((t.rank - 1) / Math.max(1, maxRank - 1)) * 63;
          const isDimmed = dimmedExcept !== null && dimmedExcept !== t.methodId;
          return (
            <div
              key={t.methodId}
              className="flex flex-col items-center flex-1 h-full justify-end min-w-0"
              style={{ opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.2s ease' }}
            >
              <div
                className="w-full rounded-t-sm relative overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  height: `${heightPct}%`,
                  minHeight: 20,
                  maxWidth: 72,
                  background: `linear-gradient(to top, ${t.color.getStyle()}, ${t.emissiveColor.getStyle()})`,
                  boxShadow: dimmedExcept === t.methodId
                    ? `0 0 20px ${t.emissiveColor.getStyle()}50, inset 0 1px 0 rgba(255,255,255,0.15)`
                    : `0 0 8px ${t.emissiveColor.getStyle()}25, inset 0 1px 0 rgba(255,255,255,0.08)`,
                  outlineColor: t.emissiveColor.getStyle(),
                  transition: 'box-shadow 0.2s ease, opacity 0.2s ease',
                }}
                tabIndex={0}
                role="img"
                aria-label={`${t.label}: ${t.value}, rank #${t.rank}, agreement ${t.score}%, weight ${(t.weight * 100).toFixed(0)}%`}
                aria-describedby={activeTower?.methodId === t.methodId ? 'nexus-tooltip' : undefined}
                onMouseEnter={() => handleBarInteraction(t)}
                onMouseLeave={clearInteraction}
                onFocus={() => handleBarInteraction(t)}
                onBlur={clearInteraction}
              >
                {/* Window pattern */}
                <div className="absolute inset-0 opacity-[0.06]" style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 7px, rgba(255,255,255,0.6) 7px, rgba(255,255,255,0.6) 8px)',
                }} />
                {/* Vertical glass highlight */}
                <div className="absolute top-0 bottom-0 left-[20%] w-[2px] opacity-[0.08] bg-white" />
              </div>
              {/* Label — hidden on very small screens */}
              <p className="text-[8px] sm:text-[9px] text-white/50 mt-1.5 text-center leading-tight font-medium truncate w-full px-0.5">
                {t.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Ground line */}
      <div className="flex-shrink-0 mx-3 sm:mx-4" aria-hidden="true" style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent 2%, rgba(255,255,255,0.15) 15%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.15) 85%, transparent 98%)',
      }} />

      {/* Ranking list — compact, scrollable, doesn't steal space from bars */}
      <div className="mt-2 sm:mt-3 px-2 sm:px-3 md:px-4 space-y-1 flex-shrink-0 overflow-y-auto pb-3 max-h-[35%]" role="list" aria-label="Valuation methods ranked by agreement">
        {towers.map(t => (
          <div
            key={t.methodId}
            role="listitem"
            className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-1 focus-visible:outline-white/20 cursor-default"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}
            tabIndex={0}
            aria-label={`Rank ${t.rank}: ${t.label}, ${t.value}, agreement ${t.score}%`}
            onMouseEnter={() => setDimmedExcept(t.methodId)}
            onMouseLeave={() => setDimmedExcept(null)}
            onFocus={() => setDimmedExcept(t.methodId)}
            onBlur={() => setDimmedExcept(null)}
          >
            <span className="text-[11px] sm:text-[12px] font-bold w-5 sm:w-6 text-center flex-shrink-0" style={{ color: t.emissiveColor.getStyle() }}>
              #{t.rank}
            </span>
            <span className="text-white/80 text-[11px] sm:text-[12px] flex-1 font-medium truncate">{t.label}</span>
            <span className="text-white/60 text-[11px] sm:text-[12px] font-semibold flex-shrink-0">{t.value}</span>
            <span className="text-white/30 text-[9px] sm:text-[10px] w-8 sm:w-10 text-right flex-shrink-0">{t.score}%</span>
          </div>
        ))}
      </div>

      {/* Tooltip — fixed top-left inside container, never spills */}
      {activeTower && (
        <div
          id="nexus-tooltip"
          role="tooltip"
          className="absolute top-3 left-3 z-[100] pointer-events-none px-4 py-3.5 rounded-xl"
          style={{
            width: 230,
            background: 'rgba(6,8,14,0.98)',
            border: `1px solid ${activeTower.emissiveColor.getStyle()}60`,
            boxShadow: `0 10px 40px rgba(0,0,0,0.8), 0 0 20px ${activeTower.emissiveColor.getStyle()}20`,
          }}
        >
          <p className="text-[13px] font-bold leading-tight" style={{ color: activeTower.emissiveColor.getStyle() }}>
            {activeTower.label}
          </p>
          <p className="text-white/50 text-[10px] italic mt-0.5">{activeTower.template.name}</p>
          <div className="mt-2.5 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-white/45 text-[11px]">Enterprise Value</span>
              <span className="text-white/95 text-[12px] font-semibold">{activeTower.value}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/45 text-[11px]">Agreement</span>
              <span className="text-white/95 text-[12px] font-semibold">{activeTower.score}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/45 text-[11px]">Weight</span>
              <span className="text-white/95 text-[12px] font-semibold">{(activeTower.weight * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/45 text-[11px]">Rank</span>
              <span className="text-[12px] font-bold" style={{ color: activeTower.emissiveColor.getStyle() }}>#{activeTower.rank}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Error Boundary — catches WebGL / Three.js crashes gracefully
   ═══════════════════════════════════════════════════════════════════════════ */

class NexusErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Export
   ═══════════════════════════════════════════════════════════════════════════ */

type ViewStyle = '2d' | '3d';

export default function CompanyIntelligenceNexus(props: NexusProps) {
  const [mode, setMode] = useState<ViewMode>('ranked');
  const [viewStyle, setViewStyle] = useState<ViewStyle>('2d');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile / low-power
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const baseEV = props.evBase ?? 0;

  // Build tower data from valuation methods
  const towers: MetricTower[] = useMemo(() => {
    const enabledMethods = props.methods.filter(m => m.enabled);

    // Score and sort
    const scored = enabledMethods.map(m => ({
      method: m,
      score: agreementScore(baseEV, m.enterpriseValue?.base ?? 0),
    })).sort((a, b) => b.score - a.score);

    const maxGuideHeight = 306; // Shard = max reference

    if (mode === 'ranked') {
      // Best metric → tallest building template
      return scored.map((s, i) => {
        const template = BUILDING_TEMPLATES[Math.min(i, BUILDING_TEMPLATES.length - 1)];
        const normalizedScore = s.score / 100;
        const guideHeight = (template.realHeightM / maxGuideHeight) * 8; // scale to scene units (max ~8)
        const displayHeight = guideHeight * (0.20 + 0.80 * normalizedScore);
        const rank = i + 1;
        const colors = rankToColor(rank, scored.length);
        const mEv = s.method.enterpriseValue?.base ?? 0;

        return {
          templateId: template.id,
          template,
          methodId: s.method.method,
          label: methodLabel(s.method.method),
          score: s.score,
          value: mEv > 0 ? fmtCompact(mEv) : '—',
          weight: s.method.weight,
          rank,
          enabled: true,
          displayHeight,
          color: colors.main,
          emissiveColor: colors.emissive,
        };
      });
    } else {
      // Fixed mode: each method maps to its designated building
      return scored.map((s, i) => {
        const assignedBuildingId = FIXED_MAPPING[s.method.method];
        const template = BUILDING_TEMPLATES.find(b => b.id === assignedBuildingId) || BUILDING_TEMPLATES[Math.min(i, BUILDING_TEMPLATES.length - 1)];
        const normalizedScore = s.score / 100;
        const guideHeight = (template.realHeightM / maxGuideHeight) * 8;
        const displayHeight = guideHeight * (0.20 + 0.80 * normalizedScore);
        const rank = i + 1;
        const colors = rankToColor(rank, scored.length);
        const mEv = s.method.enterpriseValue?.base ?? 0;

        return {
          templateId: template.id,
          template,
          methodId: s.method.method,
          label: methodLabel(s.method.method),
          score: s.score,
          value: mEv > 0 ? fmtCompact(mEv) : '—',
          weight: s.method.weight,
          rank,
          enabled: true,
          displayHeight,
          color: colors.main,
          emissiveColor: colors.emissive,
        };
      });
    }
  }, [props.methods, baseEV, mode]);

  const activeTower = useMemo(() => towers.find(t => t.methodId === activeId) || null, [towers, activeId]);

  const handleHover = useCallback((id: string | null) => setHoveredId(id), []);
  const handleClick = useCallback((id: string) => setActiveId(prev => prev === id ? null : id), []);

  const show3D = viewStyle === '3d' && !isMobile;

  return (
    <div className="w-full" ref={containerRef}>
      <HeaderStrip data={props} />

      <div
        className="relative w-full rounded-xl overflow-hidden"
        style={{
          height: isMobile ? 'clamp(480px, 75vh, 700px)' : 'clamp(520px, 65vh, 780px)',
          minHeight: isMobile ? 420 : 520,
          background: '#050810',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* View style toggle — top right */}
        {!isMobile && (
          <div
            className="absolute top-3 right-4 z-[30] flex items-center gap-0.5 p-1 rounded-lg"
            style={{ background: 'rgba(6,8,14,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
            role="tablist"
            aria-label="View style"
          >
            <button
              role="tab"
              aria-selected={viewStyle === '2d'}
              onClick={() => setViewStyle('2d')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                viewStyle === '2d' ? 'bg-white/[0.1] text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="8" width="7" height="13" rx="1" />
              </svg>
              Skyline
            </button>
            <button
              role="tab"
              aria-selected={viewStyle === '3d'}
              onClick={() => setViewStyle('3d')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                viewStyle === '3d' ? 'bg-white/[0.1] text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              3D City
            </button>
          </div>
        )}

        {/* 2D Skyline Bar View */}
        {!show3D && <SkylineBarView towers={towers} />}

        {/* 3D Three.js View */}
        {show3D && (
          <NexusErrorBoundary fallback={<SkylineBarView towers={towers} />}>
            <Canvas
              dpr={[1, 2]}
              gl={{ antialias: true, alpha: false }}
              style={{ background: '#050810', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            >
              <Suspense fallback={null}>
                <Scene
                  towers={towers}
                  hoveredId={hoveredId}
                  activeId={activeId}
                  onHover={handleHover}
                  onClick={handleClick}
                />
              </Suspense>
            </Canvas>

            <ModeToggle mode={mode} onChange={setMode} />

            {/* DOM hover info panel — top-left, inside viewpane */}
            {hoveredId && (() => {
              const ht = towers.find(t => t.methodId === hoveredId);
              if (!ht) return null;
              return (
                <div
                  className="absolute top-14 left-4 z-[20] px-4 py-3.5 rounded-xl pointer-events-none"
                  role="tooltip"
                  style={{
                    width: 220,
                    background: 'rgba(6,8,14,0.97)',
                    border: `1px solid ${ht.emissiveColor.getStyle()}50`,
                    boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 16px ${ht.emissiveColor.getStyle()}20`,
                  }}
                >
                  <p className="text-[13px] font-bold" style={{ color: ht.emissiveColor.getStyle() }}>{ht.label}</p>
                  <p className="text-white/50 text-[10px] italic mt-0.5">{ht.template.name}</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex justify-between"><span className="text-white/45 text-[11px]">Value</span><span className="text-white/95 text-[12px] font-semibold">{ht.value}</span></div>
                    <div className="flex justify-between"><span className="text-white/45 text-[11px]">Agreement</span><span className="text-white/95 text-[12px] font-semibold">{ht.score}%</span></div>
                    <div className="flex justify-between"><span className="text-white/45 text-[11px]">Weight</span><span className="text-white/95 text-[12px] font-semibold">{(ht.weight * 100).toFixed(0)}%</span></div>
                    <div className="flex justify-between"><span className="text-white/45 text-[11px]">Rank</span><span className="text-[12px] font-bold" style={{ color: ht.emissiveColor.getStyle() }}>#{ht.rank}</span></div>
                  </div>
                </div>
              );
            })()}

            {/* Auto-orbit hint */}
            <div className="absolute bottom-3 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/30 pointer-events-none">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 6v6l4 2" />
              </svg>
              Auto-orbit
            </div>

            {/* Side panel */}
            <InsightPanel tower={activeTower} onClose={() => setActiveId(null)} />
          </NexusErrorBoundary>
        )}
      </div>

      {/* CSS for panel animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
