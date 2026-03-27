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

// DNS CNAME: custom domain → Worker's workers.dev hostname
let dnsRecord: cloudflare.DnsRecord | undefined;
if (zoneId && customDomain) {
  const zone = cloudflare.getZoneOutput({ zoneId });
  const recordName = zone.name.apply((zoneName) =>
    customDomain === zoneName ? "@" : customDomain.replace(`.${zoneName}`, "")
  );
  dnsRecord = new cloudflare.DnsRecord("hexapath-cname", {
    zoneId,
    name: recordName,
    type: "CNAME",
    content: `${workerName}.workers.dev`,
    ttl: 1,
    proxied: true,
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
export const accessApplicationId = accessApp?.id;
export const dnsCnameId = dnsRecord?.id;
