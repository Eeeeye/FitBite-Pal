#!/usr/bin/env python3
"""Rehearse a FitBite binary rollout and full MySQL restore in three empty, disposable schemas."""
import argparse
import configparser
from contextlib import ExitStack, contextmanager
from datetime import date, timedelta
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import subprocess
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, ProxyHandler

ROOT = Path(__file__).resolve().parents[2]
HTTP = build_opener(ProxyHandler({}))


def fetch(url, payload=None, token=None, method=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = json.dumps(payload).encode() if payload is not None else None
    with HTTP.open(Request(url, data, headers, method=method), timeout=6) as response:
        return json.load(response)


def eventually(check, label, timeout=90):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        try:
            if check():
                return
        except (URLError, OSError):
            pass
        time.sleep(0.35)
    raise RuntimeError('Timed out waiting for ' + label)


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


@contextmanager
def service(directory, name, args, env=None):
    with (directory / (name + '.log')).open('ab') as log:
        proc = subprocess.Popen(args, cwd=directory, stdin=subprocess.DEVNULL, stdout=log, stderr=log, env=env)
        try:
            yield proc
        finally:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=35)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait()


class Database:
    def __init__(self, args):
        self.bin = args.mysql_bin
        config = configparser.ConfigParser(interpolation=None)
        config.read(args.client_cnf)
        self.login = config['client']
        if self.login['host'] not in ('127.0.0.1', 'localhost'):
            raise ValueError('The rehearsal needs a local, dedicated MySQL server.')
        self.client = ['--defaults-file=' + str(args.client_cnf.resolve()), '--protocol=TCP',
                       '--host=127.0.0.1', '--port=' + str(self.login.getint('port', 3306))]

    def sql(self, schema, query):
        return subprocess.check_output([self.bin/'mysql', *self.client, '-NB', schema],
                                       input=query, text=True).strip()

    def apply(self, schema, path):
        with path.open('rb') as source:
            subprocess.run([self.bin/'mysql', *self.client, schema], stdin=source, check=True)

    def dump(self, schema, path, rows_only=False):
        flags = ['--single-transaction', '--order-by-primary', '--skip-comments', '--no-tablespaces',
                 '--set-gtid-purged=OFF', '--hex-blob']
        if rows_only:
            flags.extend(['--no-create-info', '--skip-extended-insert', '--skip-triggers'])
        with path.open('wb') as out:
            subprocess.run([self.bin/'mysqldump', *self.client, *flags, schema], stdout=out, check=True)

    def connection(self, schema):
        port = self.login.getint('port', 3306)
        return dict(SPRING_DATASOURCE_URL=f'jdbc:mysql://127.0.0.1:{port}/{schema}?useSSL=false&allowPublicKeyRetrieval=true',
                    SPRING_DATASOURCE_USERNAME=self.login['user'], SPRING_DATASOURCE_PASSWORD=self.login['password'])


def monitor(stack, args, ports, root):
    config = ROOT/'ops/monitoring'
    d = args.output
    smtp, blackbox, manager, prom = (ports[k] for k in ('smtp', 'blackbox', 'manager', 'prom'))
    def address(port):
        return '127.0.0.1:' + str(port)
    def start(name, executable, *flags):
        return stack.enter_context(service(d, name, [executable, *flags]))
    start('blackbox', args.monitor_bin/'blackbox_exporter', '--config.file='+str(config/'blackbox.yml'),
          '--web.listen-address='+address(blackbox))
    am_cfg = (config/'alertmanager.local.yml').read_text().replace('release-inbox:1025', address(smtp))
    (d/'alertmanager.yml').write_text(am_cfg)
    start('alertmanager', args.monitor_bin/'alertmanager', '--config.file='+str(d/'alertmanager.yml'),
          '--storage.path='+str(d/'notifications'), '--cluster.listen-address=', '--web.listen-address='+address(manager))
    pcfg = (config/'prometheus.yml').read_text().replace('http://backend:8080/api', root)
    pcfg = pcfg.replace('alertmanager:9093', address(manager)).replace('blackbox:9115', address(blackbox))
    (d/'prometheus.yml').write_text(pcfg)
    shutil.copy(config/'rules.yml', d/'rules.yml')
    subprocess.run([args.monitor_bin/'promtool', 'check', 'config', d/'prometheus.yml'], check=True)
    start('prometheus', args.monitor_bin/'prometheus', '--config.file='+str(d/'prometheus.yml'),
          '--storage.tsdb.path='+str(d/'promdata'), '--web.listen-address='+address(prom))


