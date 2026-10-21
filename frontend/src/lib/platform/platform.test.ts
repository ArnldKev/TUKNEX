import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PASSWORD, DEMO_SESSION_KEY, MockAuthService } from './auth';
import { MockPlatformRepository } from './repository';

test('demo auth accepts only the documented example credentials', async () => {
  const auth = new MockAuthService();
  await assert.rejects(auth.login('real@example.com', 'a-real-password'), /credenciales de ejemplo/);
  await assert.rejects(auth.login('cliente@demo.tuknex', 'incorrecta'));
  const client = await auth.login('cliente@demo.tuknex', DEMO_PASSWORD);
  assert.equal(client.id, 'client-demo');
  assert.equal(auth.hasRole('client'), true);
  assert.equal('password' in client, false);
});

test('demo auth can switch roles and logout without retaining a password', async () => {
  const auth = new MockAuthService();
  assert.equal((await auth.loginDemo('client')).role, 'client');
  assert.equal((await auth.loginDemo('admin')).role, 'admin');
  assert.equal(auth.hasRole('client'), false);
  await auth.logout();
  assert.equal(await auth.getCurrentUser(), null);
});

test('session storage retains only a demo identity and refresh restores its role', async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  try {
    await new MockAuthService().loginDemo('admin');
    assert.deepEqual(JSON.parse(values.get(DEMO_SESSION_KEY)!), { userId: 'admin-demo', role: 'admin' });
    assert.equal((await new MockAuthService().getCurrentUser())?.role, 'admin');
    assert.equal(values.size, 1);
    await new MockAuthService().logout();
    assert.equal(values.size, 0);
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});

test('password recovery is explicit about not sending email', async () => {
  const auth = new MockAuthService();
  await assert.rejects(auth.resetPassword('invalid'));
  assert.match(await auth.resetPassword('cliente@demo.tuknex'), /No se envió ningún correo/);
});

test('seed relationships connect every review to its completed project and owner', () => {
  const repository = new MockPlatformRepository(),
    data = repository.getSnapshot();
  for (const review of data.reviews) {
    const project = data.projects.find((p) => p.id === review.projectId);
    assert.ok(project);
    assert.equal(project.userId, review.userId);
    assert.equal(project.status, 'completed');
    assert.ok(data.quotes.some((q) => q.id === project.quoteId && q.userId === project.userId));
  }
});

const reviewInput = {
  userId: 'client-demo',
  projectId: 'project-demo-completed',
  rating: 1,
  title: 'Podemos mejorar',
  comment: 'Ejemplo ficticio: las fechas podrían comunicarse con mayor claridad.',
  displayConsent: true,
  displayName: 'Cliente ficticio',
};
test('reviews require ownership and a completed project', () => {
  const repository = new MockPlatformRepository();
  assert.throws(
    () => repository.saveReview({ ...reviewInput, projectId: 'project-demo-active' }),
    /finalizado/,
  );
  assert.throws(() => repository.saveReview({ ...reviewInput, userId: 'client-demo-2' }), /tuyo/);
  assert.throws(() => repository.saveReview({ ...reviewInput, rating: 6 }), /1 a 5/);
  assert.throws(
    () =>
      repository.saveReview({
        ...reviewInput,
        comment: 'Escríbeme a cliente@example.com para más información.',
      }),
    /datos|correos|teléfonos/,
  );
});

test('draft editing, consent and moderation preserve legitimate negative reviews', () => {
  const repository = new MockPlatformRepository();
  const draft = repository.saveReview({ ...reviewInput, displayConsent: false });
  assert.equal(draft.status, 'draft');
  assert.throws(() => repository.submitReview(draft.id, 'client-demo'), /Autoriza/);
  const edited = repository.saveReview({ ...reviewInput, title: 'Una crítica legítima' });
  assert.equal(edited.id, draft.id);
  repository.submitReview(draft.id, 'client-demo');
  assert.throws(() => repository.saveReview(reviewInput), /ya fue enviada/);
  repository.moderateReview(draft.id, 'published', { reply: 'Gracias. Mejoraremos la comunicación.' });
  const published = repository.getSnapshot().reviews.find((r) => r.id === draft.id)!;
  assert.equal(published.rating, 1);
  assert.equal(published.status, 'published');
  assert.equal(published.verified, false);
  assert.deepEqual(repository.getPublicReviews(), []);
});

