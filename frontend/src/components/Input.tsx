import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        className={`w-full border p-2 rounded focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500 focus:ring-red-500 bg-red-50'
            : 'border-gray-300 focus:ring-[#1a63b6]'
        }`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500 font-medium mt-1 inline-block">{error}</span>
      )}
    </div>
  );
}