import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { userAdmin } from "../functions/user-admin/resource.js";

/**
 * IMASPORT data model.
 *
 * Authorization conventions used throughout:
 *   - Public site content (events, albums, photos, plans, coaches, FAQ) is
 *     readable by `guest` so the marketing pages render for logged-out
 *     visitors, and writable only by `ADMINS`. We deliberately use guest
 *     (identity pool) rather than an API key: API keys expire after at most a
 *     year and would silently take the public site down.
 *   - Per-athlete data is `owner`-scoped, with `COACHES` able to read and
 *     `ADMINS` able to do anything.
 *   - Role changes are not writable from any client. They go through the
 *     ADMINS-only custom mutations at the bottom of this schema.
 *
 * Note on the two read rules on public models: `guest` covers logged-out
 * visitors (identity pool, unauthenticated role) and `authenticated` covers
 * signed-in ones (user pool token). There is deliberately no
 * `authenticated("identityPool")` rule — it cannot work here, because signing
 * in puts a user in a Cognito group and the identity pool then issues that
 * group's role, which Amplify does not grant AppSync permissions to. Client
 * code picks the right mode via `publicAuthMode()` in lib/amplify-client.ts.
 */
const schema = a
  .schema({
    Discipline: a.enum(["CrossFit", "Hyrox", "Calistenia"]),
    Role: a.enum(["ATHLETE", "COACH", "ADMIN"]),
    ApprovalStatus: a.enum(["NONE", "PENDING", "APPROVED", "REJECTED"]),
    PlanTier: a.enum(["basic", "pro", "elite"]),
    PaymentStatus: a.enum(["PENDING", "ACTIVE", "PAST_DUE", "CANCELLED"]),
    AlbumVisibility: a.enum(["PUBLIC", "MEMBERS"]),
    RegistrationStatus: a.enum([
      "REGISTERED",
      "WAITLIST",
      "CANCELLED",
      "ATTENDED",
    ]),
    AppointmentStatus: a.enum([
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
    ]),
    SessionStatus: a.enum(["upcoming", "active", "completed"]),

    /**
     * Mirror of a Cognito user, holding everything the app needs that does not
     * belong in a token. `role` here is a convenience copy for listing and
     * filtering in the admin panel — the authoritative role is the user's
     * Cognito group.
     */
    UserProfile: a
      .model({
        userId: a.string().required(),
        email: a.string().required(),
        name: a.string().required(),
        phone: a.string(),
        role: a.ref("Role"),
        discipline: a.ref("Discipline"),

        planTier: a.ref("PlanTier"),
        planStatus: a.ref("PaymentStatus"),
        memberSince: a.date(),

        age: a.integer(),
        weightKg: a.float(),
        heightCm: a.float(),
        bodyFatPct: a.float(),
        goals: a.string().array(),
        avatarKey: a.string(),

        notifyClasses: a.boolean(),
        notifyWorkouts: a.boolean(),
        notifyWeekly: a.boolean(),

        // Coach application. A sign-up can request COACH but only an admin
        // approving it actually moves the user into the COACHES group.
        coachStatus: a.ref("ApprovalStatus"),
        bio: a.string(),
        certifications: a.string(),
        yearsExperience: a.integer(),
        specialty: a.string(),

        isActive: a.boolean(),

        evaluations: a.hasMany("Evaluation", "athleteId"),
        workouts: a.hasMany("Workout", "userId"),
        bodyMetrics: a.hasMany("BodyMetric", "userId"),
        progress: a.hasMany("ProgressEntry", "userId"),
        athletePhotos: a.hasMany("AthletePhoto", "athleteId"),
      })
      .identifier(["userId"])
      .authorization((allow) => [
        allow.ownerDefinedIn("userId").identityClaim("sub").to(["read", "create", "update"]),
        allow.group("COACHES").to(["read"]),
        allow.group("ADMINS"),
      ]),

    Event: a
      .model({
        title: a.string().required(),
        slug: a.string(),
        description: a.string(),
        date: a.date().required(),
        time: a.string(),
        location: a.string(),
        category: a.ref("Discipline"),
        spots: a.integer(),
        // Denormalized counter kept in step by the registration action. The
        // admin panel reads the registration list itself for the exact figure.
        spotsTaken: a.integer(),
        imageKey: a.string(),
        imageUrl: a.string(),
        featured: a.boolean(),
        published: a.boolean(),
        priceMxn: a.float(),
        registrations: a.hasMany("EventRegistration", "eventId"),
        albums: a.hasMany("Album", "eventId"),
      })
      .secondaryIndexes((index) => [index("date")])
      .authorization((allow) => [
        allow.guest().to(["read"]),
        allow.authenticated().to(["read"]),
        allow.group("ADMINS"),
      ]),

    EventRegistration: a
      .model({
        eventId: a.id().required(),
        event: a.belongsTo("Event", "eventId"),
        userId: a.string().required(),
        name: a.string().required(),
        email: a.string().required(),
        phone: a.string(),
        status: a.ref("RegistrationStatus"),
        notes: a.string(),
      })
      .secondaryIndexes((index) => [index("eventId"), index("userId")])
      .authorization((allow) => [
        allow.ownerDefinedIn("userId").identityClaim("sub").to(["read", "create", "delete"]),
        allow.group("COACHES").to(["read"]),
        allow.group("ADMINS"),
      ]),

    /** A photo album. `eventId` set means it is an event gallery. */
    Album: a
      .model({
        title: a.string().required(),
        slug: a.string(),
        description: a.string(),
        coverKey: a.string(),
        visibility: a.ref("AlbumVisibility"),
        published: a.boolean(),
        order: a.integer(),
        eventId: a.id(),
        event: a.belongsTo("Event", "eventId"),
        photos: a.hasMany("Photo", "albumId"),
      })
      .authorization((allow) => [
        allow.guest().to(["read"]),
        allow.authenticated().to(["read"]),
        allow.group("ADMINS"),
      ]),

    Photo: a
      .model({
        albumId: a.id().required(),
        album: a.belongsTo("Album", "albumId"),
        key: a.string().required(),
        caption: a.string(),
        order: a.integer(),
        width: a.integer(),
        height: a.integer(),
        takenAt: a.date(),
      })
      .secondaryIndexes((index) => [index("albumId")])
      .authorization((allow) => [
        allow.guest().to(["read"]),
        allow.authenticated().to(["read"]),
        allow.group("ADMINS"),
      ]),

    /** Private progress photos captured by a coach during a session. */
    AthletePhoto: a
      .model({
        athleteId: a.string().required(),
        athlete: a.belongsTo("UserProfile", "athleteId"),
        coachId: a.string(),
        key: a.string().required(),
        caption: a.string(),
        takenAt: a.date(),
        evaluationId: a.id(),
      })
      .secondaryIndexes((index) => [index("athleteId")])
      .authorization((allow) => [
        allow.ownerDefinedIn("athleteId").identityClaim("sub").to(["read"]),
        allow.group("COACHES"),
        allow.group("ADMINS"),
      ]),

    Plan: a
      .model({
        tier: a.ref("PlanTier"),
        name: a.string().required(),
        nameEn: a.string(),
        priceMxn: a.float().required(),
        features: a.string().array(),
        featuresEn: a.string().array(),
        popular: a.boolean(),
        order: a.integer(),
        active: a.boolean(),
      })
      .authorization((allow) => [
        allow.guest().to(["read"]),
        allow.authenticated().to(["read"]),
        allow.group("ADMINS"),
      ]),

    /**
     * Public-facing coach card. Decoupled from UserProfile on purpose so the
     * marketing grid can be curated independently of who has an account.
     * `userId` links the card to a real account when one exists.
     */
    CoachProfile: a
      .model({
        userId: a.string(),
        name: a.string().required(),
        discipline: a.ref("Discipline"),
        certifications: a.string(),
        bio: a.string(),
        imageKey: a.string(),
        imageUrl: a.string(),
        instagram: a.string(),
        specialty: a.string(),
        yearsExperience: a.integer(),
        order: a.integer(),
        published: a.boolean(),
      })
      .authorization((allow) => [
        allow.guest().to(["read"]),
        allow.authenticated().to(["read"]),
        allow.group("ADMINS"),
      ]),

    Faq: a
      .model({
        question: a.string().required(),
        answer: a.string().required(),
        questionEn: a.string(),
        answerEn: a.string(),
        order: a.integer(),
        published: a.boolean(),
      })
      .authorization((allow) => [
        allow.guest().to(["read"]),
        allow.authenticated().to(["read"]),
        allow.group("ADMINS"),
      ]),

    Evaluation: a
      .model({
        athleteId: a.string().required(),
        athlete: a.belongsTo("UserProfile", "athleteId"),
        coachId: a.string(),
        coachName: a.string(),
        date: a.date().required(),
        discipline: a.ref("Discipline"),
        performance: a.integer(),
        technique: a.integer(),
        effort: a.integer(),
        notes: a.string(),
        /** Discipline-specific numbers, e.g. { backSquat: 120, wodTime: "9:12" } */
        metrics: a.json(),
        photoKey: a.string(),
      })
      .secondaryIndexes((index) => [index("athleteId"), index("coachId")])
      .authorization((allow) => [
        allow.ownerDefinedIn("athleteId").identityClaim("sub").to(["read"]),
        allow.group("COACHES"),
        allow.group("ADMINS"),
      ]),

    Appointment: a
      .model({
        athleteId: a.string().required(),
        athleteName: a.string(),
        coachId: a.string(),
        coachName: a.string(),
        sessionType: a.string(),
        date: a.date().required(),
        time: a.string(),
        status: a.ref("AppointmentStatus"),
        notes: a.string(),
      })
      .secondaryIndexes((index) => [index("athleteId"), index("coachId")])
      .authorization((allow) => [
        allow
          .ownerDefinedIn("athleteId").identityClaim("sub")
          .to(["read", "create", "update", "delete"]),
        allow.group("COACHES"),
        allow.group("ADMINS"),
      ]),

    Workout: a
      .model({
        userId: a.string().required(),
        user: a.belongsTo("UserProfile", "userId"),
        date: a.date().required(),
        type: a.ref("Discipline"),
        name: a.string().required(),
        durationSec: a.integer(),
        calories: a.integer(),
        notes: a.string(),
      })
      .secondaryIndexes((index) => [index("userId")])
      .authorization((allow) => [
        allow
          .ownerDefinedIn("userId").identityClaim("sub")
          .to(["read", "create", "update", "delete"]),
        allow.group("COACHES"),
        allow.group("ADMINS"),
      ]),

    BodyMetric: a
      .model({
        userId: a.string().required(),
        user: a.belongsTo("UserProfile", "userId"),
        date: a.date().required(),
        weightKg: a.float(),
        musclePct: a.float(),
        fatPct: a.float(),
      })
      .secondaryIndexes((index) => [index("userId")])
      .authorization((allow) => [
        allow
          .ownerDefinedIn("userId").identityClaim("sub")
          .to(["read", "create", "update", "delete"]),
        allow.group("COACHES"),
        allow.group("ADMINS"),
      ]),

    /**
     * Generic time series behind the dashboard charts: one row per
     * (metric, date). Keeping it generic means a new chart series is data, not
     * a schema migration.
     */
    ProgressEntry: a
      .model({
        userId: a.string().required(),
        user: a.belongsTo("UserProfile", "userId"),
        discipline: a.ref("Discipline"),
        /** e.g. "squat", "pullups", "skiErg", "muscleUpLevel" */
        metric: a.string().required(),
        value: a.float().required(),
        unit: a.string(),
        target: a.float(),
        date: a.date().required(),
      })
      .secondaryIndexes((index) => [index("userId")])
      .authorization((allow) => [
        allow
          .ownerDefinedIn("userId").identityClaim("sub")
          .to(["read", "create", "update", "delete"]),
        allow.group("COACHES"),
        allow.group("ADMINS"),
      ]),

    ClassSession: a
      .model({
        name: a.string().required(),
        date: a.date().required(),
        time: a.string(),
        discipline: a.ref("Discipline"),
        coachId: a.string(),
        coachName: a.string(),
        capacity: a.integer(),
        enrolled: a.integer(),
        status: a.ref("SessionStatus"),
        published: a.boolean(),
      })
      .secondaryIndexes((index) => [index("date")])
      .authorization((allow) => [
        allow.guest().to(["read"]),
        allow.authenticated().to(["read"]),
        allow.group("COACHES").to(["read", "update"]),
        allow.group("ADMINS"),
      ]),

    Achievement: a
      .model({
        code: a.string().required(),
        name: a.string().required(),
        description: a.string(),
        icon: a.string(),
        order: a.integer(),
      })
      .authorization((allow) => [
        allow.guest().to(["read"]),
        allow.authenticated().to(["read"]),
        allow.group("ADMINS"),
      ]),

    UserAchievement: a
      .model({
        userId: a.string().required(),
        achievementCode: a.string().required(),
        unlockedAt: a.date(),
      })
      .secondaryIndexes((index) => [index("userId")])
      .authorization((allow) => [
        allow.ownerDefinedIn("userId").identityClaim("sub").to(["read"]),
        allow.group("COACHES").to(["read"]),
        allow.group("ADMINS"),
      ]),

    /** Editable singletons: contact details, hero stats, social links. */
    SiteSetting: a
      .model({
        key: a.string().required(),
        value: a.json(),
      })
      .identifier(["key"])
      .authorization((allow) => [
        allow.guest().to(["read"]),
        allow.authenticated().to(["read"]),
        allow.group("ADMINS"),
      ]),

    // ---- Admin-only Cognito operations -------------------------------------

    setUserRole: a
      .mutation()
      .arguments({
        userId: a.string().required(),
        role: a.string().required(),
      })
      .returns(a.json())
      .authorization((allow) => [allow.group("ADMINS")])
      .handler(a.handler.function(userAdmin)),

    setUserEnabled: a
      .mutation()
      .arguments({
        userId: a.string().required(),
        enabled: a.boolean().required(),
      })
      .returns(a.json())
      .authorization((allow) => [allow.group("ADMINS")])
      .handler(a.handler.function(userAdmin)),

    listCognitoUsers: a
      .query()
      .returns(a.json())
      .authorization((allow) => [allow.group("ADMINS")])
      .handler(a.handler.function(userAdmin)),
  })
  .authorization((allow) => [allow.resource(userAdmin)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
