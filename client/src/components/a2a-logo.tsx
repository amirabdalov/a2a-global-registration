export function A2ALogo({ className = "", size = "default" }: { className?: string; size?: "small" | "default" | "large" }) {
  const sizeMap = { small: "text-base", default: "text-lg", large: "text-xl" };
  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="logo-a2a-global">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="A2A Global Logo" className={size === "large" ? "w-10 h-10" : size === "small" ? "w-6 h-6" : "w-8 h-8"}>
        <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
        <path d="M8 22L13.5 10H15.5L21 22H18.8L17.5 19H11.5L10.2 22H8ZM12.2 17.2H16.8L14.5 11.8L12.2 17.2Z" fill="white" />
        <path d="M20 14.5C20 11.5 22 10 24.5 10V12C23 12 22 13 22 14.5C22 16 23 17 24.5 17V19C22 19 20 17.5 20 14.5Z" fill="white" fillOpacity="0.8" />
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0F3DD1" />
            <stop offset="1" stopColor="#171717" />
          </linearGradient>
        </defs>
      </svg>
      <span className={`font-semibold tracking-tight ${sizeMap[size]}`} style={{ background: "linear-gradient(to right, #0F3DD1, #686868)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        A2A Global
      </span>
    </div>
  );
}