test('rejection needs an objective policy reason', () => {
  const repository = new MockPlatformRepository();
  assert.throws(() => repository.moderateReview('review-demo-pending', 'rejected'), /motivo objetivo/);
  repository.moderateReview('review-demo-pending', 'rejected', {
    reason: 'private-data',
    note: 'Retira los datos privados para reenviar.',
  });
  assert.equal(
    repository.getSnapshot().reviews.find((r) => r.id === 'review-demo-pending')?.moderationReason,
    'private-data',
  );
});

test('approved quotes create one synchronized project and completed milestones unlock reviews', () => {
  const repository = new MockPlatformRepository();
  assert.throws(() => repository.createProjectFromQuote('quote-demo-new'), /Aprueba/);
  const project = repository.createProjectFromQuote('quote-demo-approved');
  assert.equal(project.userId, 'client-demo');
  assert.throws(() => repository.createProjectFromQuote('quote-demo-approved'));
  for (const milestone of project.milestones) repository.toggleMilestone(project.id, milestone.id);
  const completed = repository.getSnapshot().projects.find((p) => p.id === project.id)!;
  assert.equal(completed.progress, 100);
  assert.equal(completed.status, 'completed');
  assert.equal(repository.saveReview({ ...reviewInput, projectId: project.id }).status, 'draft');
});

test('guest and client quotes stay in repository memory with explicit ownership', () => {
  const repository = new MockPlatformRepository(),
    input = { name: 'Persona ficticia', business: 'Demo', projectType: 'landing', amount: 200 };
  const guest = repository.createQuote(input),
    client = repository.createQuote(input, 'client-demo');
  assert.equal(guest.userId, undefined);
  assert.equal(client.userId, 'client-demo');
  assert.equal(client.isDemo, true);
  repository.reset();
  assert.equal(
    repository.getSnapshot().quotes.some((q) => q.id === client.id),
    false,
  );
});

test('reopening or completing a project keeps milestones and its quote consistent', () => {
  const repository = new MockPlatformRepository();
  repository.updateProject('project-demo-completed', { status: 'development' });
  let project = repository.getSnapshot().projects.find((p) => p.id === 'project-demo-completed')!;
  assert.ok(project.progress < 100);
  assert.equal(project.milestones.at(-1)?.completed, false);
  assert.equal(
    repository.getSnapshot().quotes.find((q) => q.id === project.quoteId)?.status,
    'En desarrollo',
  );
  repository.updateQuote(project.quoteId, { status: 'Finalizado' });
  project = repository.getSnapshot().projects.find((p) => p.id === project.id)!;
  assert.equal(project.status, 'completed');
  assert.equal(project.progress, 100);
  repository.toggleMilestone(project.id, project.milestones[0].id);
  assert.equal(
    repository.getSnapshot().quotes.find((q) => q.id === project.quoteId)?.status,
    'En desarrollo',
  );
  assert.throws(() => repository.toggleMilestone(project.id, 'missing-milestone'), /hito/);
});

test('review contact protection also covers its public title and display name', () => {
  const repository = new MockPlatformRepository();
  assert.throws(
    () => repository.saveReview({ ...reviewInput, title: 'Escribe a alex@example.com' }),
    /correos/,
  );
  assert.throws(() => repository.saveReview({ ...reviewInput, displayName: '+51 987 654 321' }), /teléfonos/);
  assert.throws(
    () => repository.saveReview({ ...reviewInput, displayName: 'A'.repeat(51) }),
    /50 caracteres/,
  );
});

test('demo auth rejects unsupported roles instead of constructing an inconsistent session', async () => {
  const auth = new MockAuthService();
  await assert.rejects(auth.loginDemo('owner' as 'client'), /rol de demostración válido/);
  assert.equal(await auth.getCurrentUser(), null);
});
