# 📬 AI Email Sorting App

[![Deployed on Railway](https://img.shields.io/badge/Deployed%20on-Railway-purple.svg?style=for-the-badge&logo=railway)](https://ai-email-sorting-app-production.up.railway.app/)
[![Tech Stack](https://img.shields.io/badge/tech-Next.js-blue.svg?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/database-Supabase-green.svg?style=for-the-badge&logo=supabase)](https://supabase.io/)

An intelligent AI-powered application for automatic email categorization, cleanup, and summarization. Connect multiple Gmail accounts and let the app organize your inbox with minimal effort.

---

## 🚀 Live Demo

👉 [Try it here](https://ai-email-sorting-app-production.up.railway.app/)
 
---

## ✨ Features

- 📂 Automatic email categorization using AI
- 🧹 One-click inbox cleanup
- 📄 Summarization of long emails
- 🔌 Support for multiple Gmail accounts
- 🔒 Secure authentication with NextAuth
- 📊 Dashboard with real-time filtering and analytics
- 🔁 Background syncing via scheduled cron jobs
- 📨 Bulk unsubscribe functionality

---

## 🛠 Tech Stack

- **Frontend**: Next.js, Tailwind CSS, TypeScript
- **Backend**: Next.js API routes, Supabase (PostgreSQL)
- **AI**: OpenAI integration for email analysis
- **Auth**: NextAuth.js
- **Testing**: Jest, Cypress
- **Deployment**: Railway

---

## 📦 Getting Started

### ✅ Prerequisites

- Node.js >= 18.x
- pnpm (or npm/yarn)
- Supabase project + credentials
- Gmail API credentials

### 🔧 Installation

```bash
git clone https://github.com/your-username/ai-email-sorting-app.git
cd ai-email-sorting-app
pnpm install
```

### 🧱 Database Setup

1. Create a Supabase project.
2. Run SQL scripts in `/scripts/` to set up tables.
3. Add environment variables for Supabase keys.

### ⚙️ Environment Variables

Create a `.env.local` file and add the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_secret
```

### 🏃‍♂️ Run Locally

```bash
pnpm dev
```

App will be available at `http://localhost:3000`.

---

## 🧪 Testing

```bash
pnpm test     # Run unit tests with Jest
pnpm cypress  # Run end-to-end tests
```

---

## 🗂 Project Structure

```
/app               → Pages and API routes
/components        → Reusable UI and feature components
/hooks             → Custom React hooks
/lib               → Utility functions and error handling
/scripts           → Database schema setup
/__tests__         → Unit and integration tests
```

---

## 🙌 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [OpenAI](https://openai.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [NextAuth.js](https://next-auth.js.org/)
