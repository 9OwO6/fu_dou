import Image from "next/image";

import logo from "@/assets/brand/happy-beans-logo-primary.jpg";

export function BrandEmptyMark() {
  return <Image alt="" aria-hidden="true" className="empty-brand-avatar" src={logo} />;
}
