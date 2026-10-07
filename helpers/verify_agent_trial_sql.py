"""Exercise the real quota SQL against an isolated, disposable local PostgreSQL.

Uses a cached postgres image; never connects to Supabase or publishes a port.
Run through agent-heavy-check. All fixtures are synthetic and removed on exit.
"""
import json
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import uuid4


def run(*args, input=None):
    return subprocess.run(args, input=input, text=True, capture_output=True, check=True, timeout=45).stdout.strip()


def main():
    name = f"portfolio-trial-verify-{uuid4().hex[:10]}"
    started = False
    try:
        run("docker", "run", "--detach", "--rm", "--name", name,
            "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine")
        started = True
        for _ in range(30):
            result = subprocess.run(["docker", "exec", name, "pg_isready", "-U", "postgres"],
                                    capture_output=True, timeout=10)
            if result.returncode == 0:
                break
            time.sleep(0.2)
        else:
            raise RuntimeError("Local PostgreSQL did not become ready")
        # The image briefly starts a bootstrap server, then replaces it with
        # the final server. Wait for that documented initialization to finish.
        for _ in range(30):
            if "PostgreSQL init process complete" in run("docker", "logs", name):
                time.sleep(0.5)
                break
            time.sleep(0.2)
        else:
            raise RuntimeError("Local PostgreSQL initialization did not finish")

        def sql(query):
            return run("docker", "exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1",
                       "-At", input=query)

        sql("create role anon; create role authenticated; create role service_role;")
        migration = Path(__file__).resolve().parents[1] / "backend/migrations/20261007_agent_trials.sql"
        sql(migration.read_text())
        trial_id = str(uuid4())
        expiry = int(time.time()) + 3600
        assert json.loads(sql(f"select public.portfolio_issue_agent_trial('{trial_id}', '{'a' * 64}', {expiry});"))["allowed"]
        # Twenty callers race the same receipt: only two paid-turn reservations may succeed.
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: json.loads(sql(
                f"select public.portfolio_agent_trial_turn('{trial_id}', true);")), range(20)))
        assert sum(result["allowed"] for result in results) == 2, results
        assert json.loads(sql(f"select public.portfolio_agent_trial_turn('{trial_id}', false);"))["remaining_messages"] == 0
        assert not json.loads(sql(f"select public.portfolio_issue_agent_trial('{uuid4()}', '{'a' * 64}', {expiry});"))["allowed"]
        # Race separate sessions from one peer: the daily admission lock must allow only one.
        with ThreadPoolExecutor(max_workers=2) as pool:
            issued = list(pool.map(lambda _: json.loads(sql(
                f"select public.portfolio_issue_agent_trial('{uuid4()}', '{'b' * 64}', {expiry});")), range(8)))
        assert sum(result["allowed"] for result in issued) == 1, issued
        privileges = sql("select has_function_privilege('anon', 'public.portfolio_agent_trial_turn(uuid,boolean)', 'EXECUTE'), "
                         "has_function_privilege('authenticated', 'public.portfolio_agent_trial_turn(uuid,boolean)', 'EXECUTE'), "
                         "has_function_privilege('service_role', 'public.portfolio_agent_trial_turn(uuid,boolean)', 'EXECUTE');")
        assert privileges == "f|f|t", privileges
        print("Local PostgreSQL quota verification passed: 20 competing turns admit exactly 2; 8 peer admissions admit 1; public execution denied.")
    finally:
        if started:
            subprocess.run(["docker", "stop", name], capture_output=True, timeout=30, check=False)


if __name__ == "__main__":
    main()
