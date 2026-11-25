#!/usr/bin/env python3
"""Check the Maven libraries actually shipped in a Spring Boot executable JAR.

Run after Maven package, using the same local artifact repository:
  python3 scripts/release/audit-backend-jar.py FitBitePal-Backend/target/backend-1.0.0.jar
Pass --maven-repo PATH when the build uses -Dmaven.repo.local=PATH.

Only Maven package coordinates and versions are sent to Google's OSV API. A
successful scan prints JSON totals. Exit 0 means no published advisory matched,
1 means matched advisories, and 2 indicates incomplete coverage or a failed lookup.
"""

import argparse
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
from urllib.request import Request, urlopen
from zipfile import BadZipFile, ZipFile


def sha256(stream):
    digest = hashlib.sha256()
    for block in iter(lambda: stream.read(1024 * 1024), b""):
        digest.update(block)
    return digest.hexdigest()


def packages_in(jar_path, repo):
    with ZipFile(jar_path) as jar:
        libraries = {}
        for entry in jar.infolist():
            path = Path(entry.filename)
            if path.parent == Path("BOOT-INF/lib") and path.suffix == ".jar":
                if path.name in libraries:
                    raise ValueError(f"duplicate nested library {path.name}")
                with jar.open(entry) as content:
                    libraries[path.name] = sha256(content)
    if not libraries:
        raise ValueError("no BOOT-INF/lib/*.jar entries in the executable JAR")

    coordinates = defaultdict(set)
    for artifact in repo.rglob("*.jar"):
        parts = artifact.relative_to(repo).parts
        if len(parts) < 4:
            continue
        name, version = parts[-3:-1]
        group = ".".join(parts[:-3])
        if artifact.name in libraries:
            with artifact.open("rb") as content:
                if sha256(content) == libraries[artifact.name]:
                    coordinates[artifact.name].add((f"{group}:{name}", version))
        # Boot's repackager embeds its jarmode library inside spring-boot-loader-tools.
        if group == "org.springframework.boot" and artifact.name == f"spring-boot-loader-tools-{version}.jar":
            with ZipFile(artifact) as loader:
                for member in loader.namelist():
                    path = Path(member)
                    if path.parent != Path("META-INF/jarmode") or path.suffix != ".jar":
                        continue
                    packed = f"{path.stem}-{version}.jar"
                    if packed in libraries:
                        with loader.open(member) as content:
                            if sha256(content) == libraries[packed]:
                                coordinates[packed].add((f"{group}:{path.stem}", version))

    missing = [name for name in libraries if len(coordinates[name]) != 1]
    if missing:
        raise ValueError("unmapped or ambiguous libraries: " + ", ".join(sorted(missing)))
    return len(libraries), sorted({entry for matches in coordinates.values() for entry in matches})


def scan(packages):
    affected = defaultdict(set)
    for start in range(0, len(packages), 100):
        pending = [(p, "", set()) for p in packages[start:start + 100]]
        while pending:
            queries = []
            for (name, version), token, _ in pending:
                query = {"package": {"ecosystem": "Maven", "name": name}, "version": version}
                if token:
                    query["page_token"] = token
                queries.append(query)
            request = Request("https://api.osv.dev/v1/querybatch", data=json.dumps({"queries": queries}).encode(),
                              headers={"Content-Type": "application/json"})
            with urlopen(request, timeout=30) as response:
                results = json.load(response)["results"]
            if not isinstance(results, list) or len(results) != len(pending):
                raise ValueError("OSV returned incomplete batch results")
            next_page = []
            for (package, _, seen), result in zip(pending, results):
                if not isinstance(result, dict) or set(result) - {"vulns", "next_page_token"}:
                    raise ValueError("OSV returned an invalid package result")
                vulnerabilities = result.get("vulns", [])
                if not isinstance(vulnerabilities, list):
                    raise ValueError("OSV returned a malformed vulnerability list")
                for item in vulnerabilities:
                    advisory = item["id"]
                    if not isinstance(advisory, str) or not advisory:
                        raise ValueError("OSV returned a vulnerability without an ID")
                    affected[package].add(advisory)
                token = result.get("next_page_token")
                if token:
                    if token in seen:
                        raise ValueError("OSV repeated a pagination token")
                    seen.add(token)
                    next_page.append((package, token, seen))
            pending = next_page
    return affected


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("jar", type=Path)
    parser.add_argument("--maven-repo", type=Path, default=Path.home() / ".m2" / "repository")
    args = parser.parse_args()
    try:
        count, packages = packages_in(args.jar, args.maven_repo)
        matches = scan(packages)
        with args.jar.open("rb") as artifact:
            digest = sha256(artifact)
    except (BadZipFile, OSError, ValueError, KeyError, TypeError) as error:
        print(f"Scan incomplete: {error}", file=sys.stderr)
        return 2
    print(json.dumps({"scanned_at": datetime.now(timezone.utc).isoformat(), "jar_sha256": digest,
                      "libraries": count, "coordinates": len(packages), "affected_coordinates": len(matches),
                      "distinct_advisories": len({v for ids in matches.values() for v in ids})}))
    return int(bool(matches))


if __name__ == "__main__":
    sys.exit(main())
