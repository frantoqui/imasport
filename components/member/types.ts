/**
 * Plain, serializable row shapes for the member area.
 *
 * The Amplify data client hands back objects that carry lazy relationship
 * loaders (`photo.athlete()`), which cannot cross the server/client boundary.
 * Everything the member pages pass into a client component is mapped into one
 * of the types below first, so the boundary only ever sees JSON.
 *
 * These live under `components/member` rather than in `lib/member-queries.ts`
 * because client components import them, and that module is `server-only`.
 */

export type Discipline = "CrossFit" | "Hyrox" | "Calistenia";
export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";
export type RegistrationStatus =
  | "REGISTERED"
  | "WAITLIST"
  | "CANCELLED"
  | "ATTENDED";
export type SessionStatus = "upcoming" | "active" | "completed";
export type PlanTier = "basic" | "pro" | "elite";
export type PaymentStatus = "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELLED";
export type ApprovalStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export type WorkoutRow = {
  id: string;
  date: string;
  type: Discipline | null;
  name: string;
  /** Integer seconds — format for display with `formatDuration`. */
  durationSec: number | null;
  calories: number | null;
  notes: string | null;
};

export type BodyMetricRow = {
  id: string;
  date: string;
  weightKg: number | null;
  musclePct: number | null;
  fatPct: number | null;
};

export type ProgressRow = {
  id: string;
  discipline: Discipline | null;
  /** One of the documented keys in `components/member/metrics.ts`. */
  metric: string;
  value: number;
  unit: string | null;
  target: number | null;
  date: string;
};

export type EvaluationRow = {
  id: string;
  athleteId: string;
  coachId: string | null;
  coachName: string | null;
  date: string;
  discipline: Discipline | null;
  performance: number | null;
  technique: number | null;
  effort: number | null;
  notes: string | null;
  /** `Evaluation.metrics` is `a.json()`, so it is narrowed defensively. */
  metrics: Record<string, number | string>;
  photoKey: string | null;
};

export type AppointmentRow = {
  id: string;
  coachId: string | null;
  coachName: string | null;
  sessionType: string | null;
  date: string;
  time: string | null;
  status: AppointmentStatus | null;
  notes: string | null;
};

export type AthletePhotoRow = {
  id: string;
  key: string;
  caption: string | null;
  takenAt: string | null;
  coachId: string | null;
  /** Resolved from CoachProfile / the linked Evaluation when possible. */
  coachName: string | null;
  evaluationId: string | null;
  createdAt: string;
};

export type ClassSessionRow = {
  id: string;
  name: string;
  date: string;
  time: string | null;
  discipline: Discipline | null;
  coachName: string | null;
  capacity: number | null;
  enrolled: number | null;
  status: SessionStatus | null;
};

export type AchievementRow = {
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  order: number | null;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type EventRegistrationRow = {
  id: string;
  eventId: string;
  status: RegistrationStatus | null;
  eventTitle: string;
  eventDate: string;
  eventTime: string | null;
  eventLocation: string | null;
  eventCategory: Discipline | null;
};

export type CoachRow = {
  id: string;
  userId: string | null;
  name: string;
  discipline: Discipline | null;
  specialty: string | null;
  imageKey: string | null;
};

/** The viewer's own profile, flattened for the profile form. */
export type ProfileRow = {
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  discipline: Discipline | null;
  planTier: PlanTier | null;
  planStatus: PaymentStatus | null;
  memberSince: string | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  bodyFatPct: number | null;
  goals: string[];
  avatarKey: string | null;
  notifyClasses: boolean;
  notifyWorkouts: boolean;
  notifyWeekly: boolean;
  /**
   * Coach application state. This is only a request flag — the privilege that
   * actually matters is the Cognito group, which only an admin can change.
   */
  coachStatus: ApprovalStatus | null;
  bio: string | null;
  certifications: string | null;
  yearsExperience: number | null;
  specialty: string | null;
};

/** A row in the coach panel's athlete list. */
export type AthleteListRow = {
  userId: string;
  name: string;
  email: string;
  discipline: Discipline | null;
  planTier: PlanTier | null;
  avatarKey: string | null;
  /** Most recent Workout or Evaluation date, whichever is later. */
  lastSessionDate: string | null;
};

export type AthleteDetail = {
  athlete: AthleteListRow;
  evaluations: EvaluationRow[];
  progress: ProgressRow[];
  workouts: WorkoutRow[];
  photos: AthletePhotoRow[];
};

/**
 * Derived dashboard headline numbers. `delta` is `null` whenever there is no
 * honest comparison to make (no prior month of data), and the UI then omits
 * the delta line rather than inventing one.
 */
export type StatValue = {
  value: number;
  delta: number | null;
};

export type DashboardStats = {
  sessionsThisMonth: StatValue;
  /** Consecutive days with a workout, ending today or yesterday. */
  streakDays: number;
  prsThisMonth: StatValue;
  caloriesThisMonth: StatValue;
};
