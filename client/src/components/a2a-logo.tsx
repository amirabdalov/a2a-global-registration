import logoSrc from "@assets/a2a-blue-logo.svg";

export function A2ALogo({ className = "", size = "default" }: { className?: string; size?: "small" | "default" | "large" }) {
  const heightMap = { small: "h-5", default: "h-7", large: "h-8" };
  const textMap = { small: "text-sm", default: "text-base", large: "text-lg" };
  
  return (
    <div className={`flex items-center gap-1.5 ${className}`} data-testid="logo-a2a-global">
      {/* Globe icon only — extracted from the full SVG, just the globe portion */}
      <svg className={`${heightMap[size]} w-auto`} viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.59 23.7C9.42 24.93 7.59 23.11 8.76 21.89C9.94 20.66 11.76 22.48 10.59 23.7ZM37.25 22.04C36.74 24.47 35.72 26.81 34.19 28.89C35.21 30.09 33.7 31.83 32.41 30.95C31.08 32.26 29.6 33.31 28.03 34.1C28.56 36.34 25.44 37.44 24.47 35.39C23.26 35.7 22 35.87 20.73 35.89C20.07 37.51 17.71 37.3 17.33 35.61C15.63 35.29 13.91 34.69 12.41 33.89C10.94 35.12 8.81 33.68 9.39 31.83C7.52 30.24 6.02 28.27 4.95 26.06C3.03 26.43 2.04 23.74 3.74 22.73C3.28 20.89 3.1 18.96 3.25 17C1.26 16.37 1.76 13.23 3.93 13.35C4.95 9.86 6.95 6.94 9.53 4.79C8.41 2.56 11.26 .33 13.08 2.13C13.16 2.22 13.24 2.32 13.31 2.41C16.05 1.15 19.12.6 22.24.95C22.83-.6 25.12-.14 25.09 1.51C25.91 1.75 26.72 2.05 27.51 2.42C28.29 1.57 29.64 2.34 29.39 3.43C29.84 3.7 30.28 4.01 30.71 4.34C31.73 5.12 32.68 6.02 33.5 7.01C34.4 6.66 35.25 7.75 34.67 8.56C35.26 9.45 35.77 10.39 36.19 11.36C37.68 11.13 38.41 13.23 37.08 14C37.44 15.44 37.62 16.93 37.62 18.42C39.67 18.89 39.35 22.01 37.25 22.04Z" fill="#0F3DD1"/>
        <circle cx="33.87" cy="23.15" r="0.85" fill="#0F3DD1" opacity="0.6"/>
        <circle cx="21.04" cy="22.36" r="0.85" fill="#0F3DD1" opacity="0.6"/>
        <circle cx="21.19" cy="29.54" r="0.85" fill="#0F3DD1" opacity="0.6"/>
        <circle cx="14.67" cy="11.17" r="0.85" fill="#0F3DD1" opacity="0.6"/>
      </svg>
      <span className={`font-bold text-[#0F3DD1] ${textMap[size]} leading-none`}>
        A2A Global
      </span>
    </div>
  );
}
