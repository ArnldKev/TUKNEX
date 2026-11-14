import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const require = createRequire(import.meta.url);
const { AI_MODELS, AiProviderError, requestGroqReport } = require('../dist/ai/groq.js');
const { createQuoteProject } = require('../dist/domain/quote/project.js');
const { quoteDefaults } = require('../dist/domain/quote/form.js');

const cases = {
  short: {
    businessName: 'Restaurante ficticio',
    offering: 'Carta de platos',
    problem: 'Organizar pedidos por WhatsApp.',
    sector: 'food',
  },
  complete: {
    projectType: 'catalog',
    goal: 'orders',
    businessName: 'Catálogo ficticio de plantas',
    offering: 'Plantas de interior y macetas para hogares.',
    problem: 'Quiero que las personas encuentren plantas por tamaño. No quiero pagos online.',
    sector: 'commerce',
    customers: 'Personas que buscan plantas para espacios pequeños.',
    salesProcess: 'El visitante selecciona una planta y consulta su disponibilidad por WhatsApp.',
    features: ['information', 'catalog', 'search', 'whatsapp'],
    productsRange: '21-100',
    stylePreference: 'minimal',
    colorsLiked: 'Verde',
  },
};

async function main() {
  const [option, name, ...extra] = process.argv.slice(2);
  if (option !== undefined && (option !== '--live' || !Object.hasOwn(cases, name) || extra.length)) {
    console.error('Uso: node scripts/check-groq.mjs [--live short|complete]');
    process.exitCode = 2;
    return;
  }
  config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
  const keyPresent = Boolean(process.env.GROQ_API_KEY?.trim());
  const modelAllowed = AI_MODELS.includes(process.env.NEXI_AI_MODEL || AI_MODELS[0]);
  const providerAllowed = (process.env.NEXI_AI_PROVIDER || 'groq') === 'groq';
  if (!option || !keyPresent || !modelAllowed || !providerAllowed) {
    console.log(JSON.stringify({ keyPresent, modelAllowed, providerAllowed, providerCalls: 0 }));
    if (option) process.exitCode = 2;
    return;
  }

  try {
    const project = createQuoteProject({ ...quoteDefaults, ...cases[name] });
    await requestGroqReport(project);
    console.log(JSON.stringify({ result: 'valid', case: name }));
  } catch (error) {
    const result = error instanceof AiProviderError
      ? { code: error.diagnosticCode, status: error.status, reference: error.reference }
      : { code: 'NEXI_CHECK_ERROR' };
    console.error(JSON.stringify({ result: 'failed', case: name, ...result }));
    process.exitCode = 1;
  }
}

await main();
