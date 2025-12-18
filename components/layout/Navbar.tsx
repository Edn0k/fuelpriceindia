"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
];

function NavbarPumpIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id="pumpMaskNavbar">
          <rect x="290" y="140" width="330" height="700" rx="74" fill="#FFFFFF" />
          <rect x="345" y="205" width="220" height="165" rx="22" fill="#000000" />
        </mask>
      </defs>

      <rect
        x="290"
        y="140"
        width="330"
        height="700"
        rx="74"
        fill="currentColor"
        mask="url(#pumpMaskNavbar)"
      />
      <rect x="235" y="790" width="440" height="94" rx="47" fill="currentColor" />

      <path
        d="M620 360 C700 360 730 400 730 460 V600 C730 700 670 740 600 740 C530 740 500 690 500 630 V470 C500 410 530 380 590 380"
        stroke="currentColor"
        strokeWidth="60"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <path d="M768 330 L850 248 L886 286 L815 360 L792 392 L744 344 Z" fill="currentColor" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border/10 bg-surface/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <NavbarPumpIcon className="h-[34px] w-[34px] shrink-0 text-text" />
          <span className="text-base font-semibold tracking-tight text-text">
            FuelPriceIndia
          </span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-4 text-sm text-muted">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative transition-colors hover:text-text after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:origin-left after:bg-primary after:transition-transform after:content-[''] ${
                  active
                    ? "font-medium text-text after:scale-x-100"
                    : "after:scale-x-0 hover:after:scale-x-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
