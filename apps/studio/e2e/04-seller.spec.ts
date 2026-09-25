import { logIn, signUp, sql, test, expect } from './helpers';

test('a marketplace seller sees only their own products, with prices in rupees', async ({ page }) => {
  const [site] = await sql<{ id: string }>(`select id from sites where name = 'Mithai Market'`);
  const [s1] = await sql<{ id: string }>(`insert into sellers (site_id, name, status) values ($1, 'Joshi Sweets', 'active') returning id`, [site.id]);
  const [s2] = await sql<{ id: string }>(`insert into sellers (site_id, name, status) values ($1, 'Rival Namkeen', 'active') returning id`, [site.id]);
  await sql(
    `insert into products (site_id, seller_id, name, price_paise, mrp_paise, status) values
      ($1, $2, 'Diwali hamper', 12500000, 15000000, 'active'),
      ($1, $2, 'Kaju katli 500g', 49950, null, 'draft'),
      ($1, $3, 'Rival bhujia', 9900, null, 'active')`,
    [site.id, s1.id, s2.id],
  );

  await signUp(page, 'Joshi Seller', 'seller@joshisweets.test');
  const [u] = await sql<{ id: string }>(`select id from auth.users where email = 'seller@joshisweets.test'`);
  await sql(`insert into seller_members (seller_id, user_id) values ($1, $2)`, [s1.id, u.id]);

  await logIn(page, 'seller@joshisweets.test');
  await expect(page).toHaveURL(/\/seller$/);
  await expect(page.getByRole('heading', { name: 'Joshi Sweets' })).toBeVisible();
  const products = page.getByRole('list', { name: 'Products' });
  await expect(products.getByText('Diwali hamper')).toBeVisible();
  await expect(products.getByText('₹1,25,000')).toBeVisible();
  await expect(products.getByText('₹1,50,000')).toBeVisible();
  await expect(products.getByText('₹499.50')).toBeVisible();
  await expect(products.getByText('Rival bhujia')).toHaveCount(0);

  await page.goto('/studio');
  await expect(page).toHaveURL(/\/seller$/);
});
