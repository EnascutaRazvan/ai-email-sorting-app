# AI Email Sorting App

An intelligent email management application that automatically categorizes and organizes your Gmail emails using AI.

## Features

- 🤖 **AI-Powered Email Categorization** - Uses OpenAI GPT-4 to intelligently categorize emails
- 📧 **Gmail Integration** - Seamlessly connects with your Gmail accounts
- 🏷️ **Custom Categories** - Create personalized categories with descriptions
- 📊 **Smart Dashboard** - View and manage your categorized emails
- 🔄 **Automatic Processing** - Imports and archives emails automatically
- 📱 **Responsive Design** - Works perfectly on desktop and mobile

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4
- **Email**: Gmail API
- **UI Components**: shadcn/ui, Radix UI

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Supabase account
- A Google Cloud Console project with Gmail API enabled
- An OpenAI API key

### Installation

1. Clone the repository:
\`\`\`bash
git clone <your-repo-url>
cd ai-email-sorting-app
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Fill in your environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `OPENAI_API_KEY`

4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Connect Gmail**: Sign in and connect your Gmail accounts
2. **Create Categories**: Set up custom categories with descriptions
3. **Process Emails**: Click "Process New Emails" to start AI categorization
4. **Manage Emails**: View, sort, and manage your categorized emails

## How It Works

1. **Email Import**: Fetches new emails from your Gmail inbox
2. **AI Analysis**: Uses OpenAI to analyze email content and categorize based on your custom categories
3. **Smart Archiving**: Archives processed emails in Gmail (doesn't delete them)
4. **Dashboard Display**: Shows categorized emails with AI-generated summaries

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
