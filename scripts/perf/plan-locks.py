#!/usr/bin/env python3
"""Compare two local FitBite JARs using different disposable MySQL schemas and Redis databases.

Start each JAR against fitbite_lockbench_before (port 29691, Redis DB 9) or
fitbite_lockbench_after (port 29692, Redis DB 10), with the same JVM limits
and app configuration. Load db/baseline/mysql8.sql into each empty schema.
See --help. Only the benchmark's newly registered account is written to.
The mixed fixture reuses one authenticated member per build. Each wave starts
with a published warm plan and a fresh check-in date slot. The controlled
fixture removes only this member's plan cache entries and holds their InnoDB
user row for --hold-ms after the readers start. Both scenarios compare the
same stable ordered plan IDs. InnoDB lock counters are instance-wide, so keep
the database instance dedicated during measurement. Output contains no tokens.
"""
import argparse
import contextlib
import datetime
import http.client
import json
import math
import secrets
import selectors
import subprocess
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


def sql(target, query):
    return subprocess.check_output(target["cli"] + ["-e", query], text=True, timeout=15).strip()


def request(target, path, body=None):
    connection = http.client.HTTPConnection("127.0.0.1", target["port"], timeout=10)
    headers = {"Content-Type": "application/json"}
    if "token" in target:
        headers["Authorization"] = "Bearer " + target["token"]
    try:
        connection.request("POST" if body is not None else "GET", "/api" + path,
                           json.dumps(body) if body is not None else None, headers)
        response = connection.getresponse()
        payload = json.loads(response.read())
        if response.status // 100 != 2 or payload.get("success") is not True:
            raise ValueError("HTTP " + str(response.status) + " or unsuccessful response")
        return payload["data"]
    finally:
        connection.close()


def plan(target):
    items = request(target, "/users/{}/training-plan?date={}".format(target["user"], target["date"]))
    return [int(item["id"]) for item in items]


def prepare(args, label):
    port = getattr(args, label + "_port")
    schema = "fitbite_lockbench_" + label
    redis_db = getattr(args, label + "_redis_db")
    target = {"port": port, "schema": schema, "label": label,
              "cli": [args.mysql, "--defaults-file=" + str(args.mysql_config.resolve()),
                      "--unbuffered", "--batch", "--skip-column-names", schema],
              "redis": [args.redis_cli, "-h", "127.0.0.1", "-p", str(args.redis_port), "-n", str(redis_db)],
              "date": datetime.date.today().isoformat()}
    username = "lockperf" + uuid.uuid4().hex[:20]
    password = secrets.token_urlsafe(18)
    request(target, "/auth/register", {"username": username, "email": username + "@example.test",
                                       "password": password})
    login = request(target, "/auth/login", {"usernameOrEmail": username, "password": password})
    target.update(user=int(login["userId"]), token=login["token"])
    # Check HTTP and SQL refer to the same disposable account before any deletes.
    if sql(target, "SELECT username FROM users WHERE id=" + str(target["user"])) != username:
        raise RuntimeError("API and SQL fixture do not match")
    request(target, "/users/{}/profile".format(target["user"]),
            {"gender": "Male", "age": 25, "height": 175, "weight": 70,
             "activityLevel": "Beginner", "goal": "Keep fit", "trainingDuration": 30})
    target["ids"] = plan(target)
    if not target["ids"]:
        raise RuntimeError("Fixture has no published plan")
    return target


def counters(target):
    lines = sql(target, "SHOW GLOBAL STATUS WHERE Variable_name IN "
                "('Innodb_row_lock_waits','Innodb_row_lock_time')").splitlines()
    return {k: int(v) for k, v in (line.split("\t") for line in lines)}


def clear_plan_cache(target):
    # Old and versioned plan cache keys both start with this exact account/day.
    prefix = "fitbite:v2:trainingPlanCache::{}:{}".format(target["user"], target["date"])
    keys = subprocess.check_output(target["redis"] + ["--scan", "--pattern", prefix + "*"],
                                   text=True, timeout=10).splitlines()
    if not keys or not all(k == prefix or k.startswith(prefix + ":") for k in keys):
        raise RuntimeError("Expected to find the fixture plan in its designated Redis database")
    subprocess.run(target["redis"] + ["DEL"] + keys, check=True, stdout=subprocess.DEVNULL, timeout=10)


