import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

const config = new pulumi.Config();
const stack = pulumi.getStack();

const accountId = config.require("accountId");
const projectName = config.get("projectName") ?? (stack === "hex-dev" ? "hexapath-dev" : "hexapath");
const customDomain = config.get("customDomain");
const zoneId = config.get("zoneId");
const enableZeroTrust = config.getBoolean("enableZeroTrust") ?? false;
const accessEmails = config.getSecret("accessEmails")?.apply((v) => v.split(",").map((e) => e.trim()));
const accessEmailDomains = config.getSecret("accessEmailDomains")?.apply((v) => v.split(",").map((d) => d.trim()));

const pagesProject = new cloudflare.PagesProject("hexapath-pages", {
  accountId,
  name: projectName,
  productionBranch: "main",
  buildConfig: {
    buildCommand: "bun run build",
    destinationDir: "dist",
    rootDir: "/",
    buildCaching: true,
  },
});

let pagesDomain: cloudflare.PagesDomain | undefined;
if (customDomain) {
  pagesDomain = new cloudflare.PagesDomain("hexapath-domain", {
    accountId,
    projectName: pagesProject.name,
    name: customDomain,
  });
}

let dnsRecord: cloudflare.DnsRecord | undefined;
if (zoneId && customDomain) {
  const zone = cloudflare.getZoneOutput({ zoneId });
  const recordName = zone.name.apply((zoneName) =>
    customDomain === zoneName ? "@" : customDomain.replace(`.${zoneName}`, "")
  );
  const recordContent = pagesProject.name.apply((name) => `${name}.pages.dev`);
  dnsRecord = new cloudflare.DnsRecord("hexapath-pages-cname", {
    zoneId,
    name: recordName,
    type: "CNAME",
    content: recordContent,
    ttl: 1,
    proxied: true,
  });
}

let accessApp: cloudflare.ZeroTrustAccessApplication | undefined;
if (enableZeroTrust && zoneId && customDomain) {
  const idps = cloudflare.getZeroTrustAccessIdentityProvidersOutput({ accountId });
  const otpIdpId = idps.results.apply((results) => {
    const otp = results.find((r) => r.type === "onetimepin");
    if (!otp) throw new Error("One-time PIN identity provider not found in Cloudflare Zero Trust. Add it in the dashboard first.");
    return otp.id;
  });

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
    allowedIdps: otpIdpId.apply((id) => [id]),
    autoRedirectToIdentity: true,
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
export const projectNameOutput = pagesProject.name;
export const projectId = pagesProject.id;
export const customDomainOutput = pagesDomain?.name;
export const accessApplicationId = accessApp?.id;
export const pagesCnameId = dnsRecord?.id;
