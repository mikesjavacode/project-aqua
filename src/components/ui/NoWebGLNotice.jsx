/**
 * NoWebGLNotice — shown in place of the console when WebGL is unavailable.
 *
 * Four of the five layers would still run without it, but Layer 1 is the globe
 * the whole interface is built around, and a console missing its centrepiece
 * reads as broken rather than as unsupported. Better to say what is missing and
 * why than to render most of an application.
 */

export default function NoWebGLNotice() {
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center px-8">
      <div className="max-w-md">
        <div className="text-cyan-400 text-[10px] font-mono uppercase tracking-[0.3em]">
          Project Aqua
        </div>

        <h1 className="text-white text-lg font-semibold mt-3 leading-snug">
          This browser can&rsquo;t open a WebGL context
        </h1>

        <p className="text-slate-300 text-sm mt-4 leading-relaxed">
          The globe, the molecular view, and the plume rendering all need WebGL.
          Rather than show you a console with its centrepiece missing, here is
          what is going on.
        </p>

        <p className="text-slate-400 text-sm mt-4 leading-relaxed">
          Almost always this is hardware rather than the browser: on a machine
          with no GPU — a virtual machine, or a system falling back to software
          rendering — Chrome and Firefox disable WebGL by default. Enabling 3D
          acceleration for the VM, or launching Chrome with{' '}
          <code className="text-cyan-300 font-mono text-xs">
            --enable-unsafe-swiftshader
          </code>
          , will bring it back.
        </p>

        <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest mt-6">
          Check chrome://gpu &middot; WebGL row
        </p>
      </div>
    </div>
  );
}
