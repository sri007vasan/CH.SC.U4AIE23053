# notification system design

## Stage 1

so basically we need to build a notification system for students. the main things it should do are - fetch notifications, send new ones, mark them read, delete them etc.

### api endpoints

1. GET /api/notifications - gets all notifs for a user. needs auth token in header. can pass query params like ?type=Placement&page=1&limit=20

response looks like:
```json
{
  "notifications": [
    {
      "id": "uuid-here",
      "type": "Result",
      "message": "mid-sem results out",
      "timestamp": "2026-04-22 17:51:30",
      "isRead": false
    }
  ],
  "total": 150,
  "page": 1
}
```

2. POST /api/notifications - create notification (only admin/HR)

body:
```json
{
  "studentIds": [1042, 1043],
  "type": "Placement",
  "message": "CSK hiring"
}
```

3. PATCH /api/notifications/:id/read - mark one as read

4. PATCH /api/notifications/read-all - mark all read

5. DELETE /api/notifications/:id - delete one

6. GET /api/notifications/unread-count - for showing badge count

### notification json structure
```json
{
  "id": "uuid",
  "studentId": 1042,
  "type": "Event/Result/Placement",
  "message": "some text",
  "isRead": false,
  "timestamp": "2026-04-22 17:51:30"
}
```

### realtime mechanism

using websockets. when user logs in frontend connects to ws://server/notifications. server keeps a map of studentId to socketId. when new notif is created server pushes it via websocket to that student. this way no polling needed.

---

## Stage 2

### db choice - PostgreSQL

chose postgres because its free, supports indexes well, has enum types for notification_type, and is ACID compliant so notifs wont get lost. also its what most companies use so good choice.

### schema

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(150) UNIQUE,
    roll_no VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id INTEGER REFERENCES students(id),
    type notification_type NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_student ON notifications(student_id);
CREATE INDEX idx_unread ON notifications(student_id, is_read);
CREATE INDEX idx_type ON notifications(type);
```

### problems at scale

when we have 50k students and millions of notifs, queries get slow. solution is to add proper indexes (already done above), use pagination, and maybe partition old data into archive tables. also batch inserts help when sending bulk notifs.

### queries

fetch unread:
```sql
SELECT id, type, message, timestamp FROM notifications
WHERE student_id = 1042 AND is_read = FALSE
ORDER BY created_at DESC LIMIT 20;
```

mark read:
```sql
UPDATE notifications SET is_read = TRUE WHERE id = 'uuid';
```

mark all read:
```sql
UPDATE notifications SET is_read = TRUE
WHERE student_id = 1042 AND is_read = FALSE;
```

unread count:
```sql
SELECT COUNT(*) FROM notifications WHERE student_id = 1042 AND is_read = FALSE;
```

---

## Stage 3

the given query:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

### is it accurate?
kinda but not really. problems - SELECT * fetches everything even columns we dont need. ORDER BY ASC means oldest first but users want newest. no LIMIT so it returns all rows which is bad for 5M rows.

### why slow?
no index on (studentID, isRead) so it scans all 5M rows. also SELECT * reads everything from disk. sorting without index is O(n log n) on 5M rows which is super slow.

### better query:
```sql
SELECT id, type, message, timestamp FROM notifications
WHERE student_id = 1042 AND is_read = FALSE
ORDER BY created_at DESC LIMIT 20;
```

### should we index every column?
NO thats bad idea. indexes speed up reads but slow down writes. every INSERT UPDATE DELETE has to update all indexes too. with notifs coming in constantly thats a lot of overhead. only index columns used in WHERE and ORDER BY.

### placement notifs last 7 days:
```sql
SELECT s.name, s.email, n.message, n.timestamp
FROM notifications n JOIN students s ON n.student_id = s.id
WHERE n.type = 'Placement' AND n.timestamp >= NOW() - INTERVAL '7 days'
ORDER BY n.timestamp DESC;
```

---

## Stage 4

problem is notifs getting fetched every page load and db cant handle it.

### solution 1 - redis cache
store notifs in redis with TTL of like 5 mins. first load goes to db and caches it. next loads read from cache directly. when new notif comes invalidate cache. this reduces db load by like 90%.
downside - need redis server, cache invalidation is tricky

### solution 2 - pagination
only fetch 20 at a time instead of all. simple but still hits db every time.

### solution 3 - websocket
push notifs in realtime instead of fetching. no polling at all. but needs persistent connections which uses memory.

### what i would do
combine redis cache + pagination + websocket. cache first page in redis, paginate rest, push new notifs via websocket so no polling.

---

## Stage 5

the given code:
```
function notify_all(student_ids, message):
    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

### problems
1. its sequential - 50k students one by one takes forever
2. if send_email fails at student 200, students 201-50000 get nothing
3. no retry for failed emails
4. everything is tightly coupled - email db push all in one loop
5. HRs browser hangs until all 50k are done

### should db save and email happen together?
no. db save is fast and local, email is slow and can fail. decouple them.

### revised pseudocode:
```
function notify_all(student_ids, message):
    batch_save_to_db(student_ids, message)
    for sid in student_ids:
        queue.push({sid, message, tasks: ["email","push"]})
    return "queued"

function worker():
    while True:
        job = queue.pop()
        try:
            send_email(job.sid, job.msg)
        except:
            retry_queue.push(job, delay=30)
        try:
            push_to_app(job.sid, job.msg)
        except:
            pass

function retry_worker():
    while True:
        job = retry_queue.pop()
        if job.retries < 3:
            try:
                send_email(job.sid, job.msg)
            except:
                job.retries += 1
                retry_queue.push(job, delay=60)
        else:
            log_failed(job)
```

main improvements - batch db insert, message queue for async, retry mechanism, workers can scale, one failure doesnt break everything

---

## Stage 6

### priority inbox

need to show top N most important notifs. priority is based on type weight and recency.

weights: Placement=3, Result=2, Event=1

score = type_weight * 10^12 + unix_timestamp

this way all placements come before results, results before events. within same type newer ones come first.

code is in priority_inbox.py. it fetches from the api, scores each notif, sorts and shows top 10.

for maintaining top N efficiently when new notifs come in - we just merge new ones with existing top N list and re-sort. since its a small list (10-20 items) this is fast. could also use a min-heap of size N for O(log N) insertions.
