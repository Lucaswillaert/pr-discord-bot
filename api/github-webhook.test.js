import { jest } from '@jest/globals';
import crypto from 'crypto';

// Mock discord.js before importing handler
const mockSend = jest.fn().mockResolvedValue(true);
const mockFetch = jest.fn().mockResolvedValue({
  send: mockSend
});
const mockLogin = jest.fn().mockResolvedValue(true);
const mockClient = {
  login: mockLogin,
  channels: {
    fetch: mockFetch
  }
};

jest.unstable_mockModule('discord.js', () => ({
  Client: jest.fn(() => mockClient),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2
  }
}));

const { default: handler } = await import('./github-webhook.js');

// Helper function to create valid signature
function createSignature(secret, body) {
  const hmac = crypto.createHmac('sha256', secret);
  return 'sha256=' + hmac.update(body).digest('hex');
}

// Helper to create a mock request
function createMockRequest(method, headers = {}, body = '') {
  const chunks = [Buffer.from(body)];
  const req = {
    method,
    headers,
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    }
  };
  return req;
}

// Helper to create a mock response
function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis()
  };
  return res;
}

describe('GitHub Webhook Handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockClear();
    mockFetch.mockClear();
    mockLogin.mockClear();
    process.env = {
      ...originalEnv,
      GITHUB_WEBHOOK_SECRET: 'test-secret',
      DISCORD_TOKEN: 'test-token',
      CHANNEL_ID: 'test-channel-id'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET requests', () => {
    it('should return health check response', async () => {
      const req = createMockRequest('GET');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ok: true, route: '/api/github-webhook' });
    });
  });

  describe('Invalid method requests', () => {
    it('should return 405 for PUT requests', async () => {
      const req = createMockRequest('PUT');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
    });

    it('should return 405 for DELETE requests', async () => {
      const req = createMockRequest('DELETE');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
    });
  });

  describe('POST requests - signature verification', () => {
    it('should reject requests with invalid signature', async () => {
      const body = JSON.stringify({ test: 'data' });
      const req = createMockRequest('POST', {
        'x-hub-signature-256': 'sha256=invalid',
        'x-github-event': 'pull_request'
      }, body);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('invalid signature');
    });

    it('should reject requests without signature', async () => {
      const body = JSON.stringify({ test: 'data' });
      const req = createMockRequest('POST', {
        'x-github-event': 'pull_request'
      }, body);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('invalid signature');
    });

    it('should reject requests without webhook secret in env', async () => {
      delete process.env.GITHUB_WEBHOOK_SECRET;
      const body = JSON.stringify({ test: 'data' });
      const signature = createSignature('test-secret', body);
      const req = createMockRequest('POST', {
        'x-hub-signature-256': signature,
        'x-github-event': 'pull_request'
      }, body);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('invalid signature');
    });

    it('should accept requests with valid signature', async () => {
      const payload = { action: 'opened' };
      const body = JSON.stringify(payload);
      const signature = createSignature('test-secret', body);
      const req = createMockRequest('POST', {
        'x-hub-signature-256': signature,
        'x-github-event': 'ping'
      }, body);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('OK');
    });
  });

  describe('POST requests - invalid JSON', () => {
    it('should reject requests with invalid JSON', async () => {
      const body = 'not valid json{';
      const signature = createSignature('test-secret', body);
      const req = createMockRequest('POST', {
        'x-hub-signature-256': signature,
        'x-github-event': 'pull_request'
      }, body);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('invalid json');
    });
  });

  describe('POST requests - pull request opened', () => {
    it('should handle pull_request opened event', async () => {
      const payload = {
        action: 'opened',
        pull_request: {
          title: 'Test PR',
          html_url: 'https://github.com/test/repo/pull/1',
          user: {
            login: 'testuser'
          },
          base: {
            ref: 'main'
          },
          head: {
            ref: 'feature-branch'
          }
        },
        repository: {
          full_name: 'test/repo'
        }
      };
      const body = JSON.stringify(payload);
      const signature = createSignature('test-secret', body);
      const req = createMockRequest('POST', {
        'x-hub-signature-256': signature,
        'x-github-event': 'pull_request'
      }, body);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('OK');
    });

    it('should handle pull_request non-opened events', async () => {
      const payload = {
        action: 'closed',
        pull_request: {
          title: 'Test PR'
        }
      };
      const body = JSON.stringify(payload);
      const signature = createSignature('test-secret', body);
      const req = createMockRequest('POST', {
        'x-hub-signature-256': signature,
        'x-github-event': 'pull_request'
      }, body);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('OK');
    });
  });

  describe('POST requests - other events', () => {
    it('should handle ping event', async () => {
      const payload = {
        zen: 'Test zen message',
        hook_id: 12345
      };
      const body = JSON.stringify(payload);
      const signature = createSignature('test-secret', body);
      const req = createMockRequest('POST', {
        'x-hub-signature-256': signature,
        'x-github-event': 'ping'
      }, body);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('OK');
    });

    it('should handle push event', async () => {
      const payload = {
        ref: 'refs/heads/main',
        commits: []
      };
      const body = JSON.stringify(payload);
      const signature = createSignature('test-secret', body);
      const req = createMockRequest('POST', {
        'x-hub-signature-256': signature,
        'x-github-event': 'push'
      }, body);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('OK');
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock fetch to throw an error
      mockFetch.mockRejectedValueOnce(new Error('Channel fetch failed'));

      const payload = {
        action: 'opened',
        pull_request: {
          title: 'Test PR',
          html_url: 'https://github.com/test/repo/pull/1',
          user: { login: 'testuser' },
          base: { ref: 'main' },
          head: { ref: 'feature-branch' }
        },
        repository: { full_name: 'test/repo' }
      };
      const body = JSON.stringify(payload);
      const signature = createSignature('test-secret', body);
      const req = createMockRequest('POST', {
        'x-hub-signature-256': signature,
        'x-github-event': 'pull_request'
      }, body);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('Received');
    });
  });
});
