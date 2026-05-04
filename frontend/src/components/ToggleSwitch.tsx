interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelOn?: string;
  labelOff?: string;
  activeColorClass?: string;
  activeTextClass?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  labelOn = 'Ativo',
  labelOff = 'Inativo',
  activeColorClass = 'bg-[#09a7a5]',
  activeTextClass = 'text-[#09a7a5]'
}: ToggleSwitchProps) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#09a7a5] focus:ring-offset-2 ${checked ? activeColorClass : 'bg-gray-300'}`}
        role="switch"
        aria-checked={checked}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
      {(labelOn || labelOff) && (
        <span className={`ml-3 text-sm font-bold w-16 ${checked ? activeTextClass : 'text-gray-500'}`}>
          {checked ? labelOn : labelOff}
        </span>
      )}
    </div>
  )
}