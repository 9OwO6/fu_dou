"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

export function RevealMedia({ children, className }: { children: ReactNode; className: string }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={className} ref={elementRef}>
      <div className={`reveal-media-motion${isVisible ? " is-visible" : ""}`}>{children}</div>
    </div>
  );
}
