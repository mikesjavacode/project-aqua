/**
 * DesktopOnlyNotice — shown in place of the console on narrow viewports.
 *
 * Rendered instead of App's layer stack below useDesktopViewport's threshold,
 * so a phone visitor gets an intentional screen rather than five overlapping
 * fixed-width panels — and none of the animation loops start.
 */

export default function DesktopOnlyNotice() {
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center px-8">
      <div className="max-w-sm">
        <div className="text-cyan-400 text-[10px] font-mono uppercase tracking-[0.3em]">
          Project Aqua
        </div>

        <h1 className="text-white text-lg font-semibold mt-3 leading-snug">
          Global Industrial Water Treatment Intelligence
        </h1>

        <p className="text-slate-300 text-sm mt-4 leading-relaxed">
          Best viewed on a desktop display. Five layers run at once across a wide
          console — a rotating globe, the process flow schematic, a molecular
          simulation, live telemetry, and the AI advisor — and they are sized to sit
          side by side rather than stack.
        </p>

        <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest mt-6">
          Open on a laptop or a wider window
        </p>
      </div>
    </div>
  );
}
