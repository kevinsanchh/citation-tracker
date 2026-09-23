import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

// Title-cases the part after the colon, e.g. "PG5: MARKET STATION" -> "PG5: Market Station"
export function formatLocation(locationStr: string): string {
  // Split the string at the first colon
  const parts = locationStr.split(":");

  // If there's no colon, return the original string
  if (parts.length < 2) {
    return locationStr;
  }

  const prefix = parts[0];
  const description = parts[1].trim(); // Get the part after the colon and remove whitespace

  // Convert the description to title case
  const titleCasedDescription = description
    .toLowerCase() // e.g., "gold garage"
    .split(" ") // e.g., ["gold", "garage"]
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // e.g., ["Gold", "Garage"]
    .join(" "); // e.g., "Gold Garage"

  // Recombine the prefix and the newly formatted description
  return `${prefix}: ${titleCasedDescription}`;
}
