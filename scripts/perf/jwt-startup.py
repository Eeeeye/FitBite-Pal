#!/usr/bin/env python3
"""Measure the first authenticated requests to a newly launched local FitBite JAR."""
import argparse
import collections
import concurrent.futures
import contextlib
import http.client
import json
import math
import os
import secrets
import socket
import subprocess
import tempfile
import threading
import time
from pathlib import Path


def request(port, path, body=None, token=None):
    headers = {}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if body:
        headers['Content-Type'] = 'application/json'
    with contextlib.closing(http.client.HTTPConnection('127.0.0.1', port, timeout=12)) as connection:
        connection.request('POST' if body else 'GET', '/api' + path,
                           json.dumps(body).encode() if body else None, headers)
        response = connection.getresponse()
        raw = response.read()
        return response.status, json.loads(raw) if response.status == 200 else None


@contextlib.contextmanager
def start(jar, env, port, directory, name):
    with socket.socket() as available:
        available.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        available.bind(('127.0.0.1', port))
    logfile = directory / (name + '.log')
    started = time.perf_counter()
    with logfile.open('w') as log:
        process = subprocess.Popen(['java', '-Xms384m', '-Xmx384m', '-jar', str(jar)],
                                   env=env, cwd=directory, stdout=log, stderr=subprocess.STDOUT)
        try:
            while time.perf_counter() - started < 60:
                if process.poll() is not None:
                    raise RuntimeError('Application exited before readiness: ' + name)
                try:
                    status, data = request(port, '/actuator/health')
                    if status == 200 and data.get('status') == 'UP':
                        break
                except (OSError, http.client.HTTPException):
                    pass
                time.sleep(.05)
            else:
                raise RuntimeError('Timed out waiting for readiness: ' + name)
            yield round((time.perf_counter() - started) * 1000, 2)
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


def fixture(port, clients):
    members = []
    prefix = 'start' + secrets.token_hex(5)
    password = secrets.token_hex(16)
    for i in range(clients):
        name = prefix + str(i)
        result, account = request(port, '/auth/register',
                                  {'username': name, 'email': name + '@example.test', 'password': password})
        if result != 200 or not account['success']:
            raise RuntimeError('Could not register disposable member')
        status, login = request(port, '/auth/login', {'usernameOrEmail': name, 'password': password})
        if status != 200 or not login['success']:
            raise RuntimeError('Could not log in disposable member')
        member = login['data']
        status, data = request(port, '/users/' + str(member['userId']), token=member['token'])
        if status != 200 or data['data']['id'] != member['userId']:
            raise RuntimeError('Could not prepare member profile')
        members.append((member['userId'], name, member['token']))
    return members, password


def percentiles(values):
    values = sorted(values)
    if not values:
        return {}
    return {name: round(values[math.ceil(fraction * len(values)) - 1], 2)
            for name, fraction in [('p50', .50), ('p95', .95), ('p99', .99)]}


