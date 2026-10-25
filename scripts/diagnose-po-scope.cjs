// Read-only diagnostics using application configuration. Never prints credentials.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const fs = require('fs');
const ts = require('typescript');
const path = require('path');
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', 'module', code)(id => {
    if (id === '@/lib/ttl-cache') return { cacheGet: () => undefined };
    return load(id.startsWith('@/') ? path.resolve(__dirname, '../src', id.slice(2) + '.ts') : path.resolve(path.dirname(file), id + '.ts'));
  }, module.exports, module);
  return module.exports;
}
const { poScopeFromUnits } = load(path.resolve(__dirname, '../src/lib/utils/poScope.ts'));
const { checkPOOwnership } = load(path.resolve(__dirname, '../src/lib/utils/regional.ts'));
const { buildPOQueryParams } = load(path.resolve(__dirname, '../src/app/api/po/services/poQueryBuilder.ts'));
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL?.replace(/([?&])sslmode=require&?/, '$1'), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000, statement_timeout: 15000 });
  try {
    await client.connect(); await client.query('BEGIN READ ONLY');
    const users = (await client.query('SELECT email, role, regional, "siteArea" FROM "User" WHERE lower(email) = ANY($1)', [['rmi_27001@bulog.co.id', 'spbdki@bulog.co.id']])).rows;
    const pos = (await client.query('SELECT p.id, p."noPo", p.regional, p."unitProduksiId", u."namaRegional", u."kodeRegional", u."siteArea" FROM "PurchaseOrder" p LEFT JOIN "UnitProduksi" u ON u."idRegional" = p."unitProduksiId" WHERE lower(trim(p."noPo")) = lower($1)', ['PO-Testing-E2E 1'])).rows;
    const units = (await client.query('SELECT "idRegional", "namaRegional", "kodeRegional", "siteArea" FROM "UnitProduksi"')).rows;
    console.log(JSON.stringify({ users, pos, checks: users.map(user => ({ email: user.email, scope: poScopeFromUnits(user.role, user.regional, user.siteArea, units), ownership: pos.map(po => ({ noPo: po.noPo, ...checkPOOwnership({ ...po, UnitProduksi: { idRegional: po.unitProduksiId, namaRegional: po.namaRegional, kodeRegional: po.kodeRegional, siteArea: po.siteArea } }, user.role, user.regional, user.siteArea) })) })) }, null, 2));
    await client.query('ROLLBACK');
    const { PrismaClient } = require('../server/generated/prisma');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL?.replace(/([?&])sslmode=require&?/, '$1'), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 }) });
    try {
      await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
        for (const user of users) {
          const params = new URLSearchParams({ noPo: 'PO-Testing-E2E 1', summary: 'true', limit: '10', offset: '0' });
          if (user.role === 'sitearea') params.set('siteArea', user.siteArea);
          const auth = { role: user.role, dbUser: user, session: {} };
          const oldQuery = buildPOQueryParams(params, auth);
          const query = buildPOQueryParams(params, { ...auth, resolvedPoScope: poScopeFromUnits(user.role, user.regional, user.siteArea, units) });
          const before = await tx.purchaseOrder.count({ where: oldQuery.where });
          const after = await tx.purchaseOrder.findMany({ where: query.where, orderBy: query.orderBy, take: query.take, skip: query.skip, select: { noPo: true } });
          const relationExact = await tx.purchaseOrder.count({ where: { noPo: 'PO-Testing-E2E 1', UnitProduksi: { siteArea: { equals: 'SPB DKI', mode: 'insensitive' } } } });
          console.log(JSON.stringify({ email: user.email, priorWhere: oldQuery.where, priorTextScopeMatches: before, relationExactMatches: relationExact, resolvedScopeMatches: after }));
        }
      }, { timeout: 30000 });
    } finally { await prisma.$disconnect(); }
  } catch (error) { console.error('Read-only diagnostic failed:', error.code || error.name); process.exitCode = 1; }
  finally { await client.end(); }
})();
