import { Component, type ReactNode } from 'react';

interface CanvasGuardProps {
  children: ReactNode;
}

interface CanvasGuardState {
  failed: boolean;
}

/**
 * A11Y/ROBUSTNESS: error boundary around the WebGL canvas. Three.js throws hard
 * (uncaught) when a context is lost or shaders fail to compile; without this the
 * entire React tree unmounts and the user gets a blank page. On failure we swap
 * in a static sandal→maroon gradient so the site stays readable.
 */
export default class CanvasGuard extends Component<CanvasGuardProps, CanvasGuardState> {
  state: CanvasGuardState = { failed: false };

  static getDerivedStateFromError(): CanvasGuardState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[CanvasGuard] WebGL scene failed — falling back to static art:', error);
  }

  render() {
    if (this.state.failed) {
      return <div className="canvas-fallback" role="img" aria-label="Decorative background art" />;
    }
    return this.props.children;
  }
}