def wave(port, members, login_password=None):
    ready = threading.Barrier(len(members) + 1, timeout=15)

    def read(member):
        user_id, username, token = member
        ready.wait()
        begin = time.perf_counter()
        issued = None
        try:
            if login_password:
                status, result = request(port, '/auth/login', {'usernameOrEmail': username, 'password': login_password})
            else:
                status, result = request(port, '/users/' + str(user_id), token=token)
            outcome = str(status)
            if status == 200:
                data = result['data']
                expected_id_field = 'userId' if login_password else 'id'
                if not (result['success'] and data[expected_id_field] == user_id and data['username'] == username):
                    outcome = 'incorrectMember'
                elif login_password:
                    issued = data['token']
                    if not issued:
                        outcome = 'missingToken'
        except (OSError, ValueError, KeyError, TypeError, http.client.HTTPException) as error:
            outcome = type(error).__name__
        return outcome, (time.perf_counter() - begin) * 1000, issued

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(members)) as executor:
        jobs = [executor.submit(read, member) for member in members]
        ready.wait()
        rows = [job.result() for job in jobs]
    metrics = {'outcomes': dict(sorted(collections.Counter(row[0] for row in rows).items())),
               'allMs': percentiles([row[1] for row in rows]),
               'successMs': percentiles([row[1] for row in rows if row[0] == '200'])}
    issued_members = [(uid, name, token) for (uid, name, _), (status, _, token) in zip(members, rows)
                      if status == '200' and token]
    return metrics, issued_members


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--before', type=Path, required=True)
    parser.add_argument('--after', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--rounds', type=int, choices=range(1, 21), default=10, metavar='1..20')
    parser.add_argument('--operation', choices=['profile', 'login'], default='profile')
    parser.add_argument('--clients', type=int, choices=range(1, 33), default=32, metavar='1..32')
    args = parser.parse_args()
    jars = {'before': args.before.resolve(strict=True), 'after': args.after.resolve(strict=True)}
    port = int(os.environ.get('PERF_PORT', '29693'))
    mysql_port = int(os.environ['PERF_MYSQL_PORT'])
    env = dict(os.environ, SERVER_ADDRESS='127.0.0.1', SERVER_PORT=str(port),
               SPRING_PROFILES_ACTIVE='prod,localmail', JWT_SECRET=secrets.token_hex(32),
               SPRING_JPA_HIBERNATE_DDL_AUTO='validate', AI_ENABLED='false', ARK_ENABLED='false',
               POSE_ENABLED='false', MAIL_USERNAME='', MAIL_PASSWORD='', ARK_API_KEY='',
               MAIL_FROM='startup@example.test', FITBITE_ADMIN_PASSWORD='',
               REDIS_HOST='127.0.0.1', REDIS_DATABASE='11',
               SPRING_DATASOURCE_URL='jdbc:mysql://127.0.0.1:{}/fitbite_jwt?allowPublicKeyRetrieval=true&useSSL=false'.format(mysql_port))
    report = {'operation': args.operation, 'clients': args.clients, 'roundsPerVersion': args.rounds, 'runs': []}
    with tempfile.TemporaryDirectory(prefix='fitbite-startup-run-') as folder:
        directory = Path(folder)
        env['LOG_PATH'] = folder
        with start(jars['before'], env, port, directory, 'fixture'):
            members, password = fixture(port, args.clients)
        for trial in range(1, args.rounds + 1):
            order = ['before', 'after'] if trial % 2 else ['after', 'before']
            for version in order:
                name = version + '-' + str(trial)
                with start(jars[version], env, port, directory, name) as ready_ms:
                    is_login = args.operation == 'login'
                    first, issued = wave(port, members, password if is_login else None)
                    followup = issued if is_login else members
                    second, _ = wave(port, followup) if followup else ({'outcomes': {}}, [])
                log = (directory / (name + '.log')).read_text(errors='replace')
                row = dict(trial=trial, version=version, readyMs=ready_ms, first=first, second=second,
                           jwtProviderStack=('io.jsonwebtoken.impl.lang.Services.loadFirst' in log and
                                             'io.jsonwebtoken.impl.DefaultJwtParserBuilder.build' in log))
                if is_login:
                    row['jwtSigningProviderStack'] = ('io.jsonwebtoken.impl.lang.Services.loadFirst' in log and
                                                      'io.jsonwebtoken.impl.DefaultJwtBuilder.compact' in log)
                report['runs'].append(row)
                args.output.write_text(json.dumps(report, indent=2) + '\n')
                print(name, 'readyMs', ready_ms, 'first', first['outcomes'], 'second', second['outcomes'], flush=True)
    return int(any(run[key]['outcomes'] != {'200': args.clients} for run in report['runs']
                   if run['version'] == 'after' for key in ('first', 'second')))


if __name__ == '__main__':
    raise SystemExit(main())
