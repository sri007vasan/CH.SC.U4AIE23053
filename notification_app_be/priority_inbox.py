import requests
import json
from datetime import datetime

url = "http://20.207.122.201/evaluation-service/notifications"
w = {"Placement": 3, "Result": 2, "Event": 1}

import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from logging_middleware.middleware import Log

def gettok():
    try:
        with open("token.json","r") as f:
            return json.load(f).get("access_token","")
    except:
        return ""

def fetch():
    t = gettok()
    if not t:
        print("no token")
        Log("backend", "warn", "handler", "no token found for priority inbox fetch")
        return []
    h = {"Authorization": f"Bearer {t}"}
    r = requests.get(url, headers=h, timeout=10)
    if r.status_code == 200:
        Log("backend", "info", "handler", "successfully fetched notifications from api")
        return r.json().get("notifications", [])
    else:
        print(f"err: {r.status_code}")
        Log("backend", "error", "handler", f"failed to fetch notifications. Status: {r.status_code}")
        return []

def calc(n):
    tw = w.get(n.get("Type",""), 0)
    ts = n.get("Timestamp","")
    try:
        dt = datetime.strptime(ts, "%Y-%m-%d %H:%M:%S")
        rc = dt.timestamp()
    except:
        rc = 0
    return tw * 10**12 + rc

def topn(nots, n=10):
    return sorted(nots, key=calc, reverse=True)[:n]

def show(nots):
    print(f"\nPriority Inbox - Top {len(nots)}")
    print("-" * 40)
    for i, n in enumerate(nots, 1):
        print(f"{i}. [{n.get('Type','')}] {n.get('Message','')}")
        print(f"   {n.get('Timestamp','')}")
        print(f"   id: {n.get('ID','')}")
        print()

if __name__ == "__main__":
    print("fetching...")
    all = fetch()
    if all:
        print(f"got {len(all)} notifications")
        top = topn(all, 10)
        show(top)
    else:
        print("no notifications")
