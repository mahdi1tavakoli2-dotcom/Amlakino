import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  padding = 'md',
  border = true,
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={`
        bg-white rounded-2xl transition-all duration-150 text-right
        ${border ? 'border border-slate-200/80 shadow-xs' : 'shadow-sm'}
        ${paddingStyles[padding]}
        ${interactive ? 'hover:border-slate-300 hover:shadow-md cursor-pointer active:scale-[0.99]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
