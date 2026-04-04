import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  loadingText = 'Salvando...',
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseClass = "px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50 flex items-center justify-center";

  const variants = {
    primary: "text-white bg-[#1a63b6] hover:bg-blue-800 shadow-sm",
    secondary: "text-gray-600 border border-gray-300 hover:bg-gray-50",
    danger: "text-white bg-red-600 hover:bg-red-800 shadow-sm"
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseClass} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? loadingText : children}
    </button>
  );
}