import { Pool } from "pg";

const globalPool = globalThis as unknown as { _pgPool?: Pool };

if (!globalPool._pgPool) {
  globalPool._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
  });
}

export const db = globalPool._pgPool;

export async function getUserSubscription(userId: string) {
  const result = await db.query(
    `SELECT s.*, p.name as product_name FROM subscriptions s
     JOIN products p ON p.id = s.product_id
     WHERE s.user_id = $1 AND s.status = 'active' AND s.current_period_end > NOW()
     ORDER BY s.created_at DESC LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function upsertSubscription(data: {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date;
  email?: string;
}) {
  // Find user by stripe customer ID or email
  let userResult = await db.query(
    `SELECT id FROM users WHERE stripe_customer_id = $1`,
    [data.stripeCustomerId]
  );

  if (userResult.rows.length === 0 && data.email) {
    userResult = await db.query(`SELECT id FROM users WHERE email = $1`, [
      data.email,
    ]);
  }

  if (userResult.rows.length === 0) return null;
  const userId = userResult.rows[0].id;

  const productResult = await db.query(
    `SELECT id FROM products WHERE slug = 'stratus-platform' LIMIT 1`
  );
  const productId = productResult.rows[0]?.id;

  await db.query(
    `INSERT INTO subscriptions (user_id, product_id, stripe_subscription_id, status, current_period_end, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (stripe_subscription_id)
     DO UPDATE SET status = $4, current_period_end = $5, updated_at = NOW()`,
    [
      userId,
      productId,
      data.stripeSubscriptionId,
      data.status,
      data.currentPeriodEnd,
    ]
  );

  return userId;
}

export async function setStripeCustomerId(userId: string, customerId: string) {
  await db.query(`UPDATE users SET stripe_customer_id = $1 WHERE id = $2`, [
    customerId,
    userId,
  ]);
}

export async function getStripeCustomerId(
  userId: string
): Promise<string | null> {
  const result = await db.query(
    `SELECT stripe_customer_id FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.stripe_customer_id ?? null;
}
