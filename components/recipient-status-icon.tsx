import type { ReactNode } from "react";
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleXIcon,
  EyeIcon,
  MailCheckIcon,
  MinusCircleIcon,
} from "lucide-react";
import { LoaderCircle } from "@/components/page-loader";

const LABELS: Record<string, string> = {
  pending: "En attente",
  queued: "En file",
  sent: "Envoyé",
  delivered: "Distribué",
  read: "Lu",
  failed: "Échec",
  skipped: "Ignoré",
};

export function RecipientStatusIcon({ status }: { status: string }) {
  const label = LABELS[status] ?? status;

  let icon: ReactNode;
  let tone = "recipient-status";

  switch (status) {
    case "sent":
      icon = <CheckCircle2Icon className="size-4" aria-hidden />;
      tone += " is-ok";
      break;
    case "delivered":
      icon = <MailCheckIcon className="size-4" aria-hidden />;
      tone += " is-ok";
      break;
    case "read":
      icon = <EyeIcon className="size-4" aria-hidden />;
      tone += " is-ok";
      break;
    case "queued":
    case "pending":
      icon = <LoaderCircle className="size-4" />;
      tone += " is-pending";
      break;
    case "failed":
      icon = <CircleXIcon className="size-4" aria-hidden />;
      tone += " is-failed";
      break;
    case "skipped":
      icon = <MinusCircleIcon className="size-4" aria-hidden />;
      tone += " is-unknown";
      break;
    default:
      icon = <CircleDashedIcon className="size-4" aria-hidden />;
      tone += " is-unknown";
  }

  return (
    <span className={tone} title={label} aria-label={label}>
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}
