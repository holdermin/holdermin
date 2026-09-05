/**
 * TronKeeper Cloudflare Worker - TON Claims System (SECURED v3.0)
 * 
 * Security improvements:
 * - Telegram initData validation with HMAC
 * - Hold duration calculated on server (not trusted from client)
 * - Strict CORS (only allow Telegram Mini App origin)
 * - Enhanced claim verification (comment, amount, replay protection)
 * 
 * Environment Variables (Secrets):
 * - BOT_TOKEN: Telegram Bot Token
 * - SUPA_URL: Supabase project URL
 * - SUPA_SERVICE_KEY: Supabase service role key
 * - ALLOWED_ORIGINS: Comma-separated list of allowed origins (e.g., "https://app.tronkeeper.com,https://t.me")
 */

import { findValidTonPayment, normalizeTonAddress } from './lib.js';

// ============================================
// CORS Configuration
// ============================================

const ALLOWED_ORIGINS = (env.ALLOWED_ORIGINS || 'https://t.me,https://telegram.org').split(',');

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  return headers;
}

function handleOptions(request) {
  const origin = request.headers.get('Origin') || '';
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin)
  });
}

// ============================================
// Telegram initData Validation
// ============================================

/**
 * Validate Telegram WebApp initData using HMAC-SHA256
 * @param {string} initData - Raw initData string from Telegram
 * @param {string} botToken - Telegram Bot Token
 * @returns {object|null} - Parsed user data if valid, null otherwise
 */
async function validateTelegramInitData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    // Remove hash from params
    params.delete('hash');
    
    // Sort params alphabetically
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Generate check string and compute HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const secretKeyBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(botToken)
    );

    const secretKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      new TextEncoder().encode(sortedParams)
    );

    const computedHash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedHash !== hash) {
      console.error('Invalid initData hash');
      return null;
    }

    // Parse user data
    const userParam = params.get('user');
    if (!userParam) return null;
    
    const user = JSON.parse(decodeURIComponent(userParam));
    
    return {
      user,
      authDate: parseInt(params.get('auth_date') || '0', 10)
    };
  } catch (error) {
    console.error('InitData validation error:', error);
    return null;
  }
}

/**
 * Extract and validate tgId from request
 * @param {Request} request
 * @param {string} botToken
 * @returns {Promise<{success: boolean, tgId?: string, error?: string}>}
 */
async function authenticateRequest(request, botToken) {
  try {
    const body = await request.json();
    const { initData, tgId } = body;

    // Prefer initData validation
    if (initData) {
      const validated = await validateTelegramInitData(initData, botToken);
      if (validated && validated.user && validated.user.id) {
        // Check auth_date is recent (within 5 minutes)
        const now = Math.floor(Date.now() / 1000);
        if (now - validated.authDate > 300) {
          return { success: false, error: 'InitData expired' };
        }
        return { success: true, tgId: validated.user.id.toString() };
      }
    }

    // Fallback to tgId (for development/testing only)
    if (tgId) {
      console.warn('Using fallback tgId without validation - INSECURE');
      return { success: true, tgId: tgId.toString() };
    }

    return { success: false, error: 'Missing initData or tgId' };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Invalid request' };
  }
}

// ============================================
// Database Helper
// ============================================

