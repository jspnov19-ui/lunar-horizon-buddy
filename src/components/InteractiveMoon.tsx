import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

function createLunarTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#77766f");
  gradient.addColorStop(0.48, "#aaa79d");
  gradient.addColorStop(1, "#66655f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  let seed = 73129;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 1700; i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 2 + random() ** 2 * 28;
    const shade = Math.round(75 + random() * 75);
    context.beginPath();
    context.ellipse(x, y, radius, radius * (0.45 + random() * 0.25), 0, 0, Math.PI * 2);
    context.fillStyle = `rgba(${shade}, ${shade}, ${shade - 5}, ${0.12 + random() * 0.2})`;
    context.fill();
    context.beginPath();
    context.ellipse(
      x - radius * 0.12,
      y - radius * 0.1,
      radius * 0.76,
      radius * 0.56,
      0,
      Math.PI,
      Math.PI * 2,
    );
    context.strokeStyle = "rgba(225, 221, 207, 0.18)";
    context.lineWidth = Math.max(1, radius * 0.1);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function Moon() {
  const texture = useMemo(createLunarTexture, []);
  return (
    <mesh rotation={[0.16, -0.55, 0.08]}>
      <sphereGeometry args={[1.42, 96, 96]} />
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}

export function InteractiveMoon() {
  const controls = useRef<OrbitControlsImpl>(null);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-[#080a10]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="label-caps text-primary">Lunar surface / 3D</p>
          <p className="mt-1 text-xs text-muted-foreground">Drag to rotate · scroll to zoom</p>
        </div>
        <button
          type="button"
          onClick={() => controls.current?.reset()}
          className="rounded-md border border-white/15 px-3 py-1.5 font-mono text-[10px] text-foreground/80 transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Reset view
        </button>
      </div>
      <div className="relative h-[min(76vw,520px)] min-h-[320px] w-full touch-none">
        <Canvas
          camera={{ position: [0, 0, 4.7], fov: 38 }}
          dpr={[1, 1.75]}
          aria-label="Interactive three-dimensional Moon. Drag to rotate and scroll to zoom."
          fallback={
            <p className="p-6 text-sm text-muted-foreground">3D rendering is unavailable.</p>
          }
        >
          <color attach="background" args={["#080a10"]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[-3, 2, 4]} intensity={2.4} />
          <directionalLight position={[3, -2, -2]} intensity={0.18} color="#8cb9e8" />
          <Moon />
          <OrbitControls
            ref={controls}
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            minDistance={2.2}
            maxDistance={8}
            rotateSpeed={0.65}
          />
        </Canvas>
        <span className="pointer-events-none absolute bottom-3 left-4 font-mono text-[9px] tracking-[0.16em] text-white/45">
          LUNAR GLOBE · INTERACTIVE
        </span>
      </div>
    </section>
  );
}
