

interface TooltipProps {
  text: string;
}

export function Tooltip({ text }: TooltipProps) {
  return (
    <div className="relative group inline-block leading-none">
      {/* Icon Trigger */}
      <div className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] cursor-default opacity-40 group-hover:opacity-100 transition-opacity">
        ?
      </div>
      
      {/* Tooltip Box */}
      <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-48 p-2.5 bg-gray-900/95 text-white text-[10px] font-medium rounded-lg shadow-2xl z-50 pointer-events-none backdrop-blur-sm border border-white/10 normal-case tracking-normal">
        {text}
        {/* Arrow (aligned to the right at the top of the box) */}
        <div className="absolute bottom-full right-1 border-4 border-transparent border-b-gray-900/95"></div>
      </div>
    </div>
  );
}
