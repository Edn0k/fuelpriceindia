"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: any[];
    __adsensePushScheduled?: boolean;
  }
}

type Props = {
  slot: string;
  className?: string;
};

export default function AdUnit({ slot, className = "" }: Props) {
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    const ins = insRef.current;
    if (!ins) return;

    const status = ins.getAttribute("data-adsbygoogle-status");
    if (status) return;

    if (window.__adsensePushScheduled) return;
    window.__adsensePushScheduled = true;

    setTimeout(() => {
      window.__adsensePushScheduled = false;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.log("AdSense error:", err);
        }
      }
    }, 0);
  }, []);

  return (
    <div className={`rounded-xl border border-white/10 bg-surface/60 p-4 ${className}`}>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/50">Advertisement</p>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: 100 }}
        data-ad-client="ca-pub-5922980925549177"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}
