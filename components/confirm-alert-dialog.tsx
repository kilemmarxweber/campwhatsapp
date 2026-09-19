"use client";

import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmAlertDialogButtonProps = {
  className?: string;
  children: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  variant?: "destructive" | "default";
  onConfirm: () => void;
  disabled?: boolean;
};

/** Confirmation shadcn (Alert Dialog) — remplace window.confirm. */
export function ConfirmAlertDialogButton({
  className,
  children,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  pending = false,
  variant = "destructive",
  onConfirm,
  disabled,
}: ConfirmAlertDialogButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled || pending}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={variant === "destructive" ? "destructive" : "default"}
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {pending ? "…" : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
