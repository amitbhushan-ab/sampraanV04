# 🚀 Sampraan Free Tier Deployment Guide

This guide covers the fastest way to get your project deployed **100% for free** and running in production. It utilizes **Aiven** for a free MySQL database and **Render** for a free web service.

We have already patched the codebase to bypass the strict IPFS requirement for production, meaning your app can safely run using the ephemeral local storage fallback without erroring out. We have also updated `render.yaml` to point to the `free` tier.

## 1. Create a Free MySQL Database (Aiven)

Render requires an external MySQL database. Aiven provides a free tier with 5GB of storage.

1. Go to [Aiven](https://aiven.io/mysql) and sign up for a free account.
2. In the console, click **Create Service** and select **MySQL**.
3. Choose the **Free** plan.
4. Once the database is running, copy the **Service URI** (it will look like `mysql://avnadmin:password@host:port/defaultdb?ssl-mode=REQUIRED`).
5. Keep this `DATABASE_URL` handy.

## 2. Deploy on Render (Free Tier)

Render can automatically build and deploy your project using the `render.yaml` Blueprint we've provided in the repo.

1. Create a free account at [Render](https://render.com/).
2. On your Render dashboard, click **New +** and select **Blueprint**.
3. Connect your GitHub repository where you've pushed this codebase.
4. Render will read the `render.yaml` and set up the Web Service automatically on the `free` tier.
5. During the setup, Render will prompt you for the missing **Environment Variables** (secrets marked `sync: false`). Fill them in:

| Variable | What to provide |
| :--- | :--- |
| **`DATABASE_URL`** | The Aiven MySQL Service URI you copied in step 1. |
| **`JWT_SECRET`** | A random string (at least 32 characters). *Example:* `this-is-a-very-long-and-secure-random-secret-for-jwt` |
| **`VITE_APP_ID`** | A simple string to identify the app. *Example:* `sampraan` |
| **`ASSET_CONTENT_MASTER_KEY`** | A 64-character hex string. You can generate one via terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **`APP_URL`** | Your future Render app URL, e.g., `https://sampraan-xxxx.onrender.com` (you can update this later once the URL is generated). |
| **`CORS_ORIGIN`** | Leave blank or set to the same as `APP_URL`. |

> **Note on Blockchain & IPFS:**
> - `BLOCKCHAIN_*`: Leave these empty. The app will gracefully fall back to **MOCK mode** and simply log warnings (perfect for a demo).
> - `IPFS_API_URL`: Leave empty. The app will seamlessly fall back to local disk storage (thanks to the patch we just applied!).

## 3. Submit Your Link!

Once the deployment finishes building (which takes a few minutes as it compiles the Docker image), Render will give you a public URL (e.g., `https://sampraan.onrender.com`).

**Your app is now live and completely free! You can submit this link for your morning deadline.**
