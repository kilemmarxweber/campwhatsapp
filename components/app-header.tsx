import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { AppNav, type AppNavItem } from "@/components/app-nav";
import {
  UserProfileMenu,
  type ProfileUser,
} from "@/components/user-profile-menu";

export function AppHeader({
  title,
  subtitle,
  navItems,
  user,
  homeHref = "/dashboard",
  showSiegeLink = false,
  showOrganisationsLink = false,
  contextLabel,
  brand = "Campagnes",
  menuLabels,
}: {
  title: string;
  subtitle?: string;
  navItems?: AppNavItem[];
  user: ProfileUser;
  homeHref?: string;
  showSiegeLink?: boolean;
  showOrganisationsLink?: boolean;
  contextLabel?: string;
  brand?: string;
  menuLabels?: {
    organisations: string;
    branches: string;
    siege: string;
    signOut: string;
  };
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 shadow-[0_1px_0_0_var(--border),0_8px_24px_-12px_color-mix(in_oklab,var(--tvs-blue)_28%,transparent)] backdrop-blur-md">
      <div
        className="h-1 w-full"
        style={{
          background:
            "linear-gradient(90deg, var(--tvs-blue) 0%, var(--tvs-blue) 55%, var(--tvs-red) 55%, var(--tvs-red) 100%)",
        }}
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <div className="flex min-w-0 items-center gap-4">
          <Link href={homeHref} className="brand-mark shrink-0 text-base uppercase">
            {brand}
          </Link>
          <Separator orientation="vertical" className="hidden h-8 sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-primary">
              {title}
            </p>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <UserProfileMenu
          user={user}
          showSiegeLink={showSiegeLink}
          showOrganisationsLink={showOrganisationsLink}
          contextLabel={contextLabel}
          menuLabels={menuLabels}
        />
      </div>
      {navItems && navItems.length > 0 ? (
        <>
          <Separator />
          <AppNav items={navItems} />
        </>
      ) : null}
    </header>
  );
}
