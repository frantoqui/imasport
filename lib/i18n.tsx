"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Locale = "es" | "en";

const translations = {
  es: {
    nav: {
      home: "Inicio",
      services: "Servicios",
      plans: "Planes",
      coaches: "Coaches",
      events: "Eventos",
      contact: "Contacto",
      login: "Iniciar Sesión",
      register: "Registrarse",
      dashboard: "Mi Panel",
      profile: "Mi Perfil",
      logout: "Cerrar Sesión",
    },
    hero: {
      title: "ENTRENA COMO ATLETA",
      subtitle: "CrossFit | Hyrox | Calistenia",
      description:
        "Somos la comunidad de atletas más completa de Morelia. Entrena con metodologías de clase mundial y alcanza tu máximo potencial.",
      cta: "Comienza Ahora",
      ctaSecondary: "Ver Planes",
    },
    services: {
      title: "Nuestros Programas",
      subtitle: "Tres disciplinas, un objetivo: tu mejor versión",
      crossfit: {
        name: "CrossFit",
        description:
          "Entrenamiento funcional de alta intensidad que combina gimnasia, halterofilia y cardio para desarrollar una condición física completa.",
      },
      hyrox: {
        name: "Hyrox",
        description:
          "Prepárate para la competencia de fitness más grande del mundo. Carrera + estaciones funcionales en un formato único.",
      },
      calistenia: {
        name: "Calistenia",
        description:
          "Domina tu peso corporal. Desarrolla fuerza, control y habilidades impresionantes con movimientos progresivos.",
      },
    },
    plans: {
      title: "Planes y Membresías",
      subtitle: "Elige el plan que se adapte a tus objetivos",
      monthly: "Mensual",
      quarterly: "Trimestral",
      annual: "Anual",
      popular: "Más Popular",
      perMonth: "/mes",
      features: "Incluye:",
      cta: "Elegir Plan",
      basic: {
        name: "Básico",
        price: "$899",
        features: [
          "1 disciplina a elegir",
          "Acceso a horarios regulares",
          "Evaluación inicial",
          "App de seguimiento",
        ],
      },
      pro: {
        name: "Pro",
        price: "$1,299",
        features: [
          "2 disciplinas a elegir",
          "Acceso a todos los horarios",
          "Evaluación mensual",
          "App de seguimiento",
          "Plan nutricional básico",
        ],
      },
      elite: {
        name: "Elite",
        price: "$1,799",
        features: [
          "Acceso a todas las disciplinas",
          "Horarios ilimitados",
          "Evaluación semanal",
          "App de seguimiento premium",
          "Plan nutricional personalizado",
          "Sesión 1-a-1 mensual con coach",
        ],
      },
    },
    coaches: {
      title: "Nuestros Coaches",
      subtitle: "Profesionales certificados listos para guiarte",
    },
    faq: {
      title: "Preguntas Frecuentes",
      items: [
        {
          q: "¿Necesito experiencia previa?",
          a: "No. Nuestros programas están diseñados para todos los niveles. Los coaches adaptan cada sesión a tu condición actual.",
        },
        {
          q: "¿Qué es Hyrox?",
          a: "Hyrox es la competencia de fitness más grande del mundo. Combina 8km de carrera con 8 estaciones funcionales. Nosotros te preparamos para competir.",
        },
        {
          q: "¿Puedo probar antes de inscribirme?",
          a: "¡Claro! Ofrecemos una clase de prueba gratuita en cualquiera de nuestras disciplinas.",
        },
        {
          q: "¿Cuál es el horario?",
          a: "Tenemos clases desde las 6:00 AM hasta las 9:00 PM de lunes a viernes, y sábados de 7:00 AM a 1:00 PM.",
        },
      ],
    },
    events: {
      title: "Eventos y Competencias",
      subtitle: "Pon a prueba tu entrenamiento en nuestros eventos exclusivos",
      featured: "Evento Destacado",
      all: "Todos",
      register: "Inscribirme",
      spotsLeft: "lugares disponibles",
    },
    schedule: {
      title: "Agendar Sesión con Coach",
      selectCoach: "Selecciona un Coach",
      selectDate: "Fecha",
      selectTime: "Horario",
      sessionType: "Tipo de Sesión",
      types: {
        evaluation: "Evaluación",
        personal: "Entrenamiento Personal",
        technique: "Corrección de Técnica",
        planning: "Planificación de Objetivos",
      },
      confirm: "Confirmar Cita",
      upcoming: "Próximas Citas",
      noSessions: "No tienes citas programadas",
    },
    auth: {
      login: "Iniciar Sesión",
      register: "Crear Cuenta",
      registerCoach: "Registro de Coach",
      email: "Correo electrónico",
      password: "Contraseña",
      confirmPassword: "Confirmar contraseña",
      name: "Nombre completo",
      phone: "Teléfono",
      forgotPassword: "¿Olvidaste tu contraseña?",
      noAccount: "¿No tienes cuenta?",
      hasAccount: "¿Ya tienes cuenta?",
      selectDiscipline: "Disciplina principal",
      certifications: "Certificaciones",
      experience: "Años de experiencia",
      bio: "Biografía profesional",
    },
    dashboard: {
      title: "Mi Panel de Progreso",
      welcome: "¡Bienvenido de vuelta",
      stats: {
        sessions: "Sesiones este mes",
        streak: "Racha actual",
        pr: "PRs este mes",
        calories: "Calorías quemadas",
      },
      progress: "Progreso Semanal",
      recentWorkouts: "Entrenamientos Recientes",
      achievements: "Logros",
      nextClass: "Próxima Clase",
      bodyMetrics: "Métricas Corporales",
      performanceChart: "Rendimiento",
    },
    profile: {
      title: "Mi Perfil",
      personalInfo: "Información Personal",
      goals: "Objetivos",
      preferences: "Preferencias",
      save: "Guardar Cambios",
      weight: "Peso (kg)",
      height: "Altura (cm)",
      age: "Edad",
      goalOptions: [
        "Perder peso",
        "Ganar músculo",
        "Mejorar resistencia",
        "Competir en Hyrox",
        "Aprender calistenia",
        "Condición general",
      ],
    },
    coach: {
      title: "Panel de Coach",
      selectStudent: "Seleccionar Atleta",
      takePhoto: "Tomar Foto",
      addComment: "Agregar Comentario",
      saveEvaluation: "Guardar Evaluación",
      evaluationForm: "Formulario de Evaluación",
      performance: "Rendimiento",
      technique: "Técnica",
      effort: "Esfuerzo",
      notes: "Notas adicionales",
      history: "Historial de Evaluaciones",
      studentProgress: "Progreso del Atleta",
      todaysSessions: "Sesiones de Hoy",
      rating: "Calificación",
    },
    footer: {
      rights: "Todos los derechos reservados",
      location: "Morelia, Michoacán, México",
      followUs: "Síguenos",
      contact: "Contacto",
      terms: "Términos y Condiciones",
      privacy: "Política de Privacidad",
    },
    theme: {
      light: "Claro",
      dark: "Oscuro",
    },
  },
  en: {
    nav: {
      home: "Home",
      services: "Services",
      plans: "Plans",
      coaches: "Coaches",
      events: "Events",
      contact: "Contact",
      login: "Log In",
      register: "Sign Up",
      dashboard: "Dashboard",
      profile: "My Profile",
      logout: "Log Out",
    },
    hero: {
      title: "TRAIN LIKE AN ATHLETE",
      subtitle: "CrossFit | Hyrox | Calisthenics",
      description:
        "We are the most complete athlete community in Morelia. Train with world-class methodologies and reach your maximum potential.",
      cta: "Start Now",
      ctaSecondary: "View Plans",
    },
    services: {
      title: "Our Programs",
      subtitle: "Three disciplines, one goal: your best version",
      crossfit: {
        name: "CrossFit",
        description:
          "High-intensity functional training combining gymnastics, weightlifting, and cardio for complete physical development.",
      },
      hyrox: {
        name: "Hyrox",
        description:
          "Prepare for the world's largest fitness competition. Running + functional stations in a unique format.",
      },
      calistenia: {
        name: "Calisthenics",
        description:
          "Master your body weight. Develop strength, control, and impressive skills with progressive movements.",
      },
    },
    plans: {
      title: "Plans & Memberships",
      subtitle: "Choose the plan that fits your goals",
      monthly: "Monthly",
      quarterly: "Quarterly",
      annual: "Annual",
      popular: "Most Popular",
      perMonth: "/month",
      features: "Includes:",
      cta: "Choose Plan",
      basic: {
        name: "Basic",
        price: "$899",
        features: [
          "1 discipline of choice",
          "Regular schedule access",
          "Initial evaluation",
          "Tracking app",
        ],
      },
      pro: {
        name: "Pro",
        price: "$1,299",
        features: [
          "2 disciplines of choice",
          "All schedule access",
          "Monthly evaluation",
          "Tracking app",
          "Basic nutrition plan",
        ],
      },
      elite: {
        name: "Elite",
        price: "$1,799",
        features: [
          "Access to all disciplines",
          "Unlimited schedules",
          "Weekly evaluation",
          "Premium tracking app",
          "Personalized nutrition plan",
          "Monthly 1-on-1 with coach",
        ],
      },
    },
    coaches: {
      title: "Our Coaches",
      subtitle: "Certified professionals ready to guide you",
    },
    faq: {
      title: "Frequently Asked Questions",
      items: [
        {
          q: "Do I need prior experience?",
          a: "No. Our programs are designed for all levels. Coaches adapt each session to your current condition.",
        },
        {
          q: "What is Hyrox?",
          a: "Hyrox is the world's largest fitness competition. It combines 8km of running with 8 functional stations. We prepare you to compete.",
        },
        {
          q: "Can I try before signing up?",
          a: "Of course! We offer a free trial class in any of our disciplines.",
        },
        {
          q: "What are the hours?",
          a: "We have classes from 6:00 AM to 9:00 PM Monday through Friday, and Saturdays from 7:00 AM to 1:00 PM.",
        },
      ],
    },
    events: {
      title: "Events & Competitions",
      subtitle: "Test your training at our exclusive events",
      featured: "Featured Event",
      all: "All",
      register: "Sign Up",
      spotsLeft: "spots left",
    },
    schedule: {
      title: "Schedule a Session with Coach",
      selectCoach: "Select a Coach",
      selectDate: "Date",
      selectTime: "Time",
      sessionType: "Session Type",
      types: {
        evaluation: "Evaluation",
        personal: "Personal Training",
        technique: "Technique Correction",
        planning: "Goal Planning",
      },
      confirm: "Confirm Appointment",
      upcoming: "Upcoming Appointments",
      noSessions: "No scheduled appointments",
    },
    auth: {
      login: "Log In",
      register: "Create Account",
      registerCoach: "Coach Registration",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm password",
      name: "Full name",
      phone: "Phone",
      forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      selectDiscipline: "Main discipline",
      certifications: "Certifications",
      experience: "Years of experience",
      bio: "Professional bio",
    },
    dashboard: {
      title: "My Progress Dashboard",
      welcome: "Welcome back",
      stats: {
        sessions: "Sessions this month",
        streak: "Current streak",
        pr: "PRs this month",
        calories: "Calories burned",
      },
      progress: "Weekly Progress",
      recentWorkouts: "Recent Workouts",
      achievements: "Achievements",
      nextClass: "Next Class",
      bodyMetrics: "Body Metrics",
      performanceChart: "Performance",
    },
    profile: {
      title: "My Profile",
      personalInfo: "Personal Information",
      goals: "Goals",
      preferences: "Preferences",
      save: "Save Changes",
      weight: "Weight (kg)",
      height: "Height (cm)",
      age: "Age",
      goalOptions: [
        "Lose weight",
        "Build muscle",
        "Improve endurance",
        "Compete in Hyrox",
        "Learn calisthenics",
        "General fitness",
      ],
    },
    coach: {
      title: "Coach Dashboard",
      selectStudent: "Select Athlete",
      takePhoto: "Take Photo",
      addComment: "Add Comment",
      saveEvaluation: "Save Evaluation",
      evaluationForm: "Evaluation Form",
      performance: "Performance",
      technique: "Technique",
      effort: "Effort",
      notes: "Additional notes",
      history: "Evaluation History",
      studentProgress: "Athlete Progress",
      todaysSessions: "Today's Sessions",
      rating: "Rating",
    },
    footer: {
      rights: "All rights reserved",
      location: "Morelia, Michoacán, Mexico",
      followUs: "Follow Us",
      contact: "Contact",
      terms: "Terms & Conditions",
      privacy: "Privacy Policy",
    },
    theme: {
      light: "Light",
      dark: "Dark",
    },
  },
};

type Translations = typeof translations.es;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType>({
  locale: "es",
  setLocale: () => {},
  t: translations.es,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("es");

  return (
    <I18nContext.Provider
      value={{ locale, setLocale, t: translations[locale] }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
