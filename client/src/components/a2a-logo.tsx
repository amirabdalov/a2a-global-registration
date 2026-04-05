export function A2ALogo({ className = "", size = "default" }: { className?: string; size?: "small" | "default" | "large" }) {
  const heightMap = { small: "h-6", default: "h-8", large: "h-10" };
  return (
    <div className={`flex items-center ${className}`} data-testid="logo-a2a-global">
      <img
        src="/a2a-blue-logo.svg"
        alt="A2A Global"
        className={`${heightMap[size]} w-auto`}
      />
    </div>
  );
}
