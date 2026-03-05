import { cn } from "@/lib/utils";

interface TakaIconProps {
  className?: string;
}

export function TakaIcon({ className }: TakaIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
    >
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6" />
      <path d="M8 4v16" />
    </svg>
  );
}
