'use client';

import { useSyncExternalStore } from 'react';
import type {
  ClientProfile,
  Conversation,
  CreateQuoteInput,
  FaqItem,
  Lead,
  ModerationReason,
  PlatformSnapshot,
  Project,
  ProjectStatus,
  Quote,
  QuoteStatus,
  Review,
  User,
  UserRole,
} from './types';

const now = () => new Date().toISOString();
let counter = 0;
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++counter}`;
const demoDate = '2026-10-17T09:00:00-05:00';
const statuses: QuoteStatus[] = [
  'Nuevo',
  'Cotizado',
  'Contactado',
  'Negociación',
  'Aprobado',
  'En desarrollo',
  'Finalizado',
  'Pausado',
];
const projectQuoteStatuses: Record<ProjectStatus, QuoteStatus> = {
  planning: 'En desarrollo',
  development: 'En desarrollo',
  review: 'En desarrollo',
  completed: 'Finalizado',
  paused: 'Pausado',
};

function transitionProject(project: Project, status: ProjectStatus): Project {
  const milestones = project.milestones.map((milestone, index) => ({
    ...milestone,
    completed:
      status === 'completed'
        ? true
        : project.status === 'completed' && index === project.milestones.length - 1
          ? false
          : milestone.completed,
  }));
  const progress = milestones.length
    ? Math.round((milestones.filter((milestone) => milestone.completed).length / milestones.length) * 100)
    : status === 'completed'
      ? 100
      : 0;
  return { ...project, status, milestones, progress, updatedAt: now() };
}
export const moderationReasons: Record<ModerationReason, string> = {
  spam: 'Spam o publicidad ajena al servicio',
  insults: 'Insultos o acoso',
  'private-data': 'Datos privados de otra persona',
  illegal: 'Contenido ilegal',
};

function seed(): PlatformSnapshot {
  const users: User[] = [
    {
      id: 'client-demo',
      role: 'client',
      name: 'Alex · Cliente demo',
      email: 'cliente@demo.tuknex',
      isDemo: true,
      createdAt: demoDate,
    },
    {
      id: 'admin-demo',
      role: 'admin',
      name: 'Equipo TUKNEX · Demo',
      email: 'admin@demo.tuknex',
      isDemo: true,
      createdAt: demoDate,
    },
    {
      id: 'client-demo-2',
      role: 'client',
      name: 'Sam · Cliente ficticio',
      email: 'sam@demo.tuknex',
      isDemo: true,
      createdAt: demoDate,
    },
  ];
  const quote = (value: Partial<Quote> & Pick<Quote, 'id' | 'project' | 'amount' | 'status'>): Quote => ({
    userId: 'client-demo',
    name: users[0].name,
    business: 'Negocio Bosque · Demo',
    email: users[0].email,
    phone: '',
    projectType: 'business',
    features: ['Información', 'Galería', 'WhatsApp'],
    date: demoDate,
    createdAt: demoDate,
    notes: 'Registro ficticio para explorar el flujo. No corresponde a un encargo real.',
    answers: [{ question: '¿Qué quieres lograr?', value: 'Presentar mi negocio y recibir consultas.' }],
    version: 1,
    isDemo: true,
    demo: true,
    ...value,
  });
  const quotes = [
    quote({
      id: 'quote-demo-completed',
      project: 'Landing Esencial · Demo',
      amount: 250,
      status: 'Finalizado',
      projectType: 'landing',
    }),
    quote({ id: 'quote-demo-active', project: 'Web Negocio · Demo', amount: 450, status: 'En desarrollo' }),
    quote({
      id: 'quote-demo-approved',
      project: 'Catálogo Digital · Demo',
      amount: 580,
      status: 'Aprobado',
      projectType: 'catalog',
    }),
    quote({
      id: 'quote-demo-new',
      userId: 'client-demo-2',
      name: users[2].name,
      email: users[2].email,
      business: 'Taller Local · Demo',
      project: 'Sistema básico · Demo',
      amount: null,
      status: 'Nuevo',
      projectType: 'system',
    }),
  ];
  quotes.push(
    quote({
      id: 'quote-demo-other',
      userId: 'client-demo-2',
      name: users[2].name,
      email: users[2].email,
      business: 'Taller Local · Demo',
      project: 'Web Taller · Demo',
      amount: 350,
      status: 'Finalizado',
    }),
  );
  const otherProject: Project = {
    id: 'project-other-demo',
    userId: 'client-demo-2',
    quoteId: 'quote-demo-other',
    name: 'Web Taller · Demo',
    type: 'Web Negocio',
    status: 'completed',
    progress: 100,
    manager: 'Equipo TUKNEX · Demo',
    description: 'Proyecto ficticio finalizado, vinculado a la reseña de ejemplo.',
    createdAt: demoDate,
    updatedAt: demoDate,
    isDemo: true,
    milestones: [{ id: 'mo1', title: 'Entrega y revisión', completed: true }],
  };
  return {
    users,
    profiles: [
      {
        id: 'profile-demo',
        userId: 'client-demo',
        business: 'Negocio Bosque · Demo',
        city: 'Oxapampa',
        phone: '',
        preferredContact: 'message',
        marketingConsent: false,
      },
    ],
    quotes,
    projects: [
      otherProject,
      {
        id: 'project-demo-completed',
        userId: 'client-demo',
        quoteId: 'quote-demo-completed',
        name: 'Tu primera presencia digital · Demo',
        type: 'Landing Esencial',
        status: 'completed',
        progress: 100,
        manager: 'Equipo TUKNEX · Demo',
        description: 'Proyecto ficticio finalizado para explorar el envío de una reseña.',
        createdAt: demoDate,
        updatedAt: demoDate,
        isDemo: true,
        milestones: [
          { id: 'mc1', title: 'Descubrimiento y contenido', completed: true },
          { id: 'mc2', title: 'Diseño y desarrollo', completed: true },
          { id: 'mc3', title: 'Revisión y entrega', completed: true },
        ],
      },
      {
        id: 'project-demo-active',
        userId: 'client-demo',
        quoteId: 'quote-demo-active',
        name: 'El siguiente nivel de tu negocio · Demo',
        type: 'Web Negocio',
        status: 'development',
        progress: 50,
        manager: 'Equipo TUKNEX · Demo',
        description: 'Una web de negocio simulada con galería y formulario de contacto.',
        createdAt: demoDate,
        updatedAt: demoDate,
        isDemo: true,
        milestones: [
          { id: 'ma1', title: 'Definición de alcance', completed: true },
          { id: 'ma2', title: 'Propuesta visual', completed: true },
          { id: 'ma3', title: 'Desarrollo', completed: false },
          { id: 'ma4', title: 'Revisión y entrega', completed: false },
        ],
      },
    ],
    reviews: [
      {
        id: 'review-demo-pending',
        userId: 'client-demo-2',
        projectId: 'project-other-demo',
        rating: 3,
        title: 'Experiencia de ejemplo',
        comment:
          'Ejemplo ficticio de una opinión con sugerencias de mejora. Me gustaría tener más claridad sobre las fechas.',
        status: 'pending',
        displayConsent: true,
        displayName: 'Cliente de ejemplo',
        isDemo: true,
        verified: false,
        businessReply: '',
        createdAt: demoDate,
        updatedAt: demoDate,
      },
    ],
    conversations: [
      {
        id: 'conversation-demo',
        userId: 'client-demo',
        name: users[0].name,
        topic: 'Bienvenida a tu proyecto demo',
        date: demoDate,
        isDemo: true,
        messages: [
          {
            id: 'message-demo-1',
            role: 'assistant',
            content:
              '¡Bienvenido a tu espacio demo! Aquí podrás seguir tu proyecto y consultar avances. Este mensaje es ficticio.',
            timestamp: demoDate,
          },
        ],
      },
    ],
    leads: [
      {
        id: 'lead-demo',
        userId: 'client-demo-2',
        name: users[2].name,
        email: users[2].email,
        phone: '',
        business: 'Taller Local · Demo',
        message: 'Quiero organizar mis órdenes de trabajo.',
        notes: 'Registro de demostración.',
        date: demoDate,
        status: 'Nuevo',
        isDemo: true,
      },
    ],
    activities: [],
    pricingPlans: [
      {
        id: 'landing',
        name: 'Landing Esencial',
        price: 200,
        description: 'Una página para presentar tu negocio.',
        features: ['Diseño adaptable', 'Hasta 5 secciones', 'Contacto'],
        active: true,
        isDemo: true,
      },
      {
        id: 'business',
        name: 'Web Negocio',
        price: 250,
        description: 'Una presencia profesional.',
        features: ['Información del negocio', 'Galería', 'Formulario'],
        active: true,
        isDemo: true,
      },
      {
        id: 'catalog',
        name: 'Catálogo Digital',
        price: 450,
        description: 'Tus productos organizados.',
        features: ['Catálogo', 'Categorías', 'Consulta por WhatsApp'],
        active: true,
        isDemo: true,
      },
    ],
    faqs: [
      {
        id: 'faq-demo-1',
        question: '¿Qué es una landing page?',
        answer:
          'Es una página enfocada en una idea, servicio o campaña, con la información esencial y una acción clara.',
        active: true,
      },
      {
        id: 'faq-demo-2',
        question: '¿La cotización es un precio definitivo?',
        answer:
          'Es una estimación orientativa. Antes de empezar validamos el alcance y acordamos una propuesta.',
        active: true,
      },
    ],
  };
}

export class MockPlatformRepository {
  private snapshot: PlatformSnapshot;
  private listeners = new Set<() => void>();
  constructor() {
    this.snapshot = seed();
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<PlatformSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((fn) => fn());
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('tuknex-data'));
  }
  private log(entityId: string, action: string, actorId = 'admin-demo') {
    return { id: id('activity'), entityId, action, actorId, date: now(), isDemo: true };
  }
  reset() {
    this.snapshot = seed();
    this.listeners.forEach((fn) => fn());
  }
  createUser(input: { name: string; email: string; role?: UserRole }) {
    const user: User = {
      id: id('user-demo'),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role || 'client',
      isDemo: true,
      createdAt: now(),
    };
    this.update({
      users: [...this.snapshot.users, user],
      profiles: [
        ...this.snapshot.profiles,
        {
          id: id('profile'),
          userId: user.id,
          business: 'Mi negocio demo',
          city: 'Oxapampa',
          phone: '',
          preferredContact: 'message',
          marketingConsent: false,
        },
      ],
    });
    return user;
  }
  updateUserRole(userId: string, role: UserRole) {
    this.update({
      users: this.snapshot.users.map((u) => (u.id === userId ? { ...u, role } : u)),
      activities: [this.log(userId, `Rol de ficha demo actualizado a ${role}`), ...this.snapshot.activities],
    });
  }
  updateProfile(userId: string, patch: Partial<ClientProfile>, userPatch?: Pick<User, 'name' | 'email'>) {
    if (!this.snapshot.users.some((u) => u.id === userId))
      throw new Error('No encontramos este perfil demo.');
    const profile = this.snapshot.profiles.find((p) => p.userId === userId);
    const next: ClientProfile = {
      id: profile?.id || id('profile'),
      business: '',
      city: '',
      phone: '',
      preferredContact: 'message',
      marketingConsent: false,
      ...profile,
      ...patch,
      userId,
    };
    this.update({
      profiles: [...this.snapshot.profiles.filter((p) => p.userId !== userId), next],
      users: userPatch
        ? this.snapshot.users.map((u) => (u.id === userId ? { ...u, ...userPatch } : u))
        : this.snapshot.users,
      activities: [this.log(userId, 'Perfil demo actualizado', userId), ...this.snapshot.activities],
    });
  }
  createQuote(input: CreateQuoteInput, userId?: string): Quote {
    const quote: Quote = {
      ...input,
      id: id('quote'),
      userId,
      name: input.name,
      business: input.business,
      email: input.email || '',
      phone: input.phone || '',
      projectType: input.projectType,
      project: input.project || input.projectType,
      features: input.features || [],
      amount: input.amount,
      status: 'Nuevo',
      date: now(),
      createdAt: now(),
      notes: 'Solicitud de demostración. Conservada sólo en memoria.',
      answers: input.answers || [],
      estimate: input.estimate,
      version: 1,
      isDemo: true,
      demo: true,
    };
    this.update({
      quotes: [quote, ...this.snapshot.quotes],
      activities: [
        this.log(quote.id, 'Cotización preliminar creada', userId || 'guest'),
        ...this.snapshot.activities,
      ],
    });
    return quote;
  }
  updateQuote(idValue: string, patch: Partial<Pick<Quote, 'status' | 'notes' | 'amount'>>) {
    if (patch.status && !statuses.includes(patch.status)) throw new Error('Estado no válido.');
    const projectStatus =
      patch.status === 'Finalizado'
        ? 'completed'
        : patch.status === 'Pausado'
          ? 'paused'
          : patch.status === 'En desarrollo'
            ? 'development'
            : null;
    this.update({
      quotes: this.snapshot.quotes.map((q) =>
        q.id === idValue ? { ...q, ...patch, version: q.version + 1 } : q,
      ),
      projects: projectStatus
        ? this.snapshot.projects.map((project) =>
            project.quoteId === idValue ? transitionProject(project, projectStatus) : project,
          )
        : this.snapshot.projects,
      activities: [this.log(idValue, 'Cotización actualizada'), ...this.snapshot.activities],
    });
  }
  saveConversation(
    input: {
      id?: string;
      name?: string;
      topic?: string;
      messages: { id?: string; role: 'user' | 'assistant'; content: string; timestamp?: string }[];
      [key: string]: unknown;
    },
    userId?: string,
  ): Conversation {
    const existing = input.id ? this.snapshot.conversations.find((c) => c.id === input.id) : undefined;
    const conversation: Conversation = {
      id: input.id || id('conversation'),
      userId: userId || existing?.userId,
      name: input.name || 'Visitante demo',
      topic: input.topic || 'Conversación con NEXI',
      date: now(),
      messages: input.messages.map((m) => ({
        ...m,
        id: m.id || id('message'),
        timestamp: m.timestamp || now(),
      })),
      isDemo: true,
    };
    this.update({
      conversations: [conversation, ...this.snapshot.conversations.filter((c) => c.id !== conversation.id)],
    });
    return conversation;
  }
  sendClientMessage(userId: string, content: string) {
    if (!content.trim() || content.trim().length > 2000)
      throw new Error('Escribe un mensaje de hasta 2,000 caracteres.');
    const previous = this.snapshot.conversations.find((c) => c.userId === userId);
    return this.saveConversation(
      {
        id: previous?.id,
        name: this.snapshot.users.find((u) => u.id === userId)?.name,
        topic: 'Mensajes de mi proyecto',
        messages: [
          ...(previous?.messages || []),
          { role: 'user', content: content.trim() },
          {
            role: 'assistant',
            content:
              'Mensaje recibido en la demostración. El equipo responderá por este canal cuando exista un backend; esta confirmación es simulada.',
          },
        ],
      },
      userId,
    );
  }
  createLead(
    input: {
      name: string;
      email?: string;
      phone?: string;
      message?: string;
      business?: string;
      [key: string]: unknown;
    },
    userId?: string,
  ): Lead {
    const lead: Lead = {
      id: id('lead'),
      userId,
      name: input.name,
      email: input.email || '',
      phone: input.phone || '',
      business: input.business || 'Consulta web',
      message: input.message || '',
      status: 'Nuevo',
      notes: '',
      date: now(),
      isDemo: true,
    };
    this.update({ leads: [lead, ...this.snapshot.leads] });
    return lead;
  }
  saveContact = (
    input: { name: string; email?: string; message?: string; [key: string]: unknown },
    userId?: string,
  ) => this.createLead(input, userId);
  updateLead(idValue: string, patch: Partial<Pick<Lead, 'status' | 'notes'>>) {
    this.update({ leads: this.snapshot.leads.map((l) => (l.id === idValue ? { ...l, ...patch } : l)) });
  }
  deleteLead(idValue: string) {
    const lead = this.snapshot.leads.find((item) => item.id === idValue);
    if (!lead?.isDemo) throw new Error('Sólo se pueden eliminar leads de demostración.');
    this.update({
      leads: this.snapshot.leads.filter((item) => item.id !== idValue),
      activities: [this.log(idValue, 'Lead demo eliminado'), ...this.snapshot.activities],
    });
  }
  createProjectFromQuote(quoteId: string): Project {
    const quote = this.snapshot.quotes.find((q) => q.id === quoteId);
    if (!quote || quote.status !== 'Aprobado')
      throw new Error('Aprueba la cotización antes de convertirla en proyecto.');
    if (!quote.userId) throw new Error('Asocia la cotización a un cliente antes de crear un proyecto.');
    if (this.snapshot.projects.some((p) => p.quoteId === quoteId))
      throw new Error('Esta cotización ya tiene un proyecto asociado.');
    const project: Project = {
      id: id('project'),
      userId: quote.userId,
      quoteId,
      name: `${quote.project} · Demo`,
      type: quote.project,
      status: 'planning',
      progress: 0,
      manager: 'Equipo TUKNEX · Demo',
      description: 'Proyecto de demostración creado desde una cotización aprobada.',
      createdAt: now(),
      updatedAt: now(),
      isDemo: true,
      milestones: ['Definición de alcance', 'Diseño', 'Desarrollo', 'Revisión y entrega'].map((title) => ({
        id: id('milestone'),
        title,
        completed: false,
      })),
    };
    this.update({
      projects: [project, ...this.snapshot.projects],
      quotes: this.snapshot.quotes.map((q) => (q.id === quoteId ? { ...q, status: 'En desarrollo' } : q)),
      activities: [
        this.log(project.id, 'Proyecto demo creado desde cotización aprobada'),
        ...this.snapshot.activities,
      ],
    });
    return project;
  }
  updateProject(projectId: string, patch: Partial<Pick<Project, 'status' | 'manager' | 'name'>>) {
    const allowed: ProjectStatus[] = ['planning', 'development', 'review', 'completed', 'paused'];
    if (patch.status && !allowed.includes(patch.status)) throw new Error('Estado de proyecto no válido.');
    const project = this.snapshot.projects.find((p) => p.id === projectId);
    if (!project) throw new Error('No encontramos este proyecto demo.');
    const updated = patch.status ? transitionProject(project, patch.status) : project;
    this.update({
      projects: this.snapshot.projects.map((p) =>
        p.id === projectId ? { ...updated, ...patch, updatedAt: now() } : p,
      ),
      quotes: patch.status
        ? this.snapshot.quotes.map((q) =>
            q.id === project.quoteId
              ? { ...q, status: projectQuoteStatuses[patch.status!], version: q.version + 1 }
              : q,
          )
        : this.snapshot.quotes,
      activities: [this.log(projectId, 'Proyecto actualizado'), ...this.snapshot.activities],
    });
  }
  toggleMilestone(projectId: string, milestoneId: string) {
    const project = this.snapshot.projects.find((p) => p.id === projectId);
    if (!project || !project.milestones.some((milestone) => milestone.id === milestoneId))
      throw new Error('No encontramos el hito de este proyecto demo.');
    const milestones = project.milestones.map((milestone) =>
      milestone.id === milestoneId ? { ...milestone, completed: !milestone.completed } : milestone,
    );
    const progress = Math.round(
      (milestones.filter((milestone) => milestone.completed).length / milestones.length) * 100,
    );
    const status: ProjectStatus =
      progress === 100 ? 'completed' : project.status === 'completed' ? 'development' : project.status;
    this.update({
      projects: this.snapshot.projects.map((p) =>
        p.id === projectId ? { ...p, milestones, progress, status, updatedAt: now() } : p,
      ),
      quotes: this.snapshot.quotes.map((q) =>
        q.id === project.quoteId ? { ...q, status: projectQuoteStatuses[status], version: q.version + 1 } : q,
      ),
      activities: [this.log(projectId, 'Hito actualizado'), ...this.snapshot.activities],
    });
  }
  saveReview(input: {
    projectId: string;
    userId: string;
    rating: number;
    title: string;
    comment: string;
    displayConsent: boolean;
    displayName?: string;
  }): Review {
    const project = this.snapshot.projects.find((p) => p.id === input.projectId);
    if (!project || project.userId !== input.userId || project.status !== 'completed')
      throw new Error('Sólo puedes opinar sobre un proyecto tuyo finalizado.');
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
      throw new Error('Elige una calificación de 1 a 5 estrellas.');
    if (
      input.title.trim().length > 80 ||
      input.comment.trim().length < 20 ||
      input.comment.trim().length > 1200
    )
      throw new Error('Usa un título de hasta 80 caracteres y un comentario de 20 a 1,200 caracteres.');
    const publicText = [input.title, input.comment, input.displayName || ''].join(' ');
    if ((input.displayName?.trim().length || 0) > 50)
      throw new Error('Usa un nombre de hasta 50 caracteres para mostrar.');
    if (/(https?:\/\/|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?51[\s-]?)?9(?:[\s-]?\d){8})/i.test(publicText))
      throw new Error('Evita publicar enlaces, correos o teléfonos en tu reseña.');
    const existing = this.snapshot.reviews.find(
      (r) => r.projectId === input.projectId && r.userId === input.userId,
    );
    if (existing && ['pending', 'published'].includes(existing.status))
      throw new Error('Tu reseña ya fue enviada. Espera la revisión de moderación.');
    const review: Review = {
      id: existing?.id || id('review'),
      ...input,
      title: input.title.trim(),
      comment: input.comment.trim(),
      displayName: input.displayName?.trim() || 'Cliente demo',
      status: 'draft',
      isDemo: true,
      verified: false,
      businessReply: '',
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
    };
    this.update({
      reviews: [review, ...this.snapshot.reviews.filter((r) => r.id !== review.id)],
      activities: [
        this.log(review.id, 'Borrador de reseña demo guardado', input.userId),
        ...this.snapshot.activities,
      ],
    });
    return review;
  }
  submitReview(reviewId: string, userId: string) {
    const review = this.snapshot.reviews.find((r) => r.id === reviewId);
    if (!review || review.userId !== userId || review.status !== 'draft')
      throw new Error('No hay un borrador editable para enviar.');
    if (!review.displayConsent)
      throw new Error('Autoriza mostrar el nombre elegido y el texto antes de enviar.');
    const project = this.snapshot.projects.find((p) => p.id === review.projectId);
    if (!project || project.status !== 'completed') throw new Error('El proyecto debe estar finalizado.');
    this.update({
      reviews: this.snapshot.reviews.map((r) =>
        r.id === reviewId ? { ...r, status: 'pending', updatedAt: now() } : r,
      ),
      activities: [
        this.log(reviewId, 'Reseña enviada a moderación demo', userId),
        ...this.snapshot.activities,
      ],
    });
  }
  moderateReview(
    reviewId: string,
    status: 'published' | 'rejected',
    options: { reason?: ModerationReason; note?: string; reply?: string } = {},
  ) {
    const review = this.snapshot.reviews.find((r) => r.id === reviewId);
    if (!review || !['pending', 'published', 'rejected'].includes(review.status))
      throw new Error('Primero debe enviarse la reseña a moderación.');
    if (status === 'rejected' && (!options.reason || !Object.hasOwn(moderationReasons, options.reason)))
      throw new Error('Selecciona un motivo objetivo. Una calificación baja no es un motivo de rechazo.');
    if (status === 'published' && !review.displayConsent)
      throw new Error('Falta consentimiento para mostrar esta reseña.');
    this.update({
      reviews: this.snapshot.reviews.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              status,
              businessReply: options.reply?.trim() || '',
              moderationReason: status === 'rejected' ? options.reason : undefined,
              moderationNote: options.note?.trim(),
              updatedAt: now(),
            }
          : r,
      ),
      activities: [
        this.log(
          reviewId,
          status === 'published'
            ? 'Reseña demo aprobada; no se presenta como testimonio real'
            : `Reseña rechazada por ${options.reason}`,
        ),
        ...this.snapshot.activities,
      ],
    });
  }
  getPublicReviews() {
    return this.snapshot.reviews.filter((r) => r.status === 'published' && r.displayConsent && !r.isDemo);
  }
  saveFaq(input: FaqItem) {
    if (input.question.trim().length < 5 || input.answer.trim().length < 15)
      throw new Error('Escribe una pregunta y respuesta completas.');
    this.update({ faqs: [input, ...this.snapshot.faqs.filter((f) => f.id !== input.id)] });
  }
  deleteFaq(faqId: string) {
    this.update({ faqs: this.snapshot.faqs.filter((f) => f.id !== faqId) });
  }
}

export const platformRepository = new MockPlatformRepository();
export function usePlatformData() {
  return useSyncExternalStore(
    platformRepository.subscribe,
    platformRepository.getSnapshot,
    platformRepository.getSnapshot,
  );
}
