import * as React from "react";

import { cn } from "@/lib/utils";

type Variant = "default" | "active" | "warning" | "danger";

interface KnoxCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  asButton?: boolean;
  disabled?: boolean;
}

const variantStyles: Record<Variant, string> = {
  default: "bg-surface border-border text-border",
  active: "bg-[var(--color-primary)] border-border text-white",
  warning: "bg-[var(--color-warning)] border-border text-border",
  danger: "bg-[var(--color-danger)] border-border text-white",
};

export const KnoxCard = React.forwardRef<HTMLDivElement, KnoxCardProps>(
  (
    {
      className,
      variant = "default",
      asButton,
      disabled = false,
      children,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      "relative border-[3px] shadow-[4px_4px_0px_0px_#000000] p-6 transition-all rounded-none";

    const interactiveClasses =
      asButton && !disabled
        ? "cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000000]"
        : "";

    const disabledClasses = disabled
      ? "opacity-50 cursor-not-allowed pointer-events-none grayscale"
      : "";

    return (
      <div
        ref={ref}
        aria-disabled={disabled}
        className={cn(
          baseClasses,
          interactiveClasses,
          disabledClasses,
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

KnoxCard.displayName = "KnoxCard";
