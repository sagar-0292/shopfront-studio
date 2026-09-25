// Proves the database's own security rules. Every test logs in as a real
// role and tries to read or change data it should (or should not) reach.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, as, pool, refused } from './harness';
import { seed, type World } from './fixtures';

let w: World;
const count = async (rows: Promise<{ rows: unknown[] }>) => (await rows).rows.length;

beforeAll(async () => {
  w = await seed();
});
afterAll(async () => {
  await pool.end();
});

describe('every table is protected', () => {
  it('has row-level security switched on for every table', async () => {
    const { rows } = await admin(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it('gives visitors (not logged in) no access to private tables', async () => {
    for (const table of ['organisations', 'clients', 'sites', 'orders', 'leads', 'profiles', 'audit_log',
                         'organisation_billing', 'invitations', 'client_members', 'sellers']) {
      const err = await refused(as('anon', (q) => q(`select * from ${table}`)));
      expect(err.code, table).toBe('42501');
    }
  });
});

describe('agency ↔ agency isolation', () => {
  it('agency B sees none of agency A', async () => {
    const b = w.people.ownerB;
    await as(b, async (q) => {
      const orgs = await q(`select id from organisations`);
      expect(orgs.rows.map((r) => r.id)).toEqual([w.orgB]);
      expect(await count(q(`select * from clients where organisation_id = $1`, [w.orgA]))).toBe(0);
      expect(await count(q(`select * from sites where organisation_id = $1`, [w.orgA]))).toBe(0);
      expect(await count(q(`select * from orders where organisation_id = $1`, [w.orgA]))).toBe(0);
      expect(await count(q(`select * from leads where organisation_id = $1`, [w.orgA]))).toBe(0);
      expect(await count(q(`select * from organisation_members where organisation_id = $1`, [w.orgA]))).toBe(0);
      expect(await count(q(`select * from audit_log where organisation_id = $1`, [w.orgA]))).toBe(0);
      expect(await count(q(`select * from organisation_billing where organisation_id = $1`, [w.orgA]))).toBe(0);
    });
  });

  it('agency B cannot change or delete agency A data', async () => {
    await as(w.people.ownerB, async (q) => {
      expect((await q(`update clients set name = 'hacked' where organisation_id = $1`, [w.orgA])).rowCount).toBe(0);
      expect((await q(`update products set price_paise = 1 where organisation_id = $1`, [w.orgA])).rowCount).toBe(0);
      expect((await q(`delete from sites where organisation_id = $1`, [w.orgA])).rowCount).toBe(0);
      expect((await q(`update organisations set name = 'hacked' where id = $1`, [w.orgA])).rowCount).toBe(0);
    });
  });

  it('agency B cannot create a client or site inside agency A', async () => {
    await refused(as(w.people.ownerB, (q) => q(`insert into clients (organisation_id, name) values ($1, 'Sneaky')`, [w.orgA])));
    await refused(as(w.people.ownerB, (q) => q(`insert into sites (client_id, name, slug) values ($1, 'Sneaky', 'sneaky')`, [w.clientA1])));
  });

  it('agency B cannot add itself to agency A', async () => {
    await refused(as(w.people.ownerB, (q) =>
      q(`insert into organisation_members (organisation_id, user_id, role) values ($1, $2, 'owner')`, [w.orgA, w.people.ownerB.id])));
  });
});

describe('client ↔ client isolation', () => {
  it('a client owner sees only their own client, sites and data', async () => {
    await as(w.people.clientA1Owner, async (q) => {
      expect((await q(`select id from clients`)).rows.map((r) => r.id)).toEqual([w.clientA1]);
      expect((await q(`select id from sites`)).rows.map((r) => r.id)).toEqual([w.siteA1]);
      expect(await count(q(`select * from orders where site_id <> $1`, [w.siteA1]))).toBe(0);
      expect(await count(q(`select * from orders where site_id = $1`, [w.siteA1]))).toBe(1);
      expect(await count(q(`select * from leads where site_id <> $1`, [w.siteA1]))).toBe(0);
      expect(await count(q(`select * from products where id = $1`, [w.products.a2Draft]))).toBe(0);
    });
  });

  it('a client owner cannot change another client’s products, orders or leads', async () => {
    await as(w.people.clientA1Owner, async (q) => {
      expect((await q(`update products set price_paise = 1 where site_id = $1`, [w.siteA2])).rowCount).toBe(0);
      expect((await q(`update products set price_paise = 1 where site_id = $1`, [w.siteB1])).rowCount).toBe(0);
      expect((await q(`update orders set status = 'cancelled' where site_id <> $1`, [w.siteA1])).rowCount).toBe(0);
      expect((await q(`delete from leads where site_id <> $1`, [w.siteA1])).rowCount).toBe(0);
    });
  });

  it('a client owner cannot add products to another client’s site', async () => {
    const err = await refused(as(w.people.clientA1Owner, (q) =>
      q(`insert into products (site_id, name, price_paise) values ($1, 'Fake', 100)`, [w.siteA2])));
    expect(err.code).toBe('42501');
  });

  it('a client owner cannot move their product to another client’s site', async () => {
    const err = await refused(as(w.people.clientA1Owner, (q) =>
      q(`update products set site_id = $1 where id = $2`, [w.siteA2, w.products.a1Shop])));
    expect(err.message).toMatch(/cannot be moved/);
  });

  it('pretending to belong to another agency does not work', async () => {
    // organisation_id is always taken from the website, never from the request.
    const row = await as(w.people.clientA1Owner, (q) =>
      q(`insert into products (organisation_id, site_id, name, price_paise) values ($1, $2, 'Barfi', 100) returning organisation_id`,
        [w.orgB, w.siteA1]));
    expect(row.rows[0].organisation_id).toBe(w.orgA);
  });

  it('a client owner cannot change their own site settings or client record', async () => {
    await as(w.people.clientA1Owner, async (q) => {
      expect((await q(`update sites set status = 'live' where id = $1`, [w.siteA1])).rowCount).toBe(0);
      expect((await q(`update clients set name = 'x' where id = $1`, [w.clientA1])).rowCount).toBe(0);
    });
  });

  it('a client owner cannot see agency team, billing or the audit log', async () => {
    await as(w.people.clientA1Owner, async (q) => {
      expect(await count(q(`select * from organisation_members`))).toBe(0);
      expect(await count(q(`select * from organisation_billing`))).toBe(0);
      expect(await count(q(`select * from audit_log`))).toBe(0);
    });
  });

  it('a client in agency B sees nothing of agency A', async () => {
    await as(w.people.clientB1Owner, async (q) => {
      expect((await q(`select id from sites`)).rows.map((r) => r.id)).toEqual([w.siteB1]);
      expect(await count(q(`select * from orders where organisation_id = $1`, [w.orgA]))).toBe(0);
    });
  });

  it('someone with no role sees nothing at all', async () => {
    await as(w.people.stranger, async (q) => {
      for (const t of ['organisations', 'clients', 'sites', 'orders', 'leads', 'sellers', 'invitations', 'audit_log']) {
        expect(await count(q(`select * from ${t}`)), t).toBe(0);
      }
    });
  });
});

describe('client staff with limited roles', () => {
  it('orders-only staff can see and update orders', async () => {
    await as(w.people.clientA1Staff, async (q) => {
      expect(await count(q(`select * from orders`))).toBe(1);
      expect((await q(`update orders set status = 'confirmed' where id = $1`, [w.orders.a1])).rowCount).toBe(1);
    });
  });

  it('orders-only staff cannot see leads or manage products', async () => {
    await as(w.people.clientA1Staff, async (q) => {
      expect(await count(q(`select * from leads`))).toBe(0);
      expect(await count(q(`select * from products where status = 'draft'`))).toBe(0);
      expect((await q(`update products set price_paise = 1 where site_id = $1`, [w.siteA1])).rowCount).toBe(0);
    });
    await refused(as(w.people.clientA1Staff, (q) =>
      q(`insert into products (site_id, name, price_paise) values ($1, 'x', 1)`, [w.siteA1])));
  });

  it('staff cannot give themselves more permissions', async () => {
    const r = await as(w.people.clientA1Staff, (q) =>
      q(`update client_members set permissions = '{orders,products,leads}' where user_id = $1`, [w.people.clientA1Staff.id]));
    expect(r.rowCount).toBe(0);
  });

  it('the client owner can add staff but not another business owner', async () => {
    await as(w.people.clientA1Owner, (q) =>
      q(`insert into client_members (client_id, user_id, role, permissions) values ($1, $2, 'client_staff', '{leads}')`,
        [w.clientA1, w.people.stranger.id]));
    const err = await refused(as(w.people.clientA1Owner, (q) =>
      q(`insert into client_members (client_id, user_id, role) values ($1, $2, 'client_owner')`, [w.clientA1, w.people.stranger.id])));
    expect(err.message).toMatch(/Only your agency/);
  });

  it('a client owner cannot add people to another client', async () => {
    await refused(as(w.people.clientA1Owner, (q) =>
      q(`insert into client_members (client_id, user_id, role) values ($1, $2, 'client_staff')`, [w.clientA2, w.people.stranger.id])));
  });
});

describe('marketplace sellers', () => {
  it('a seller sees their own products (including drafts) but not another seller’s drafts', async () => {
    await as(w.people.seller1, async (q) => {
      const ids = (await q(`select id from products`)).rows.map((r) => r.id);
      expect(ids).toContain(w.products.seller1Draft);
      expect(ids).toContain(w.products.seller1Active);
      expect(ids).not.toContain(w.products.seller2Draft);
      expect(ids).not.toContain(w.products.a1ShopDraft);
    });
  });

  it('a seller cannot change or delete another seller’s products', async () => {
    await as(w.people.seller1, async (q) => {
      expect((await q(`update products set price_paise = 1 where id = $1`, [w.products.seller2Active])).rowCount).toBe(0);
      expect((await q(`delete from products where id = $1`, [w.products.seller2Active])).rowCount).toBe(0);
      expect((await q(`update products set price_paise = 1 where id = $1`, [w.products.a1Shop])).rowCount).toBe(0);
    });
  });

  it('a seller can edit their own product', async () => {
    const r = await as(w.people.seller1, (q) => q(`update products set price_paise = 30000 where id = $1`, [w.products.seller1Active]));
    expect(r.rowCount).toBe(1);
  });

  it('a seller cannot create products under another seller', async () => {
    await refused(as(w.people.seller1, (q) =>
      q(`insert into products (site_id, seller_id, name, price_paise) values ($1, $2, 'Fake', 1)`, [w.siteA1, w.seller2])));
  });

  it('a seller cannot hand their product to another seller or to the shop', async () => {
    await refused(as(w.people.seller1, (q) =>
      q(`update products set seller_id = $1 where id = $2`, [w.seller2, w.products.seller1Active])));
    await refused(as(w.people.seller1, (q) =>
      q(`update products set seller_id = null where id = $1`, [w.products.seller1Active])));
  });

  it('a seller cannot change their own commission or see other sellers', async () => {
    await as(w.people.seller1, async (q) => {
      expect((await q(`update sellers set commission_bps = 0 where id = $1`, [w.seller1])).rowCount).toBe(0);
      expect((await q(`select id from sellers`)).rows.map((r) => r.id)).toEqual([w.seller1]);
    });
  });

  it('a seller cannot see the shop’s orders, leads or customers', async () => {
    await as(w.people.seller1, async (q) => {
      expect(await count(q(`select * from orders`))).toBe(0);
      expect(await count(q(`select * from leads`))).toBe(0);
      expect(await count(q(`select * from clients`))).toBe(0);
    });
  });

  it('the shop owner can manage every seller’s products on their site', async () => {
    const r = await as(w.people.clientA1Owner, (q) => q(`update products set featured = true where site_id = $1`, [w.siteA1]));
    expect(r.rowCount).toBe(6);
  });
});

describe('public visitors', () => {
  it('see only active and sold-out products of live websites', async () => {
    await as('anon', async (q) => {
      const ids = (await q(`select id from products`)).rows.map((r) => r.id).sort();
      expect(ids).toEqual([w.products.a1Shop, w.products.seller1Active, w.products.seller2Active, w.products.b1Active].sort());
    });
  });

  it('cannot change anything', async () => {
    await refused(as('anon', (q) => q(`update products set price_paise = 1`)));
    await refused(as('anon', (q) => q(`insert into products (site_id, name, price_paise) values ($1, 'x', 1)`, [w.siteA1])));
  });
});

describe('agency roles', () => {
  it('team members cannot see or change billing; owners can', async () => {
    await as(w.people.teamA, async (q) => {
      expect(await count(q(`select * from organisation_billing`))).toBe(0);
      expect((await q(`update organisation_billing set legal_name = 'x'`)).rowCount).toBe(0);
    });
    await as(w.people.ownerA, async (q) => {
      expect(await count(q(`select * from organisation_billing`))).toBe(1);
      expect((await q(`update organisation_billing set gstin = '27AAPFU0939F1ZV'`)).rowCount).toBe(1);
    });
  });

  it('team members can create and edit client projects', async () => {
    await as(w.people.teamA, async (q) => {
      const c = await q(`insert into clients (organisation_id, name) values ($1, 'New Cafe') returning id`, [w.orgA]);
      const s = await q(`insert into sites (client_id, name, slug) values ($1, 'New Cafe', 'new-cafe') returning organisation_id`, [c.rows[0].id]);
      expect(s.rows[0].organisation_id).toBe(w.orgA);
      expect((await q(`update sites set business_kind = 'Café' where id = $1`, [w.siteA1])).rowCount).toBe(1);
    });
  });

  it('team members cannot change team roles or invite agency members', async () => {
    await as(w.people.teamA, async (q) => {
      expect((await q(`update organisation_members set role = 'owner' where user_id = $1`, [w.people.teamA.id])).rowCount).toBe(0);
    });
    await refused(as(w.people.teamA, (q) =>
      q(`select * from create_invitation($1, 'agency', 'friend@x.test', 'team')`, [w.orgA])));
  });

  it('team members can invite a client owner', async () => {
    const r = await as(w.people.teamA, (q) =>
      q(`select * from create_invitation($1, 'client', 'boss@mithai.test', null, $2, 'client_owner')`, [w.orgA, w.clientA1]));
    expect(r.rows[0].token).toMatch(/^[0-9a-f]{48}$/);
  });

  it('the last owner cannot be removed or demoted', async () => {
    const err = await refused(as(w.people.ownerA, (q) =>
      q(`update organisation_members set role = 'team' where user_id = $1`, [w.people.ownerA.id])));
    expect(err.message).toMatch(/at least one owner/);
    await refused(as(w.people.ownerA, (q) => q(`delete from organisation_members where user_id = $1`, [w.people.ownerA.id])));
  });

  it('an owner can remove a team member', async () => {
    const r = await as(w.people.ownerA, (q) => q(`delete from organisation_members where user_id = $1`, [w.people.teamA.id]));
    expect(r.rowCount).toBe(1);
  });
});

describe('invitations', () => {
  async function invite(by: World['people'][keyof World['people']], sql: string, params: unknown[]) {
    return as(by, (q) => q(sql, params), { commit: true }).then((r: any) => r.rows[0].token as string);
  }

  it('client owners can invite staff but not another owner, and not for other clients', async () => {
    await as(w.people.clientA1Owner, (q) =>
      q(`select * from create_invitation($1, 'client', 'new-staff@mithai.test', null, $2, 'client_staff', '{orders}')`, [w.orgA, w.clientA1]));
    await refused(as(w.people.clientA1Owner, (q) =>
      q(`select * from create_invitation($1, 'client', 'x@mithai.test', null, $2, 'client_owner')`, [w.orgA, w.clientA1])));
    await refused(as(w.people.clientA1Owner, (q) =>
      q(`select * from create_invitation($1, 'client', 'x@clinic.test', null, $2, 'client_staff')`, [w.orgA, w.clientA2])));
  });

  it('only the invited email can accept, only once', async () => {
    const token = await invite(w.people.ownerA,
      `select * from create_invitation($1, 'client', 'Stranger@Nowhere.test', null, $2, 'client_staff', '{leads}')`, [w.orgA, w.clientA2]);

    const wrong = await refused(as(w.people.seller1, (q) => q(`select accept_invitation($1)`, [token])));
    expect(wrong.message).toMatch(/was sent to stranger@nowhere.test/);

    const preview = await as('anon', (q) => q(`select * from invitation_preview($1)`, [token]));
    expect(preview.rows[0]).toMatchObject({ kind: 'client', client_name: 'Kapoor Clinic', status: 'pending', role: 'client_staff' });

    await as(w.people.stranger, (q) => q(`select accept_invitation($1)`, [token]), { commit: true });
    await as(w.people.stranger, async (q) => {
      expect((await q(`select id from sites`)).rows.map((r) => r.id)).toEqual([w.siteA2]);
      expect(await count(q(`select * from leads`))).toBe(0); // clinic has no leads, but access works
      expect(await count(q(`select * from orders`))).toBe(0); // not permitted
    });

    const again = await refused(as(w.people.stranger, (q) => q(`select accept_invitation($1)`, [token])));
    expect(again.message).toMatch(/already been used/);
  });

  it('client owner invitations can be accepted (the agency-only rule does not block it)', async () => {
    const newOwner = (await admin(`insert into auth.users (email) values ('second-owner@bakery.test') returning id`)).rows[0].id;
    const token = await invite(w.people.ownerB,
      `select * from create_invitation($1, 'client', 'second-owner@bakery.test', null, $2, 'client_owner')`, [w.orgB, w.clientB1]);
    const kind = await as({ id: newOwner, email: 'second-owner@bakery.test' }, (q) => q(`select accept_invitation($1) as k`, [token]), { commit: true });
    expect(kind.rows[0].k).toBe('client');
  });

  it('expired and revoked invitations are refused', async () => {
    const token = await invite(w.people.ownerA, `select * from create_invitation($1, 'agency', 'stranger@nowhere.test', 'team')`, [w.orgA]);
    await admin(`update invitations set expires_at = now() - interval '1 day' where email = 'stranger@nowhere.test' and kind = 'agency'`);
    expect((await refused(as(w.people.stranger, (q) => q(`select accept_invitation($1)`, [token])))).message).toMatch(/expired/);

    const token2 = await invite(w.people.ownerA, `select * from create_invitation($1, 'agency', 'stranger@nowhere.test', 'team')`, [w.orgA]);
    await as(w.people.ownerA, (q) => q(`update invitations set revoked_at = now() where accepted_at is null and expires_at > now()`), { commit: true });
    expect((await refused(as(w.people.stranger, (q) => q(`select accept_invitation($1)`, [token2])))).message).toMatch(/cancelled/);
  });

  it('an invalid link is refused', async () => {
    expect((await refused(as(w.people.stranger, (q) => q(`select accept_invitation('nope')`)))).message).toMatch(/not valid/);
  });

  it('agency B cannot see or revoke agency A invitations', async () => {
    await as(w.people.ownerB, async (q) => {
      expect(await count(q(`select * from invitations where organisation_id = $1`, [w.orgA]))).toBe(0);
      expect((await q(`update invitations set revoked_at = now() where organisation_id = $1`, [w.orgA])).rowCount).toBe(0);
    });
  });

  it('the secret link token is never stored or logged', async () => {
    const token = await invite(w.people.ownerA, `select * from create_invitation($1, 'agency', 'logcheck@x.test', 'team')`, [w.orgA]);
    const stored = await admin(`select count(*)::int as n from invitations where token_hash = $1`, [token]);
    expect(stored.rows[0].n).toBe(0);
    const logged = await admin(`select count(*)::int as n from audit_log where new_data::text like '%' || $1 || '%' or new_data ? 'token_hash'`, [token]);
    expect(logged.rows[0].n).toBe(0);
  });
});

describe('audit log', () => {
  it('records who changed what', async () => {
    await as(w.people.clientA1Owner, (q) => q(`update products set price_paise = 99900 where id = $1`, [w.products.a1Shop]), { commit: true });
    const { rows } = await admin(
      `select actor_id, actor_email, action, old_data->>'price_paise' as before, new_data->>'price_paise' as after
       from audit_log where table_name = 'products' and record_id = $1 order by id desc limit 1`,
      [w.products.a1Shop],
    );
    expect(rows[0]).toMatchObject({ actor_id: w.people.clientA1Owner.id, actor_email: 'owner@mithai.test', action: 'update', after: '99900' });
  });

  it('nobody can edit or delete audit entries, not even the agency owner', async () => {
    await refused(as(w.people.ownerA, (q) => q(`update audit_log set actor_email = 'x'`)));
    await refused(as(w.people.ownerA, (q) => q(`delete from audit_log`)));
    await refused(as(w.people.ownerA, (q) => q(`insert into audit_log (table_name, action) values ('x', 'insert')`)));
  });

  it('agency owners can read their own log', async () => {
    const n = await as(w.people.ownerA, (q) => count(q(`select * from audit_log`)));
    expect(n).toBeGreaterThan(0);
  });
});

describe('creating an agency', () => {
  it('is closed once the first agency exists (default setting)', async () => {
    const err = await refused(as(w.people.stranger, (q) => q(`select create_agency('Rogue', 'rogue')`)));
    expect(err.message).toMatch(/not open/);
  });

  it('works when sign-ups are open, and makes the caller the owner', async () => {
    await admin(`update platform_settings set agency_signup_mode = 'open'`);
    const founder = (await admin(`insert into auth.users (email) values ('founder@pune.test') returning id`)).rows[0].id;
    try {
      await as({ id: founder, email: 'founder@pune.test' }, async (q) => {
        const org = (await q(`select create_agency('Pune Pixels', 'pune-pixels') as id`)).rows[0].id;
        const me = await q(`select role from organisation_members where organisation_id = $1`, [org]);
        expect(me.rows[0].role).toBe('owner');
        expect(await count(q(`select * from organisation_billing where organisation_id = $1`, [org]))).toBe(1);
        expect(await count(q(`select * from clients`))).toBe(0);
      });
    } finally {
      await admin(`update platform_settings set agency_signup_mode = 'first_only'`);
    }
  });

  it('nobody can read or change the platform settings directly', async () => {
    await refused(as(w.people.ownerA, (q) => q(`update platform_settings set agency_signup_mode = 'open'`)));
  });
});

describe('kit versions', () => {
  it('new websites start on a kit version', async () => {
    const { rows } = await admin(`select motion_kit_version, commerce_kit_version from sites where id = $1`, [w.siteA1]);
    expect(rows[0]).toEqual({ motion_kit_version: '1.0.0', commerce_kit_version: '1.0.0' });
  });

  it('only the agency owner can upgrade a website’s kits', async () => {
    const err = await refused(as(w.people.teamA, (q) => q(`update sites set motion_kit_version = '1.1.0' where id = $1`, [w.siteA1])));
    expect(err.message).toMatch(/Only the agency owner/);
    // team members can still edit everything else
    const ok = await as(w.people.teamA, (q) => q(`update sites set name = 'Mithai Market 2' where id = $1`, [w.siteA1]));
    expect(ok.rowCount).toBe(1);
    const up = await as(w.people.ownerA, (q) => q(`update sites set motion_kit_version = '1.1.0' where id = $1`, [w.siteA1]));
    expect(up.rowCount).toBe(1);
  });

  it('clients and other agencies cannot change kit versions', async () => {
    expect((await as(w.people.clientA1Owner, (q) => q(`update sites set commerce_kit_version = '9.9.9' where id = $1`, [w.siteA1]))).rowCount).toBe(0);
    expect((await as(w.people.ownerB, (q) => q(`update sites set commerce_kit_version = '9.9.9' where id = $1`, [w.siteA1]))).rowCount).toBe(0);
  });

  it('rejects nonsense version numbers', async () => {
    await refused(as(w.people.ownerA, (q) => q(`update sites set motion_kit_version = 'latest' where id = $1`, [w.siteA1])));
  });
});
