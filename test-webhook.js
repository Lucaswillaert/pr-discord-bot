#!/usr/bin/env node
/**
 * Manual testing script for the GitHub webhook endpoint
 * 
 * This script simulates GitHub webhook calls to test the bot locally or on Vercel
 * 
 * Usage:
 *   node test-webhook.js <url> [secret]
 * 
 * Examples:
 *   # Test health check
 *   node test-webhook.js http://localhost:3000/api/github-webhook
 * 
 *   # Test with webhook (provide secret)
 *   node test-webhook.js https://your-app.vercel.app/api/github-webhook your-secret
 */

import crypto from 'crypto';
import https from 'https';
import http from 'http';

const url = process.argv[2];
const secret = process.argv[3];

if (!url) {
  console.error('Usage: node test-webhook.js <url> [secret]');
  console.error('');
  console.error('Examples:');
  console.error('  node test-webhook.js http://localhost:3000/api/github-webhook');
  console.error('  node test-webhook.js https://your-app.vercel.app/api/github-webhook your-secret');
  process.exit(1);
}

// Test 1: Health check (GET)
async function testHealthCheck() {
  console.log('\n🔍 Test 1: Health Check (GET)');
  console.log(`URL: ${url}`);
  
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        
        if (res.statusCode === 200) {
          console.log('✅ Health check passed');
          resolve(true);
        } else {
          console.log('❌ Health check failed');
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Request failed:', err.message);
      resolve(false);
    });
    
    req.end();
  });
}

// Test 2: Invalid signature (POST)
async function testInvalidSignature() {
  console.log('\n🔍 Test 2: Invalid Signature (POST)');
  
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ test: 'data' });
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-GitHub-Event': 'ping',
        'X-Hub-Signature-256': 'sha256=invalid'
      }
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        
        if (res.statusCode === 401) {
          console.log('✅ Invalid signature correctly rejected');
          resolve(true);
        } else {
          console.log('❌ Should have rejected invalid signature');
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Request failed:', err.message);
      resolve(false);
    });
    
    req.write(payload);
    req.end();
  });
}

// Test 3: Valid webhook (POST) - only if secret provided
async function testValidWebhook() {
  if (!secret) {
    console.log('\n⏭️  Test 3: Valid Webhook (POST) - Skipped (no secret provided)');
    return true;
  }
  
  console.log('\n🔍 Test 3: Valid Webhook (POST)');
  
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      action: 'opened',
      pull_request: {
        title: 'Test PR from webhook tester',
        html_url: 'https://github.com/test/repo/pull/1',
        user: { login: 'test-user' },
        base: { ref: 'main' },
        head: { ref: 'test-branch' }
      },
      repository: { full_name: 'test/repo' }
    });
    
    const hmac = crypto.createHmac('sha256', secret);
    const signature = 'sha256=' + hmac.update(payload).digest('hex');
    
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-GitHub-Event': 'pull_request',
        'X-Hub-Signature-256': signature
      }
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        
        if (res.statusCode === 200) {
          console.log('✅ Valid webhook accepted');
          console.log('💬 Check your Discord channel for the notification!');
          resolve(true);
        } else {
          console.log('❌ Valid webhook was rejected');
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Request failed:', err.message);
      resolve(false);
    });
    
    req.write(payload);
    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting webhook tests...');
  
  const results = [];
  
  results.push(await testHealthCheck());
  results.push(await testInvalidSignature());
  results.push(await testValidWebhook());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

runTests();