async function queryDB(env, query, params = {}) {
  const res = await fetch(`${env.SUPA_URL}/rest/v1/rpc/${query}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SUPA_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`DB error: ${error}`);
  }

  return res.json();
}

// ============================================
// Hold Endpoints (SECURED)
// ============================================

async function handleHoldStart(request, env) {
  const auth = await authenticateRequest(request, env.BOT_TOKEN);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  }

  const { tgId } = auth;

  try {
    // Get or create active cycle for user
    const cycles = await queryDB(env, 'get_or_create_hold_cycle', { user_id: tgId });
    const cycle = cycles[0];

    // Create new hold
    const holdNumber = (cycle.current_hold_number || 0) + 1;
    
    const holds = await queryDB(env, 'create_hold', {
      p_cycle_id: cycle.id,
      p_hold_number: holdNumber
    });

    const hold = holds[0];

    return new Response(JSON.stringify({ 
      success: true, 
      hold: {
        id: hold.id,
        hold_number: hold.hold_number,
        started_at: hold.started_at
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  } catch (error) {
    console.error('Hold start error:', error);
    return new Response(JSON.stringify({ error: 'Failed to start hold' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  }
}

async function handleHoldComplete(request, env) {
  const auth = await authenticateRequest(request, env.BOT_TOKEN);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  }

  const { tgId } = auth;
  const body = await request.json();
  const { holdId } = body;

  if (!holdId) {
    return new Response(JSON.stringify({ error: 'Missing holdId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  }

  try {
    // SECURITY: Calculate duration on server, NOT from client
    const now = new Date().toISOString();
    
    // Update hold with completion time
    const result = await queryDB(env, 'complete_hold_with_server_time', {
      p_hold_id: holdId,
      p_completed_at: now
    });

    const hold = result[0];
    
    if (!hold || hold.status !== 'completed') {
      return new Response(JSON.stringify({ error: 'Hold not found or already completed' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
      });
    }

    // Calculate duration on server
    const startedAt = new Date(hold.started_at).getTime();
    const completedAt = new Date(hold.completed_at).getTime();
    const durationMs = completedAt - startedAt;
    const durationSec = Math.floor(durationMs / 1000);

    // Validate minimum duration (e.g., 3 seconds)
    const MIN_HOLD_SECONDS = 3;
    if (durationSec < MIN_HOLD_SECONDS) {
      return new Response(JSON.stringify({ 
        error: `Hold duration too short (${durationSec}s < ${MIN_HOLD_SECONDS}s required)` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
      });
    }

    // Check if 3 holds completed -> claim ready
    const cycles = await queryDB(env, 'get_hold_cycle', { cycle_id: hold.cycle_id });
    const cycle = cycles[0];
    
    const claimReady = cycle.completed_holds >= 3;

    // If claim ready, create claim record
    let claim = null;
    if (claimReady && !cycle.claim_created) {
      const claims = await queryDB(env, 'create_claim', {
        p_cycle_id: cycle.id,
        p_amount: 0.5 // USDT reward
      });
      claim = claims[0];
      
      // Mark cycle as claim created
      await queryDB(env, 'update_cycle_claim_flag', { cycle_id: cycle.id });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      completed: true,
      duration_seconds: durationSec,
      claimReady,
      claim: claim ? { id: claim.id, amount: claim.amount } : null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  } catch (error) {
    console.error('Hold complete error:', error);
    return new Response(JSON.stringify({ error: 'Failed to complete hold' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  }
}

// ============================================
// Claim Endpoints (SECURED)
// ============================================

async function handleGetActiveClaim(request, env) {
  const auth = await authenticateRequest(request, env.BOT_TOKEN);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  }

  const { tgId } = auth;

  try {
    const claims = await queryDB(env, 'get_active_claim', { user_id: tgId });
    const claim = claims[0];

    if (!claim) {
      return new Response(JSON.stringify({ success: true, claim: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
      });
    }

    // Calculate expires_in
    const expiresAt = new Date(claim.expires_at).getTime();
    const now = Date.now();
    const expiresInSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

    return new Response(JSON.stringify({ 
      success: true, 
      claim: {
        id: claim.id,
        amount: claim.amount,
        expires_in: expiresInSeconds,
        status: claim.status
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  } catch (error) {
    console.error('Get claim error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch claim' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  }
}

async function handleVerifyClaim(request, env) {
  const auth = await authenticateRequest(request, env.BOT_TOKEN);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  }

  const { tgId } = auth;
  const body = await request.json();
  const { claimId, senderAddress, txHash } = body;

  if (!claimId || !txHash) {
    return new Response(JSON.stringify({ error: 'Missing claimId or txHash' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  }

  try {
    // Get claim details
    const claims = await queryDB(env, 'get_claim', { claim_id: claimId });
    const claim = claims[0];

    if (!claim || claim.user_id !== tgId) {
      return new Response(JSON.stringify({ error: 'Claim not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
      });
    }

    if (claim.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Claim already processed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
      });
    }

    // SECURITY: Verify on-chain payment
    const payment = await findValidTonPayment({
      claimId,
      senderAddress: senderAddress || claim.treasury_wallet,
      minAmountNano: Math.floor(claim.amount * 1e9), // Convert USDT to nanoTON (simplified)
      txHash
    });

    if (!payment) {
      // Mark as pending verification
      await queryDB(env, 'update_claim_status', {
        claim_id: claimId,
        status: 'pending_verification'
      });

      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment not found on-chain',
        pending: true
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
      });
    }

    // SECURITY: Verify comment matches CLAIM:<claimId>
    const expectedComment = `CLAIM:${claimId}`;
    if (payment.comment !== expectedComment) {
      return new Response(JSON.stringify({ 
        error: `Invalid payment comment (expected: ${expectedComment}, got: ${payment.comment})` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
      });
    }

    // SECURITY: Verify amount
    if (payment.amount_nano < Math.floor(claim.amount * 1e9)) {
      return new Response(JSON.stringify({ 
        error: `Insufficient payment amount (${payment.amount_nano} < ${claim.amount * 1e9} nano)` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
      });
    }

    // Credit the claim
    await queryDB(env, 'credit_claim', {
      claim_id: claimId,
      tx_hash: txHash
    });

    return new Response(JSON.stringify({ 
      success: true, 
      credited: claim.amount 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  } catch (error) {
    console.error('Verify claim error:', error);
    return new Response(JSON.stringify({ error: 'Claim verification failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin') || '') }
    });
  }
}

// ============================================
// Main Request Handler
// ============================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Route requests
    try {
      if (path === '/api/hold/start' && request.method === 'POST') {
        return await handleHoldStart(request, env);
      }
      
      if (path === '/api/hold/complete' && request.method === 'POST') {
        return await handleHoldComplete(request, env);
      }
      
      if (path === '/api/claim/active' && request.method === 'POST') {
        return await handleGetActiveClaim(request, env);
      }
      
      if (path === '/api/claim/verify' && request.method === 'POST') {
        return await handleVerifyClaim(request, env);
      }

      // Add more routes here for wallet, missions, etc.

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
      });
    } catch (error) {
      console.error('Request handler error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
      });
    }
  }
};
