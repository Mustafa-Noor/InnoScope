"use client";

import * as React from "react";
import { MinusIcon } from "lucide-react";
import { cn } from "./utils";

// Define the type for each OTP slot
type OTPSlotType = {
  char?: string;
  hasFakeCaret?: boolean;
  isActive?: boolean;
};

// Define the context type
type OTPInputContextType = {
  slots: OTPSlotType[];
} | null;

const OTPInputContext = React.createContext<OTPInputContextType>(null);

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"input"> & { containerClassName?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName
      )}
    >
      <input className={cn("disabled:cursor-not-allowed", className)} {...props} />
    </div>
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center gap-1", className)} {...props} />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & { index: number }) {
  const context = React.useContext(OTPInputContext);

  const { char, hasFakeCaret, isActive } = context?.slots[index] ?? {};

  return (
    <div
      data-active={isActive}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center border border-input bg-input-background text-sm transition-all outline-none first:rounded-l-md last:rounded-r-md",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div role="separator" {...props}>
      <MinusIcon />
    </div>
  );
}

export { OTPInputContext, InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
