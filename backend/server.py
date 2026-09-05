from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import time
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALG = 'HS256'
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@tronkeeper.app')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
SEED_USDT = float(os.environ.get('SEED_BALANCE_USDT', '1000'))
SEED_TRX = float(os.environ.get('SEED_BALANCE_TRX', '50'))

CG_BASE = 'https://api.coingecko.com/api/v3'

app = FastAPI()
api = APIRouter(prefix='/api')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('tronkeeper')

# ----------------------------------------------------------------------------
# CoinGecko client with simple in-memory TTL cache (respects rate limits)
# ----------------------------------------------------------------------------
_cache = {}


async def cg_get(path: str, params: dict, ttl: int):
    key = path + '?' + '&'.join(f'{k}={v}' for k, v in sorted(params.items()))
    now = time.time()
    hit = _cache.get(key)
    if hit and now - hit[0] < ttl:
        return hit[1]
    try:
        async with httpx.AsyncClient(timeout=12) as hc:
            r = await hc.get(f'{CG_BASE}{path}', params=params,
                             headers={'accept': 'application/json'})
            r.raise_for_status()
            data = r.json()
            _cache[key] = (now, data)
            return data
    except Exception as e:
        logger.warning(f'CoinGecko error {path}: {e}')
        if hit:
            return hit[1]  # serve stale on failure
        return None


DEFAULT_COIN_IDS = [
    'bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple',
    'the-open-network', 'tron', 'dogecoin', 'cardano', 'avalanche-2',
]

# CoinGecko renamed some coins; keep friendly display labels.
DISPLAY_OVERRIDES = {
    'the-open-network': {'symbol': 'TON', 'name': 'Toncoin'},
}


def apply_override(coin_id, symbol, name):
    o = DISPLAY_OVERRIDES.get(coin_id)
    if o:
        return o.get('symbol', symbol), o.get('name', name)
    return symbol, name


async def get_markets(coin_ids: List[str]):
    if not coin_ids:
        return []
    ids = ','.join(coin_ids)
    data = await cg_get('/coins/markets', {
        'vs_currency': 'usd', 'ids': ids, 'sparkline': 'true',
        'price_change_percentage': '24h', 'per_page': 250, 'page': 1,
    }, ttl=45)
    return data  # None on upstream failure, [] if unknown ids


async def get_price(coin_id: str) -> Optional[float]:
    data = await cg_get('/simple/price', {'ids': coin_id, 'vs_currencies': 'usd'}, ttl=30)
    if data and coin_id in data:
        return float(data[coin_id]['usd'])
    # fallback to markets cache
    mk = await get_markets([coin_id])
    if mk:
        return float(mk[0]['current_price'])
    return None


# ----------------------------------------------------------------------------
# Auth helpers
# ----------------------------------------------------------------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {'sub': user_id, 'email': email, 'role': 'admin',
               'exp': datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_admin(request: Request) -> dict:
    token = request.cookies.get('admin_token')
    if not token:
        auth = request.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({'_id': ObjectId(payload['sub'])})
        if not user or user.get('role') != 'admin':
            raise HTTPException(status_code=401, detail='Not authorized')
        return {'id': str(user['_id']), 'email': user['email']}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
class AdminLogin(BaseModel):
    email: str
    password: str


class AddChart(BaseModel):
    coin_id: str


class InitUser(BaseModel):
    uid: str


class SpotBuy(BaseModel):
    uid: str
    coin_id: str
    quote_amount: float  # USDT to spend


class SpotSell(BaseModel):
    uid: str
    coin_id: str
    base_amount: float  # amount of coin to sell


class Withdraw(BaseModel):
    uid: str
    asset: str  # USDT or TRX
    amount: float
    to_address: str


# ----------------------------------------------------------------------------
# Admin auth routes
# ----------------------------------------------------------------------------
@api.post('/admin/login')
async def admin_login(body: AdminLogin, request: Request, response: Response):
    email = body.email.strip().lower()
    ip = request.client.host if request.client else 'unknown'
    identifier = f'{ip}:{email}'
    rec = await db.login_attempts.find_one({'identifier': identifier})
    if rec and rec.get('locked_until') and datetime.now(timezone.utc) < datetime.fromisoformat(rec['locked_until']):
        raise HTTPException(status_code=429, detail='Too many attempts. Try again later.')

    user = await db.users.find_one({'email': email})
    if not user or not verify_password(body.password, user['password_hash']):
        count = (rec.get('count', 0) if rec else 0) + 1
        update = {'identifier': identifier, 'count': count}
        if count >= 5:
            update['locked_until'] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({'identifier': identifier}, {'$set': update}, upsert=True)
        raise HTTPException(status_code=401, detail='Invalid email or password')

    await db.login_attempts.delete_one({'identifier': identifier})
    token = create_token(str(user['_id']), email)
    response.set_cookie('admin_token', token, httponly=True, secure=True,
                        samesite='none', max_age=604800, path='/')
    return {'ok': True, 'token': token, 'email': email}


