"""TronKeeper backend regression tests (charts, admin auth, spot trading, wallet)."""
import os
import re
import time
from pathlib import Path

import pytest
import requests

PREVIEW = "https://2433dbc8-8476-4b21-8b1c-0d1f3d0dfed3.preview.emergentagent.com"
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or PREVIEW).rstrip("/")
API = f"{BASE_URL}/api"

QA_UID = "QA_USER_1"


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_creds():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("missing test_credentials.md")
    c = p.read_text()
    email = re.search(r"Email:\s*`([^`]+)`", c)
    pw = re.search(r"Password:\s*`([^`]+)`", c)
    if not email or not pw:
        pytest.skip("no creds parsed")
    return {"email": email.group(1), "password": pw.group(1)}


@pytest.fixture(scope="session")
def admin_token(api_client, admin_creds):
    r = api_client.post(f"{API}/admin/login", json=admin_creds)
    if r.status_code != 200:
        pytest.fail(f"admin login failed {r.status_code}: {r.text[:300]}")
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="session", autouse=True)
def fresh_user(api_client):
    """Reset QA user in mongo so balances are deterministic."""
    import subprocess
    subprocess.run([
        "mongosh", "tronkeeper", "--quiet", "--eval",
        f"db.app_users.deleteMany({{uid:'{QA_UID}'}}); db.transactions.deleteMany({{uid:'{QA_UID}'}})",
    ], capture_output=True)
    yield
    subprocess.run([
        "mongosh", "tronkeeper", "--quiet", "--eval",
        f"db.app_users.deleteMany({{uid:'{QA_UID}'}}); db.transactions.deleteMany({{uid:'{QA_UID}'}})",
    ], capture_output=True)


# --------------------------------------------------------------- charts (public)
class TestCharts:
    def test_list_charts(self, api_client):
        r = api_client.get(f"{API}/charts")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        charts = data["charts"]
        assert len(charts) >= 8, f"expected ~10 charts, got {len(charts)}"
        for c in charts:
            assert "_id" not in c
            for k in ("id", "coin_id", "symbol", "name", "image", "price", "change_24h", "sparkline"):
                assert k in c, f"missing {k} in {c}"
            assert c["price"] is not None, f"null price for {c['coin_id']}"
            assert isinstance(c["price"], (int, float)) and c["price"] > 0
            assert isinstance(c["sparkline"], list) and len(c["sparkline"]) > 0
        ids = [c["coin_id"] for c in charts]
        assert "bitcoin" in ids and "ethereum" in ids

    def test_coin_chart_ranges(self, api_client):
        for days in ("1", "7", "30", "365"):
            r = api_client.get(f"{API}/market/coin/bitcoin/chart", params={"days": days})
            assert r.status_code == 200, r.text[:200]
            prices = r.json()["prices"]
            assert isinstance(prices, list) and len(prices) > 5, f"days={days} -> {len(prices)}"

    def test_market_search(self, api_client):
        r = api_client.get(f"{API}/market/search", params={"q": "litecoin"})
        assert r.status_code == 200
        results = r.json()["results"]
        assert any(x["coin_id"] == "litecoin" for x in results)


