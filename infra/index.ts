import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

const config = new pulumi.Config();
const stack = pulumi.getStack();

const accountId = config.require("accountId");
const workerName = config.get("projectName") ?? (stack === "hex-dev" ? "hexapath-dev" : "hexapath");
const customDomain = config.get("customDomain");
const zoneId = config.get("zoneId");
const enableZeroTrust = config.getBoolean("enableZeroTrust") ?? false;
const accessEmails = config.getSecret("accessEmails")?.apply((v) => v.split(",").map((e) => e.trim()));
const accessEmailDomains = config.getSecret("accessEmailDomains")?.apply((v) => v.split(",").map((d) => d.trim()));

// Worker Custom Domain: routes traffic for the custom domain to the Worker and handles SSL
let workerDomain: cloudflare.WorkerDomain | undefined;
if (zoneId && customDomain) {
  workerDomain = new cloudflare.WorkerDomain("hexapath-domain", {
    accountId,
    hostname: customDomain,
    service: workerName,
    zoneId,
  });
}

// Zero Trust Access for dev
let accessApp: cloudflare.ZeroTrustAccessApplication | undefined;
if (enableZeroTrust && zoneId && customDomain) {
  const policyIncludes = pulumi.all([accessEmails, accessEmailDomains]).apply(([emails, domains]) => {
    const includes: Record<string, unknown>[] = [];
    for (const email of emails ?? []) includes.push({ email: { email } });
    for (const domain of domains ?? []) includes.push({ emailDomain: { domain } });
    if (includes.length === 0) throw new Error("Set at least one of accessEmails or accessEmailDomains for Zero Trust.");
    return includes;
  });

  accessApp = new cloudflare.ZeroTrustAccessApplication("hexapath-access", {
    zoneId,
    name: `HexaPath (${stack})`,
    type: "self_hosted",
    domain: customDomain,
    sessionDuration: "24h",
    policies: [
      {
        name: "Allowed users",
        decision: "allow",
        precedence: 1,
        includes: policyIncludes,
      },
    ],
  });
}

export const stackName = stack;
export const workerNameOutput = workerName;
export const customDomainOutput = customDomain;
export const workerDomainId = workerDomain?.id;
export const accessApplicationId = accessApp?.id;
