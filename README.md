This is a [Next.js](https://nextjs.org) project for generating and managing Let's Encrypt SSL certificates.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set environment variables:

```bash
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
JWT_SECRET=<long-random-secret>
```

Notes:
- In production (Vercel), `DATABASE_URL` should point to your Neon database.
- If `DATABASE_URL` is missing, the app falls back to local filesystem storage under `./data`.
- Optional: set `SSLRENEW_DATA_DIR` to customize local file storage path.

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Storage Backends

- **Neon mode (`DATABASE_URL` set):**
  - Uses Postgres tables for users, certificates, and private keys.
  - Automatically creates tables at startup if missing.
- **Local mode (`DATABASE_URL` not set):**
  - Uses JSON files under `data/` and key files under `data/keys/`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