def run(args):
    os.umask(0o077)
    args.output = args.output.resolve()
    args.output.mkdir(mode=0o700, parents=True, exist_ok=False)
    db = Database(args)
    schemas = (args.source_schema, args.rollback_schema, args.restore_schema)
    if len({name.casefold() for name in schemas}) != len(schemas):
        raise ValueError('Use separate source and restoration schemas.')
    for schema in schemas:
        if not re.fullmatch(r'[A-Za-z0-9_]+', schema) or db.sql(schema, 'SHOW TABLES'):
            raise ValueError('Each rehearsal schema must be empty.')
    ports = {}
    for name in ('api', 'redis', 'inbox', 'smtp', 'blackbox', 'manager', 'prom'):
        port = free_port()
        while port in ports.values():
            port = free_port()
        ports[name] = port
    root = f"http://127.0.0.1:{ports['api']}/api"
    today = date.today()
    username = 'qa' + secrets.token_hex(8)
    password = secrets.token_urlsafe(22)
    secret = secrets.token_urlsafe(48)
    def start_api(jar, schema, name):
        args_env = dict(SERVER_ADDRESS='127.0.0.1', SERVER_PORT=str(ports['api']), SPRING_PROFILES_ACTIVE='prod,localmail',
                        REDIS_HOST='127.0.0.1', REDIS_PORT=str(ports['redis']), REDIS_PASSWORD='', REDIS_DATABASE='0',
                        FITBITE_MAILPIT_PORT=str(ports['smtp']), JWT_SECRET=secret, MAIL_FROM='qa@fitbite.test',
                        MAIL_USERNAME='', MAIL_PASSWORD='', ARK_API_KEY='', ARK_ENABLED='false', AI_ENABLED='false',
                        FITBITE_ADMIN_EMAIL='', FITBITE_ADMIN_PASSWORD='', LOG_PATH=str(args.output/name),
                        **db.connection(schema))
        # Explicit env avoids inheriting operator credentials or another datasource.
        env = dict(PATH=os.environ['PATH'], LANG='en_US.UTF-8', **args_env)
        return service(args.output, name, [args.java, '-Xmx384m', '-XX:ActiveProcessorCount=4', '-jar', jar.resolve()], env)
    def ready(path=''):
        return fetch(root+'/actuator/health'+path)['status'] == 'UP'
    def business(path, payload=None, token=None, method=None):
        reply = fetch(root+path, payload, token, method)
        if not reply.get('success'):
            raise ValueError('Business request failed: ' + path.split('?')[0])
        return reply.get('data')
    def login():
        return business('/auth/login', {'usernameOrEmail': username, 'password': password})
    def verify(uid, days):
        session = login()
        assert session['userId'] == uid
        token = session['token']
        profile = business('/users/'+str(uid), token=token)
        assert profile['username'] == username and profile['weight'] == 72.5
        for day in days:
            status = business(f'/users/{uid}/check-in/status?date={day}', token=token)
            assert status['checkedIn'] and status['record']['weight'] == 72.5
        assert business(f'/users/{uid}/training-plan?date={today}', token=token)
        assert business(f'/data/progress?days=7&userId={uid}&endDate={today}', token=token)
        return token
    summary = {}
    def emit(name, value):
        summary[name] = value
        print(name, value, flush=True)
        (args.output/'result.json').write_text(json.dumps(summary, indent=2)+'\n')
    redis_args = [args.redis_server, '--bind', '127.0.0.1', '--port', str(ports['redis']), '--save', '', '--appendonly','no']
    db.apply(args.source_schema, args.previous_schema)
    with ExitStack() as stack:
        redis = stack.enter_context(service(args.output, 'redis', redis_args))
        stack.enter_context(service(args.output, 'inbox', [args.mailpit, '--listen', f"127.0.0.1:{ports['inbox']}",
                           '--smtp', f"127.0.0.1:{ports['smtp']}", '--database', str(args.output/'inbox.sqlite')]))
        with start_api(args.previous_jar, args.source_schema, 'previous'):
            eventually(ready,'previous version')
            business('/auth/register', {'username':username, 'email':username+'@example.test','password':password})
            auth = login()
            uid, token = auth['userId'], auth['token']
            business(f'/users/{uid}/profile', {'gender':'Male', 'height':175, 'weight':72.5, 'age':25,
                     'activityLevel':'Beginner','goal':'Keep fit','trainingDuration':30}, token)
            business(f'/users/{uid}/check-in', {'date':str(today), 'weight':72.5}, token)
            verify(uid, [today])
        db.dump(args.source_schema, args.output/'before.sql')
        for migration in args.migration:
            db.apply(args.source_schema, migration)
        with start_api(args.candidate_jar, args.source_schema, 'candidate'):
            eventually(lambda:ready('/readiness'), 'candidate readiness')
            token = verify(uid, [today])
            previous_day = today-timedelta(days=1)
            business(f'/users/{uid}/check-in', {'date':str(previous_day),'weight':72.5}, token)
            verify(uid, [today, previous_day])
            meals = business(f'/users/{uid}/diet-plan?date={today}', token=token)
            meal_key = 'plan:' + str(meals[0]['id'])
            business('/completion/save', {'userId': uid, 'date': str(today), 'itemType': 'meal',
                     'mealKey': meal_key, 'completed': True}, token)
            business(f'/users/{uid}/goals', {'weight': 66.0}, token, method='PATCH')
            def verify_candidate_fields():
                report = business(f'/data/progress?days=7&userId={uid}&endDate={today}', token=login()['token'])
                assert report['mealCompletionsByKey'][meal_key]
                goal = report['statistics']['goals']['weight']
                assert goal['start'] == 72.5 and goal['target'] == 66.0
            verify_candidate_fields()
            emit('candidate_reads_and_writes', True)
            # Wait for a successful external sample before interrupting this rehearsal's cache.
            monitor(stack, args, ports, root)
            query = f"http://127.0.0.1:{ports['prom']}/api/v1/query?query=probe_success"
            def probe_is_up():
                samples = fetch(query)['data']['result']
                return bool(samples) and samples[0]['value'][1] == '1'
            eventually(probe_is_up, 'successful external probe')
            inbox_url = f"http://127.0.0.1:{ports['inbox']}/api/v1/messages?limit=50"
            def messages():
                return fetch(inbox_url)['messages']
            existing = {m['ID'] for m in messages()}
            def received(state):
                return any(m['ID'] not in existing and state in m['Subject'] and 'FitBiteUnavailable' in m['Subject']
                           for m in messages())
            start = time.monotonic()
            redis.terminate()
            redis.wait(timeout=10)
            def unavailable():
                try:
                    ready('/readiness')
                except HTTPError as error:
                    return error.code == 503
                return False
            eventually(unavailable, 'unavailable readiness')
            assert ready('/liveness')
            eventually(lambda: received('FIRING'), 'alert delivery to the local inbox',150)
            emit('failure_to_alert_mail_seconds', round(time.monotonic()-start,1))
            start = time.monotonic()
            warmed = stack.enter_context(service(args.output,'redis-restarted',redis_args))
            eventually(lambda:ready('/readiness'), 'readiness recovery')
            verify(uid,[today, previous_day])
            eventually(lambda:received('RESOLVED'), 'resolved alert delivery to the local inbox',420)
            emit('recovery_to_resolved_mail_seconds', round(time.monotonic()-start,1))
        # V10 adds state older readers cannot represent. Rehearse rollback before reopening writes
        # with the original schema in a separate database, leaving candidate writes intact.
        db.apply(args.rollback_schema, args.output/'before.sql')
        warmed.terminate()
        warmed.wait(timeout=10)
        rollback_cache = stack.enter_context(service(args.output, 'redis-rollback', redis_args))
        with start_api(args.previous_jar,args.rollback_schema,'rollback'):
            eventually(ready,'rollback')
            verify(uid,[today])
            emit('previous_binary_restored_pre_release_state', True)
        backup = args.output/'candidate.sql'
        db.dump(args.source_schema, backup)
        restore_start = time.monotonic()
        db.apply(args.restore_schema, backup)
        restore_seconds = time.monotonic() - restore_start
        # Compare every ordered data row in SQL form, including rows not exposed by the smoke API.
        hashes = []
        for schema in (args.source_schema, args.restore_schema):
            out = args.output/(schema+'.rows.sql')
            db.dump(schema, out, rows_only=True)
            hashes.append(hashlib.sha256(out.read_bytes()).hexdigest())
        assert hashes[0] == hashes[1], 'Data differs after restore'
        emit('restored_row_dump_sha256',hashes[0])
        emit('restore_sql_seconds',round(restore_seconds,3))
        # A cold cache prevents a stale page from disguising an incomplete restoration.
        rollback_cache.terminate()
        rollback_cache.wait(timeout=10)
        stack.enter_context(service(args.output,'redis-restored',redis_args))
        with start_api(args.candidate_jar,args.restore_schema,'restored'):
            eventually(lambda:ready('/readiness'), 'restored candidate')
            verify(uid,[today, previous_day])
            verify_candidate_fields()
            emit('restored_login_training_progress_checkins_meal_goal',True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['mysql-bin','client-cnf','previous-jar','candidate-jar','previous-schema','monitor-bin',
                 'mailpit','redis-server','output']:
        parser.add_argument('--'+name, required=True, type=lambda value:Path(value).resolve())
    parser.add_argument('--migration', action='append', required=True, type=Path)
    parser.add_argument('--source-schema', required=True)
    parser.add_argument('--restore-schema', required=True)
    parser.add_argument('--rollback-schema', required=True)
    parser.add_argument('--java',default='java')
    if not __debug__:
        parser.error('Validation requires Python without -O.')
    run(parser.parse_args())
