import { Navbar } from "./Navbar";
import { FooterClean } from "./FooterClean";
import AdUnit from "../AdUnit";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gradient-to-b from-background to-surface">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
      <div className="bg-surface">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <AdUnit slot="1148498855" className="my-10" />
        </div>
      </div>
      <FooterClean />
    </div>
  );
}
