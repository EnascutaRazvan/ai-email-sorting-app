# 📧 AI Email Sorting App

An intelligent email management application that automatically categorizes and organizes your emails using AI-powered classification. Connect multiple email accounts, create custom categories, and let AI do the heavy lifting of sorting your inbox.

## ✨ Features

### 🤖 AI-Powered Email Classification
- Automatically categorize emails using advanced AI algorithms
- Smart learning from your manual categorizations
- Bulk recategorization of existing emails

### 📬 Multi-Account Support
- Connect multiple Gmail accounts
- Unified dashboard for all your email accounts
- Individual account management and sync controls

### 🏷️ Custom Categories
- Create unlimited custom categories
- Color-coded organization system
- Automatic "Uncategorized" fallback for new emails

### 🔄 Real-time Synchronization
- Automatic email syncing via cron jobs
- Manual sync options for immediate updates
- Import emails from specific date ranges

### 🗑️ Bulk Operations
- Mass delete emails by category or selection
- Bulk unsubscribe from unwanted senders
- Batch operations with progress tracking

### 🔍 Advanced Filtering & Search
- Filter by categories, accounts, and date ranges
- Search through email content and metadata
- Sort by various criteria (date, sender, subject)

### 🌙 Modern UI/UX
- Dark/light theme support
- Responsive design for all devices
- Intuitive dashboard with real-time updates

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- A Supabase account
- Google Cloud Console project with Gmail API enabled

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/your-username/ai-email-sorting-app.git
   cd ai-email-sorting-app
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   \`\`\`env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # NextAuth Configuration
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   \`\`\`

4. **Set up the database**
   Run the SQL scripts in the `scripts/` directory in your Supabase SQL editor:
   \`\`\`bash
   # Run these in order:
   # 1. scripts/database-schema.sql
   # 2. scripts/enhanced-accounts-schema.sql
   \`\`\`

5. **Configure Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)

6. **Run the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

\`\`\`
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── dashboard/         # Dashboard-specific components
│   └── ui/               # Reusable UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── scripts/              # Database scripts
├── types/                # TypeScript type definitions
└── cypress/              # E2E tests
\`\`\`

## 🔧 Configuration

### Database Schema
The app uses Supabase with the following main tables:
- `users` - User authentication and profiles
- `user_accounts` - Connected email accounts
- `categories` - Email categories
- `emails` - Email metadata and content
- `email_processing_jobs` - Background job tracking
- `unsubscribe_jobs` - Unsubscribe operation tracking

### API Endpoints
- `/api/auth/*` - Authentication (NextAuth.js)
- `/api/accounts` - Email account management
- `/api/categories` - Category CRUD operations
- `/api/emails` - Email operations and AI processing
- `/api/cron/sync-emails` - Automated email synchronization

## 🧪 Testing

### Unit Tests
\`\`\`bash
npm run test
\`\`\`

### E2E Tests
\`\`\`bash
npm run cypress:open
\`\`\`

### Test Coverage
\`\`\`bash
npm run test:coverage
\`\`\`

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Deployment
\`\`\`bash
npm run build
npm start
\`\`\`

## 🔒 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **OAuth 2.0** - Secure Google account integration
- **JWT Tokens** - Secure session management
- **API Rate Limiting** - Protection against abuse
- **Input Validation** - Comprehensive data sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Use conventional commit messages
- Ensure responsive design
- Test across different browsers

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/) - Unstyled, accessible components
- [NextAuth.js](https://next-auth.js.org/) - Authentication library
- [Lucide React](https://lucide.dev/) - Beautiful icons

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/ai-email-sorting-app/issues) page
2. Create a new issue with detailed information
3. Join our [Discord community](https://discord.gg/your-invite) for real-time help

## 🗺️ Roadmap

- [ ] **Advanced AI Features**
  - Smart reply suggestions
  - Email priority scoring
  - Sentiment analysis

- [ ] **Enhanced Integrations**
  - Outlook/Exchange support
  - Slack notifications
  - Calendar integration

- [ ] **Mobile App**
  - React Native mobile application
  - Push notifications
  - Offline support

- [ ] **Analytics Dashboard**
  - Email volume analytics
  - Category distribution charts
  - Productivity insights

---

**Built with ❤️ using [v0.dev](https://v0.dev)**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/renascuta-7771s-projects/v0-email-sorting-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/t7jpRYEDFBN)
