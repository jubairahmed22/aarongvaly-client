"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * Small shared pieces for the auth forms (login / register / reset-password).
 * Kept together so every auth surface renders identical field errors, the
 * same password reveal control, and the same Google button.
 */

/** Inline validation message. Renders nothing when there's no error. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-[12px] font-medium leading-tight text-red-600">
      {message}
    </p>
  );
}

/**
 * Password field with a show/hide toggle. Forwards its ref so it drops
 * straight into react-hook-form's `register()` spread like a plain Input.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-[44px]", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-[4px] top-1/2 inline-flex h-[32px] w-[32px] -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-ink"
        >
          {visible ? (
            <EyeOff className="h-[16px] w-[16px]" aria-hidden />
          ) : (
            <Eye className="h-[16px] w-[16px]" aria-hidden />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

/**
 * OAuth button carrying Google's official four-colour mark. Inline SVG (not
 * a remote asset) so it renders instantly with no extra request.
 */
export function GoogleButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-[48px] w-full items-center justify-center gap-[10px] rounded-[12px] border border-neutral-300 bg-paper text-[14px] font-bold text-ink transition-colors hover:bg-neutral-50"
    >
      <GoogleMark />
      {label}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
