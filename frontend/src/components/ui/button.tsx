import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import useLongPress from "@/hooks/useLongPress";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        xl: "h-12 rounded-md px-8 has-[>svg]:px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  longPress?: () => void;
  longPressDelay?: number;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      longPress,
      longPressDelay = 3000,
      loading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const [isPressing, setIsPressing] = React.useState(false);
    const canUseLongPress = !asChild && !!longPress;

    const { onMouseDown, onMouseLeave, onMouseUp, onTouchEnd, onTouchStart } =
      useLongPress(
        () => {
          longPress?.();
          setIsPressing(false);
        },
        () => {
          setIsPressing(false);
        },
        {
          delay: longPressDelay,
          shouldPreventDefault: true,
        }
      );

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (canUseLongPress) {
        setIsPressing(true);
        onMouseDown(e);
      } else {
        props?.onMouseDown?.(e);
      }
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
      if (canUseLongPress) {
        setIsPressing(true);
        onTouchStart(e);
      } else {
        props?.onTouchStart?.(e);
      }
    };

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-long-press={isPressing || undefined}
        className={cn(
          "relative",
          buttonVariants({ variant, size, className }),
          canUseLongPress &&
            "before:absolute before:left-0 before:top-0 before:h-full before:bg-constructive/40 before:z-0 before:rounded-md before:transition-[width] before:content-[''] before:duration-500",
          canUseLongPress
            ? isPressing
              ? "before:w-full before:duration-[var(--long-press-duration)]"
              : "before:w-0"
            : null
        )}
        style={
          canUseLongPress
            ? { ["--long-press-duration" as any]: `${longPressDelay}ms` }
            : undefined
        }
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseUp={canUseLongPress ? onMouseUp : props?.onMouseUp}
        onMouseLeave={
          canUseLongPress ? (e) => onMouseLeave(e) : props?.onMouseLeave
        }
        onTouchEnd={canUseLongPress ? onTouchEnd : props?.onTouchEnd}
        disabled={disabled || loading}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