# --------------------------------------------------------------- admin auth
class TestAdminAuth:
    def test_login_success_sets_cookie(self, api_client, admin_creds):
        r = requests.post(f"{API}/admin/login", json=admin_creds)
        assert r.status_code == 200
        assert r.json()["email"] == admin_creds["email"]
        set_cookie = r.headers.get("set-cookie", "")
        assert "admin_token" in set_cookie
        assert "HttpOnly" in set_cookie

    def test_login_wrong_password(self, api_client, admin_creds):
        r = api_client.post(f"{API}/admin/login",
                            json={"email": admin_creds["email"], "password": "wrong-pass"})
        assert r.status_code == 401

    def test_admin_me_requires_token(self, api_client, admin_token):
        r = requests.get(f"{API}/admin/me")
        assert r.status_code == 401
        r2 = requests.get(f"{API}/admin/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert r2.status_code == 200
        assert r2.json()["admin"]["email"]

    def test_bcrypt_hash_format(self):
        import subprocess
        out = subprocess.run([
            "mongosh", "tronkeeper", "--quiet", "--eval",
            "db.users.findOne({role:'admin'}).password_hash",
        ], capture_output=True, text=True).stdout.strip()
        assert out.startswith("$2b$"), f"hash format: {out[:20]}"


# --------------------------------------------------------------- admin charts CRUD
class TestAdminCharts:
    def test_add_chart_requires_auth(self, api_client):
        r = requests.post(f"{API}/admin/charts", json={"coin_id": "litecoin"})
        assert r.status_code == 401

    def test_delete_chart_requires_auth(self, api_client):
        r = requests.delete(f"{API}/admin/charts/000000000000000000000000")
        assert r.status_code == 401

    def test_add_duplicate_unknown_and_delete(self, api_client, admin_token):
        h = {"Authorization": f"Bearer {admin_token}"}
        # cleanup any prior litecoin chart
        charts = api_client.get(f"{API}/charts").json()["charts"]
        for c in charts:
            if c["coin_id"] == "litecoin":
                requests.delete(f"{API}/admin/charts/{c['id']}", headers=h)

        r = requests.post(f"{API}/admin/charts", json={"coin_id": "litecoin"}, headers=h)
        assert r.status_code == 200, r.text[:300]
        chart = r.json()["chart"]
        assert chart["coin_id"] == "litecoin"
        assert chart["symbol"] == "LTC"
        chart_id = chart["id"]

        # appears in public list
        listed = api_client.get(f"{API}/charts").json()["charts"]
        assert any(c["coin_id"] == "litecoin" for c in listed)

        # duplicate -> 400
        dup = requests.post(f"{API}/admin/charts", json={"coin_id": "litecoin"}, headers=h)
        assert dup.status_code == 400

        # unknown -> 404
        unk = requests.post(f"{API}/admin/charts", json={"coin_id": "not-a-real-coin-xyz"}, headers=h)
        assert unk.status_code == 404, unk.text[:200]

        # delete
        d = requests.delete(f"{API}/admin/charts/{chart_id}", headers=h)
        assert d.status_code == 200
        listed2 = api_client.get(f"{API}/charts").json()["charts"]
        assert not any(c["coin_id"] == "litecoin" for c in listed2)

        # delete again -> 404
        d2 = requests.delete(f"{API}/admin/charts/{chart_id}", headers=h)
        assert d2.status_code == 404

    def test_delete_invalid_objectid(self, api_client, admin_token):
        h = {"Authorization": f"Bearer {admin_token}"}
        r = requests.delete(f"{API}/admin/charts/not-an-objectid", headers=h)
        assert r.status_code in (400, 404, 422), f"got {r.status_code}: {r.text[:200]}"


# --------------------------------------------------------------- user init / spot / wallet
class TestUserSpotWallet:
    def test_01_init_user_seeded(self, api_client):
        r = api_client.post(f"{API}/user/init", json={"uid": QA_UID})
        assert r.status_code == 200, r.text[:300]
        u = r.json()["user"]
        assert u["uid"] == QA_UID
        assert u["usdt_balance"] == 1000
        assert u["trx_balance"] == 50
        assert u["holdings"] == []

    def test_02_buy_eth(self, api_client):
        r = api_client.post(f"{API}/spot/buy",
                            json={"uid": QA_UID, "coin_id": "ethereum", "quote_amount": 200})
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        u = body["user"]
        assert u["usdt_balance"] == 800
        eth = next((h for h in u["holdings"] if h["coin_id"] == "ethereum"), None)
        assert eth is not None
        assert eth["amount"] > 0 and eth["avg_price"] > 0
        assert eth["symbol"] == "ETH"
        assert body["filled"]["price"] > 0

    def test_03_buy_insufficient(self, api_client):
        r = api_client.post(f"{API}/spot/buy",
                            json={"uid": QA_UID, "coin_id": "bitcoin", "quote_amount": 999999})
        assert r.status_code == 400
        assert "Insufficient USDT" in r.json()["detail"]

    def test_04_buy_zero_amount(self, api_client):
        r = api_client.post(f"{API}/spot/buy",
                            json={"uid": QA_UID, "coin_id": "bitcoin", "quote_amount": 0})
        assert r.status_code == 400

    def test_05_sell_too_much(self, api_client):
        r = api_client.post(f"{API}/spot/sell",
                            json={"uid": QA_UID, "coin_id": "ethereum", "base_amount": 10000})
        assert r.status_code == 400
        assert "Insufficient holdings" in r.json()["detail"]

    def test_06_sell_unheld_coin(self, api_client):
        r = api_client.post(f"{API}/spot/sell",
                            json={"uid": QA_UID, "coin_id": "cardano", "base_amount": 1})
        assert r.status_code == 400

    def test_07_sell_half(self, api_client):
        u = api_client.get(f"{API}/user/{QA_UID}").json()["user"]
        eth = next(h for h in u["holdings"] if h["coin_id"] == "ethereum")
        held = eth["amount"]
        before_usdt = u["usdt_balance"]
        r = api_client.post(f"{API}/spot/sell",
                            json={"uid": QA_UID, "coin_id": "ethereum", "base_amount": held / 2})
        assert r.status_code == 200, r.text[:300]
        nu = r.json()["user"]
        assert nu["usdt_balance"] > before_usdt
        eth2 = next(h for h in nu["holdings"] if h["coin_id"] == "ethereum")
        assert eth2["amount"] == pytest.approx(held / 2, rel=1e-6)
        # persistence
        again = api_client.get(f"{API}/user/{QA_UID}").json()["user"]
        eth3 = next(h for h in again["holdings"] if h["coin_id"] == "ethereum")
        assert eth3["amount"] == pytest.approx(held / 2, rel=1e-6)

    def test_08_withdraw_usdt(self, api_client):
        before = api_client.get(f"{API}/user/{QA_UID}").json()["user"]["usdt_balance"]
        r = api_client.post(f"{API}/wallet/withdraw", json={
            "uid": QA_UID, "asset": "USDT", "amount": 50,
            "to_address": "TNjqVzo47ndAvH241njkMLKbda3G6FPgVs"})
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body["new_balance"] == pytest.approx(before - 50, abs=0.01)
        assert body["tx"]["status"] == "pending"
        assert body["tx"]["type"] == "withdraw"
        after = api_client.get(f"{API}/user/{QA_UID}").json()["user"]["usdt_balance"]
        assert after == pytest.approx(before - 50, abs=0.01)

    def test_09_withdraw_over_balance(self, api_client):
        r = api_client.post(f"{API}/wallet/withdraw", json={
            "uid": QA_UID, "asset": "TRX", "amount": 99999, "to_address": "Tabc"})
        assert r.status_code == 400
        assert "Insufficient" in r.json()["detail"]

    def test_10_withdraw_invalid_asset(self, api_client):
        r = api_client.post(f"{API}/wallet/withdraw", json={
            "uid": QA_UID, "asset": "BTC", "amount": 1, "to_address": "Tabc"})
        assert r.status_code == 400

    def test_11_withdraw_holdings_not_possible(self, api_client):
        r = api_client.post(f"{API}/wallet/withdraw", json={
            "uid": QA_UID, "asset": "ETH", "amount": 0.001, "to_address": "Tabc"})
        assert r.status_code == 400

    def test_12_transactions_newest_first(self, api_client):
        r = api_client.get(f"{API}/user/{QA_UID}/transactions")
        assert r.status_code == 200
        txs = r.json()["transactions"]
        types = [t["type"] for t in txs]
        assert "buy" in types and "sell" in types and "withdraw" in types
        for t in txs:
            assert "_id" not in t
            assert "id" in t and "timestamp" in t
        ts = [t["timestamp"] for t in txs]
        assert ts == sorted(ts, reverse=True), "transactions not newest-first"
        assert txs[0]["type"] == "withdraw"
