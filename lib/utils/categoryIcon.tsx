import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Apple,
  Archive,
  Baby,
  Backpack,
  Bath,
  Bed,
  Bike,
  Blocks,
  Box,
  Briefcase,
  Brush,
  Camera,
  Candy,
  Car,
  ChefHat,
  Circle,
  CircleDot,
  Coffee,
  Cookie,
  Cpu,
  Crown,
  CupSoda,
  Droplet,
  Dumbbell,
  Flower,
  Flower2,
  Footprints,
  Gamepad2,
  Gem,
  Glasses,
  Goal,
  GraduationCap,
  Headphones,
  HeartPulse,
  Home,
  Image as ImageIcon,
  Laptop,
  Layers,
  Leaf,
  Lightbulb,
  Link,
  Microwave,
  Mountain,
  Palette,
  PersonStanding,
  Pill,
  Plug,
  Popcorn,
  Puzzle,
  Router,
  Scissors,
  Shield,
  Shirt,
  ShowerHead,
  Smartphone,
  Sofa,
  Sparkle,
  Sparkles,
  SprayCan,
  Stethoscope,
  Sun,
  Swords,
  Tag,
  Target,
  ToyBrick,
  Trees,
  Trophy,
  Umbrella,
  Utensils,
  UtensilsCrossed,
  Wand2,
  Watch,
  Wheat,
  Zap,
} from "lucide-react";

/**
 * Category `icon` strings (set by the backend seed / admin category form)
 * are the EXACT PascalCase export name of a lucide-react icon, e.g.
 * "Smartphone", "Dumbbell". This map is a deliberately explicit allow-list
 * (rather than `import * as LucideIcons from "lucide-react"`) so unused
 * icons get tree-shaken out of the client bundle instead of shipping all
 * ~1600 of them.
 *
 * Adding a new category icon? Add the named import above + an entry below -
 * keep this in sync with scripts/seed-kangaro-categories.ts in the backend.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Activity,
  Apple,
  Archive,
  Baby,
  Backpack,
  Bath,
  Bed,
  Bike,
  Blocks,
  Box,
  Briefcase,
  Brush,
  Camera,
  Candy,
  Car,
  ChefHat,
  Circle,
  CircleDot,
  Coffee,
  Cookie,
  Cpu,
  Crown,
  CupSoda,
  Droplet,
  Dumbbell,
  Flower,
  Flower2,
  Footprints,
  Gamepad2,
  Gem,
  Glasses,
  Goal,
  GraduationCap,
  Headphones,
  HeartPulse,
  Home,
  Image: ImageIcon,
  Laptop,
  Layers,
  Leaf,
  Lightbulb,
  Link,
  Microwave,
  Mountain,
  Palette,
  PersonStanding,
  Pill,
  Plug,
  Popcorn,
  Puzzle,
  Router,
  Scissors,
  Shield,
  Shirt,
  ShowerHead,
  Smartphone,
  Sofa,
  Sparkle,
  Sparkles,
  SprayCan,
  Stethoscope,
  Sun,
  Swords,
  Target,
  ToyBrick,
  Trees,
  Trophy,
  Umbrella,
  Utensils,
  UtensilsCrossed,
  Wand2,
  Watch,
  Wheat,
  Zap,
};

/** Generic fallback for an unrecognized/missing icon name - never renders nothing. */
const FALLBACK_ICON: LucideIcon = Tag;

/** Resolve a category `icon` string to its lucide-react component (or the fallback). */
export function resolveCategoryIcon(name?: string | null): LucideIcon {
  if (!name) return FALLBACK_ICON;
  return CATEGORY_ICONS[name] ?? FALLBACK_ICON;
}

export interface CategoryIconProps extends Omit<React.ComponentProps<LucideIcon>, "name"> {
  /** The category's `icon` field (lucide-react export name, e.g. "Dumbbell"). */
  name?: string | null;
}

/** Renders a category's icon by name, falling back to a generic tag icon. */
export function CategoryIcon({ name, ...props }: CategoryIconProps) {
  const Icon = resolveCategoryIcon(name);
  return <Icon {...props} />;
}
