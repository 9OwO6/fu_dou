import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      {children}
    </svg>
  );
}

const strokeProps = {
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.8,
};

export function HomeIcon(props: IconProps) {
  return <IconBase {...props}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" {...strokeProps} /></IconBase>;
}

export function ProductIcon(props: IconProps) {
  return <IconBase {...props}><path d="m4.5 7.2 7.5-4 7.5 4v9.6l-7.5 4-7.5-4V7.2Z" {...strokeProps} /><path d="m4.8 7.4 7.2 4 7.2-4M12 11.4v9" {...strokeProps} /></IconBase>;
}

export function FolderIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5l-1.2 8A1.75 1.75 0 0 1 18.1 19H5.9a1.75 1.75 0 0 1-1.7-1.5L3 7.5Z" {...strokeProps} /></IconBase>;
}

export function OrderIcon(props: IconProps) {
  return <IconBase {...props}><path d="M7 5h10a2 2 0 0 1 2 2v13H5V7a2 2 0 0 1 2-2Z" {...strokeProps} /><path d="M9 5V3h6v2M8.5 10h7M8.5 14h7" {...strokeProps} /></IconBase>;
}

export function StoreIcon(props: IconProps) {
  return <IconBase {...props}><path d="m4 10 1.5-6h13L20 10M5 10v10h14V10" {...strokeProps} /><path d="M3 10h18M9 20v-6h6v6" {...strokeProps} /></IconBase>;
}

export function SparklesIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 3 13.5 8.5 19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" {...strokeProps} /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" {...strokeProps} /></IconBase>;
}

export function InfoIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" {...strokeProps} /><path d="M12 11v5M12 8h.01" {...strokeProps} /></IconBase>;
}

export function ChevronIcon(props: IconProps) {
  return <IconBase {...props}><path d="m8 10 4 4 4-4" {...strokeProps} /></IconBase>;
}