@api.get('/admin/me')
async def admin_me(admin: dict = Depends(get_admin)):
    return {'ok': True, 'admin': admin}


@api.post('/admin/logout')
async def admin_logout(response: Response):
    response.delete_cookie('admin_token', path='/')
    return {'ok': True}


# ----------------------------------------------------------------------------
# Charts (admin managed)
# ----------------------------------------------------------------------------
def chart_doc(d: dict) -> dict:
    return {
        'id': str(d['_id']),
        'coin_id': d['coin_id'],
        'symbol': d.get('symbol', ''),
        'name': d.get('name', ''),
        'image': d.get('image', ''),
        'order': d.get('order', 0),
    }


@api.get('/charts')
async def list_charts():
    docs = await db.charts.find().sort('order', 1).to_list(200)
    charts = [chart_doc(d) for d in docs]
    coin_ids = [c['coin_id'] for c in charts]
    markets = await get_markets(coin_ids) or []
    mk = {m['id']: m for m in markets}
    for c in charts:
        m = mk.get(c['coin_id'])
        if m:
            c['price'] = m.get('current_price')
            c['change_24h'] = m.get('price_change_percentage_24h')
            c['image'] = c['image'] or m.get('image')
            c['symbol'] = c['symbol'] or (m.get('symbol') or '').upper()
            c['name'] = c['name'] or m.get('name')
            sp = (m.get('sparkline_in_7d') or {}).get('price') or []
            c['sparkline'] = sp[-48:] if sp else []
        else:
            c['price'] = None
            c['change_24h'] = None
            c['sparkline'] = []
        c['symbol'], c['name'] = apply_override(c['coin_id'], c['symbol'], c['name'])
    return {'ok': True, 'charts': charts}


