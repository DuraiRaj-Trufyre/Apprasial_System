import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition ${className}`}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
