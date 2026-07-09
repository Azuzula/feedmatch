import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const currency = (body.currency || 'czk').toLowerCase();
    const secret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secret) return Response.json({ error: 'Stripe not configured' }, { status: 503 });

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const s = settings[0] || {};
    const amount = currency === 'eur' ? (s.price_eur || 27) : (s.price_czk || 690);

    const stripe = new Stripe(secret, { apiVersion: '2023-10-16' });
    const origin = req.headers.get('origin') || 'https://feedspy.app';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency,
          product_data: { name: 'FeedSpy - rocni predplatne / annual subscription' },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      success_url: origin + '/subscription?status=success',
      cancel_url: origin + '/subscription?status=cancel',
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, currency, base44_app_id: Deno.env.get('BASE44_APP_ID') }
    });
    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});