import { useEffect, useRef, useState } from 'react';
import { loadThree } from '@/lib/three-loader';

type TerrainManifest = { resolutionM: number; spanM: number; grid: number; sites: Record<string, { file: string; lat: number; lon: number; validFraction: number }> };
let manifestPromise: Promise<TerrainManifest> | undefined;
function getManifest() { return manifestPromise ??= fetch('/lola-sites/manifest.json').then(r => { if (!r.ok) throw new Error('Terrain catalog unavailable'); return r.json(); }); }

export function LolaTerrain({ siteId, siteName }: { siteId: string; siteName: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let cancelled = false, frame = 0, renderer: any, sceneRef: any, observer: ResizeObserver | undefined;
    const listeners: Array<[string, EventListener, any]> = [];
    setState('loading');
    Promise.all([loadThree(), getManifest()]).then(async ([THREE, manifest]) => {
      const entry = manifest.sites[siteId];
      if (!entry) throw new Error('No site patch');
      const response = await fetch(`/lola-sites/${entry.file}`);
      if (!response.ok) throw new Error('Terrain patch unavailable');
      const heights = new Float32Array(await response.arrayBuffer());
      if (cancelled || !hostRef.current) return;
      const host = hostRef.current, grid = manifest.grid, span = manifest.spanM / 1000;
      const scene = new THREE.Scene(); sceneRef = scene; scene.background = new THREE.Color(0x080a0d);
      const camera = new THREE.PerspectiveCamera(34, 1, .05, 100);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
      renderer.domElement.className = 'block size-full touch-none cursor-grab active:cursor-grabbing';
      renderer.domElement.setAttribute('aria-label', `Interactive NASA LOLA elevation terrain for ${siteName}; drag to rotate and scroll to zoom.`);
      host.replaceChildren(renderer.domElement);
      scene.add(new THREE.AmbientLight(0x9aa0aa, .26));
      const light = new THREE.DirectionalLight(0xd8d3cb, 3.2); light.position.set(-7, 5, 8); scene.add(light);
      const fill = new THREE.DirectionalLight(0x71819a, .35); fill.position.set(7, 3, -5); scene.add(fill);
      const geometry = new THREE.PlaneGeometry(span, span, grid - 1, grid - 1);
      geometry.rotateX(-Math.PI / 2);
      const positions = geometry.attributes.position;
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < heights.length; i++) { min = Math.min(min, heights[i]!); max = Math.max(max, heights[i]!); }
      for (let i = 0; i < positions.count; i++) positions.setY(i, ((heights[i] ?? 0) - (min + max) / 2) / 1000 * 1.6);
      const colors = new Float32Array(positions.count * 3);
      for (let i = 0; i < positions.count; i++) {
        const t = Math.max(0, Math.min(1, (heights[i]! - min) / Math.max(1, max - min)));
        const shade = .52 + t * .16;
        const c = new THREE.Color().setRGB(shade, shade * .98, shade * .94);
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
      const surface = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide, flatShading: false })); scene.add(surface);
      const sampleHeight = (x: number, y: number) => {
        const gx = Math.max(0, Math.min(grid - 1, Math.round((x / span + .5) * (grid - 1))));
        const gy = Math.max(0, Math.min(grid - 1, Math.round((.5 - y / span) * (grid - 1))));
        return ((heights[gy * grid + gx] ?? 0) - (min + max) / 2) / 1000 * 1.6 + .035;
      };
      const boundary: any[] = [];
      for (let i = 0; i <= 180; i++) { const a = i / 180 * Math.PI * 2, x = Math.cos(a) * 2.2, z = Math.sin(a) * 1.55; boundary.push(new THREE.Vector3(x, sampleHeight(x, z) + .025, z)); }
      const boundaryCurve = new THREE.CatmullRomCurve3(boundary);
      const outline = new THREE.Mesh(new THREE.TubeGeometry(boundaryCurve, 240, .018, 6, false), new THREE.MeshBasicMaterial({ color: 0xf04470, transparent: true, opacity: .98 })); scene.add(outline);
      const marker = new THREE.Mesh(new THREE.SphereGeometry(.075, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffc968 })); marker.position.set(0, sampleHeight(0, 0) + .06, 0); scene.add(marker);
      const stars: number[] = []; for (let i = 0; i < 230; i++) { const a = i * 2.399, r = 14 + (i % 13); stars.push(Math.cos(a) * r, 5 + (i % 11) * .45, Math.sin(a) * r); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3)); scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xc8d9f3, size: .045, transparent: true, opacity: .7 })));
      let theta = .58, phi = 1.34, distance = 21;
      const updateCamera = () => { camera.position.set(distance * Math.sin(phi) * Math.sin(theta), distance * Math.cos(phi), distance * Math.sin(phi) * Math.cos(theta)); camera.lookAt(0, 0, 0); };
      const resize = () => { if (!host.clientWidth || !host.clientHeight) return; renderer.setSize(host.clientWidth, host.clientHeight, false); camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); };
      resize(); updateCamera(); observer = new ResizeObserver(resize); observer.observe(host);
      let drag: { x: number; y: number } | null = null;
      const down = ((e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId); }) as EventListener;
      const move = ((e: PointerEvent) => { if (!drag) return; theta -= (e.clientX - drag.x) * .006; phi = Math.max(.38, Math.min(1.52, phi - (e.clientY - drag.y) * .006)); drag = { x: e.clientX, y: e.clientY }; updateCamera(); }) as EventListener;
      const up = (() => { drag = null; }) as EventListener;
      const wheel = ((e: WheelEvent) => { e.preventDefault(); distance = Math.max(15, Math.min(30, distance * (1 + e.deltaY * .001))); updateCamera(); }) as EventListener;
      for (const [name, fn, options] of [['pointerdown', down, undefined], ['pointermove', move, undefined], ['pointerup', up, undefined], ['pointercancel', up, undefined], ['wheel', wheel, { passive: false }]] as Array<[string, EventListener, any]>) { renderer.domElement.addEventListener(name, fn, options); listeners.push([name, fn, options]); }
      const animate = () => { if (cancelled) return; frame = requestAnimationFrame(animate); renderer.render(scene, camera); }; animate(); setState('ready');
    }).catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; cancelAnimationFrame(frame); observer?.disconnect(); for (const [name, fn, options] of listeners) renderer?.domElement.removeEventListener(name, fn, options); sceneRef?.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose?.(); }); renderer?.dispose(); renderer?.domElement.remove(); };
  }, [siteId, siteName]);
  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#080a0d]" aria-label={`NASA LOLA terrain at ${siteName}`}>
    <div className="relative h-[250px] sm:h-[315px]"><div ref={hostRef} className="size-full"/>{state === 'loading' && <div className="absolute inset-0 grid place-items-center text-xs text-white/55">Loading LOLA elevation patch…</div>}{state === 'error' && <div className="absolute inset-0 grid place-items-center text-xs text-white/55">This site’s LOLA patch could not load.</div>}<div className="pointer-events-none absolute left-3 top-3 rounded-md border border-white/10 bg-black/60 px-2.5 py-2 font-mono text-[9px] uppercase tracking-wider text-white/70">LOLA TERRAIN <span className="mx-1 text-white/25">·</span> 240 m / px</div><div className="pointer-events-none absolute left-1/2 top-[36%] -translate-x-1/2 rounded-sm bg-black/75 px-2 py-1 text-[10px] font-medium text-white shadow">{siteName}</div><span className="pointer-events-none absolute left-[13%] top-1/2 text-[9px] font-mono text-[#f04470]">W</span><span className="pointer-events-none absolute right-[13%] top-1/2 text-[9px] font-mono text-[#f04470]">E</span><span className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[#f04470]">S</span><div className="pointer-events-none absolute bottom-2 right-3 rounded bg-black/60 px-2 py-1 text-[8px] text-white/55">Drag to rotate · scroll to zoom</div></div>
  </section>;
}
