# Email Sorting App

This is an AI-powered email sorting application built with Next.js, NextAuth.js, and Supabase. It allows users to connect their Gmail accounts, categorize emails using AI, and perform bulk actions like deleting or unsubscribing.

## Features

-   **Gmail Integration**: Connect multiple Gmail accounts securely using OAuth.
-   **AI Categorization**: Automatically categorize emails using AI models (e.g., Groq).
-   **Email Management**: View, search, filter, and manage emails from connected accounts.
-   **Bulk Actions**: Perform bulk delete and unsubscribe operations.
-   **Responsive UI**: Optimized for both desktop and mobile devices.
-   **Dark/Light Mode**: Supports theme switching for better user experience.

## Technologies Used

-   **Next.js**: React framework for building server-rendered and static web applications.
-   **NextAuth.js**: Authentication library for Next.js.
-   **Supabase**: Open-source Firebase alternative for database, authentication, and storage.
-   **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
-   **Shadcn/ui**: Reusable UI components built with Radix UI and Tailwind CSS.
-   **Lucide React**: Beautifully simple and customizable open-source icons.
-   **AI SDK**: For integrating AI models (e.g., Groq for email summarization and categorization).

## Setup and Installation

### Prerequisites

-   Node.js (v18 or higher)
-   npm or Yarn
-   A Supabase project
-   A Google Cloud Project for Gmail OAuth
-   A Groq API Key (or other AI provider supported by AI SDK)

### 1. Clone the repository

\`\`\`bash
git clone https://github.com/your-username/email-sorting-app.git
cd email-sorting-app
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
# or
yarn install
\`\`\`

### 3. Configure Environment Variables

Create a `.env.local` file in the root of your project and add the following environment variables:

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"

# NextAuth.js
NEXTAUTH_SECRET="YOUR_NEXTAUTH_SECRET" # Generate a strong secret: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000" # Your app's URL (e.g., https://yourapp.vercel.app)

# Google OAuth (for Gmail integration)
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

# Groq (for AI categorization/summarization)
GROQ_API_KEY="YOUR_GROQ_API_KEY"

# Cron Job Secret (for syncing emails)
CRON_SECRET="YOUR_CRON_SECRET" # A secret string to secure your cron endpoint
\`\`\`

### 4. Set up Supabase

#### Database Schema

Run the SQL scripts located in `scripts/` to set up your database tables. You can use the Supabase SQL Editor or `psql`.

1.  `scripts/database-schema.sql`
2.  `scripts/enhanced-accounts-schema.sql`

#### Enable Google OAuth in Supabase

1.  Go to your Supabase project dashboard.
2.  Navigate to **Authentication** > **Providers**.
3.  Enable **Google** and enter your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4.  Add the Supabase redirect URL to your Google Cloud Project's authorized redirect URIs: `YOUR_SUPABASE_URL/auth/v1/callback`.

### 5. Run the application

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

The application will be available at `http://localhost:3000`.

## Deployment

This application can be easily deployed to Vercel. Ensure all environment variables are configured in your Vercel project settings.

## Cron Job for Email Sync

The application includes a cron job endpoint (`/api/cron/sync-emails`) to periodically sync emails from connected accounts. You can set up a cron service (e.g., Vercel Cron Jobs, GitHub Actions, or a dedicated cron service) to hit this endpoint.

**Endpoint**: `/api/cron/sync-emails`
**Method**: `GET`
**Header**: `Authorization: Bearer YOUR_CRON_SECRET`

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.
