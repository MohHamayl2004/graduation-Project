// @ts-nocheck
/* eslint-disable */
// Built from src/dependencyKinds.ts so plain node can run the kit. Do not edit.
const DEPENDENCY_KINDS = ["signin", "storage", "payments", "messaging", "search", "other"];
const KNOWN_DEPENDENCY_KINDS = DEPENDENCY_KINDS.filter((k) => k !== "other");
const KIND_RULES = [
  // boosthis:dependency-rules:begin
  { domain: "clerk.accounts.dev", kind: "signin", service: "clerk" },
  { domain: "clerk.com", kind: "signin", service: "clerk" },
  { domain: "auth0.com", kind: "signin", service: "auth0" },
  { domain: "okta.com", kind: "signin", service: "okta" },
  { domain: "oktapreview.com", kind: "signin", service: "okta" },
  { domain: "okta-emea.com", kind: "signin", service: "okta" },
  { domain: "identitytoolkit.googleapis.com", kind: "signin", service: "firebase-auth" },
  { domain: "securetoken.googleapis.com", kind: "signin", service: "firebase-auth" },
  { domain: "accounts.google.com", kind: "signin", service: "google-sign-in" },
  { domain: "oauth2.googleapis.com", kind: "signin", service: "google-sign-in" },
  { domain: "login.microsoftonline.com", kind: "signin", service: "microsoft-sign-in" },
  { domain: "appleid.apple.com", kind: "signin", service: "apple-sign-in" },
  { domain: "amazoncognito.com", kind: "signin", service: "aws-cognito" },
  { domain: "amazonaws.com", prefix: "cognito-idp.", kind: "signin", service: "aws-cognito" },
  { domain: "amazonaws.com", prefix: "cognito-identity.", kind: "signin", service: "aws-cognito" },
  { domain: "workos.com", kind: "signin", service: "workos" },
  { domain: "authkit.app", kind: "signin", service: "workos" },
  { domain: "stytch.com", kind: "signin", service: "stytch" },
  { domain: "supertokens.io", kind: "signin", service: "supertokens" },
  { domain: "supertokens.com", kind: "signin", service: "supertokens" },
  { domain: "propelauth.com", kind: "signin", service: "propelauth" },
  { domain: "kinde.com", kind: "signin", service: "kinde" },
  { domain: "frontegg.com", kind: "signin", service: "frontegg" },
  { domain: "descope.com", kind: "signin", service: "descope" },
  { domain: "logto.app", kind: "signin", service: "logto" },
  { domain: "ory.sh", kind: "signin", service: "ory" },
  { domain: "api.magic.link", kind: "signin", service: "magic" },
  { domain: "keycloak.org", kind: "signin", service: "keycloak" },
  { domain: "s3.amazonaws.com", kind: "storage", service: "aws-s3" },
  { domain: "amazonaws.com", prefix: "s3.", kind: "storage", service: "aws-s3" },
  { domain: "amazonaws.com", prefix: "s3-", kind: "storage", service: "aws-s3" },
  { domain: "amazonaws.com", infix: ".s3.", kind: "storage", service: "aws-s3" },
  { domain: "amazonaws.com", infix: ".s3-", kind: "storage", service: "aws-s3" },
  { domain: "storage.googleapis.com", kind: "storage", service: "google-cloud-storage" },
  { domain: "firebasestorage.googleapis.com", kind: "storage", service: "firebase-storage" },
  { domain: "blob.core.windows.net", kind: "storage", service: "azure-blob-storage" },
  { domain: "r2.cloudflarestorage.com", kind: "storage", service: "cloudflare-r2" },
  { domain: "digitaloceanspaces.com", kind: "storage", service: "digitalocean-spaces" },
  { domain: "backblazeb2.com", kind: "storage", service: "backblaze-b2" },
  { domain: "wasabisys.com", kind: "storage", service: "wasabi" },
  { domain: "storage.bunnycdn.com", kind: "storage", service: "bunny-storage" },
  { domain: "cloudinary.com", kind: "storage", service: "cloudinary" },
  { domain: "imagekit.io", kind: "storage", service: "imagekit" },
  { domain: "uploadthing.com", kind: "storage", service: "uploadthing" },
  { domain: "uploadcare.com", kind: "storage", service: "uploadcare" },
  { domain: "ucarecdn.com", kind: "storage", service: "uploadcare" },
  { domain: "filestackapi.com", kind: "storage", service: "filestack" },
  { domain: "bytescale.com", kind: "storage", service: "bytescale" },
  { domain: "mux.com", kind: "storage", service: "mux" },
  { domain: "transloadit.com", kind: "storage", service: "transloadit" },
  { domain: "stripe.com", kind: "payments", service: "stripe" },
  { domain: "paypal.com", kind: "payments", service: "paypal" },
  { domain: "adyen.com", kind: "payments", service: "adyen" },
  { domain: "checkout.com", kind: "payments", service: "checkout-com" },
  { domain: "razorpay.com", kind: "payments", service: "razorpay" },
  { domain: "paddle.com", kind: "payments", service: "paddle" },
  { domain: "squareup.com", kind: "payments", service: "square" },
  { domain: "braintreegateway.com", kind: "payments", service: "braintree" },
  { domain: "lemonsqueezy.com", kind: "payments", service: "lemon-squeezy" },
  { domain: "mollie.com", kind: "payments", service: "mollie" },
  { domain: "paystack.co", kind: "payments", service: "paystack" },
  { domain: "flutterwave.com", kind: "payments", service: "flutterwave" },
  { domain: "moyasar.com", kind: "payments", service: "moyasar" },
  { domain: "tap.company", kind: "payments", service: "tap-payments" },
  { domain: "whop.com", kind: "payments", service: "whop" },
  { domain: "revenuecat.com", kind: "payments", service: "revenuecat" },
  { domain: "resend.com", kind: "messaging", service: "resend" },
  { domain: "sendgrid.com", kind: "messaging", service: "sendgrid" },
  { domain: "mailgun.net", kind: "messaging", service: "mailgun" },
  { domain: "mailgun.org", kind: "messaging", service: "mailgun" },
  { domain: "postmarkapp.com", kind: "messaging", service: "postmark" },
  { domain: "mailjet.com", kind: "messaging", service: "mailjet" },
  { domain: "mailchimp.com", kind: "messaging", service: "mailchimp" },
  { domain: "brevo.com", kind: "messaging", service: "brevo" },
  { domain: "sendinblue.com", kind: "messaging", service: "brevo" },
  { domain: "amazonaws.com", prefix: "email.", kind: "messaging", service: "aws-ses" },
  { domain: "twilio.com", kind: "messaging", service: "twilio" },
  { domain: "vonage.com", kind: "messaging", service: "vonage" },
  { domain: "nexmo.com", kind: "messaging", service: "vonage" },
  { domain: "unifonic.com", kind: "messaging", service: "unifonic" },
  { domain: "msg91.com", kind: "messaging", service: "msg91" },
  { domain: "api.telegram.org", kind: "messaging", service: "telegram" },
  { domain: "slack.com", kind: "messaging", service: "slack" },
  { domain: "discord.com", kind: "messaging", service: "discord" },
  { domain: "discordapp.com", kind: "messaging", service: "discord" },
  { domain: "fcm.googleapis.com", kind: "messaging", service: "firebase-messaging" },
  { domain: "onesignal.com", kind: "messaging", service: "onesignal" },
  { domain: "exp.host", kind: "messaging", service: "expo-push" },
  { domain: "pushover.net", kind: "messaging", service: "pushover" },
  { domain: "knock.app", kind: "messaging", service: "knock" },
  { domain: "courier.com", kind: "messaging", service: "courier" },
  { domain: "pinecone.io", kind: "search", service: "pinecone" },
  { domain: "weaviate.network", kind: "search", service: "weaviate" },
  { domain: "weaviate.cloud", kind: "search", service: "weaviate" },
  { domain: "qdrant.io", kind: "search", service: "qdrant" },
  { domain: "qdrant.tech", kind: "search", service: "qdrant" },
  { domain: "zillizcloud.com", kind: "search", service: "zilliz" },
  { domain: "zilliz.com", kind: "search", service: "zilliz" },
  { domain: "trychroma.com", kind: "search", service: "chroma" },
  { domain: "turbopuffer.com", kind: "search", service: "turbopuffer" },
  { domain: "vectara.io", kind: "search", service: "vectara" },
  { domain: "algolia.net", kind: "search", service: "algolia" },
  { domain: "algolianet.com", kind: "search", service: "algolia" },
  { domain: "algolia.io", kind: "search", service: "algolia" },
  { domain: "typesense.net", kind: "search", service: "typesense" },
  { domain: "meilisearch.io", kind: "search", service: "meilisearch" },
  { domain: "meilisearch.com", kind: "search", service: "meilisearch" },
  { domain: "elastic-cloud.com", kind: "search", service: "elastic-cloud" }
  // boosthis:dependency-rules:end
];
function dependencyFor(host) {
  try {
    const h = typeof host === "string" ? host.toLowerCase() : "";
    if (!h) return { kind: "other" };
    for (const rule of KIND_RULES) {
      if (h !== rule.domain && !h.endsWith("." + rule.domain)) continue;
      if (rule.prefix && !h.startsWith(rule.prefix)) continue;
      if (rule.infix && !h.includes(rule.infix)) continue;
      return { kind: rule.kind, service: rule.service };
    }
  } catch {
  }
  return { kind: "other" };
}
function dependencyKindFor(host) {
  return dependencyFor(host).kind;
}
const BARE_ADDRESS_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
function looksLikeAddress(label) {
  return BARE_ADDRESS_RE.test(label);
}
const IN_APP_SIGNIN_PACKAGES = [
  "next-auth",
  "@auth/core",
  "@auth/sveltekit",
  "@auth/express",
  "better-auth",
  "lucia",
  "@lucia-auth/adapter-drizzle",
  "passport",
  "passport-local",
  "openid-client",
  "remix-auth",
  "@nestjs/passport",
  "grant",
  "supertokens-node"
];
export {
  DEPENDENCY_KINDS,
  IN_APP_SIGNIN_PACKAGES,
  KIND_RULES,
  KNOWN_DEPENDENCY_KINDS,
  dependencyFor,
  dependencyKindFor,
  looksLikeAddress
};
