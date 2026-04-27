import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  size?: number;
};

export function BrandLogo({ className, size = 24 }: BrandLogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("shrink-0", className)}
    />
  );
}
