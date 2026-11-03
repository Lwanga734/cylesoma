# Email setup (so invitations and password resets arrive by email)

Supabase's built-in email sender is meant for testing only. It has very low sending limits and can refuse or drop
messages to ordinary addresses, so use your own SMTP service for real schools. (Until then, use
"Make a link I can share (WhatsApp)" when inviting; it needs no email at all.)

## Steps
1. **Pick an email provider that offers SMTP** (for example Brevo, Resend, Mailgun or Amazon SES). Several have free
   tiers; check their current limits and terms. Create an account.
2. **Set up a sender address.** Best: an address on a domain you own, for example `no-reply@yourdomain`, and add the SPF
   and DKIM records the provider gives you. Avoid sending "from" a gmail.com address through a provider: those
   messages are often marked as spam.
3. **Get the SMTP details** from the provider: host, port (usually 587 or 465), username and password (or API key).
4. **Supabase dashboard > Authentication > Emails > SMTP Settings:** turn on custom SMTP and enter the sender email,
   sender name (`CyleSoma`), host, port, username and password. Save.
5. **Authentication > Emails > Templates:** paste the Invite and Reset Password templates from `supabase/templates/`
   (`invite.html`, `recovery.html`) and set the subjects.
6. **Authentication > URL Configuration:** set Site URL to your live address (for example
   `https://cylesoma.vercel.app`) and add `https://cylesoma.vercel.app/**` to Redirect URLs.
7. **Authentication > Sign In / Providers > Email:** set the email OTP expiry to `86400` (24 hours).
8. **Authentication > Rate Limits:** raise the emails-per-hour limit if you will invite many people at once.
9. **Test:** on the Invite users page choose "Send an email invitation" for an address that has never used CyleSoma.
   Check the spam folder if it does not arrive.

## Good to know
- Someone who already has a CyleSoma account never gets an email: they are added to the school and can switch to it from
  Profile > Switch school.
- Shareable links are one-time and for one person. Whoever opens one first can set the password for that new account,
  so send it only to the person it is for.

## Troubleshooting: "I was invited but my password does not work"
Cause: Supabase's DEFAULT invitation email ("You've been invited ... Accept invitation") returns the person to the app
with sign-in tokens in the address bar. Older versions of the app ignored them, so the person was never asked to choose a
password and then tried to sign in with one that did not exist. (Supabase's logs show this as a successful `/verify`,
no `PUT /user`, then a failed password login.)

What fixes it now:
1. The app reads those tokens (`AuthHashHandler`) and sends the person to **Set your password**.
2. Paste the CyleSoma templates (`supabase/templates/invite.html` and `recovery.html`) into Supabase > Authentication >
   Emails > Templates, and set the Site URL (Authentication > URL Configuration). These links go through
   `/auth/confirm`, which keeps tokens out of the address bar and is the preferred route.

For someone whose invitation link was already used before the fix: on the sign-in page choose **Forgot your password?**,
enter their email, open the email and choose a password. Their school membership is already in place.
