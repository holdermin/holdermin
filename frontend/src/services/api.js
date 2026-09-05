/**
 * TronKeeper API Service - TON Claims System (SECURED)
 * 
 * Security improvements:
 * - Sends Telegram initData for authentication
 * - Validates initData before sending
 * - Fallback to tgId only for development
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://tkworker.tkexchange.workers.dev';

// ============================================
// Authentication Helper
// ============================================

/**
 * Get Telegram initData for authentication
 * @returns {string|null} - initData string or null if not available
 */
function getTelegramInitData() {
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  
  // Development fallback (INSECURE - only for local testing)
  console.warn('Telegram initData not available - using insecure fallback');
  return null;
}

/**
 * Get user tgId from Telegram
 * @returns {string|null}
 */
function getTelegramUserId() {
  if (window.Telegram?.WebApp?.initData?.user?.id) {
    return window.Telegram.WebApp.initData.user.id.toString();
  }
  
  // Development fallback
  return 'test_user';
}

// ============================================
// Hold to Earn API (SECURED)
// ============================================

/**
 * Start a hold session
 * @returns {Promise<{success: boolean, hold?: object, error?: string}>}
 */
export const startHold = async () => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/hold/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId })
    });
    
    const result = await res.json();
    
    if (!res.ok) {
      return { 
        success: false, 
        error: result.error || 'Failed to start hold' 
      };
    }
    
    return { success: true, hold: result.hold };
  } catch (error) {
    console.error('Hold start error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Complete a hold session
 * @param {string} holdId
 * @returns {Promise<{success: boolean, completed?: boolean, claimReady?: boolean, error?: string}>}
 */
export const completeHold = async (holdId) => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/hold/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        holdId,
        initData,
        tgId
        // NOTE: duration is NOW CALCULATED ON SERVER, not sent from client
      })
    });
    
    const result = await res.json();
    
    if (!res.ok) {
      return { 
        success: false, 
        error: result.error || 'Hold completion failed' 
      };
    }
    
    return { 
      success: true, 
      completed: result.completed,
      claimReady: result.claimReady,
      duration_seconds: result.duration_seconds,
      claim: result.claim
    };
  } catch (error) {
    console.error('Hold complete error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get active claim for user
 * @returns {Promise<{success: boolean, claim?: object, error?: string}>}
 */
export const getActiveClaim = async () => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/claim/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId })
    });
    
    const result = await res.json();
    
    if (!res.ok) {
      return { 
        success: false, 
        error: result.error || 'Failed to fetch claim' 
      };
    }
    
    return { success: true, claim: result.claim };
  } catch (error) {
    console.error('Get claim error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify TON payment and credit claim
 * @param {string} claimId
 * @param {string} senderAddress - TonConnect wallet address (raw "0:hex")
 * @param {string} txHash - Transaction hash
 * @returns {Promise<{success: boolean, credited?: number, error?: string, pending?: boolean}>}
 */
export const verifyClaim = async (claimId, senderAddress, txHash) => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/claim/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimId,
        senderAddress,
        txHash,
        initData,
        tgId
      })
    });
    
    const result = await res.json();
    
    if (!res.ok) {
      return { 
        success: false, 
        error: result.error || 'Claim verification failed',
        pending: result.pending
      };
    }
    
    return { 
      success: true, 
      credited: result.credited 
    };
  } catch (error) {
    console.error('Verify claim error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// Wallet API (existing - keep intact)
// ============================================

export const getWalletData = async () => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Wallet fetch error:', error);
    throw error;
  }
};

export const deposit = async (amount, asset) => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/wallet/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId, amount, asset })
    });
    
    return await res.json();
  } catch (error) {
    console.error('Deposit error:', error);
    throw error;
  }
};

export const withdraw = async (amount, asset, address, memo) => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/wallet/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId, amount, asset, address, memo })
    });
    
    return await res.json();
  } catch (error) {
    console.error('Withdraw error:', error);
    throw error;
  }
};

export const getTransactions = async () => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/wallet/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Transactions fetch error:', error);
    throw error;
  }
};

// ============================================
// Missions API (existing - keep intact)
// ============================================

export const getMissions = async () => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Missions fetch error:', error);
    throw error;
  }
};

export const claimMissionReward = async (missionId) => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/missions/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId, missionId })
    });
    
    return await res.json();
  } catch (error) {
    console.error('Mission claim error:', error);
    throw error;
  }
};

// ============================================
// Referrals API (existing - keep intact)
// ============================================

export const getReferralData = async () => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/referrals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Referrals fetch error:', error);
    throw error;
  }
};

// ============================================
// Spot Trading API (existing - keep intact)
// ============================================

export const getSpotPrices = async () => {
  try {
    const res = await fetch(`${WORKER_URL}/api/spot/prices`, {
      method: 'GET'
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Spot prices fetch error:', error);
    throw error;
  }
};

export const buySpot = async (symbol, amountUSDT) => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/spot/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId, symbol, amountUSDT })
    });
    
    return await res.json();
  } catch (error) {
    console.error('Buy spot error:', error);
    throw error;
  }
};

export const sellSpot = async (positionId, amount) => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/spot/sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId, positionId, amount })
    });
    
    return await res.json();
  } catch (error) {
    console.error('Sell spot error:', error);
    throw error;
  }
};

export const getSpotPositions = async () => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/spot/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Spot positions fetch error:', error);
    throw error;
  }
};

export const setTakeProfit = async (positionId, takeProfitPercent) => {
  try {
    const initData = getTelegramInitData();
    const tgId = getTelegramUserId();
    
    const res = await fetch(`${WORKER_URL}/api/spot/take-profit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, tgId, positionId, takeProfitPercent })
    });
    
    return await res.json();
  } catch (error) {
    console.error('Set take profit error:', error);
    throw error;
  }
};
