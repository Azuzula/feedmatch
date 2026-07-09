import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const currency = body.currency || 'czk';
    const secret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secret) return Response.json({ error: 'Stripe not configured' }, { status: 503 });
    const priceId = currency === 'eur' ? Deno.env.get('STRIPE_PRICE_ID_EUR') : Deno.env.get('STRIPE_PRICE_ID_CZK');
    if (!priceId) return Response.json({ error: 'Stripe price not configured for ' + currency }, { status: 503 });

    const stripe = new Stripe(secret, { apiVersion: '2023-10-16' });
    const origin = req.headers.get('origin') || 'https://feedspy.app';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: origin + '/subscription?status=success',
      cancel_url: origin + '/subscription?status=cancel',
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, currency }
    });
    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});