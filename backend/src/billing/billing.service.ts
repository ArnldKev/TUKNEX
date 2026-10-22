import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { DEFAULT_PRICES } from '../domain/pricing';
import { z } from 'zod';
import { Database, type Sql } from '../database/database';
import {
  parse,
  clientDto,
  quoteDto,
  contractDto,
  paymentDto,
  statusDto,
  settingsDto,
  bridgeDto,
  voidDto,
} from './dto';
import {
  buildPlan,
  installmentStatus,
  todayLima,
  addDays,
  estimateDeliveryDate,
} from '../domain/billing/finance';
import {
  contractTransitions,
  paymentModes,
  type BillingClient,
  type BillingQuote,
  type Contract,
  type BillingData,
  type Issuer,
  type PlanInput,
  type ContractStatus,
} from '../domain/billing/types';
const json = (value: unknown) => JSON.stringify(value);
const checksum = (value: unknown) => createHash('sha256').update(json(value)).digest('hex');
const queryOne = async (tx: Sql, sql: string, args: unknown[] = []) => {
  const row = (await tx.query(sql, args)).rows[0];
  if (!row) throw new NotFoundException('Registro no encontrado.');
  return row;
};
@Injectable()
export class BillingService {
  constructor(@Inject(Database) public db: Database) {}
  async initialize() {
    const exists = (await this.db.query("SELECT id FROM configuracion WHERE id='billing'")).rows.length;
    if (!exists)
      await this.db.query("INSERT INTO configuracion(id,datos) VALUES('billing',$1)", [
        json({
          issuer: {
            name: process.env.ISSUER_NAME || 'TUKNEX · titular por configurar',
            taxId: process.env.ISSUER_TAX_ID || '',
            address: process.env.ISSUER_ADDRESS || '',
            email: process.env.ISSUER_EMAIL || '',
            phone: process.env.ISSUER_PHONE || '+51 934 631 664',
          },
          rates: Object.fromEntries(Object.entries(paymentModes).map(([k, v]) => [k, v.rate])),
        }),
      ]);
    if (
      this.db.mode === 'local-demo' && process.env.SEED_DEMO_DATA === 'true' &&
      !(await this.db.query('SELECT id FROM clientes LIMIT 1')).rows.length
    ) {
      for (const [key, name, service] of [
        ['example-gringo', 'El Gringo J&M · Demo', 'catalog'],
        ['example-corry', 'CORRY SPORT · Demo', 'catalog'],
      ]) {
        const client = await this.createClient({
          name,
          taxId: '',
          email: '',
          phone: '',
          address: '',
          isDemo: true,
          legacyId: key,
        });
        await this.createQuote({
          clientId: client.id,
          projectName: 'Catálogo de ejemplo · ' + name,
          service,
          scope:
            'Catálogo responsive, fichas de productos y contacto por WhatsApp. Datos ficticios para explorar el flujo.',
          observations: 'Ejemplo; no representa un acuerdo real con este negocio.',
          conditions: 'Dominio, alojamiento y servicios de terceros se acuerdan por separado.',
          delivery: '15 días hábiles desde la entrega de materiales.',
          baseCents: 25000,
          plan: {
            mode: key === 'example-corry' ? 'weekly' : 'half',
            rate: key === 'example-corry' ? 8 : 0,
            count: 6,
            firstDueDate: todayLima(),
          },
          status: 'accepted',
          issuedDate: todayLima(),
          validUntil: addDays(todayLima(), 15),
          isDemo: true,
          legacyId: key,
        });
      }
    }
  }
  async settings() {
    const stored = (await queryOne(this.db, "SELECT datos FROM configuracion WHERE id='billing'")).datos as {
      issuer: Issuer;
      rates: BillingData['rates'];
      prices?: Record<string, number>;
    };
    return {...stored,rates:{...Object.fromEntries(Object.entries(paymentModes).map(([key,value])=>[key,value.rate])),...stored.rates}};
  }
  async saveSettings(body: unknown) {
    const input = parse(settingsDto, body);
    if (Object.keys(paymentModes).some((key) => typeof input.rates[key] !== 'number'))
      throw new BadRequestException('Configura el recargo de cada modalidad.');
    await this.db.query("UPDATE configuracion SET datos=$1,updated_at=now() WHERE id='billing'", [
      json({ ...(await this.settings()), ...input }),
    ]);
    return input;
  }
  async savePrices(body: unknown) {
    const prices = parse(z.record(z.string(), z.number().finite().min(0).max(10000000)), body);
    if (Object.keys(prices).some((k) => !Object.hasOwn(DEFAULT_PRICES, k)))
      throw new BadRequestException('Tarifa desconocida.');
    const settings = await this.settings();
    const updated = { ...settings, prices: { ...DEFAULT_PRICES, ...settings.prices, ...prices } };
    await this.db.query("UPDATE configuracion SET datos=$1,updated_at=now() WHERE id='billing'", [
      json(updated),
    ]);
    return updated.prices;
  }
  async audit(tx: Sql, action: string, id: string, data: unknown = {}) {
    await tx.query('INSERT INTO auditoria(id,accion,entidad_id,datos) VALUES($1,$2,$3,$4)', [
      randomUUID(),
      action,
      id,
      json(data),
    ]);
  }
  async number(tx: Sql, prefix: string) {
    const key = prefix + '-' + todayLima().slice(0, 4);
    const row = await queryOne(
      tx,
      'INSERT INTO secuencias(prefijo,valor) VALUES($1,1) ON CONFLICT(prefijo) DO UPDATE SET valor=secuencias.valor+1 RETURNING valor',
      [key],
    );
    return key + '-' + String(row.valor).padStart(5, '0');
  }
  async client(id: string, tx: Sql = this.db): Promise<BillingClient> {
    return (await queryOne(tx, 'SELECT datos FROM clientes WHERE id=$1', [id])).datos;
  }
  async createClient(body: unknown, existingId?: string): Promise<BillingClient> {
    const input = parse(clientDto, body);
    return this.db.transaction(async (tx) => {
      let id = existingId;
      if (!id && input.legacyId)
        id = (await tx.query('SELECT id FROM clientes WHERE legacy_id=$1', [input.legacyId])).rows[0]?.id;
      const client: BillingClient = {
        ...input,
        id: id || randomUUID(),
        createdAt: id ? (await this.client(id, tx)).createdAt : new Date().toISOString(),
      };
      if (id)
        await tx.query(
          'UPDATE clientes SET nombre=$2,documento=$3,telefono=$4,correo=$5,direccion=$6,datos=$7,updated_at=now() WHERE id=$1',
          [id, client.name, client.taxId, client.phone, client.email, client.address, json(client)],
        );
      else
        await tx.query(
          'INSERT INTO clientes(id,legacy_id,nombre,documento,telefono,correo,direccion,es_demo,datos) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [
            client.id,
            client.legacyId || null,
            client.name,
            client.taxId,
            client.phone,
            client.email,
            client.address,
            client.isDemo,
            json(client),
          ],
        );
      await this.audit(tx, 'cliente_guardado', client.id);
      return client;
    });
  }
  async createQuote(body: unknown, existingId?: string): Promise<BillingQuote> {
    const input = parse(quoteDto, body);
    const calculated = buildPlan(input.baseCents, input.plan);
    if (input.validUntil < input.issuedDate)
      throw new BadRequestException('La vigencia debe ser posterior a la emisión.');
    const settings = await this.settings();
    return this.db.transaction(async (tx) => {
      if (input.legacyId && !existingId) {
        const found = (await tx.query('SELECT datos FROM cotizaciones WHERE legacy_id=$1', [input.legacyId]))
          .rows[0];
        if (found) return found.datos;
      }
      const previous = existingId
        ? ((await queryOne(tx, 'SELECT datos,estado FROM cotizaciones WHERE id=$1 FOR UPDATE', [existingId]))
            .datos as BillingQuote)
        : undefined;
      if (previous && (previous.status === 'accepted' || previous.status === 'rejected'))
        throw new ConflictException(
          'La cotización aceptada/rechazada queda conservada. Crea una nueva versión como otra cotización.',
        );
      const quote: BillingQuote = {
        ...input,
        ...calculated,
        schedule: calculated.installments,
        id: previous?.id || randomUUID(),
        number: previous?.number || (await this.number(tx, 'TK-Q')),
        client: await this.client(input.clientId, tx),
        issuer: previous?.issuer || settings.issuer,
        version: (previous?.version || 0) + 1,
      };
      quote.isDemo = quote.isDemo || quote.client.isDemo;
      if (previous)
        await tx.query(
          'UPDATE cotizaciones SET estado=$2,monto_base=$3,monto_financiado=$4,monto_total=$5,datos=$6,version=$7,cliente_id=$8,updated_at=now() WHERE id=$1',
          [
            quote.id,
            quote.status,
            quote.baseCents,
            quote.feeCents,
            quote.totalCents,
            json(quote),
            quote.version,
            quote.clientId,
          ],
        );
      else
        await tx.query(
          'INSERT INTO cotizaciones(id,numero,cliente_id,legacy_id,estado,monto_base,monto_financiado,monto_total,datos) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [
            quote.id,
            quote.number,
            quote.clientId,
            quote.legacyId || null,
            quote.status,
            quote.baseCents,
            quote.feeCents,
            quote.totalCents,
            json(quote),
          ],
        );
      await this.audit(tx, 'cotizacion_guardada', quote.id, { status: quote.status });
      return quote;
    });
  }
  async acceptQuote(id: string) {
    return this.db.transaction(async (tx) => {
      const quote = (await queryOne(tx, 'SELECT datos FROM cotizaciones WHERE id=$1 FOR UPDATE', [id]))
        .datos as BillingQuote;
      if (quote.status === 'rejected')
        throw new ConflictException('Una cotización rechazada no puede aceptarse. Crea una nueva propuesta.');
      if (quote.status !== 'accepted') {
        quote.status = 'accepted';
        quote.version++;
        await tx.query('UPDATE cotizaciones SET estado=$2,datos=$3,version=$4,updated_at=now() WHERE id=$1', [
          id,
          'accepted',
          json(quote),
          quote.version,
        ]);
        await this.audit(tx, 'aceptacion_registrada', id);
      }
      return quote;
    });
  }
  async bridge(body: unknown) {
    const input = parse(bridgeDto, body);
    const previous = input.client.legacyId
      ? (await this.db.query('SELECT datos FROM clientes WHERE legacy_id=$1', [input.client.legacyId]))
          .rows[0]?.datos
      : undefined;
    const client = previous || (await this.createClient(input.client));
    return this.createQuote({ ...input.quote, clientId: client.id });
  }
  async contract(id: string, tx: Sql = this.db): Promise<Contract> {
    return (await queryOne(tx, 'SELECT datos FROM contratos WHERE id=$1', [id])).datos;
  }
  async createContract(body: unknown, existingId?: string): Promise<Contract> {
    const input = parse(contractDto, body),
      settings = await this.settings();
    return this.db.transaction(async (tx) => {
      let source = input;
      let projectId = input.projectId,
        quote: BillingQuote | undefined;
      if (input.quoteId) {
        quote = (await queryOne(tx, 'SELECT datos FROM cotizaciones WHERE id=$1 FOR UPDATE', [input.quoteId]))
          .datos as BillingQuote;
        if (quote.status !== 'accepted')
          throw new ConflictException('Acepta la cotización antes de generar un contrato.');
        const prior = (await tx.query('SELECT datos FROM contratos WHERE cotizacion_id=$1', [input.quoteId]))
          .rows[0];
        if (prior && !existingId) return prior.datos;
        if (!existingId)
          source = {
            ...input,
            clientId: quote.clientId,
            projectName: quote.projectName,
            service: quote.service,
            scope: quote.scope,
            observations: [
              quote.observations,
              'Plazo de la cotización: ' +
                quote.delivery +
                ' (confirmar las fechas estimadas antes de enviar).',
            ]
              .filter(Boolean)
              .join('\n'),
            conditions: quote.conditions,
            baseCents: quote.baseCents,
            plan: quote.plan,
            isDemo: quote.isDemo,
          };
      }
      const previous = existingId
        ? ((await queryOne(tx, 'SELECT datos FROM contratos WHERE id=$1 FOR UPDATE', [existingId]))
            .datos as Contract)
        : undefined;
      if (previous) {
        if (previous.version !== input.version)
          throw new ConflictException('El contrato cambió. Actualiza antes de editar.');
        const paid = (await tx.query('SELECT id FROM pagos WHERE contrato_id=$1 LIMIT 1', [existingId])).rows
          .length;
        if (previous.status !== 'borrador' || paid)
          throw new ConflictException(
            'Sólo se puede editar un borrador sin historial de pagos, incluso anulados.',
          );
        if (input.clientId !== previous.clientId || input.quoteId !== previous.quoteId)
          throw new ConflictException('No cambies las relaciones del contrato existente.');
        projectId = previous.projectId;
      }
      if (projectId) {
        const project = await queryOne(tx, 'SELECT cliente_id FROM proyectos WHERE id=$1', [projectId]);
        if (project.cliente_id !== source.clientId)
          throw new BadRequestException('El proyecto no pertenece al cliente seleccionado.');
      }
      const calculated = buildPlan(source.baseCents, source.plan);
      if (!projectId) {
        projectId = randomUUID();
        await tx.query('INSERT INTO proyectos(id,cliente_id,nombre) VALUES($1,$2,$3)', [
          projectId,
          source.clientId,
          source.projectName,
        ]);
      }
      const contract: Contract = {
        ...source,
        ...calculated,
        schedule: calculated.installments,
        id: previous?.id || randomUUID(),
        number: previous?.number || (await this.number(tx, 'TK-C')),
        projectId,
        client: await this.client(source.clientId, tx),
        issuer: previous?.issuer || quote?.issuer || settings.issuer,
        status: 'borrador',
        version: (previous?.version || 0) + 1,
      };
      contract.isDemo = contract.isDemo || contract.client.isDemo;
      const args = [
        contract.id,
        contract.number,
        contract.clientId,
        contract.quoteId || null,
        projectId,
        contract.issuedDate,
        contract.startDate,
        contract.deliveryDate,
        contract.service,
        contract.scope,
        contract.baseCents,
        contract.plan.mode,
        contract.plan.rate,
        contract.feeCents,
        contract.totalCents,
        contract.conditions,
        contract.status,
        json(contract),
        contract.version,
      ];
      if (previous) {
        await tx.query('DELETE FROM cuotas WHERE contrato_id=$1', [contract.id]);
        await tx.query(
          'UPDATE contratos SET fecha_emision=$6,fecha_inicio=$7,fecha_entrega=$8,servicio=$9,alcance=$10,monto_base=$11,tipo_pago=$12,porcentaje_financiamiento=$13,monto_financiado=$14,monto_total=$15,condiciones=$16,estado=$17,datos=$18,version=$19,updated_at=now() WHERE id=$1 AND numero_contrato=$2 AND cliente_id=$3 AND cotizacion_id IS NOT DISTINCT FROM $4 AND proyecto_id=$5',
          args,
        );
      } else
        await tx.query(
          'INSERT INTO contratos(id,numero_contrato,cliente_id,cotizacion_id,proyecto_id,fecha_emision,fecha_inicio,fecha_entrega,servicio,alcance,monto_base,tipo_pago,porcentaje_financiamiento,monto_financiado,monto_total,condiciones,estado,datos,version) VALUES(' +
            args.map((_, i) => '$' + (i + 1)).join(',') +
            ')',
          args,
        );
      for (const item of calculated.installments)
        await tx.query(
          'INSERT INTO cuotas(id,contrato_id,numero_cuota,concepto,fecha_vencimiento,monto) VALUES($1,$2,$3,$4,$5,$6)',
          [randomUUID(), contract.id, item.number, item.label, item.date, item.amountCents],
        );
      await this.audit(tx, previous ? 'contrato_editado' : 'contrato_creado', contract.id, {
        quoteId: source.quoteId || null,
      });
      return contract;
    });
  }
  async convert(id: string) {
    const quote = (await queryOne(this.db, 'SELECT datos FROM cotizaciones WHERE id=$1', [id]))
      .datos as BillingQuote;
    return this.createContract({
      clientId: quote.clientId,
      quoteId: id,
      projectName: quote.projectName,
      service: quote.service,
      scope: quote.scope,
      observations: [
        quote.observations,
        'Plazo de la cotización: ' + quote.delivery + ' (confirmar las fechas estimadas antes de enviar).',
      ]
        .filter(Boolean)
        .join('\n'),
      conditions: quote.conditions,
      issuedDate: todayLima(),
      startDate: todayLima(),
      deliveryDate: estimateDeliveryDate(todayLima(), quote.delivery),
      baseCents: quote.baseCents,
      plan: quote.plan,
      isDemo: quote.isDemo,
    });
  }
  async status(id: string, body: unknown) {
    const input = parse(statusDto, body);
    return this.db.transaction(async (tx) => {
      const contract = (await queryOne(tx, 'SELECT datos FROM contratos WHERE id=$1 FOR UPDATE', [id]))
        .datos as Contract & { clientSignedAt?: string; issuerSignedAt?: string };
      if (input.version !== contract.version)
        throw new ConflictException('El contrato cambió. Actualiza la página.');
      const transitions = contractTransitions;
      if (!transitions[contract.status].includes(input.status))
        throw new ConflictException('La transición de estado no corresponde al estado actual.');
      if (
        input.status === 'enviado' &&
        !contract.isDemo &&
        (!contract.client.taxId ||
          !contract.client.address ||
          !contract.issuer.taxId ||
          !contract.issuer.address)
      )
        throw new BadRequestException('Completa DNI/RUC y dirección de ambas partes antes de enviar.');
      if (input.status === 'firmado_cliente') contract.clientSignedAt = new Date().toISOString();
      if (input.status === 'firmado_tuknex') contract.issuerSignedAt = new Date().toISOString();
      if (input.status === 'activo' && (!contract.clientSignedAt || !contract.issuerSignedAt))
        throw new ConflictException('Registra la firma externa de ambas partes antes de activar.');
      const paid = Number(
        (
          await queryOne(
            tx,
            'SELECT COALESCE(SUM(monto),0) AS total FROM pagos WHERE contrato_id=$1 AND NOT anulado',
            [id],
          )
        ).total,
      );
      if (input.status === 'cancelado' && paid > 0)
        throw new ConflictException(
          'No se cancela un contrato con cobros vigentes. Concilia o anula con motivo los registros correspondientes.',
        );
      if (input.status === 'finalizado' && paid !== contract.totalCents)
        throw new ConflictException('Queda un saldo pendiente de pago.');
      contract.status = input.status;
      contract.version++;
      await tx.query('UPDATE contratos SET estado=$2,datos=$3,version=$4,updated_at=now() WHERE id=$1', [
        id,
        input.status,
        json(contract),
        contract.version,
      ]);
      await this.audit(tx, 'estado_contrato', id, { status: input.status, externalSignatureOnly: true });
      return contract;
    });
  }
  async recordPayment(id: string, body: unknown) {
    const input = parse(paymentDto, body);
    if (input.date > todayLima())
      throw new BadRequestException('No registres como realizado un pago futuro.');
    return this.db.transaction(async (tx) => {
      const prior = (
        await tx.query('SELECT id,contrato_id,solicitud_hash FROM pagos WHERE idempotency_key=$1', [
          input.idempotencyKey,
        ])
      ).rows[0];
      if (prior) {
        if (prior.contrato_id !== id || prior.solicitud_hash !== checksum(input))
          throw new ConflictException('La clave de reintento pertenece a otro registro.');
        return { id: prior.id, replayed: true };
      }
      const contract = (await queryOne(tx, 'SELECT datos FROM contratos WHERE id=$1 FOR UPDATE', [id]))
        .datos as Contract;
      const replay = (
        await tx.query('SELECT id,contrato_id,solicitud_hash FROM pagos WHERE idempotency_key=$1', [
          input.idempotencyKey,
        ])
      ).rows[0];
      if (replay) {
        if (replay.contrato_id !== id || replay.solicitud_hash !== checksum(input))
          throw new ConflictException('La clave de reintento pertenece a otro registro.');
        return { id: replay.id, replayed: true };
      }
      if (['cancelado', 'finalizado'].includes(contract.status))
        throw new ConflictException('Este contrato no admite nuevos pagos.');
      const rows = (
        await tx.query(
          'SELECT * FROM saldo_cuotas WHERE contrato_id=$1 ORDER BY fecha_vencimiento,numero_cuota',
          [id],
        )
      ).rows;
      const candidates = input.installmentId ? rows.filter((r) => r.id === input.installmentId) : rows;
      if (!candidates.length) throw new BadRequestException('La cuota no pertenece a este contrato.');
      if (input.amountCents > candidates.reduce((sum, r) => sum + Number(r.monto) - Number(r.pagado), 0))
        throw new BadRequestException('El pago supera el saldo pendiente.');
      if (input.receiptId) await queryOne(tx, 'SELECT id FROM comprobantes WHERE id=$1', [input.receiptId]);
      const paymentId = randomUUID();
      await tx.query(
        'INSERT INTO pagos(id,contrato_id,cuota_id,monto,fecha_pago,metodo_pago,referencia,observacion,comprobante_id,idempotency_key,solicitud_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [
          paymentId,
          id,
          input.installmentId || null,
          input.amountCents,
          input.date,
          input.method,
          input.reference,
          input.observation,
          input.receiptId || null,
          input.idempotencyKey,
          checksum(input),
        ],
      );
      let remaining = input.amountCents;
      for (const row of candidates) {
        const applied = Math.min(remaining, Number(row.monto) - Number(row.pagado));
        if (applied > 0) {
          await tx.query('INSERT INTO pago_aplicaciones(pago_id,cuota_id,monto) VALUES($1,$2,$3)', [
            paymentId,
            row.id,
            applied,
          ]);
          remaining -= applied;
        }
      }
      await this.syncInstallments(tx, id);
      await this.audit(tx, 'pago_registrado', paymentId, { contractId: id, amountCents: input.amountCents });
      return { id: paymentId, replayed: false };
    });
  }
  async syncInstallments(tx: Sql, id: string) {
    await tx.query(
      "UPDATE cuotas SET estado=CASE WHEN s.pagado>=cuotas.monto THEN 'pagada' WHEN cuotas.fecha_vencimiento<$2::date THEN 'vencida' ELSE 'pendiente' END,fecha_pago=CASE WHEN s.pagado>=cuotas.monto THEN s.ultima_fecha_pago ELSE NULL END,updated_at=now() FROM saldo_cuotas s WHERE cuotas.id=s.id AND cuotas.contrato_id=$1",
      [id, todayLima()],
    );
  }
  async voidPayment(id: string, body: unknown) {
    const { reason } = parse(voidDto, body);
    return this.db.transaction(async (tx) => {
      const pay = await queryOne(tx, 'SELECT contrato_id FROM pagos WHERE id=$1', [id]);
      const contract = await queryOne(tx, 'SELECT estado FROM contratos WHERE id=$1 FOR UPDATE', [
        pay.contrato_id,
      ]);
      if (contract.estado === 'finalizado')
        throw new ConflictException('No se anulan pagos de un contrato finalizado.');
      await tx.query('UPDATE pagos SET anulado=true,motivo_anulacion=$2,updated_at=now() WHERE id=$1', [
        id,
        reason,
      ]);
      await this.syncInstallments(tx, pay.contrato_id);
      await this.audit(tx, 'pago_anulado', id, { reason });
      return { ok: true };
    });
  }
  async state(): Promise<BillingData> {
    const [clients, quotes, contracts, installments, payments, settings] = await Promise.all([
      this.db.query('SELECT datos FROM clientes ORDER BY created_at DESC'),
      this.db.query('SELECT datos FROM cotizaciones ORDER BY created_at DESC'),
      this.db.query('SELECT datos FROM contratos ORDER BY created_at DESC'),
      this.db.query('SELECT * FROM saldo_cuotas ORDER BY fecha_vencimiento,numero_cuota'),
      this.db.query('SELECT * FROM pagos ORDER BY created_at DESC'),
      this.settings(),
    ]);
    const cs = contracts.rows.map((r) => r.datos as Contract);
    const ins = installments.rows.map((r) => ({
      id: r.id,
      contractId: r.contrato_id,
      number: r.numero_cuota,
      label: r.concepto,
      date: String(
        r.fecha_vencimiento instanceof Date
          ? r.fecha_vencimiento.toISOString().slice(0, 10)
          : r.fecha_vencimiento,
      ),
      amountCents: Number(r.monto),
      paidCents: Number(r.pagado),
      remainingCents: Number(r.monto) - Number(r.pagado),
      status: installmentStatus(
        Number(r.monto),
        Number(r.pagado),
        String(
          r.fecha_vencimiento instanceof Date
            ? r.fecha_vencimiento.toISOString().slice(0, 10)
            : r.fecha_vencimiento,
        ),
      ),
      paidDate: r.ultima_fecha_pago ? String(r.ultima_fecha_pago) : undefined,
    }));
    const validIds = new Set(cs.filter((c) => c.status !== 'cancelado').map((c) => c.id));
    return {
      clients: clients.rows.map((r) => r.datos),
      quotes: quotes.rows.map((r) => r.datos),
      contracts: cs,
      installments: ins,
      payments: payments.rows.map((r) => ({
        id: r.id,
        contractId: r.contrato_id,
        installmentId: r.cuota_id || undefined,
        amountCents: Number(r.monto),
        date: r.fecha_pago instanceof Date ? r.fecha_pago.toISOString().slice(0, 10) : String(r.fecha_pago),
        method: r.metodo_pago,
        reference: r.referencia,
        observation: r.observacion,
        receiptId: r.comprobante_id || undefined,
        voided: r.anulado,
        voidReason: r.motivo_anulacion || undefined,
        createdAt: String(r.created_at),
      })),
      ...settings,
      mode: this.db.mode,
      summary: {
        activeContracts: cs.filter((c) => c.status === 'activo').length,
        collectedCents: ins.filter((i) => validIds.has(i.contractId)).reduce((s, i) => s + i.paidCents, 0),
        outstandingCents: ins
          .filter((i) => validIds.has(i.contractId))
          .reduce((s, i) => s + i.remainingCents, 0),
        overdueCents: ins
          .filter((i) => validIds.has(i.contractId) && i.status === 'vencida')
          .reduce((s, i) => s + i.remainingCents, 0),
      },
    };
  }
}
