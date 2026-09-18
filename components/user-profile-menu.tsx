"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboardIcon,
  LogOutIcon,
  ShieldIcon,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type ProfileUser = {
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function UserProfileMenu({
  user,
  showSiegeLink = false,
  contextLabel,
}: {
  user: ProfileUser;
  showSiegeLink?: boolean;
  contextLabel?: string;
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="h-9 gap-2 rounded-full border-border/80 bg-card px-1.5 pr-2.5 shadow-sm"
          />
        }
      >
        <Avatar size="sm">
          {user.image ? (
            <AvatarImage src={user.image} alt={user.name} />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
          {user.name}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1.5 px-0.5 py-0.5">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.name}
                </p>
                {user.role ? (
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {user.role}
                  </Badge>
                ) : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
              {contextLabel ? (
                <p className="truncate text-xs text-muted-foreground">
                  {contextLabel}
                </p>
              ) : null}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/dashboard" />}>
            <LayoutDashboardIcon />
            Mes succursales
          </DropdownMenuItem>
          {showSiegeLink ? (
            <DropdownMenuItem render={<Link href="/admin" />}>
              <ShieldIcon />
              Administration siège
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={async () => {
              await signOut();
              router.push("/");
              router.refresh();
            }}
          >
            <LogOutIcon />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
