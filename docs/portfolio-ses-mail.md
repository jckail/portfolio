# Portfolio email through AWS SES

`EMAIL_PROVIDER=ses` selects SES for the shared owner-mail service. Contact forms,
phone requests, agent introductions and confirmed agent contact drafts all use
this boundary. `sendgrid` remains the default until an intentional production
switch. Unknown providers fail configuration validation; failures never trigger
another provider or issue a full-access agent receipt.

## Activation prerequisites

1. Verify the portfolio sender identity in SES **us-west-2**. The account's live
   October 7 audit shows production access and sending enabled in that region;
   the verified `kefi.show` identity belongs to another app. Do not borrow it.
2. Publish the identity's SES DKIM CNAME records at the domain's DNS provider.
   Preserve website, MX and existing mail records. Wait for SES verification.
3. Grant the portfolio runtime only `ses:SendEmail` on that identity, constrained
   to the exact From address and the owner recipient. Prefer short-lived workload
   credentials. If runtime secrets are used, bind scoped credentials through
   Secret Manager; never copy an administrator's local AWS profile into Cloud Run.
4. Set `EMAIL_PROVIDER=ses`, `SES_REGION=us-west-2`, an address on the verified
   identity in `CONTACT_SENDER_EMAIL`, and `ADMIN_EMAIL=jckail13@gmail.com`.
   Boto3 uses the AWS credential chain. No AWS credentials are stored in app data.
5. Use protected CI/deployment, then submit one labeled owner-only synthetic
   message and verify both provider acceptance and the matching inbox receipt.
   Qualify the agent introduction gate independently. AWS acceptance is not
   proof of inbox delivery.

Example permission shape (replace `ACCOUNT_ID` after verifying the target account):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "ses:SendEmail",
    "Resource": "arn:aws:ses:us-west-2:ACCOUNT_ID:identity/jordankail.ai",
    "Condition": {
      "StringEquals": {"ses:FromAddress": "assistant@jordankail.ai"},
      "ForAllValues:StringEquals": {"ses:Recipients": ["jckail13@gmail.com"]}
    }
  }]
}
```

The adapter sends UTF-8 plain text and escaped HTML, fixes the recipient to
`ADMIN_EMAIL`, and sets the visitor only as Reply-To. SDK connect/read timeouts
are 3/8 seconds with one total attempt. A successful response must include both
a 2xx status and an SES message ID. No automatic provider fallback is used.

Rollback uses `EMAIL_PROVIDER=sendgrid` with its existing credential binding.
That restores provider selection only; SendGrid still needs usable sending
allowance. Never describe a failed or ambiguous attempt as delivered.

References: [SES identity verification](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html),
[IAM conditions for SES](https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html),
[SES v2 SendEmail](https://docs.aws.amazon.com/boto3/latest/reference/services/sesv2/client/send_email.html).
