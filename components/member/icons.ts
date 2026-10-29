/**
 * Icon lookup.
 *
 * `Achievement.icon` stores a lucide icon *name* and `Workout.type` a
 * discipline, so the component resolves a name to a component here. Icons are
 * never stored in the data itself — a React component cannot survive the
 * round trip through DynamoDB or the server/client boundary.
 */

import {
  Activity,
  Award,
  Calendar,
  CheckCircle,
  Crown,
  Dumbbell,
  Flame,
  Heart,
  Medal,
  Rocket,
  Sparkles,
  Star,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Discipline } from "./types";

const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  award: Award,
  calendar: Calendar,
  checkcircle: CheckCircle,
  crown: Crown,
  dumbbell: Dumbbell,
  flame: Flame,
  heart: Heart,
  medal: Medal,
  rocket: Rocket,
  sparkles: Sparkles,
  star: Star,
  target: Target,
  timer: Timer,
  trendingup: TrendingUp,
  trophy: Trophy,
  zap: Zap,
};

/** Resolves a stored icon name, falling back to a trophy. */
export function achievementIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Trophy;
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  return ICONS[key] ?? Trophy;
}

const DISCIPLINE_ICONS: Record<Discipline, LucideIcon> = {
  CrossFit: Dumbbell,
  Hyrox: Timer,
  Calistenia: Target,
};

export function disciplineIcon(
  discipline: Discipline | null | undefined
): LucideIcon {
  return discipline ? DISCIPLINE_ICONS[discipline] : Activity;
}
