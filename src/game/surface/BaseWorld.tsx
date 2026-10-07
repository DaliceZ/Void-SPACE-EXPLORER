import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { surface } from "./state";
import { flight } from "../runtime";
import { buildState, updateBuildPreview } from "./building";
import type { BasePiece, PieceType } from "./types";
export function BaseShape({
  type,
  color = "#8a9c97",
  preview = false,
}: {
  type: PieceType;
  color?: string;
  preview?: boolean;
}) {
  const material = (
    <meshStandardMaterial
      color={color}
      metalness={0.25}
      roughness={0.55}
      transparent={preview || type === "window"}
      opacity={preview ? 0.4 : type === "window" ? 0.3 : 1}
    />
  );
  const dims: [number, number, number] =
    type === "foundation" || type === "floor" || type === "roof"
      ? [2, 0.12, 2]
      : type === "wall" || type === "window"
        ? [2, 1.2, 0.12]
        : type === "ramp"
          ? [2, 0.12, 2.4]
          : type === "power"
            ? [0.7, 0.4, 0.7]
            : type === "storage"
              ? [0.8, 0.55, 0.6]
              : type === "beacon"
                ? [0.12, 1.4, 0.12]
                : [0.15, 0.15, 0.15];
  return type === "door" ? (
    <>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.6, 1.2, 0.12]} />
          {material}
        </mesh>
      ))}
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[0.8, 0.16, 0.12]} />
        {material}
      </mesh>
    </>
  ) : (
    <>
      <mesh rotation={type === "ramp" ? [-0.3, 0, 0] : [0, 0, 0]}>
        <boxGeometry args={dims} />
        {material}
      </mesh>
      {(type === "beacon" || type === "light" || type === "power") && (
        <mesh position={[0, type === "beacon" ? 0.72 : 0.23, 0]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial
            color="#bbdec2"
            emissive="#80b994"
            emissiveIntensity={
              type === "beacon" || buildState.charge > 0 ? 1.5 : 0
            }
          />
        </mesh>
      )}
    </>
  );
}
export function BaseWorld() {
  const root = useRef<Group>(null),
    ghost = useRef<Group>(null),
    [pieces, setPieces] = useState<BasePiece[]>([]),
    [preview, setPreview] = useState<{
      type: PieceType;
      valid: boolean;
    } | null>(null);
  const revision = useRef(-1);
  const previewKey = useRef("");
  useFrame(() => {
    const p = surface.planet;
    if (root.current) {
      root.current.visible = !!p && surface.data.mode !== "flight";
      if (p) root.current.position.set(...p.position).sub(flight.position);
    }
    if (surface.revision !== revision.current) {
      revision.current = surface.revision;
      setPieces(
        surface.data.bases.filter((b) => b.planetId === p?.id).slice(-120),
      );
    }
    updateBuildPreview();
    const b = buildState.preview;
    if (ghost.current) {
      ghost.current.visible = !!b && surface.building;
      if (b && p) {
        ghost.current.position
          .set(...b.position)
          .sub(new Vector3(...p.position));
        ghost.current.quaternion.fromArray(b.rotation);
      }
    }
    const nextKey = b ? `${b.type}:${buildState.valid}` : "";
    if (nextKey !== previewKey.current) {
      previewKey.current = nextKey;
      setPreview(b ? { type: b.type, valid: buildState.valid } : null);
    }
  });
  return (
    <group ref={root}>
      {pieces.map((b) => (
        <group
          key={b.id}
          position={new Vector3(...b.position).sub(
            new Vector3(...(surface.planet?.position || [0, 0, 0])),
          )}
          quaternion={b.rotation}
        >
          <BaseShape type={b.type} />
        </group>
      ))}
      <group ref={ghost}>
        {preview && (
          <BaseShape
            type={preview.type}
            preview
            color={preview.valid ? "#86d9ad" : "#d58d79"}
          />
        )}
      </group>
    </group>
  );
}
