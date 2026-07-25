/**
 * InfoBadge — reusable ⓘ hover annotation badge
 * PROJECT AQUA | March 2026
 *
 * Props:
 *   plain    — layman's description shown first
 *   technical — technical detail shown below the divider
 *   popover  — where the card opens relative to the badge:
 *              'bottom-left'  opens downward, card hangs left  (default)
 *              'bottom-right' opens downward, card hangs right
 *              'top-left'     opens upward,   card hangs left
 *              'top-right'    opens upward,   card hangs right
 */
export default function InfoBadge({ plain, technical, popover = 'bottom-left' }) {
  const POS = {
    'bottom-left':  'top-full right-0 mt-2',
    'bottom-right': 'top-full left-0 mt-2',
    'top-left':     'bottom-full right-0 mb-2',
    'top-right':    'bottom-full left-0 mb-2',
  };
  const posClass = POS[popover] ?? POS['bottom-left'];

  return (
    <div className="relative group flex-none">

      {/* ── Badge button ── */}
      <button
        className="w-7 h-7 rounded-full bg-cyan-500 hover:bg-cyan-300
                   text-black text-sm font-bold italic
                   flex items-center justify-center cursor-help
                   ring-2 ring-cyan-400/60 hover:ring-cyan-300
                   shadow-lg shadow-cyan-500/40
                   transition-all duration-150 select-none"
        aria-label="Panel information"
        tabIndex={-1}
      >
        i
      </button>

      {/* ── Popover card ── */}
      <div
        className={`
          absolute z-50 w-80 ${posClass}
          opacity-0 invisible pointer-events-none
          group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto
          transition-all duration-200
          bg-slate-900/97 border border-cyan-400/50 rounded-lg
          shadow-2xl shadow-black/80
        `}
      >
        {/* Plain section */}
        <div className="px-3.5 pt-3 pb-2.5">
          <div className="text-[9px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5">
            What you&apos;re seeing
          </div>
          <p className="text-white text-xs leading-relaxed">{plain}</p>
        </div>

        {/* Divider + technical section */}
        <div className="border-t border-slate-600/60 px-3.5 pt-2.5 pb-3">
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">
            Technical detail
          </div>
          <p className="text-slate-300 text-[10px] leading-relaxed font-mono">{technical}</p>
        </div>
      </div>

    </div>
  );
}
