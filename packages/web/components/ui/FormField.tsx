'use client';
import React from 'react';
import { cn } from '@/lib/cn';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  hint?: string;
}

export function Label({ children, hint, className, ...props }: LabelProps) {
  return (
    <label
      className={cn('block text-sm font-medium text-gray-200 mb-1.5', className)}
      {...props}
    >
      {children}
      {hint && <span className="ml-2 text-xs text-gray-500 font-normal">{hint}</span>}
    </label>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-lg border bg-gray-900 text-gray-100 px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent',
        'transition-colors appearance-none cursor-pointer',
        error ? 'border-red-500' : 'border-gray-700 hover:border-gray-600',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border bg-gray-900 text-gray-100 px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent',
        'transition-colors resize-none placeholder:text-gray-600',
        error ? 'border-red-500' : 'border-gray-700 hover:border-gray-600',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border bg-gray-900 text-gray-100 px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent',
        'transition-colors placeholder:text-gray-600',
        error ? 'border-red-500' : 'border-gray-700 hover:border-gray-600',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-red-400">{children}</p>;
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-gray-500">{children}</p>;
}
