# Email Sorting App

This is an AI-powered email sorting application built with Next.js, Supabase, and the AI SDK.

## Features

- **Email Import**: Connect your email accounts (e.g., Gmail) and import your emails.
- **AI Categorization**: Emails are automatically categorized using AI.
- **Multi-Account Support**: Manage emails from multiple connected accounts.
- **Search & Filter**: Powerful search and filtering capabilities by sender, date, category, and account.
- **Unsubscribe Agent**: An AI agent to automatically unsubscribe from unwanted emails.
- **AI Recategorization**: Re-categorize selected emails using AI.
- **Email Detail View**: View full email content.
- **Responsive Design**: Optimized for various screen sizes.

## Getting Started

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
# or
pnpm install
\`\`\`

### 3. Set up Environment Variables

Create a `.env.local` file in the root of your project and add the following environment variables:

\`\`\`
# Supabase
NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"

# NextAuth.js
NEXTAUTH_SECRET="YOUR_NEXTAUTH_SECRET" # Generate a strong secret: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000" # Your app's URL

# Google Provider (for Gmail integration)
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

# Groq (for AI categorization)
GROQ_API_KEY="YOUR_GROQ_API_KEY"

# Unsubscribe Agent (if using a service like Browserless or similar)
# BROWSERLESS_API_KEY="YOUR_BROWSERLESS_API_KEY"
# BROWSERLESS_API_URL="https://chrome.browserless.io"
\`\`\`

### 4. Database Setup (Supabase)

Run the SQL scripts in the `scripts/` directory to set up your Supabase database schema.

1.  **`scripts/database-schema.sql`**: Creates the initial tables.
2.  **`scripts/enhanced-accounts-schema.sql`**: Adds necessary columns for enhanced account management.

You can execute these directly in your Supabase SQL editor.

### 5. Run the Development Server

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This application is designed to be deployed on Vercel. Ensure your environment variables are configured in your Vercel project settings.

## Technologies Used

-   **Next.js**: React framework for production.
-   **React**: JavaScript library for building user interfaces.
-   **Supabase**: Open-source Firebase alternative for database and authentication.
-   **NextAuth.js**: Authentication for Next.js applications.
-   **AI SDK**: For integrating AI models (e.g., Groq for categorization).
-   **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
-   **shadcn/ui**: Reusable UI components built with Radix UI and Tailwind CSS.
-   **Lucide React**: Beautifully simple and customizable open-source icons.
