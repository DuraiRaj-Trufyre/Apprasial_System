import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`px-3 py-2 rounded border border-zinc-300 bg-white/80 text-black focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";
