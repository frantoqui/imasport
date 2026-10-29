/**
 * Seeds an IMASPORT backend and bootstraps the first administrator.
 *
 * Works against any environment — the sandbox or production — because it reads
 * whatever `amplify_outputs.json` currently points at. Every write is
 * idempotent (matched on a natural key), so it is safe to re-run.
 *
 *   npx tsx scripts/seed.ts
 *
 * Credentials come from the environment, with dev-only defaults:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 *   SEED_DEMO=1   also creates demo coach/athlete accounts with sample data
 *
 * Requires AWS credentials with Cognito admin permissions for the user pool in
 * `amplify_outputs.json` (the same credentials that deployed the backend).
 */
import { readFileSync } from "node:fs";
import { Amplify } from "aws-amplify";
import { signIn, signOut } from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { generateClient } from "aws-amplify/data";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../amplify/data/resource";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const outputs = JSON.parse(readFileSync("amplify_outputs.json", "utf8"));

if (!outputs?.auth?.user_pool_id) {
  throw new Error(
    "amplify_outputs.json has no auth config. Deploy the backend first " +
      "(npx ampx sandbox) and re-run."
  );
}

const USER_POOL_ID: string = outputs.auth.user_pool_id;
const REGION: string = outputs.auth.aws_region ?? "us-east-1";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@imasport.mx";
const WITH_DEMO = process.env.SEED_DEMO === "1";

/**
 * Generates a password that satisfies the Cognito policy (8+ chars with upper,
 * lower, digit and symbol). Used when none is supplied, so this script never
 * needs a password committed to the repository.
 */
function generatePassword(): string {
  const pick = (set: string, n: number) =>
    Array.from(
      { length: n },
      () => set[Math.floor(Math.random() * set.length)]
    ).join("");
  return (
    pick("ABCDEFGHJKLMNPQRSTUVWXYZ", 4) +
    pick("abcdefghijkmnopqrstuvwxyz", 6) +
    pick("23456789", 3) +
    pick("!@#$%&*?", 2)
  );
}

/** A generated password must be reported, or the account is unusable. */
const ADMIN_PASSWORD_GENERATED = !process.env.SEED_ADMIN_PASSWORD;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? generatePassword();

const cognito = new CognitoIdentityProviderClient({ region: REGION });

/**
 * Amplify defaults to browser storage for tokens, which does not exist in
 * Node. An in-memory store is all a one-shot script needs.
 */
class MemoryStorage {
  private store = new Map<string, string>();
  async setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  async getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  async removeItem(key: string) {
    this.store.delete(key);
  }
  async clear() {
    this.store.clear();
  }
}

Amplify.configure(outputs);
cognitoUserPoolsTokenProvider.setKeyValueStorage(new MemoryStorage());

const client = generateClient<Schema>({ authMode: "userPool" });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const log = (...args: unknown[]) => console.log(...args);

/** Fails loudly: a half-seeded database is worse than none. */
function check(label: string, result: { errors?: readonly { message: string }[] }) {
  if (result.errors?.length) {
    throw new Error(`${label}: ${result.errors.map((e) => e.message).join("; ")}`);
  }
}

type CognitoUser = { sub: string; created: boolean };

/**
 * Creates a confirmed Cognito user with a permanent password and puts them in
 * `group`. Returns the existing user's sub when the account is already there.
 */
async function ensureCognitoUser(
  email: string,
  password: string,
  name: string,
  group: "ADMINS" | "COACHES" | "ATHLETES"
): Promise<CognitoUser> {
  let created = false;

  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        // No invitation mail: we set a known password immediately below.
        MessageAction: "SUPPRESS",
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: name },
        ],
      })
    );
    created = true;
  } catch (error) {
    if (!(error instanceof UsernameExistsException)) throw error;
  }

  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true,
    })
  );

  // The post-confirmation trigger never fires for an admin-created user, so
  // group membership has to be set explicitly here.
  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      GroupName: group,
    })
  );

  const detail = await cognito.send(
    new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email })
  );
  const sub = detail.UserAttributes?.find((a) => a.Name === "sub")?.Value;
  if (!sub) throw new Error(`Could not read sub for ${email}`);

  log(`  ${created ? "created" : "exists "}  ${email}  (${group})`);
  return { sub, created };
}

