import { useState, useRef, useEffect } from 'react';

export interface AcaoToolbar {
  label: string;
  onClick: () => void;
  isDanger?: boolean;
}

interface ActionToolbarProps {
  termoBusca: string;
  onBuscaChange: (termo: string) => void;
  acoes: AcaoToolbar[];
  placeholderBusca?: string;
}

export function ActionToolbar({ termoBusca, onBuscaChange, acoes, placeholderBusca = "Buscar" }: ActionToolbarProps) {
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown se o utilizador clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex justify-between items-center mb-3">
      <div className="flex w-1/6 min-w-[125px]">
        <input
          type="text"
          placeholder={placeholderBusca}
          value={termoBusca}
          onChange={(e) => onBuscaChange(e.target.value)}
          className="w-full border border-gray-300 p-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6]"
        />
      </div>

      {acoes && acoes.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownAberto(!dropdownAberto)}
            className="bg-[#1a63b6] text-white px-4 py-1.5 rounded hover:bg-blue-800 transition-colors text-sm font-medium flex items-center shadow-sm"
          >
            Ações <span className="ml-2 text-xs">▼</span>
          </button>

          {dropdownAberto && (
            <div className="absolute top-10 right-0 w-48 bg-white border border-gray-200 rounded shadow-lg z-20 overflow-hidden">
              {acoes.map((acao, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setDropdownAberto(false);
                    acao.onClick();
                  }}
                  className={`block w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 transition-colors ${
                    acao.isDanger
                    ? 'text-red-600 hover:bg-red-50 font-medium'
                    : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  {acao.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}