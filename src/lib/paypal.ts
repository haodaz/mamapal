// Thin PayPal REST client (sandbox). Orders v2 for outbound spend, Payouts v1 for inbound micro-earnings.
// Boundary: sandbox only; no webhooks; no refunds; tokens are not cached across cold starts.

const BASE = process.env.PAYPAL_BASE_URL ?? "https://api-m.sandbox.paypal.com";

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

let cached: { token: string; exp: number } | null = null;

export async function accessToken(): Promise<string> {
  if (!paypalConfigured()) throw new Error("PayPal sandbox is not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)");
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

async function call<T>(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PayPal ${method} ${path} failed: ${res.status} ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}

const money = (n: number) => ({ currency_code: "USD", value: n.toFixed(2) });

export type OrderItem = { name: string; price: number; description?: string };

export async function createOrder(items: OrderItem[], description: string, customId: string) {
  const total = items.reduce((s, i) => s + i.price, 0);
  return call<{ id: string; status: string }>("POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        custom_id: customId,
        description: description.slice(0, 127),
        amount: { ...money(total), breakdown: { item_total: money(total) } },
        items: items.map((i) => ({
          name: i.name.slice(0, 127),
          description: i.description?.slice(0, 127),
          quantity: "1",
          unit_amount: money(i.price),
          category: "PHYSICAL_GOODS",
        })),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "Survive & Thrive",
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
        },
      },
    },
  });
}

export type CaptureResult = {
  id: string;
  status: string;
  purchase_units?: { payments?: { captures?: { id: string; status: string; amount: { value: string } }[] } }[];
};

export async function captureOrder(orderId: string) {
  return call<CaptureResult>("POST", `/v2/checkout/orders/${orderId}/capture`, undefined, {
    "PayPal-Request-Id": `cap-${orderId}`,
  });
}

export async function createPayout(receiverEmail: string, amount: number, note: string, itemId: string) {
  return call<{ batch_header: { payout_batch_id: string; batch_status: string } }>("POST", "/v1/payments/payouts", {
    sender_batch_header: {
      sender_batch_id: `st-${itemId}-${Date.now().toString(36)}`,
      email_subject: "Survive & Thrive: micro-survey reward",
      email_message: note,
    },
    items: [
      {
        recipient_type: "EMAIL",
        amount: { value: amount.toFixed(2), currency: "USD" }, // Payouts v1 uses `currency`, not `currency_code`
        receiver: receiverEmail,
        note,
        sender_item_id: itemId,
      },
    ],
  });
}
