# Infrastructure (Pulumi)

Cloudflare resources for HexaPath. Two stacks:

| Stack        | Pages project  | Custom domain              | Zero Trust | DNS   |
|--------------|----------------|----------------------------|------------|-------|
| **hex-dev**  | `hexapath-dev` | `test.hex.pixelchaos.blog` | Yes (email OTP) | CNAME in `pixelchaos.blog` zone |
| **hex-prod** | `hexapath`     | `hex.pixelchaos.blog`      | No | CNAME in `pixelchaos.blog` zone |

## Config keys

| Key | Description | Required |
|-----|-------------|----------|
| `accountId` | Cloudflare account ID | Both stacks |
| `cloudflare:apiToken` | Cloudflare API token (secret) | Both stacks |
| `projectName` | Pages project name (defaults to `hexapath-dev`/`hexapath`) | Optional |
| `customDomain` | Custom domain for the Pages project | Optional |
| `zoneId` | Zone ID for `pixelchaos.blog` — used for DNS CNAME and Zero Trust | Both stacks |
| `enableZeroTrust` | Enable Cloudflare Zero Trust Access (`true`/`false`) | Dev only |
| `accessEmailDomains` | Comma-separated email domains for Zero Trust allow list | Optional (defaults to `lensdata.gmbh,tenderlens.ai`) |

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/install/)
- [Node.js](https://nodejs.org/) 20+ and pnpm
- Cloudflare account with [API token](https://dash.cloudflare.com/profile/api-tokens) (Pages edit + Zero Trust/Access if using dev)
- Zone `pixelchaos.blog` already in Cloudflare

## One-time setup

1. **Login to Pulumi:**

   ```bash
   pulumi login
   ```

2. **Create both stacks:**

   ```bash
   cd infra
   pnpm install
   pulumi stack init hex-dev
   pulumi stack init hex-prod
   ```

3. **Configure each stack** (same zone ID for both — get it from Cloudflare Dashboard > Websites > pixelchaos.blog > Overview):

   ```bash
   pulumi stack select hex-dev
   pulumi config set --secret cloudflare:apiToken YOUR_CLOUDFLARE_API_TOKEN
   pulumi config set zoneId YOUR_ZONE_ID_FOR_PIXELCHAOS_BLOG

   pulumi stack select hex-prod
   pulumi config set --secret cloudflare:apiToken YOUR_CLOUDFLARE_API_TOKEN
   pulumi config set zoneId YOUR_ZONE_ID_FOR_PIXELCHAOS_BLOG
   ```

4. **Apply:**

   ```bash
   pulumi stack select hex-dev && pulumi up
   pulumi stack select hex-prod && pulumi up
   ```

## Commands (from `infra/`)

| Command            | Description          |
|--------------------|----------------------|
| `pnpm run preview` | Show planned changes |
| `pnpm run up`      | Apply changes        |
| `pnpm run destroy` | Tear down stack      |

Always select the stack first: `pulumi stack select hex-dev` or `pulumi stack select hex-prod`.

## CI/CD

- **CI** (`.github/workflows/ci.yml`): PRs to `main` — typecheck, build, verify `dist/`.
- **Infra preview** (`.github/workflows/infra.yml`): PRs touching `infra/**` — `pulumi preview` for both stacks.
- **Deploy to Develop** (`.github/workflows/deploy-dev.yml`): Push to `main` or manual — `pulumi up` hex-dev, then build and deploy.
- **Build & Deploy** (`.github/workflows/build-deploy.yml`): Manual only — `pulumi up` hex-prod, then build and deploy.
- **Only GitHub secret needed:** `PULUMI_ACCESS_TOKEN`.

## Zero Trust (dev)

The dev stack has `enableZeroTrust: true`, which creates a Cloudflare Zero Trust Access application for `test.hex.pixelchaos.blog` with:

- **Login:** One-time PIN (email-based)
- **Allow list:** Configurable email domains (default: `@lensdata.gmbh`, `@tenderlens.ai`). Override via `pulumi config set accessEmailDomains "domain1.com,domain2.com"`.
