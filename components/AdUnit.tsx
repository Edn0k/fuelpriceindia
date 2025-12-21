"use client";

import { useEffect, useRef, useState } from "react";

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
  const [hasAd, setHasAd] = useState(false);
  const [isUnfilled, setIsUnfilled] = useState(false);

  useEffect(() => {
    const ins = insRef.current;
    if (!ins) return;

    const syncAdState = () => {
      const adStatus = ins.getAttribute("data-ad-status");
      if (adStatus === "filled") {
        setHasAd(true);
        setIsUnfilled(false);
        return;
      }
      if (adStatus === "unfilled") {
        setHasAd(false);
        setIsUnfilled(true);
        return;
      }
      setHasAd(false);
      setIsUnfilled(false);
    };

    syncAdState();

    const observer = new MutationObserver(() => {
      syncAdState();
    });
    observer.observe(ins, { attributes: true, childList: true, subtree: true });

    const alreadyPushed = Boolean(ins.getAttribute("data-adsbygoogle-status"));
    if (!alreadyPushed && !window.__adsensePushScheduled) {
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
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const isVisible = hasAd && !isUnfilled;

  return (
    <div
      className={
        isUnfilled
          ? "hidden"
          : isVisible
            ? `rounded-xl border border-white/10 bg-surface/60 p-4 ${className}`
            : "max-h-0 overflow-hidden border-0 bg-transparent p-0"
      }
    >
      <p
        className={`mb-2 text-[11px] font-medium uppercase tracking-wide text-white/50 ${
          isVisible ? "block" : "hidden"
        }`}
      >
        Advertisement
      </p>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-5922980925549177"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}
