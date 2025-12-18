import Link from "next/link";

export function Footer() {
 return (
  <footer className="border-t border-border/10 bg-surface">
   <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
    <p className="text-xs text-muted">© {new Date().getFullYear()} FuelPriceIndia</p>
    <div className="flex flex-wrap gap-4 text-xs">
     <Link href="/about" className="relative text-muted transition-colors hover:text-text after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:origin-left after:bg-primary after:scale-x-0 after:transition-transform after:content-[''] hover:after:scale-x-100">About</Link>
     <Link href="/contact" className="relative text-muted transition-colors hover:text-text after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:origin-left after:bg-primary after:scale-x-0 after:transition-transform after:content-[''] hover:after:scale-x-100">Contact</Link>
     <Link href="/privacy" className="relative text-muted transition-colors hover:text-text after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:origin-left after:bg-primary after:scale-x-0 after:transition-transform after:content-[''] hover:after:scale-x-100">Privacy</Link>
     <Link href="/terms" className="relative text-muted transition-colors hover:text-text after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:origin-left after:bg-primary after:scale-x-0 after:transition-transform after:content-[''] hover:after:scale-x-100">Terms</Link>
    </div>
   </div>
  </footer>
 );
}
