import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[8px] text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#1A1A18] text-white hover:bg-[#1A1A18]/85",
        secondary:
          "bg-[#F0EFE9] text-[#1A1A18] border border-[rgba(0,0,0,0.08)] hover:bg-[#e8e7e0]",
        ghost: "hover:bg-[#F0EFE9] text-[#6B6B65] hover:text-[#1A1A18]",
        destructive: "bg-[#A32D2D] text-white hover:bg-[#A32D2D]/85",
        outline:
          "border border-[rgba(0,0,0,0.12)] bg-white hover:bg-[#F0EFE9] text-[#1A1A18]",
        green: "bg-[#3B6D11] text-white hover:bg-[#3B6D11]/85",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
