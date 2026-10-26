"use client";
import { Billboard, Line, Text } from "@react-three/drei";

/* A tag in the 3D scene: monospace text that always faces the camera, with an optional dashed leader
   line to the thing it describes. The font is bundled so it works offline. */
export default function Label3D({ position, children, color = "#f3efd6", size = 0.3, anchorX = "center", to, dim = false }: {
  position: [number, number, number]; children: string; color?: string; size?: number; anchorX?: "left" | "center" | "right";
  to?: [number, number, number]; dim?: boolean;
}) {
  return (
    <>
      {to && <Line points={[position, to]} color={color} lineWidth={1} dashed dashSize={size * 0.18} gapSize={size * 0.12} transparent opacity={dim ? 0.35 : 0.7} />}
      <Billboard position={position}>
        <Text
          font="/fonts/IBMPlexMono-Medium.ttf"
          fontSize={size * 0.5}
          color={color}
          anchorX={anchorX}
          anchorY="bottom"
          outlineWidth={size * 0.05}
          outlineColor="#0b0c08"
          outlineOpacity={0.9}
          maxWidth={size * 9}
          textAlign={anchorX === "right" ? "right" : "left"}
          fillOpacity={dim ? 0.55 : 1}
          letterSpacing={0.02}
        >
          {children}
        </Text>
      </Billboard>
    </>
  );
}