@contextlib.contextmanager
def hold_user_row(target):
    # Unbuffered SELECT, with headers disabled, signals the user row is already locked.
    process = subprocess.Popen(target["cli"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    try:
        process.stdin.write("START TRANSACTION; SELECT id FROM users WHERE id={} FOR UPDATE;\n".format(target["user"]))
        process.stdin.flush()
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ)
            if not selector.select(timeout=10) or process.stdout.readline().strip() != str(target["user"]):
                raise RuntimeError("Did not acquire SQL fixture lock")
        yield
    finally:
        try:
            process.communicate("ROLLBACK;\n", timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.communicate()
            raise
        if process.returncode:
            raise RuntimeError("MySQL lock holder failed")


def percentile(values, p):
    return round(sorted(values)[math.ceil(len(values) * p) - 1], 3)


def wave(target, pool, scenario, readers, writers, hold_ms):
    target_day = target["date"]
    sql_where = " WHERE user_id={} AND check_in_date='{}'".format(target["user"], target_day)
    if scenario == "mixed":
        sql(target, "DELETE FROM check_in_records" + sql_where)
    plan(target)  # Confirm the published fixture and warm the cache outside measurement.
    if scenario == "held_lock_cold_read":
        clear_plan_cache(target)
        writers = 0
    barrier = threading.Barrier(readers + writers + 1, timeout=15)

    def operation(kind):
        barrier.wait()
        started = time.perf_counter()
        error, result = None, None
        try:
            if kind == "read":
                if plan(target) != target["ids"]:
                    raise ValueError("published plan changed")
            else:
                data = request(target, "/users/{}/check-in".format(target["user"]),
                               {"date": target_day, "height": 175, "weight": 70})
                if bool(data["checkedIn"]) == bool(data["alreadyCheckedIn"]):
                    raise ValueError("invalid check-in result")
                result = (bool(data["checkedIn"]), int(data["record"]["id"]))
        except Exception as exc:
            error = str(exc)
        return kind, (time.perf_counter() - started) * 1000, error, result

    lock = hold_user_row(target) if scenario == "held_lock_cold_read" else contextlib.nullcontext()
    with lock:
        jobs = [pool.submit(operation, kind) for kind in ["read"] * readers + ["write"] * writers]
        barrier.wait()
        if scenario == "held_lock_cold_read":
            time.sleep(hold_ms / 1000)
        completed_before_release = sum(f.done() for f in jobs)
    observations = [job.result(15) for job in jobs]
    errors = [error for _, _, error, _ in observations if error]
    if writers and not errors:
        checkins = [result for _, _, _, result in observations if result is not None]
        if (sum(created for created, _ in checkins) != 1 or len({row for _, row in checkins}) != 1
                or sql(target, "SELECT COUNT(*) FROM check_in_records" + sql_where) != "1"):
            errors.append("non-idempotent check-in")
    return observations, errors, completed_before_release


def measure(target, args, pool, scenario, waves):
    start = counters(target)
    latencies = {"read": [], "write": []}
    errors = []
    early = 0
    total = 0
    for _ in range(waves):
        rows, failed, count = wave(target, pool, scenario, args.readers, args.writers, args.hold_ms)
        for kind, latency, _, _ in rows:
            latencies[kind].append(latency)
        total += len(rows)
        errors.extend(failed)
        early += count
    end = counters(target)
    result = {"scenario": scenario, "variant": target["label"], "requests": total, "errors": len(errors),
              "data_ok": not errors, "sample_errors": errors[:3],
              "row_lock_waits": end["Innodb_row_lock_waits"] - start["Innodb_row_lock_waits"],
              "row_lock_wait_ms": end["Innodb_row_lock_time"] - start["Innodb_row_lock_time"]}
    for kind, values in latencies.items():
        if values:
            result[kind] = {"n": len(values), "p50_ms": percentile(values, .50),
                            "p95_ms": percentile(values, .95), "p99_ms": percentile(values, .99)}
    if scenario == "held_lock_cold_read":
        result["finished_before_unlock"] = early
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mysql", default="mysql")
    parser.add_argument("--mysql-config", required=True, type=Path)
    parser.add_argument("--redis-cli", default="redis-cli")
    parser.add_argument("--redis-port", type=int, default=6379)
    parser.add_argument("--before-port", type=int, default=29691)
    parser.add_argument("--after-port", type=int, default=29692)
    parser.add_argument("--before-redis-db", type=int, default=9)
    parser.add_argument("--after-redis-db", type=int, default=10)
    parser.add_argument("--rounds", type=int, default=4)
    parser.add_argument("--warmup", type=int, default=12, help="Mixed waves per variant before timing")
    parser.add_argument("--waves", type=int, default=18, help="Waves per scenario per round")
    parser.add_argument("--readers", type=int, default=6)
    parser.add_argument("--writers", type=int, default=2)
    parser.add_argument("--hold-ms", type=int, default=100)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if min(args.rounds, args.warmup, args.waves, args.readers, args.writers, args.hold_ms) < 1:
        parser.error("load and round parameters must be positive")
    targets = [prepare(args, label) for label in ["before", "after"]]
    report = {"parameters": {k: v for k, v in vars(args).items() if isinstance(v, int)},
              "http": "fresh loopback HTTP/1.1 connection per request", "rounds": []}
    with ThreadPoolExecutor(max_workers=args.readers + args.writers) as pool:
        for target in targets:
            for scenario, n in [("mixed", args.warmup), ("held_lock_cold_read", 2)]:
                if measure(target, args, pool, scenario, n)["errors"]:
                    raise RuntimeError("Warmup validation failed")
        for index in range(args.rounds):
            order = targets if index % 2 == 0 else list(reversed(targets))
            for target in order:
                for scenario in ["mixed", "held_lock_cold_read"]:
                    row = measure(target, args, pool, scenario, args.waves)
                    row["round"] = index + 1
                    report["rounds"].append(row)
                    print(json.dumps(row), flush=True)
                    args.output.write_text(json.dumps(report, indent=2) + "\n")
    if any(row["errors"] for row in report["rounds"]):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
