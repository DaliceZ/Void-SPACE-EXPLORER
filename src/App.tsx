import { Canvas } from "@react-three/fiber";
import { Universe } from "./game/Universe";
import { Flight } from "./game/Flight";
import { useGame } from "./stores/game";
import { Component, useEffect, type ReactNode } from "react";
import { Interface } from "./ui/Interface";
import { SpaceEffects } from "./game/SpaceEffects";
class RenderBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="render-error">
        <h2>The viewport is offline.</h2>
        <p>
          Enable hardware acceleration in your browser, then reload to try
          again.
        </p>
        <button onClick={() => location.reload()}>RELOAD</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function App() {
  const screen = useGame((s) => s.screen),
    seed = useGame((s) => s.seed),
    quality = useGame((s) => s.settings.quality);
  useEffect(() => {
    const save = () => useGame.getState().save();
    window.addEventListener("beforeunload", save);
    return () => window.removeEventListener("beforeunload", save);
  }, []);
  return (
    <RenderBoundary>
      <Canvas
        dpr={[1, quality === 3 ? 1.7 : quality === 2 ? 1.3 : 1]}
        camera={{ near: 0.1, far: 150000 }}
        gl={{ antialias: quality > 1, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.debug.onShaderError = () => {
            useGame.setState({
              simpleShaders: true,
              notice: "Simplified rendering enabled for this graphics device.",
            });
          };
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            useGame.getState().setScreen("pause");
            useGame
              .getState()
              .notify(
                "Graphics context lost. Reload to resume your saved expedition.",
              );
          });
        }}
        onPointerDown={(e) => {
          if (screen === "flight") {
            const result = (e.target as HTMLCanvasElement).requestPointerLock();
            result?.catch(() =>
              useGame
                .getState()
                .notify("Mouse capture unavailable. Use arrow keys to steer."),
            );
          }
        }}
      >
        <color attach="background" args={["#03060c"]} />
        <Universe seed={seed} quality={quality} />
        <SpaceEffects />
        <Flight />
      </Canvas>
      <div className="vignette" />
      <Interface />
    </RenderBoundary>
  );
}
