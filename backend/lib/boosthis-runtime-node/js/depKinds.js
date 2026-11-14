// @ts-nocheck
/* eslint-disable */
// Built from src/depKinds.ts so plain node can run the kit. Do not edit.
import { isHostedDatabaseCall } from "./dbWork.js";
import { aiProviderCode } from "./aiProviders.js";
const DEP_KIND_UNKNOWN = 0;
const DEP_KIND_OWN_BACKEND = 1;
const DEP_KIND_DATABASE = 2;
const DEP_KIND_AI = 3;
const DEP_KIND_STORAGE = 4;
const DEP_KIND_PAYMENTS = 5;
const DEP_KIND_OTHER = 6;
const DEP_KIND_MAX = 6;
const STORAGE_HOST_SUFFIXES = [
  ".r2.cloudflarestorage.com",
  ".blob.core.windows.net",
  "storage.googleapis.com",
  ".storage.googleapis.com",
  "api.cloudinary.com",
  "res.cloudinary.com",
  ".digitaloceanspaces.com",
  ".backblazeb2.com",
  ".wasabisys.com",
  "api.uploadthing.com",
  ".uploadthing.com",
  "api.bunny.net",
  ".b-cdn.net"
];
const S3_HOST_PREFIXES = ["s3.", "s3-"];
const AWS_APEX = ".amazonaws.com";
const PAYMENT_HOST_SUFFIXES = [
  "api.stripe.com",
  ".stripe.com",
  "api.moyasar.com",
  ".moyasar.com",
  "api.paypal.com",
  "api-m.paypal.com",
  ".paypal.com",
  "api.checkout.com",
  ".checkout.com",
  ".adyen.com",
  "api.braintreegateway.com",
  ".braintreegateway.com",
  "connect.squareup.com",
  ".squareup.com",
  "api.razorpay.com",
  "api.paddle.com",
  ".paddle.com",
  "api.lemonsqueezy.com",
  "api.mollie.com",
  ".tap.company",
  "api.myfatoorah.com",
  ".myfatoorah.com",
  "api.whop.com"
];
function matchesSuffix(host, suffixes) {
  for (const suffix of suffixes) {
    if (host === suffix || host.endsWith(suffix)) return true;
    if (suffix.startsWith(".") && host === suffix.slice(1)) return true;
  }
  return false;
}
function dependencyKindForHost(host) {
  try {
    const h = typeof host === "string" ? host.trim().toLowerCase() : "";
    if (!h) return DEP_KIND_UNKNOWN;
    if (isHostedDatabaseCall(h, "")) return DEP_KIND_DATABASE;
    if (aiProviderCode(h) > 0) return DEP_KIND_AI;
    if (matchesSuffix(h, STORAGE_HOST_SUFFIXES)) return DEP_KIND_STORAGE;
    if (h.endsWith(AWS_APEX) && S3_HOST_PREFIXES.some((p) => h.startsWith(p) || h.includes("." + p))) {
      return DEP_KIND_STORAGE;
    }
    if (matchesSuffix(h, PAYMENT_HOST_SUFFIXES)) return DEP_KIND_PAYMENTS;
    return DEP_KIND_OTHER;
  } catch {
    return DEP_KIND_UNKNOWN;
  }
}
export {
  DEP_KIND_AI,
  DEP_KIND_DATABASE,
  DEP_KIND_MAX,
  DEP_KIND_OTHER,
  DEP_KIND_OWN_BACKEND,
  DEP_KIND_PAYMENTS,
  DEP_KIND_STORAGE,
  DEP_KIND_UNKNOWN,
  dependencyKindForHost
};
