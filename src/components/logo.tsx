import Image from "next/image";
import Link from "next/link";

type LogoVariant = "mark" | "full";
type LogoSize = "sm" | "md" | "lg";

const sizes: Record<LogoSize, { mark: [number, number]; full: [number, number] }> = {
  sm: { mark: [28, 29], full: [90, 42] },
  md: { mark: [36, 37], full: [120, 56] },
  lg: { mark: [56, 58], full: [180, 84] },
};

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  href?: string;
  className?: string;
}

export function Logo({ variant = "mark", size = "md", href, className = "" }: LogoProps) {
  const [w, h] = sizes[size][variant];
  const src = variant === "full" ? "/vantage-logo.svg" : "/vantage-mark.svg";

  const img = (
    <Image
      src={src}
      alt="Vantage"
      width={w}
      height={h}
      priority
      className={className}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center shrink-0">
        {img}
      </Link>
    );
  }

  return <span className="inline-flex items-center shrink-0">{img}</span>;
}

// Compact lockup: mark + "Vantage" wordmark side-by-side (for navbars)
export function NavLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 shrink-0">
      <Image
        src="/vantage-mark.svg"
        alt=""
        width={32}
        height={33}
        priority
        aria-hidden="true"
      />
      <span className="font-black text-lg tracking-tight text-white select-none">
        Vantage
      </span>
    </Link>
  );
}
