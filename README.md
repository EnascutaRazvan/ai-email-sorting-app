# Email Sorting App

[![Deployed on Railway](https://img.shields.io/badge/Deployed%20on-Railway-purple.svg?style=for-the-badge&logo=railway)](https://ai-email-sorting-app-production.up.railway.app/)
[![Tech Stack](https://img.shields.io/badge/tech-Next.js-blue.svg?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/database-Supabase-green.svg?style=for-the-badge&logo=supabase)](https://supabase.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

An intelligent email management application that uses AI to automatically categorize, summarize, and clean up your inbox. Connect multiple Gmail accounts and let the AI do the heavy lifting.

## Table of Contents

- [Live Demo](#live-demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Live Demo

You can try out the live application here: **[https://ai-email-sorting-app-production.up.railway.app/](https://ai-email-sorting-app-production.up.railway.app/)**

## Features

- **Secure Google Authentication**: Sign in safely using your Google account via NextAuth.js.
- **Multi-Account Connectivity**: Connect and manage multiple Gmail accounts in one place.
- **AI-Powered Categorization**: Automatically sorts incoming emails into smart, user-defined categories.
- **Smart Summaries**: Get quick, AI-generated summaries of long emails without opening them.
- **Bulk Email Management**: Perform actions like delete, recategorize, and unsubscribe on multiple emails at once.
- **One-Click Unsubscribe**: Easily unsubscribe from newsletters and promotional emails.
- **Customizable Categories**: Create, edit, and delete your own categories with custom colors.
- **Responsive Design**: A clean, modern, and fully responsive UI built with shadcn/ui and Tailwind CSS.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 14 (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Supabase](https://supabase.io/) (PostgreSQL)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Google Provider)
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai/) with [Groq](https://groq.com/) for fast inference.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Form Management**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Testing**: [Jest](https://jestjs.io/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/), and [Cypress](https://www.cypress.io/)
- **Deployment**: [Railway](https://railway.app/)

## Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/)
- A [Supabase](https://supabase.com/) account for the database.
- A [Google Cloud Platform](https://console.cloud.google.com/) project with OAuth 2.0 credentials.
- A [Groq](https://console.groq.com/keys) API key.

### Installation

1.  **Clone the repository:**
  \`\`\`bash
  git clone https://github.com/your-username/ai-email-sorting-app.git
  cd ai-email-sorting-app
  \`\`\`

2.  **Install dependencies:**
  \`\`\`bash
  npm install
  # or
  yarn install
  # or
  pnpm install
  \`\`\`

### Database Setup

1.  Go to [Supabase](https://app.supabase.com/) and create a new project.
2.  Navigate to the **SQL Editor** in your Supabase project.
3.  Copy the entire content of `scripts/database-schema.sql` and run it to create the necessary tables and policies.

### Environment Variables

Create a `.env.local` file in the root of your project and add the following variables.

\`\`\`sh
# Supabase
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# Google OAuth Credentials
# See: https://next-auth.js.org/providers/google
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# NextAuth
# Generate a secret with `openssl rand -base64 32`
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET
NEXTAUTH_URL=http://localhost:3000

# AI Provider (Groq)
GROQ_API_KEY=YOUR_GROQ_API_KEY
\`\`\`

- You can get your Supabase keys from your project's **Settings > API** page.
- You can get your Google credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
- You can get your Groq API key from the [Groq Console](https://console.groq.com/keys).

## Usage

Once the setup is complete, run the development server:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Running Tests

This project uses Jest for unit tests and Cypress for end-to-end tests.

- **Run Jest unit tests:**
\`\`\`bash
npm test
\`\`\`

- **Run Cypress E2E tests:**
\`\`\`bash
npm run test:e2e
\`\`\`

- **Open Cypress for interactive testing:**
\`\`\`bash
npm run cypress:open
\`\`\`

## Deployment

### Railway (Current Deployment)

The application is currently deployed on [Railway](https://railway.app/). To deploy your own instance:

1. Fork this repository
2. Sign up for a [Railway](https://railway.app/) account
3. Create a new project and connect your GitHub repository
4. Add all the required environment variables in the Railway dashboard
5. Deploy automatically on push

### Alternative Deployment Options

#### Vercel
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

#### Manual Deployment
\`\`\`bash
npm run build
npm start
\`\`\`

## Contributing

Contributions are welcome! If you have suggestions for improving the app, please feel free to create an issue or submit a pull request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
