"use client";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, BrightnessContrast, DepthOfField, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { Expand } from "lucide-react";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { toggleFullscreen } from "../Shell";

/* A specimen on the bench, lit like a studio at dusk: a warm key softbox (wax glows), a cool silver rim
   (silk catches it), bloom for dew and anything stressed, filmic tone mapping, grain and a vignette.
   Pauses when scrolled off screen. */
export interface Look { ao?: number | false; dof?: { target: [number, number, number]; range?: number; bokeh?: number } | false; grain?: number; bloom?: number; threshold?: number }

export function StudioEnv({ warm = "#ffe6bf", cool = "#9fd8ff", rose = "#f2b134", intensity = 1 }: { warm?: string; cool?: string; rose?: string; intensity?: number }) {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.4 * intensity} color={warm} position={[0, 6, 2]} scale={[10, 3, 1]} rotation-x={Math.PI / 2} />
      <Lightformer form="rect" intensity={1.6 * intensity} color={cool} position={[-7, 1.5, -2]} scale={[3, 6, 1]} rotation-y={Math.PI / 2} />
      <Lightformer form="rect" intensity={1.4 * intensity} color={rose} position={[7, 1.2, 1]} scale={[3, 5, 1]} rotation-y={-Math.PI / 2} />
      <Lightformer form="ring" intensity={0.8 * intensity} color="#ffffff" position={[0, 2, -8]} scale={4} />
      {/* a soft wall of light behind the viewer, so polished metal has something to reflect */}
      <Lightformer form="rect" intensity={0.55 * intensity} color="#c9c4a6" position={[0, 2, 10]} scale={[24, 8, 1]} />
      <Lightformer form="rect" intensity={0.35 * intensity} color="#6d6a52" position={[0, -4, 0]} scale={[30, 30, 1]} rotation-x={-Math.PI / 2} />
    </Environment>
  );
}

export default function Stage3D({
  children, camera = { position: [0, 2, 8], fov: 36 }, className = "stage", style, overlay, label, look = {}, env = true, background, lights = true,
}: {
  children: ReactNode; camera?: { position: [number, number, number]; fov?: number; near?: number; far?: number };
  className?: string; style?: React.CSSProperties; overlay?: ReactNode; label: string; look?: Look; env?: boolean | ReactNode; background?: string; lights?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ok, setOk] = useState(true);
  useEffect(() => {
    try { const c = document.createElement("canvas"); setOk(!!(c.getContext("webgl2") || c.getContext("webgl"))); } catch { setOk(false); }
    if (!host.current) return;
    const io = new IntersectionObserver((es) => setVisible(es[0].isIntersecting), { threshold: 0.01 });
    io.observe(host.current);
    return () => io.disconnect();
  }, []);
  const ao = look.ao ?? false;

  return (
    <div ref={host} className={className} style={{ ...(background ? { background } : null), ...style }} role="img" aria-label={label}>
      {ok ? (
        <Canvas
          frameloop={visible ? "always" : "never"}
          dpr={[1, 1.75]}
          shadows="soft"
          resize={{ offsetSize: true, scroll: false, debounce: { scroll: 0, resize: 150 } }}
          flat
          camera={{ near: 0.02, far: 8000, ...camera }}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance", stencil: false }}
          onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.outputColorSpace = THREE.SRGBColorSpace; gl.localClippingEnabled = true; }}
        >
          {env === true ? <StudioEnv /> : env || null}
          {lights && <>
            <hemisphereLight args={["#fff1cf", "#15130a", 0.7]} />
            <directionalLight position={[6, 9, 6]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0004} />
            <directionalLight position={[-6, 3, -5]} intensity={0.9} color="#9fd8ff" />
          </>}
          {children}
          <EffectComposer multisampling={0} enableNormalPass={false}>
            {ao !== false ? <N8AO aoRadius={ao} intensity={2} distanceFalloff={0.6} quality="medium" halfRes /> : null}
            {look.dof ? <DepthOfField target={look.dof.target} worldFocusRange={look.dof.range ?? 2} bokehScale={look.dof.bokeh ?? 3} height={540} /> : null}
            <Bloom intensity={look.bloom ?? 0.7} luminanceThreshold={look.threshold ?? 0.75} luminanceSmoothing={0.2} mipmapBlur radius={0.7} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <BrightnessContrast contrast={0.06} />
            <Vignette offset={0.28} darkness={0.55} />
            <Noise opacity={look.grain ?? 0.04} blendFunction={BlendFunction.OVERLAY} premultiply />
            <SMAA />
          </EffectComposer>
        </Canvas>
      ) : (
        <div className="hud tag" style={{ inset: 24, display: "grid", placeItems: "center", textAlign: "center" }}>
          This 3D specimen needs WebGL. Turn on hardware acceleration in the browser settings and reload.
        </div>
      )}
      {overlay}
      {ok && <button className="stage-fs" title="Full screen this model" aria-label="Full screen this model" onClick={() => toggleFullscreen(host.current)}><Expand size={15} /></button>}
    </div>
  );
}
