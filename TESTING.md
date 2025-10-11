# Testing Guide

This document provides comprehensive testing instructions for the PR Discord Bot.

## Test Suite Overview

The bot includes **13 automated tests** covering all critical functionality:

### ✅ All Tests Passing

```
 PASS  api/github-webhook.test.js
  GitHub Webhook Handler
    GET requests
      ✓ should return health check response
    Invalid method requests
      ✓ should return 405 for PUT requests
      ✓ should return 405 for DELETE requests
    POST requests - signature verification
      ✓ should reject requests with invalid signature
      ✓ should reject requests without signature
      ✓ should reject requests without webhook secret in env
      ✓ should accept requests with valid signature
    POST requests - invalid JSON
      ✓ should reject requests with invalid JSON
    POST requests - pull request opened
      ✓ should handle pull_request opened event
      ✓ should handle pull_request non-opened events
    POST requests - other events
      ✓ should handle ping event
      ✓ should handle push event
    Error handling
      ✓ should handle errors gracefully

Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

## Running Tests

### Automated Tests (Jest)

Run all tests:
```bash
npm test
```

Run tests in watch mode (for development):
```bash
npm run test:watch
```

### Manual Testing

The repository includes a manual testing script to verify the webhook endpoint:

```bash
# Test health check only
node test-webhook.js https://your-app.vercel.app/api/github-webhook

# Test with full webhook simulation (requires webhook secret)
node test-webhook.js https://your-app.vercel.app/api/github-webhook your-webhook-secret
```

The manual test script will:
1. ✅ Test the GET health check endpoint
2. ✅ Test invalid signature rejection
3. ✅ Test valid webhook acceptance (if secret provided)

## Test Coverage

### 1. HTTP Methods
- ✅ GET requests return health check
- ✅ POST requests are processed
- ✅ Other methods (PUT, DELETE, etc.) are rejected with 405

### 2. Security
- ✅ Valid HMAC signatures are accepted
- ✅ Invalid HMAC signatures are rejected
- ✅ Missing signatures are rejected
- ✅ Missing webhook secret in environment is handled

### 3. Payload Processing
- ✅ Valid JSON is parsed
- ✅ Invalid JSON is rejected with 400
- ✅ Pull request opened events are handled
- ✅ Other pull request events are accepted but not processed
- ✅ Other GitHub events (ping, push) are accepted

### 4. Discord Integration
- ✅ Discord client is initialized correctly
- ✅ Messages are sent to the configured channel
- ✅ Errors are handled gracefully

### 5. Error Handling
- ✅ Discord connection failures don't crash the bot
- ✅ Errors return 200 status to prevent GitHub retries
- ✅ Error messages are logged for debugging

## Testing in Production

### 1. Deploy to Vercel

```bash
vercel deploy
```

### 2. Set Environment Variables

```bash
vercel env add DISCORD_TOKEN
vercel env add CHANNEL_ID
vercel env add GITHUB_WEBHOOK_SECRET
```

### 3. Test Health Check

```bash
curl https://your-app.vercel.app/api/github-webhook
# Should return: {"ok":true,"route":"/api/github-webhook"}
```

### 4. Configure GitHub Webhook

1. Go to your repository → Settings → Webhooks → Add webhook
2. Set Payload URL: `https://your-app.vercel.app/api/github-webhook`
3. Set Content type: `application/json`
4. Set Secret: (same as GITHUB_WEBHOOK_SECRET)
5. Select events: Pull requests
6. Save webhook

### 5. Test with a Real PR

1. Create a test branch
2. Open a pull request
3. Check your Discord channel for the notification

Expected message format:
```
Nieuwe pull request in **owner/repo**
Titel: Your PR Title
Auteur: username
Branches: feature-branch → main
https://github.com/owner/repo/pull/123
```

## Troubleshooting

### Tests Fail Locally

1. Ensure you have Node.js 18+ installed
2. Run `npm install` to install dependencies
3. Check that no environment variables are set (tests use mocks)

### Webhook Doesn't Work in Production

1. Check Vercel logs: `vercel logs`
2. Verify environment variables are set: `vercel env ls`
3. Test the health check endpoint
4. Verify GitHub webhook signature matches your secret
5. Check Discord bot token is valid and bot has permissions

### Discord Message Not Sent

1. Verify `DISCORD_TOKEN` is correct
2. Verify `CHANNEL_ID` is correct
3. Verify bot has permission to send messages in the channel
4. Check Vercel logs for Discord API errors

## Security Notes

- ✅ All webhook signatures are verified using HMAC SHA-256
- ✅ No credentials are stored in code
- ✅ Environment variables are used for all secrets
- ✅ Invalid signatures return 401 Unauthorized
- ✅ Errors don't expose sensitive information

## CI/CD Integration

To run tests in CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test
```

The tests are fast (< 1 second) and require no external dependencies.
