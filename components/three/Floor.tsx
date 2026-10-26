"use client";
import { Grid, MeshReflectorMaterial } from "@react-three/drei";

/* The bench: a dark, faintly reflective slab with a measuring grid fading into the dark. */
export default function Floor({ y = 0, size = 60, cell = 0.5, section = 2.5, color = "#f2b134", reflect = true }: {
  y?: number; size?: number; cell?: number; section?: number; color?: string; reflect?: boolean;
}) {
  return (
    <group position={[0, y, 0]}>
      {reflect ? (
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[size, size]} />
          <MeshReflectorMaterial blur={[300, 80]} resolution={512} mixBlur={1} mixStrength={18} roughness={0.92} depthScale={0.8} minDepthThreshold={0.4} maxDepthThreshold={1.4} color="#0d0e09" metalness={0.5} mirror={0} />
        </mesh>
      ) : (
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial color="#0d0e09" roughness={0.9} />
        </mesh>
      )}
      <Grid position={[0, 0.002, 0]} args={[size, size]} cellSize={cell} cellThickness={0.6} cellColor="#2a2b1f" sectionSize={section} sectionThickness={1} sectionColor={color} fadeDistance={size * 0.45} fadeStrength={1.6} infiniteGrid={false} />
    </group>
  );
}
