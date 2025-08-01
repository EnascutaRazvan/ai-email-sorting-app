import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error, errorDescription)

      // Provide specific error messages for common issues
      const errorMap: Record<string, string> = {
        access_denied: "access_denied",
        invalid_request: "invalid_request",
        unauthorized_client: "unauthorized_client",
        unsupported_response_type: "unsupported_response_type",
        invalid_scope: "invalid_scope",
        server_error: "server_error",
        temporarily_unavailable: "temporarily_unavailable",
      }

      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Failed</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #f8fafc;
              }
              .error {
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                max-width: 400px;
              }
              .error-icon {
                color: #ef4444;
                font-size: 3rem;
                margin-bottom: 1rem;
              }
              .retry-btn {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 1rem;
              }
            </style>
          </head>
          <body>
            <div class="error">
              <div class="error-icon">⚠️</div>
              <h2>Connection Failed</h2>
              <p>Unable to connect your account. ${errorDescription || "Please try again."}</p>
              <button class="retry-btn" onclick="window.close()">Close Window</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'ACCOUNT_CONNECTION_ERROR', 
                  error: '${error}',
                  description: '${errorDescription || ""}'
                }, '*');
              }
              setTimeout(() => window.close(), 5000);
            </script>
          </body>
        </html>
        `,
        {
          headers: {
            "Content-Type": "text/html",
          },
        },
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=missing_params`)
    }

    // Verify and decode state parameter
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString())

      // Verify state is not too old (10 minutes max)
      if (Date.now() - stateData.timestamp > 600000) {
        throw new Error("State expired")
      }
    } catch (error) {
      console.error("Invalid state parameter:", error)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=invalid_state`)
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/connect-callback`,
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokenResponse.ok || !tokens.access_token) {
      console.error("Token exchange failed:", tokens)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=token_exchange_failed`)
    }

    // Get user info from Google with the new token
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      console.error("Failed to fetch user info")
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=user_info_failed`)
    }

    const userInfo = await userInfoResponse.json()

    if (!userInfo.id || !userInfo.email) {
      console.error("Invalid user info:", userInfo)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=invalid_user_info`)
    }

    // Check if this account is already connected to this user
    const { data: existingAccount } = await supabase
      .from("user_accounts")
      .select("user_id, email, is_primary")
      .eq("gmail_id", userInfo.id)
      .single()

    if (existingAccount) {
      if (existingAccount.user_id === stateData.userId) {
        // Account already connected to this user - just update tokens
        const { error: updateError } = await supabase
          .from("user_accounts")
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("gmail_id", userInfo.id)
          .eq("user_id", stateData.userId)

        if (updateError) {
          console.error("Error updating existing account:", updateError)
        }

        return new NextResponse(
          `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Account Already Connected</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: #f8fafc;
                }
                .info {
                  text-align: center;
                  padding: 2rem;
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .info-icon {
                  color: #f59e0b;
                  font-size: 3rem;
                  margin-bottom: 1rem;
                }
              </style>
            </head>
            <body>
              <div class="info">
                <div class="info-icon">ℹ️</div>
                <h2>Account Already Connected</h2>
                <p>This Gmail account is already connected to your dashboard.</p>
                <p>Tokens have been refreshed.</p>
              </div>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'ACCOUNT_ALREADY_CONNECTED', 
                    email: '${userInfo.email}' 
                  }, '*');
                }
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
          `,
          {
            headers: {
              "Content-Type": "text/html",
            },
          },
        )
      } else {
        // Account connected to different user
        console.error(`Account ${userInfo.email} already connected to different user`)
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=account_already_connected`)
      }
    }

    // Store the new account
    const { error: dbError } = await supabase.from("user_accounts").insert({
      user_id: stateData.userId,
      gmail_id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name || null,
      picture: userInfo.picture || null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      scope: tokens.scope || null,
      is_primary: false,
      sync_status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (dbError) {
      console.error("Error storing additional account:", dbError)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=storage_failed`)
    }

    // Log successful connection
    console.log(`Successfully connected account ${userInfo.email} for user ${stateData.userId}`)

    // Return success page that closes popup and notifies parent
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Account Connected</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f8fafc;
            }
            .success {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .checkmark {
              color: #10b981;
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            .account-info {
              background: #f0f9ff;
              padding: 1rem;
              border-radius: 6px;
              margin: 1rem 0;
              border-left: 4px solid #3b82f6;
            }
          </style>
        </head>
        <body>
          <div class="success">
            <div class="checkmark">✅</div>
            <h2>Account Connected Successfully!</h2>
            <div class="account-info">
              <strong>${userInfo.email}</strong><br>
              <small>Now connected to your dashboard</small>
            </div>
            <p>You can now close this window.</p>
          </div>
          <script>
            // Notify parent window and close popup
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'ACCOUNT_CONNECTED', 
                email: '${userInfo.email}',
                name: '${userInfo.name || ""}',
                picture: '${userInfo.picture || ""}'
              }, '*');
            }
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
      `,
      {
        headers: {
          "Content-Type": "text/html",
        },
      },
    )
  } catch (error) {
    console.error("Connect callback error:", error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=unexpected_error`)
  }
}
