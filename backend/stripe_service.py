"""
Stripe Integration for Legenddary Platform
Subscription management, webhooks, checkout
"""
import stripe
from datetime import datetime, timezone
from typing import Optional
from config import get_settings

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY


PRICE_TO_TIER = {
    settings.STRIPE_STARTER_PRICE_ID: "starter",
    settings.STRIPE_PRO_PRICE_ID: "pro",
    settings.STRIPE_PUBLISHER_PRICE_ID: "publisher",
}


async def create_stripe_customer(email: str, name: str, user_id: str) -> str:
    """Create a Stripe customer and return the customer ID"""
    customer = stripe.Customer.create(
        email=email,
        name=name,
        metadata={"user_id": user_id}
    )
    return customer.id


async def create_checkout_session(
    customer_id: str,
    price_id: str,
    success_url: str,
    cancel_url: str,
    user_id: str
) -> str:
    """Create a Stripe checkout session for subscription"""
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user_id}
    )
    return session.url


async def create_billing_portal_session(customer_id: str, return_url: str) -> str:
    """Create a billing portal session for customer to manage subscription"""
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url
    )
    return session.url


async def cancel_subscription(subscription_id: str) -> bool:
    """Cancel a subscription"""
    try:
        stripe.Subscription.delete(subscription_id)
        return True
    except stripe.error.StripeError:
        return False


async def get_subscription_details(subscription_id: str) -> Optional[dict]:
    """Get subscription details from Stripe"""
    try:
        sub = stripe.Subscription.retrieve(subscription_id)
        return {
            "id": sub.id,
            "status": sub.status,
            "current_period_end": datetime.fromtimestamp(sub.current_period_end, tz=timezone.utc).isoformat(),
            "cancel_at_period_end": sub.cancel_at_period_end,
            "price_id": sub["items"]["data"][0]["price"]["id"] if sub["items"]["data"] else None
        }
    except stripe.error.StripeError:
        return None


def verify_webhook_signature(payload: bytes, sig_header: str) -> Optional[dict]:
    """Verify Stripe webhook signature and return event"""
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        return event
    except (ValueError, stripe.error.SignatureVerificationError):
        return None


async def handle_checkout_completed(db, event_data: dict):
    """Handle checkout.session.completed webhook"""
    session = event_data
    user_id = session.get("metadata", {}).get("user_id")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    
    if not user_id:
        return False
    
    # Get subscription to find the tier
    sub = stripe.Subscription.retrieve(subscription_id)
    price_id = sub["items"]["data"][0]["price"]["id"]
    tier = PRICE_TO_TIER.get(price_id, "starter")
    
    # Update user in database
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
            "subscription_tier": tier,
            "subscription_status": "active",
            "subscription_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return True


async def handle_invoice_paid(db, event_data: dict):
    """Handle invoice.paid webhook - subscription renewed"""
    invoice = event_data
    customer_id = invoice.get("customer")
    subscription_id = invoice.get("subscription")
    
    # Find user by customer ID
    user = await db.users.find_one({"stripe_customer_id": customer_id}, {"_id": 0})
    if not user:
        return False
    
    # Reset monthly usage on successful payment
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    await db.usage.update_one(
        {"user_id": user["id"], "month": month_start.isoformat()},
        {"$set": {"ai_calls": 0, "exports": 0, "reset_at": now.isoformat()}},
        upsert=True
    )
    
    # Update subscription status
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "subscription_status": "active",
            "subscription_updated_at": now.isoformat()
        }}
    )
    return True


async def handle_subscription_deleted(db, event_data: dict):
    """Handle customer.subscription.deleted webhook"""
    subscription = event_data
    customer_id = subscription.get("customer")
    
    # Find user and downgrade to free
    user = await db.users.find_one({"stripe_customer_id": customer_id}, {"_id": 0})
    if not user:
        return False
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "subscription_tier": "free",
            "subscription_status": "canceled",
            "stripe_subscription_id": None,
            "subscription_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return True
