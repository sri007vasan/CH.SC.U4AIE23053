import requests
import json

url = "http://20.207.122.201/evaluation-service/logs"
stk = ["backend", "frontend"]
lvl = ["debug", "info", "warn", "error", "fatal"]
be = ["cache","controller","cron_job","db","domain","handler","repository","route","service","auth","config","middleware","utils"]
fe = ["api","component","hook","page","state","style","auth","config","middleware","utils"]

def gettok():
    try:
        with open("token.json","r") as f:
            return json.load(f).get("access_token","")
    except:
        return ""

def Log(s, l, p, m):
    if s not in stk or l not in lvl:
        print("invalid params")
        return None
    v = be if s == "backend" else fe
    if p not in v:
        print("invalid pkg")
        return None
    t = gettok()
    if not t:
        print("no token")
        return None
    h = {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}
    b = {"stack": s, "level": l, "package": p, "message": m}
    try:
        r = requests.post(url, json=b, headers=h, timeout=10)
        if r.status_code == 200:
            return r.json()
        else:
            print(f"fail: {r.status_code}")
            return None
    except Exception as e:
        print(f"err: {e}")
        return None

if __name__ == "__main__":
    r = Log("backend", "info", "middleware", "Logging middleware initialized successfully")
    if r:
        print(r)