/** Today, and a date `days` from now, as YYYY-MM-DD. */
function day(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Seed content — mirrors the original mockup so the site looks complete
// ---------------------------------------------------------------------------

const PLANS = [
  {
    tier: "basic" as const,
    name: "Básico",
    nameEn: "Basic",
    priceMxn: 899,
    order: 1,
    popular: false,
    features: [
      "Acceso a clases grupales",
      "Evaluación inicial",
      "Acceso a la app",
      "Horario matutino",
    ],
    featuresEn: [
      "Group class access",
      "Initial assessment",
      "App access",
      "Morning schedule",
    ],
  },
  {
    tier: "pro" as const,
    name: "Pro",
    nameEn: "Pro",
    priceMxn: 1299,
    order: 2,
    popular: true,
    features: [
      "Acceso ilimitado a clases",
      "Evaluación mensual con coach",
      "Plan de nutrición básico",
      "Analíticas de progreso",
      "Acceso a eventos del gym",
    ],
    featuresEn: [
      "Unlimited class access",
      "Monthly coach assessment",
      "Basic nutrition plan",
      "Progress analytics",
      "Gym event access",
    ],
  },
  {
    tier: "elite" as const,
    name: "Elite",
    nameEn: "Elite",
    priceMxn: 1799,
    order: 3,
    popular: false,
    features: [
      "Todo lo del plan Pro",
      "2 sesiones personales al mes",
      "Plan de nutrición personalizado",
      "Preparación para competencias",
      "Acceso prioritario a eventos",
      "Seguimiento semanal",
    ],
    featuresEn: [
      "Everything in Pro",
      "2 personal sessions monthly",
      "Custom nutrition plan",
      "Competition preparation",
      "Priority event access",
      "Weekly follow-up",
    ],
  },
];

const COACHES = [
  {
    name: "Carlos Méndez",
    discipline: "CrossFit" as const,
    certifications: "CrossFit Level 2, Weightlifting",
    specialty: "Fuerza",
    yearsExperience: 8,
    bio: "Especialista en halterofilia y desarrollo de fuerza. Ha preparado atletas para competencias regionales de CrossFit.",
    imageUrl:
      "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400&q=80",
    order: 1,
  },
  {
    name: "Ana Rodríguez",
    discipline: "Hyrox" as const,
    certifications: "Hyrox Master Trainer, CrossFit L1",
    specialty: "Resistencia",
    yearsExperience: 6,
    bio: "Atleta Hyrox con múltiples participaciones internacionales. Enfocada en acondicionamiento metabólico.",
    imageUrl:
      "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&q=80",
    order: 2,
  },
  {
    name: "Miguel Torres",
    discipline: "Calistenia" as const,
    certifications: "Calistenia Avanzada, Movilidad",
    specialty: "Técnica",
    yearsExperience: 7,
    bio: "Referente de calistenia en Morelia. Especialista en progresiones de habilidades y control corporal.",
    imageUrl:
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80",
    order: 3,
  },
  {
    name: "Laura Vega",
    discipline: "CrossFit" as const,
    certifications: "CrossFit Level 1, Nutrición Deportiva",
    specialty: "Competencia",
    yearsExperience: 5,
    bio: "Coach de CrossFit y nutrición deportiva, enfocada en atletas que compiten por primera vez.",
    imageUrl:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80",
    order: 4,
  },
];

const FAQS = [
  {
    question: "¿Necesito experiencia previa para entrenar?",
    answer:
      "No. Todos nuestros programas se adaptan a tu nivel. En tu primera sesión hacemos una evaluación y el coach ajusta las cargas y los movimientos a lo que puedas hacer hoy.",
    questionEn: "Do I need previous experience to train?",
    answerEn:
      "No. Every program scales to your level. On your first session we run an assessment and your coach adapts the loads and movements to what you can do today.",
    order: 1,
  },
  {
    question: "¿Qué es Hyrox?",
    answer:
      "Hyrox es una competencia de fitness que combina 8 kilómetros de carrera con 8 estaciones funcionales (SkiErg, trineo, burpees, remo, farmers carry, lunges y wall balls). Entrenamos específicamente para ese formato.",
    questionEn: "What is Hyrox?",
    answerEn:
      "Hyrox is a fitness race combining 8 km of running with 8 functional stations (SkiErg, sled push and pull, burpees, rowing, farmers carry, lunges and wall balls). We train specifically for that format.",
    order: 2,
  },
  {
    question: "¿Puedo tomar una clase de prueba?",
    answer:
      "Sí. Ofrecemos una clase de prueba gratuita para que conozcas las instalaciones y el estilo de entrenamiento. Escríbenos para agendarla.",
    questionEn: "Can I take a trial class?",
    answerEn:
      "Yes. We offer a free trial class so you can see the facilities and our coaching style. Message us to book it.",
    order: 3,
  },
  {
    question: "¿Cuáles son los horarios?",
    answer:
      "Abrimos de lunes a viernes de 6:00 AM a 10:00 PM y sábados de 8:00 AM a 2:00 PM. Las clases grupales salen cada hora en los bloques de mayor demanda.",
    questionEn: "What are your opening hours?",
    answerEn:
      "We are open Monday to Friday from 6:00 AM to 10:00 PM, and Saturdays from 8:00 AM to 2:00 PM. Group classes run hourly during peak blocks.",
    order: 4,
  },
];

const EVENTS = [
  {
    title: "Hyrox Open Morelia 2025",
    slug: "hyrox-open-morelia-2025",
    description:
      "Nuestra competencia Hyrox abierta a todos los niveles. Categorías individual y dobles, con el formato oficial de 8 kilómetros y 8 estaciones.",
    date: day(21),
    time: "8:00 AM",
    location: "IMASPORT Morelia",
    category: "Hyrox" as const,
    spots: 80,
    priceMxn: 650,
    featured: true,
    imageUrl:
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&q=80",
  },
  {
    title: "Throwdown de CrossFit",
    slug: "throwdown-crossfit",
    description:
      "Competencia interna por equipos de tres. Tres WODs a lo largo del día y premiación para las categorías Scaled y RX.",
    date: day(35),
    time: "9:00 AM",
    location: "IMASPORT Morelia",
    category: "CrossFit" as const,
    spots: 60,
    priceMxn: 450,
    featured: false,
    imageUrl:
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1200&q=80",
  },
  {
    title: "Taller de Calistenia: Muscle-Up",
    slug: "taller-calistenia-muscle-up",
    description:
      "Taller intensivo de cuatro horas dedicado a las progresiones del muscle-up: fuerza de jalón, transición y dip.",
    date: day(12),
    time: "10:00 AM",
    location: "IMASPORT Morelia",
    category: "Calistenia" as const,
    spots: 25,
    priceMxn: 350,
    featured: false,
    imageUrl:
      "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=1200&q=80",
  },
  {
    title: "Simulación Hyrox por Equipos",
    slug: "simulacion-hyrox-equipos",
    description:
      "Simulación completa en formato dobles para medir tiempos antes de la competencia oficial. Incluye análisis de estaciones con el coach.",
    date: day(7),
    time: "7:00 AM",
    location: "IMASPORT Morelia",
    category: "Hyrox" as const,
    spots: 40,
    priceMxn: 200,
    featured: false,
    imageUrl:
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&q=80",
  },
  {
    title: "Clínica de Halterofilia",
    slug: "clinica-halterofilia",
    description:
      "Sesión técnica de snatch y clean & jerk con video análisis. Dirigida a atletas que ya dominan la sentadilla frontal.",
    date: day(-14),
    time: "11:00 AM",
    location: "IMASPORT Morelia",
    category: "CrossFit" as const,
    spots: 20,
    priceMxn: 400,
    featured: false,
    imageUrl:
      "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1200&q=80",
  },
];

const ACHIEVEMENTS = [
  { code: "first-week", name: "Primera Semana", description: "Completaste tu primera semana de entrenamiento", icon: "Flame", order: 1 },
  { code: "squat-pr", name: "PR de Sentadilla", description: "Superaste tu récord personal en back squat", icon: "TrendingUp", order: 2 },
  { code: "hyrox-ready", name: "Hyrox Ready", description: "Completaste una simulación Hyrox completa", icon: "Timer", order: 3 },
  { code: "streak-30", name: "Racha de 30 Días", description: "Entrenaste 30 días consecutivos", icon: "Zap", order: 4 },
  { code: "first-muscleup", name: "Primer Muscle-Up", description: "Lograste tu primer muscle-up", icon: "Award", order: 5 },
];

/**
 * Gallery albums. Photo `key`s here are absolute Unsplash URLs on purpose:
 * `mediaUrl()` passes absolute URLs straight through, so the gallery looks
 * populated without needing real objects in S3. Admin uploads produce real
 * S3 keys instead.
 */
const ALBUMS = [
  {
    title: "Hyrox Open 2024",
    slug: "hyrox-open-2024",
    description: "Lo mejor de nuestra primera competencia Hyrox abierta.",
    visibility: "PUBLIC" as const,
    order: 1,
    photos: [
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&q=80",
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&q=80",
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80",
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
    ],
  },
  {
    title: "Vida en el Box",
    slug: "vida-en-el-box",
    description: "Entrenamientos, comunidad y día a día en IMASPORT.",
    visibility: "PUBLIC" as const,
    order: 2,
    photos: [
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1200&q=80",
      "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=1200&q=80",
      "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1200&q=80",
    ],
  },
  {
    title: "Throwdown Interno",
    slug: "throwdown-interno",
    description: "Galería exclusiva para miembros de IMASPORT.",
    visibility: "MEMBERS" as const,
    order: 3,
    photos: [
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&q=80",
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80",
    ],
  },
];

const SITE_SETTINGS: Array<{ key: string; value: Record<string, unknown> }> = [
  {
    key: "contact",
    value: {
      phone: "+52 443 123 4567",
      email: "info@imasports.mx",
      address: "Morelia, Michoacán, México",
      instagram: "https://www.instagram.com/imasportsmx/",
      facebook: "",
    },
  },
  {
    key: "heroStats",
    value: { athletes: "500+", coaches: "15+", disciplines: "3" },
  },
  { key: "hero", value: { badge: "Hyrox & CrossFit Affiliate" } },
];

// ---------------------------------------------------------------------------
// Idempotent upserts
// ---------------------------------------------------------------------------

async function seedPlans() {
  const existing = await client.models.Plan.list();
  check("list Plan", existing);

  for (const plan of PLANS) {
    const match = existing.data.find((p) => p.tier === plan.tier);
    const payload = { ...plan, active: true };
    if (match) {
      check("update Plan", await client.models.Plan.update({ id: match.id, ...payload }));
    } else {
      check("create Plan", await client.models.Plan.create(payload));
    }
  }
  log(`  ${PLANS.length} planes`);
}

async function seedCoaches() {
  const existing = await client.models.CoachProfile.list();
  check("list CoachProfile", existing);

  for (const coach of COACHES) {
    const match = existing.data.find((c) => c.name === coach.name);
    const payload = {
      ...coach,
      instagram: "https://www.instagram.com/imasportsmx/",
      published: true,
    };
    if (match) {
      check("update CoachProfile", await client.models.CoachProfile.update({ id: match.id, ...payload }));
    } else {
      check("create CoachProfile", await client.models.CoachProfile.create(payload));
    }
  }
  log(`  ${COACHES.length} coaches`);
}

async function seedFaqs() {
  const existing = await client.models.Faq.list();
  check("list Faq", existing);

  for (const faq of FAQS) {
    const match = existing.data.find((f) => f.question === faq.question);
    const payload = { ...faq, published: true };
    if (match) {
      check("update Faq", await client.models.Faq.update({ id: match.id, ...payload }));
    } else {
      check("create Faq", await client.models.Faq.create(payload));
    }
  }
  log(`  ${FAQS.length} preguntas frecuentes`);
}

async function seedEvents() {
  const existing = await client.models.Event.list();
  check("list Event", existing);

  for (const event of EVENTS) {
    const match = existing.data.find((e) => e.slug === event.slug);
    const payload = { ...event, published: true, spotsTaken: match?.spotsTaken ?? 0 };
    if (match) {
      check("update Event", await client.models.Event.update({ id: match.id, ...payload }));
    } else {
      check("create Event", await client.models.Event.create(payload));
    }
  }
  log(`  ${EVENTS.length} eventos`);
}

async function seedAchievements() {
  const existing = await client.models.Achievement.list();
  check("list Achievement", existing);

  for (const achievement of ACHIEVEMENTS) {
    const match = existing.data.find((a) => a.code === achievement.code);
    if (match) {
      check("update Achievement", await client.models.Achievement.update({ id: match.id, ...achievement }));
    } else {
      check("create Achievement", await client.models.Achievement.create(achievement));
    }
  }
  log(`  ${ACHIEVEMENTS.length} logros`);
}

async function seedAlbums() {
  const existingAlbums = await client.models.Album.list();
  check("list Album", existingAlbums);

  let photoCount = 0;

  for (const album of ALBUMS) {
    const { photos, ...albumFields } = album;
    const payload = { ...albumFields, published: true, coverKey: photos[0] };
    const match = existingAlbums.data.find((a) => a.slug === album.slug);

    let record = match;
    if (record) {
      check(
        "update Album",
        await client.models.Album.update({ id: record.id, ...payload })
      );
    } else {
      const created = await client.models.Album.create(payload);
      check("create Album", created);
      record = created.data!;
    }

    const existingPhotos = await client.models.Photo.list({
      filter: { albumId: { eq: record.id } },
    });
    check("list Photo", existingPhotos);

    for (const [index, key] of photos.entries()) {
      if (existingPhotos.data.some((p) => p.key === key)) continue;
      check(
        "create Photo",
        await client.models.Photo.create({
          albumId: record.id,
          key,
          order: index + 1,
          caption: null,
        })
      );
      photoCount += 1;
    }
  }

  log(`  ${ALBUMS.length} álbumes, ${photoCount} fotos nuevas`);
}

async function seedSiteSettings() {
  for (const setting of SITE_SETTINGS) {
    // `a.json()` is the AppSync AWSJSON scalar, which takes a JSON *string* as
    // a variable — passing a raw object is rejected as an invalid value.
    const payload = { key: setting.key, value: JSON.stringify(setting.value) };
    const existing = await client.models.SiteSetting.get({ key: setting.key });
    if (existing.data) {
      check("update SiteSetting", await client.models.SiteSetting.update(payload));
    } else {
      check("create SiteSetting", await client.models.SiteSetting.create(payload));
    }
  }
  log(`  ${SITE_SETTINGS.length} ajustes de sitio`);
}

// ---------------------------------------------------------------------------
// Demo accounts and sample athlete history (SEED_DEMO=1)
// ---------------------------------------------------------------------------

/**
 * The `ProgressEntry.metric` vocabulary the dashboard charts read.
 * Must stay in step with `components/member/metrics.ts`, which is the
 * authoritative list — an unknown key is ignored by the charts.
 */
const DEMO_EMAIL_COACH = "coach@imasport.mx";
const DEMO_EMAIL_ATHLETE = "atleta@imasport.mx";
const DEMO_PASSWORD_GENERATED = !process.env.SEED_DEMO_PASSWORD;
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? generatePassword();

/** `months` ago, on the 15th, as YYYY-MM-DD. */
function monthsAgo(months: number): string {
  const d = new Date();
  d.setDate(15);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

/** Monday of the current week, plus `offset` days. */
function thisWeek(offset: number): string {
  const d = new Date();
  const monday = d.getDate() - ((d.getDay() + 6) % 7);
  d.setDate(monday + offset);
  return d.toISOString().slice(0, 10);
}

type ProgressSeed = {
  metric: string;
  unit: string;
  /** One value per month, oldest first. */
  values: number[];
  target?: number;
};

function rampSeries(
  discipline: "CrossFit" | "Hyrox" | "Calistenia",
  userId: string,
  seeds: ProgressSeed[]
) {
  const rows: Array<Record<string, unknown>> = [];
  for (const seed of seeds) {
    seed.values.forEach((value, index) => {
      rows.push({
        userId,
        discipline,
        metric: seed.metric,
        value,
        unit: seed.unit,
        target: seed.target,
        date: monthsAgo(seed.values.length - 1 - index),
      });
    });
  }
  return rows;
}

/** A single-point series, used for radars and current skill levels. */
function snapshot(
  discipline: "CrossFit" | "Hyrox" | "Calistenia",
  userId: string,
  unit: string,
  entries: Record<string, number>
) {
  return Object.entries(entries).map(([metric, value]) => ({
    userId,
    discipline,
    metric,
    value,
    unit,
    date: monthsAgo(0),
  }));
}

async function seedDemo() {
  log("\nCuentas demo:");
  const coach = await ensureCognitoUser(
    DEMO_EMAIL_COACH,
    DEMO_PASSWORD,
    "Ana Rodríguez",
    "COACHES"
  );
  const athlete = await ensureCognitoUser(
    DEMO_EMAIL_ATHLETE,
    DEMO_PASSWORD,
    "Carlos Hernández",
    "ATHLETES"
  );

  // Profiles. Admins may write any profile, so the seed can create these
  // without signing in as each user.
  const coachProfile = await client.models.UserProfile.get({
    userId: coach.sub,
  });
  const coachFields = {
    userId: coach.sub,
    email: DEMO_EMAIL_COACH,
    name: "Ana Rodríguez",
    role: "COACH" as const,
    discipline: "Hyrox" as const,
    coachStatus: "APPROVED" as const,
    certifications: "Hyrox Master Trainer, CrossFit L1",
    specialty: "Resistencia",
    yearsExperience: 6,
    memberSince: monthsAgo(18),
    isActive: true,
  };
  check(
    "demo coach profile",
    coachProfile.data
      ? await client.models.UserProfile.update(coachFields)
      : await client.models.UserProfile.create(coachFields)
  );

  const athleteProfile = await client.models.UserProfile.get({
    userId: athlete.sub,
  });
  const athleteFields = {
    userId: athlete.sub,
    email: DEMO_EMAIL_ATHLETE,
    name: "Carlos Hernández",
    role: "ATHLETE" as const,
    discipline: "CrossFit" as const,
    planTier: "pro" as const,
    planStatus: "ACTIVE" as const,
    memberSince: monthsAgo(9),
    age: 28,
    weightKg: 76,
    heightCm: 175,
    bodyFatPct: 15.8,
    goals: ["Mejorar resistencia", "Competir en Hyrox"],
    coachStatus: "NONE" as const,
    notifyClasses: true,
    notifyWorkouts: true,
    notifyWeekly: false,
    isActive: true,
  };
  check(
    "demo athlete profile",
    athleteProfile.data
      ? await client.models.UserProfile.update(athleteFields)
      : await client.models.UserProfile.create(athleteFields)
  );

  // Link the public coach card to the real coach account.
  const card = (
    await client.models.CoachProfile.list({
      filter: { name: { eq: "Ana Rodríguez" } },
      limit: 1,
    })
  ).data[0];
  if (card && card.userId !== coach.sub) {
    check(
      "link coach card",
      await client.models.CoachProfile.update({
        id: card.id,
        userId: coach.sub,
      })
    );
  }

  // Progress history is only seeded once; re-runs leave it alone so a demo
  // session's own entries are not buried under fresh sample data.
  const existingProgress = await client.models.ProgressEntry.list({
    filter: { userId: { eq: athlete.sub } },
    limit: 1,
  });
  if (existingProgress.data.length) {
    log("  historial ya existe, se conserva");
    return;
  }

  const progress = [
    ...rampSeries("CrossFit", athlete.sub, [
      { metric: "squat", unit: "kg", values: [95, 100, 105, 110, 115, 120] },
      { metric: "deadlift", unit: "kg", values: [120, 128, 135, 142, 148, 155] },
      { metric: "clean", unit: "kg", values: [70, 73, 76, 80, 83, 86] },
      { metric: "snatch", unit: "kg", values: [52, 55, 57, 60, 62, 65] },
      // Benchmark WODs are times: lower is better.
      { metric: "wodFran", unit: "s", values: [420, 400, 385, 370, 358, 342] },
      {
        metric: "wodMurph",
        unit: "s",
        values: [3300, 3240, 3180, 3100, 3040, 2960],
      },
      { metric: "wodGrace", unit: "s", values: [210, 202, 195, 188, 181, 174] },
    ]),
    ...snapshot("CrossFit", athlete.sub, "score", {
      strength: 78,
      gymnastics: 65,
      cardio: 82,
      weightlifting: 72,
      mobility: 60,
      power: 75,
    }),
    ...rampSeries("Hyrox", athlete.sub, [
      { metric: "skiErg", unit: "min", values: [4.8, 4.6, 4.5, 4.3, 4.2, 4.1], target: 4.0 },
      { metric: "sledPush", unit: "min", values: [3.6, 3.4, 3.3, 3.1, 3.0, 2.9], target: 2.8 },
      { metric: "sledPull", unit: "min", values: [4.4, 4.2, 4.1, 3.9, 3.8, 3.7], target: 3.5 },
      { metric: "burpees", unit: "min", values: [5.2, 5.0, 4.8, 4.6, 4.5, 4.3], target: 4.0 },
      { metric: "row", unit: "min", values: [4.6, 4.5, 4.4, 4.2, 4.1, 4.0], target: 3.9 },
      { metric: "farmers", unit: "min", values: [2.8, 2.7, 2.6, 2.5, 2.4, 2.3], target: 2.2 },
      { metric: "lunges", unit: "min", values: [5.0, 4.9, 4.7, 4.6, 4.4, 4.3], target: 4.1 },
      { metric: "wallBalls", unit: "min", values: [6.2, 6.0, 5.8, 5.6, 5.4, 5.2], target: 5.0 },
      { metric: "raceRunning", unit: "min", values: [44, 43, 42, 41, 40, 39] },
      { metric: "raceStations", unit: "min", values: [38, 37, 36, 35, 34, 33] },
    ]),
    ...snapshot("Hyrox", athlete.sub, "score", {
      running: 80,
      skiErgScore: 70,
      sledScore: 66,
      burpeesScore: 74,
      rowScore: 78,
      wallBallsScore: 68,
    }),
    ...rampSeries("Calistenia", athlete.sub, [
      { metric: "pullups", unit: "reps", values: [12, 14, 15, 17, 18, 20] },
      { metric: "dips", unit: "reps", values: [18, 20, 22, 24, 26, 28] },
      { metric: "hspu", unit: "reps", values: [3, 4, 5, 6, 7, 8] },
      { metric: "muscleup", unit: "reps", values: [0, 1, 1, 2, 3, 4] },
    ]),
    ...snapshot("Calistenia", athlete.sub, "score", {
      push: 72,
      pull: 76,
      core: 68,
      legs: 64,
      skills: 58,
      holds: 55,
    }),
    ...snapshot("Calistenia", athlete.sub, "nivel", {
      muscleUpLevel: 3,
      handstandPushupLevel: 2,
      frontLeverLevel: 2,
      planacheLevel: 1,
    }),
  ];

  for (const row of progress) {
    check(
      "create ProgressEntry",
      await client.models.ProgressEntry.create(
        row as Parameters<typeof client.models.ProgressEntry.create>[0]
      )
    );
  }
  log(`  ${progress.length} registros de progreso`);

  // Body composition over the last six weeks.
  const body = [
    { musclePct: 38.2, fatPct: 18.4, weightKg: 79 },
    { musclePct: 38.8, fatPct: 17.9, weightKg: 78.4 },
    { musclePct: 39.4, fatPct: 17.2, weightKg: 78 },
    { musclePct: 40.1, fatPct: 16.6, weightKg: 77.3 },
    { musclePct: 40.6, fatPct: 16.1, weightKg: 76.6 },
    { musclePct: 41.2, fatPct: 15.8, weightKg: 76 },
  ];
  for (const [index, entry] of body.entries()) {
    check(
      "create BodyMetric",
      await client.models.BodyMetric.create({
        userId: athlete.sub,
        date: thisWeek(-7 * (body.length - 1 - index)),
        ...entry,
      })
    );
  }
  log(`  ${body.length} mediciones corporales`);

  // Workouts in the current Mon–Sun week, so the weekly calories chart and
  // the "sessions this month" stat are non-zero.
  const workouts = [
    { offset: 0, name: "Back Squat + Metcon", type: "CrossFit" as const, durationSec: 3600, calories: 620 },
    { offset: 1, name: "Hyrox Engine", type: "Hyrox" as const, durationSec: 3300, calories: 710 },
    { offset: 2, name: "Skills & Holds", type: "Calistenia" as const, durationSec: 2700, calories: 410 },
    { offset: 3, name: "Murph", type: "CrossFit" as const, durationSec: 2535, calories: 840 },
    { offset: 4, name: "Simulación por estaciones", type: "Hyrox" as const, durationSec: 3900, calories: 760 },
  ];
  for (const workout of workouts) {
    const { offset, ...fields } = workout;
    check(
      "create Workout",
      await client.models.Workout.create({
        userId: athlete.sub,
        date: thisWeek(offset),
        ...fields,
      })
    );
  }
  log(`  ${workouts.length} entrenamientos de esta semana`);

  // A couple of coach evaluations so the athlete has history to read.
  for (const [index, date] of [monthsAgo(1), monthsAgo(0)].entries()) {
    check(
      "create Evaluation",
      await client.models.Evaluation.create({
        athleteId: athlete.sub,
        coachId: coach.sub,
        coachName: "Ana Rodríguez",
        date,
        discipline: "CrossFit",
        performance: 8 + index,
        technique: 7 + index,
        effort: 9,
        notes:
          index === 0
            ? "Buena progresión en sentadilla. Trabajar movilidad de tobillo."
            : "Excelente mes. Listo para subir cargas en clean.",
        metrics: JSON.stringify({ squat: 115 + index * 5, deadlift: 148 + index * 7 }),
      })
    );
  }

  // Unlock the first two achievements.
  const achievements = await client.models.Achievement.list();
  for (const code of ["first-week", "squat-pr"]) {
    const match = achievements.data.find((a) => a.code === code);
    if (!match) continue;
    const existing = await client.models.UserAchievement.list({
      filter: { userId: { eq: athlete.sub }, achievementCode: { eq: code } },
      limit: 1,
    });
    if (existing.data.length) continue;
    check(
      "create UserAchievement",
      await client.models.UserAchievement.create({
        userId: athlete.sub,
        achievementCode: code,
        unlockedAt: monthsAgo(0),
      })
    );
  }

  // Classes for today so the coach panel and "next class" are populated.
  const todaysClasses = [
    { name: "CrossFit Strength", time: "9:00 AM", discipline: "CrossFit" as const, status: "completed" as const },
    { name: "Hyrox Engine", time: "6:00 PM", discipline: "Hyrox" as const, status: "upcoming" as const },
    { name: "Calistenia Skills", time: "8:00 PM", discipline: "Calistenia" as const, status: "upcoming" as const },
  ];
  const existingClasses = await client.models.ClassSession.list({
    filter: { date: { eq: day(0) } },
  });
  for (const session of todaysClasses) {
    if (existingClasses.data.some((c) => c.name === session.name)) continue;
    check(
      "create ClassSession",
      await client.models.ClassSession.create({
        ...session,
        date: day(0),
        coachId: coach.sub,
        coachName: "Ana Rodríguez",
        capacity: 20,
        enrolled: 12,
        published: true,
      })
    );
  }
  log(`  ${todaysClasses.length} clases de hoy`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log("\nIMASPORT seed");
  log(`  pool    ${USER_POOL_ID}`);
  log(`  region  ${REGION}\n`);

  log("Cuentas:");
  const admin = await ensureCognitoUser(
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    "Administrador IMASPORT",
    "ADMINS"
  );

  // Signing in as the admin means every write below is authorized by the same
  // AppSync rules the real app uses — the seed cannot create data the admin
  // role would not be allowed to create.
  await signOut().catch(() => {});
  const signedIn = await signIn({
    username: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (!signedIn.isSignedIn) {
    throw new Error(
      `Admin sign-in did not complete: ${signedIn.nextStep.signInStep}`
    );
  }

  check(
    "admin profile",
    await client.models.UserProfile.get({ userId: admin.sub }).then(async (r) =>
      r.data
        ? await client.models.UserProfile.update({
            userId: admin.sub,
            role: "ADMIN",
          })
        : await client.models.UserProfile.create({
            userId: admin.sub,
            email: ADMIN_EMAIL,
            name: "Administrador IMASPORT",
            role: "ADMIN",
            memberSince: day(0),
            coachStatus: "NONE",
            isActive: true,
          })
    )
  );

  log("\nContenido:");
  await seedPlans();
  await seedCoaches();
  await seedFaqs();
  await seedEvents();
  await seedAchievements();
  await seedAlbums();
  await seedSiteSettings();

  if (WITH_DEMO) await seedDemo();

  log("\nListo.\n");
  log("Entra con:");
  log(
    `  ${ADMIN_EMAIL}  (admin)` +
      (ADMIN_PASSWORD_GENERATED
        ? `\n    contraseña generada: ${ADMIN_PASSWORD}` +
          "\n    Anótala: no se vuelve a mostrar. Defínela tú con SEED_ADMIN_PASSWORD."
        : "\n    contraseña: la de SEED_ADMIN_PASSWORD")
  );
  if (WITH_DEMO) {
    log(`  ${DEMO_EMAIL_COACH}  (coach)`);
    log(`  ${DEMO_EMAIL_ATHLETE}  (atleta, con historial)`);
    log(
      DEMO_PASSWORD_GENERATED
        ? `    contraseña generada para ambas: ${DEMO_PASSWORD}`
        : "    contraseña: la de SEED_DEMO_PASSWORD"
    );
  } else {
    log("\n(SEED_DEMO=1 para crear además cuentas demo de coach y atleta)");
  }
  log("");

  await signOut().catch(() => {});
}

main().catch((error) => {
  console.error("\nSeed failed:\n", error);
  process.exit(1);
});
