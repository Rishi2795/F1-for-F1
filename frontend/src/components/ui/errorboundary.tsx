import { Component, type ReactNode } from "react";
import { reportError } from "../../lib/report";

type State = { failed: boolean };

/** Catches render errors in a route so one broken page cannot blank the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    reportError("render", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050505] px-6 text-center" role="alert">
        <h1 className="text-2xl font-bold text-white">This page hit an error</h1>
        <p className="text-sm text-zinc-400">The problem has been recorded. Reloading usually fixes it.</p>
        <button onClick={() => location.reload()} className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white">
          Reload
        </button>
      </div>
    );
  }
}
