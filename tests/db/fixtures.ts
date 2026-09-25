// Two agencies, several clients, a marketplace with two sellers, and one
// person for every role. Everything is created as the database superuser.
import { admin } from './harness';

export type User = { id: string; email: string };

async function user(email: string, name: string): Promise<User> {
  const { rows } = await admin(
    `insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('full_name', $2::text)) returning id`,
    [email, name],
  );
  return { id: rows[0].id, email };
}

async function one(sql: string, params: unknown[]) {
  const { rows } = await admin(sql, params);
  return rows[0].id as string;
}

export async function seed() {
  const people = {
    ownerA: await user('owner@agency-a.test', 'Asha Owner'),
    teamA: await user('team@agency-a.test', 'Tarun Team'),
    ownerB: await user('owner@agency-b.test', 'Bina Owner'),
    clientA1Owner: await user('owner@mithai.test', 'Mehul Mithai'),
    clientA1Staff: await user('orders@mithai.test', 'Sonal Staff'),
    clientA2Owner: await user('owner@clinic.test', 'Dr Kapoor'),
    clientB1Owner: await user('owner@bakery.test', 'Bakery Owner'),
    seller1: await user('seller1@market.test', 'Seller One'),
    seller2: await user('seller2@market.test', 'Seller Two'),
    stranger: await user('stranger@nowhere.test', 'Nobody'),
  };

  const orgA = await one(`insert into organisations (name, slug) values ('Agency A', 'agency-a') returning id`, []);
  const orgB = await one(`insert into organisations (name, slug) values ('Agency B', 'agency-b') returning id`, []);
  await admin(`insert into organisation_billing (organisation_id, legal_name) values ($1, 'Agency A Pvt Ltd'), ($2, 'Agency B LLP')`, [orgA, orgB]);
  await admin(
    `insert into organisation_members (organisation_id, user_id, role) values ($1, $2, 'owner'), ($1, $3, 'team'), ($4, $5, 'owner')`,
    [orgA, people.ownerA.id, people.teamA.id, orgB, people.ownerB.id],
  );

  const clientA1 = await one(`insert into clients (organisation_id, name) values ($1, 'Mithai Market') returning id`, [orgA]);
  const clientA2 = await one(`insert into clients (organisation_id, name) values ($1, 'Kapoor Clinic') returning id`, [orgA]);
  const clientB1 = await one(`insert into clients (organisation_id, name) values ($1, 'Bandra Bakery') returning id`, [orgB]);

  await admin(
    `insert into client_members (client_id, user_id, role, permissions) values
       ($1, $2, 'client_owner', '{}'), ($1, $3, 'client_staff', '{orders}'),
       ($4, $5, 'client_owner', '{}'), ($6, $7, 'client_owner', '{}')`,
    [clientA1, people.clientA1Owner.id, people.clientA1Staff.id, clientA2, people.clientA2Owner.id, clientB1, people.clientB1Owner.id],
  );

  const siteA1 = await one(
    `insert into sites (client_id, name, slug, site_types, status) values ($1, 'Mithai Market', 'mithai-market', '{marketplace}', 'live') returning id`,
    [clientA1],
  );
  const siteA2 = await one(
    `insert into sites (client_id, name, slug, site_types, status) values ($1, 'Kapoor Clinic', 'kapoor-clinic', '{bookings}', 'draft') returning id`,
    [clientA2],
  );
  const siteB1 = await one(
    `insert into sites (client_id, name, slug, site_types, status) values ($1, 'Bandra Bakery', 'bandra-bakery', '{online_store}', 'live') returning id`,
    [clientB1],
  );

  const seller1 = await one(`insert into sellers (site_id, name, status) values ($1, 'Seller One Sweets', 'active') returning id`, [siteA1]);
  const seller2 = await one(`insert into sellers (site_id, name, status) values ($1, 'Seller Two Namkeen', 'active') returning id`, [siteA1]);
  await admin(`insert into seller_members (seller_id, user_id) values ($1, $2), ($3, $4)`, [seller1, people.seller1.id, seller2, people.seller2.id]);

  const catA1 = await one(`insert into categories (site_id, name) values ($1, 'Sweets') returning id`, [siteA1]);
  const product = (site: string, name: string, status: string, seller: string | null = null) =>
    one(`insert into products (site_id, name, price_paise, status, seller_id) values ($1, $2, 25000, $3, $4) returning id`, [site, name, status, seller]);

  const products = {
    a1Shop: await product(siteA1, 'Kaju Katli (shop)', 'active'),
    a1ShopDraft: await product(siteA1, 'Secret Recipe (draft)', 'draft'),
    seller1Active: await product(siteA1, 'Seller One Ladoo', 'active', seller1),
    seller1Draft: await product(siteA1, 'Seller One Draft', 'draft', seller1),
    seller2Active: await product(siteA1, 'Seller Two Bhujia', 'active', seller2),
    seller2Draft: await product(siteA1, 'Seller Two Draft', 'draft', seller2),
    a2Draft: await product(siteA2, 'Consultation', 'draft'),
    b1Active: await product(siteB1, 'Sourdough', 'active'),
  };

  const orders = {
    a1: await one(`insert into orders (site_id, customer_name, total_paise) values ($1, 'Ravi', 125000) returning id`, [siteA1]),
    a2: await one(`insert into orders (site_id, customer_name, total_paise) values ($1, 'Priya', 50000) returning id`, [siteA2]),
    b1: await one(`insert into orders (site_id, customer_name, total_paise) values ($1, 'Joseph', 30000) returning id`, [siteB1]),
  };
  const leads = {
    a1: await one(`insert into leads (site_id, name, message) values ($1, 'Wedding order', 'Need 20kg') returning id`, [siteA1]),
    b1: await one(`insert into leads (site_id, name, message) values ($1, 'Cake enquiry', 'Birthday') returning id`, [siteB1]),
  };

  return { people, orgA, orgB, clientA1, clientA2, clientB1, siteA1, siteA2, siteB1, seller1, seller2, catA1, products, orders, leads };
}

export type World = Awaited<ReturnType<typeof seed>>;
