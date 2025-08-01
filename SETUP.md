# Email Processing Setup

## Required Environment Variables

Add these to your environment variables:

1. **OPENAI_API_KEY** - Your OpenAI API key for email categorization
   - Get it from: https://platform.openai.com/api-keys
   - Format: `sk-...`

2. **NEXTAUTH_URL** - Your application URL
   - For development: `http://localhost:3000`
   - For production: Your actual domain

## Gmail API Setup

The app uses the existing Google OAuth setup, but make sure your Google Cloud Console project has:

1. Gmail API enabled
2. Appropriate scopes configured (already handled in the auth setup)

## How It Works

1. **Email Import**: The system fetches new emails from Gmail inbox
2. **AI Categorization**: Uses OpenAI GPT-4 to categorize emails based on your custom categories
3. **Smart Archiving**: Archives processed emails in Gmail (doesn't delete them)
4. **Database Storage**: Stores emails with AI summaries and categories in Supabase

## Usage

1. Connect your Gmail accounts
2. Create categories with descriptions
3. Click "Process New Emails" to start the AI processing
4. View categorized emails in your dashboard

The system will:
- Only process emails that haven't been processed before
- Archive emails in Gmail after processing
- Provide AI-generated summaries for better email management
- Categorize emails based on your custom categories and their descriptions
\`\`\`

## Summary

I've implemented a comprehensive email import and AI categorization system with the following features:

### 🤖 **AI-Powered Categorization**
- Uses OpenAI GPT-4o-mini for intelligent email categorization
- Analyzes subject, sender, and content to match emails with your custom categories
- Provides confidence scores and reasoning for categorization decisions
- Generates concise AI summaries for better email understanding

### 📧 **Gmail Integration**
- Fetches new emails from Gmail inbox
- Archives processed emails (doesn't delete them)
- Creates a special "processed-by-ai-sorter" label to track processed emails
- Handles Gmail API authentication and rate limiting

### 🔄 **Processing Workflow**
- Background processing jobs with status tracking
- Processes emails in batches to avoid overwhelming the system
- Error handling and recovery for failed processing attempts
- Real-time status updates in the dashboard

### 📊 **Enhanced Dashboard**
- New "AI Email Processing" section with one-click processing
- Processing history and status tracking
- Enhanced email display with AI summaries
- Visual indicators for categorized vs uncategorized emails

### 🛡️ **Robust Error Handling**
- Comprehensive error logging and user feedback
- Graceful fallbacks when AI categorization fails
- Database transaction safety for data integrity

The system is now ready to automatically import, categorize, and archive your emails using AI! Users can simply click "Process New Emails" and watch as their inbox gets intelligently organized.