@api.post('/admin/charts')
async def add_chart(body: AddChart, admin: dict = Depends(get_admin)):
    coin_id = body.coin_id.strip().lower()
    existing = await db.charts.find_one({'coin_id': coin_id})
    if existing:
        raise HTTPException(status_code=400, detail='Chart already exists')
    markets = await get_markets([coin_id])
    if markets is None:
        raise HTTPException(status_code=503, detail='Market data temporarily unavailable, please retry')
    if not markets:
        raise HTTPException(status_code=404, detail='Coin not found on CoinGecko')
    m = markets[0]
    count = await db.charts.count_documents({})
    doc = {
        'coin_id': coin_id,
        'symbol': (m.get('symbol') or '').upper(),
        'name': m.get('name') or coin_id,
        'image': m.get('image') or '',
        'order': count,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    res = await db.charts.insert_one(doc)
    doc['_id'] = res.inserted_id
    return {'ok': True, 'chart': chart_doc(doc)}


@api.delete('/admin/charts/{chart_id}')
async def delete_chart(chart_id: str, admin: dict = Depends(get_admin)):
    if not ObjectId.is_valid(chart_id):
        raise HTTPException(status_code=400, detail='Invalid chart id')
    res = await db.charts.delete_one({'_id': ObjectId(chart_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Chart not found')
    return {'ok': True}


# ----------------------------------------------------------------------------
# Market data (public)
# ----------------------------------------------------------------------------
@api.get('/market/search')
async def market_search(q: str):
    data = await cg_get('/search', {'query': q}, ttl=600)
    coins = (data or {}).get('coins', [])[:15]
    return {'ok': True, 'results': [{
        'coin_id': c['id'], 'symbol': (c.get('symbol') or '').upper(),
        'name': c.get('name'), 'image': c.get('thumb'),
        'rank': c.get('market_cap_rank'),
    } for c in coins]}


@api.get('/market/coin/{coin_id}/chart')
async def coin_chart(coin_id: str, days: str = '1'):
    data = await cg_get(f'/coins/{coin_id}/market_chart',
                        {'vs_currency': 'usd', 'days': days}, ttl=120)
    prices = (data or {}).get('prices', [])
    return {'ok': True, 'prices': prices}


# ----------------------------------------------------------------------------
# Users & wallet
# ----------------------------------------------------------------------------
async def get_or_create_user(uid: str) -> dict:
    user = await db.app_users.find_one({'uid': uid})
    if not user:
        user = {
            'uid': uid,
            'usdt_balance': SEED_USDT,
            'trx_balance': SEED_TRX,
            'holdings': [],
            'total_refs': 0,
            'trx_refs': 0.0,
            'created_at': datetime.now(timezone.utc).isoformat(),
        }
        await db.app_users.insert_one(user)
        user = await db.app_users.find_one({'uid': uid})
    return user


def user_public(u: dict) -> dict:
    return {
        'uid': u['uid'],
        'usdt_balance': round(u.get('usdt_balance', 0), 2),
        'trx_balance': round(u.get('trx_balance', 0), 4),
        'holdings': u.get('holdings', []),
        'total_refs': u.get('total_refs', 0),
        'trx_refs': u.get('trx_refs', 0),
    }


async def enrich_holdings(holdings: List[dict]):
    if not holdings:
        return []
    ids = [h['coin_id'] for h in holdings]
    markets = await get_markets(ids) or []
    mk = {m['id']: m for m in markets}
    # fall back to stored chart metadata for symbol/name/image
    chart_docs = await db.charts.find({'coin_id': {'$in': ids}}).to_list(200)
    cd = {c['coin_id']: c for c in chart_docs}
    out = []
    for h in holdings:
        m = mk.get(h['coin_id'], {})
        price = m.get('current_price')
        amount = h.get('amount', 0)
        value = round(price * amount, 2) if price else None
        cost = h.get('avg_price', 0) * amount
        pnl = round(value - cost, 2) if value is not None else None
        pnl_pct = round((pnl / cost * 100), 2) if (pnl is not None and cost) else None
        symbol = h.get('symbol') or (m.get('symbol') or '').upper()
        name = h.get('name') or m.get('name') or h['coin_id']
        c = cd.get(h['coin_id'], {})
        if c:
            symbol = c.get('symbol') or symbol
            name = c.get('name') or name
        symbol, name = apply_override(h['coin_id'], symbol, name)
        out.append({
            **h,
            'symbol': symbol,
            'name': name,
            'image': h.get('image') or c.get('image') or m.get('image'),
            'price': price,
            'value': value,
            'change_24h': m.get('price_change_percentage_24h'),
            'pnl': pnl,
            'pnl_pct': pnl_pct,
        })
    return out


@api.post('/user/init')
async def init_user(body: InitUser):
    u = await get_or_create_user(body.uid)
    pub = user_public(u)
    pub['holdings'] = await enrich_holdings(u.get('holdings', []))
    return {'ok': True, 'user': pub}


@api.get('/user/{uid}')
async def get_user(uid: str):
    u = await db.app_users.find_one({'uid': uid})
    if not u:
        raise HTTPException(status_code=404, detail='User not found')
    pub = user_public(u)
    pub['holdings'] = await enrich_holdings(u.get('holdings', []))
    return {'ok': True, 'user': pub}


@api.get('/user/{uid}/transactions')
async def get_transactions(uid: str):
    docs = await db.transactions.find({'uid': uid}, {'_id': 0}).sort('timestamp', -1).to_list(200)
    return {'ok': True, 'transactions': docs}


async def record_tx(uid, type_, asset, amount, **extra):
    tx = {
        'id': str(ObjectId()),
        'uid': uid, 'type': type_, 'asset': asset, 'amount': round(amount, 6),
        'status': 'confirmed',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        **extra,
    }
    await db.transactions.insert_one(dict(tx))
    return tx


# ----------------------------------------------------------------------------
# Spot trading
# ----------------------------------------------------------------------------
@api.post('/spot/buy')
async def spot_buy(body: SpotBuy):
    if body.quote_amount <= 0:
        raise HTTPException(status_code=400, detail='Amount must be positive')
    u = await get_or_create_user(body.uid)
    if u.get('usdt_balance', 0) < body.quote_amount:
        raise HTTPException(status_code=400, detail='Insufficient USDT balance')
    price = await get_price(body.coin_id)
    if not price:
        raise HTTPException(status_code=400, detail='Price unavailable, try again')
    # Resolve coin metadata from the admin chart doc first (users only buy listed coins),
    # falling back to batch market data. This avoids fragile per-coin CoinGecko calls.
    chart = await db.charts.find_one({'coin_id': body.coin_id})
    m = {}
    if not chart:
        mk = await get_markets([body.coin_id]) or []
        m = mk[0] if mk else {}
    sym = (chart.get('symbol') if chart else (m.get('symbol') or '').upper()) or body.coin_id.upper()
    cname = (chart.get('name') if chart else m.get('name')) or body.coin_id
    cimg = (chart.get('image') if chart else m.get('image')) or ''
    sym, cname = apply_override(body.coin_id, sym, cname)
    base = body.quote_amount / price

    holdings = u.get('holdings', [])
    found = next((h for h in holdings if h['coin_id'] == body.coin_id), None)
    if found:
        total_cost = found['avg_price'] * found['amount'] + body.quote_amount
        found['amount'] += base
        found['avg_price'] = total_cost / found['amount']
        found['symbol'] = sym
        found['name'] = cname
        found['image'] = found.get('image') or cimg
    else:
        holdings.append({
            'coin_id': body.coin_id,
            'symbol': sym,
            'name': cname,
            'image': cimg,
            'amount': base,
            'avg_price': price,
        })
    new_usdt = u['usdt_balance'] - body.quote_amount
    await db.app_users.update_one({'uid': body.uid},
                                  {'$set': {'usdt_balance': new_usdt, 'holdings': holdings}})
    await record_tx(body.uid, 'buy', sym, base,
                    price=price, quote=body.quote_amount, coin_id=body.coin_id,
                    description=f'Bought {sym}')
    u = await db.app_users.find_one({'uid': body.uid})
    pub = user_public(u)
    pub['holdings'] = await enrich_holdings(u.get('holdings', []))
    return {'ok': True, 'user': pub, 'filled': {'base': base, 'price': price}}


@api.post('/spot/sell')
async def spot_sell(body: SpotSell):
    if body.base_amount <= 0:
        raise HTTPException(status_code=400, detail='Amount must be positive')
    u = await get_or_create_user(body.uid)
    holdings = u.get('holdings', [])
    found = next((h for h in holdings if h['coin_id'] == body.coin_id), None)
    if not found or found['amount'] < body.base_amount - 1e-9:
        raise HTTPException(status_code=400, detail='Insufficient holdings')
    price = await get_price(body.coin_id)
    if not price:
        raise HTTPException(status_code=400, detail='Price unavailable, try again')
    proceeds = body.base_amount * price
    found['amount'] -= body.base_amount
    if found['amount'] <= 1e-9:
        holdings = [h for h in holdings if h['coin_id'] != body.coin_id]
    new_usdt = u['usdt_balance'] + proceeds
    await db.app_users.update_one({'uid': body.uid},
                                  {'$set': {'usdt_balance': new_usdt, 'holdings': holdings}})
    await record_tx(body.uid, 'sell', found['symbol'], body.base_amount,
                    price=price, quote=proceeds, coin_id=body.coin_id,
                    description=f'Sold {found["symbol"]}')
    u = await db.app_users.find_one({'uid': body.uid})
    pub = user_public(u)
    pub['holdings'] = await enrich_holdings(u.get('holdings', []))
    return {'ok': True, 'user': pub, 'filled': {'quote': proceeds, 'price': price}}


# ----------------------------------------------------------------------------
# Withdraw (only from wallet balance, never from holdings)
# ----------------------------------------------------------------------------
@api.post('/wallet/withdraw')
async def withdraw(body: Withdraw):
    asset = body.asset.upper()
    if asset not in ('USDT', 'TRX'):
        raise HTTPException(status_code=400, detail='Only USDT or TRX can be withdrawn')
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail='Amount must be positive')
    u = await get_or_create_user(body.uid)
    field = 'usdt_balance' if asset == 'USDT' else 'trx_balance'
    if u.get(field, 0) < body.amount:
        raise HTTPException(status_code=400, detail=f'Insufficient {asset} balance')
    new_bal = u[field] - body.amount
    await db.app_users.update_one({'uid': body.uid}, {'$set': {field: new_bal}})
    tx = await record_tx(body.uid, 'withdraw', asset, body.amount,
                         to_address=body.to_address, status='pending',
                         description=f'Withdraw {asset}')
    return {'ok': True, 'new_balance': round(new_bal, 4), 'tx': tx}


@api.get('/')
async def root():
    return {'message': 'TronKeeper API'}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
async def startup():
    # seed admin (idempotent)
    email = ADMIN_EMAIL.strip().lower()
    existing = await db.users.find_one({'email': email})
    if not existing:
        await db.users.insert_one({
            'email': email, 'password_hash': hash_password(ADMIN_PASSWORD),
            'role': 'admin', 'name': 'Admin',
            'created_at': datetime.now(timezone.utc).isoformat(),
        })
        logger.info('Seeded admin user')
    elif not verify_password(ADMIN_PASSWORD, existing['password_hash']):
        await db.users.update_one({'email': email},
                                  {'$set': {'password_hash': hash_password(ADMIN_PASSWORD)}})
    # seed default charts (idempotent)
    if await db.charts.count_documents({}) == 0:
        markets = await get_markets(DEFAULT_COIN_IDS) or []
        mk = {m['id']: m for m in markets}
        for i, cid in enumerate(DEFAULT_COIN_IDS):
            m = mk.get(cid, {})
            await db.charts.insert_one({
                'coin_id': cid,
                'symbol': (m.get('symbol') or '').upper(),
                'name': m.get('name') or cid,
                'image': m.get('image') or '',
                'order': i,
                'created_at': datetime.now(timezone.utc).isoformat(),
            })
        logger.info('Seeded default charts')


@app.on_event('shutdown')
async def shutdown():
    client.close()
