"""qontext-hw: measure the Qontext contexts and write a pool for the Studio."""

from __future__ import annotations

import argparse
import json
import sys

from . import __version__
from .circuits import CONTEXTS, SETTING_KEYS
from .pool import PoolError, chsh_value, mermin_score, validate_pool
from .runner import RunnerError, fetch, ibm_target, local_target, run, transpile_report


def _parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        prog="qontext-probe",
        description="Probe: measure the Mermin-Peres contexts and CHSH settings for Qontext Notary.",
    )
    where = ap.add_mutually_exclusive_group()
    where.add_argument("--ibm", metavar="BACKEND", help="IBM Quantum backend name, or least_busy")
    where.add_argument("--noisy", action="store_true", help="local simulator with a noise model")
    where.add_argument("--fetch", metavar="JOB_ID", help="collect an IBM Quantum job submitted earlier")
    ap.add_argument("--shots", type=int, default=512, help="shots per circuit (default 512)")
    ap.add_argument("--seed", type=int, default=7, help="state seed (default 7)")
    ap.add_argument("--out", default="qontext_pool.json", help="output file (default qontext_pool.json)")
    ap.add_argument("--no-chsh", action="store_true", help="skip the four CHSH circuits")
    ap.add_argument("--dry-run", action="store_true", help="transpile and report circuit cost without running")
    ap.add_argument("--validate", metavar="FILE", help="validate an existing pool file and print its scores")
    ap.add_argument("--version", action="version", version=f"qontext-probe {__version__}")
    return ap


def _summary(pool: dict) -> str:
    lines = [f"Backend: {pool.get('backend')}   jobs: {', '.join(pool.get('job_ids', [])) or '-'}"]
    for cid, (_, sign) in CONTEXTS.items():
        shots = pool["contexts"][cid]
        held = sum(1 for a, b, c in shots if a * b * c == sign) / len(shots)
        lines.append(f"  {cid}: rule held on {held:6.1%} of {len(shots)} shots")
    lines.append(f"Mermin score {mermin_score(pool['contexts']):.3f}  (classical max 4, quantum ideal 6)")
    if pool.get("chsh"):
        lines.append(f"CHSH value   {chsh_value(pool['chsh']):.3f}  (classical max 2, quantum max 2.828)")
    return "\n".join(lines)


def _write(pool: dict, out: str) -> int:
    with open(out, "w", encoding="utf-8") as f:
        json.dump(pool, f, separators=(",", ":"))
    print(_summary(pool))
    print(f"Pool written to {out}. Load it in the Atelier's Notary room.")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.validate:
            with open(args.validate, encoding="utf-8") as f:
                pool = validate_pool(json.load(f))
            print(_summary(pool))
            print("Valid qontext-pool/1 file.")
            return 0

        if args.fetch:
            print(f"Collecting job {args.fetch} from IBM Quantum (waits if it has not finished).")
            pool = fetch(args.fetch, seed=args.seed)
            return _write(pool, args.out)

        target = ibm_target(args.ibm) if args.ibm else local_target(noisy=args.noisy)
        if args.dry_run:
            print(f"Target: {target.label}")
            for row in transpile_report(target, args.seed, not args.no_chsh):
                print(f"  {row['name']:<20} depth {row['depth']:>4}   two-qubit gates {row['two_qubit_gates']:>3}")
            n = len(CONTEXTS) + (0 if args.no_chsh else len(SETTING_KEYS))
            print(f"{n} circuits x {args.shots} shots = {n * args.shots} executions")
            return 0

        def submitted(job_id: str) -> None:
            if args.ibm:
                print(f"Job {job_id} submitted to {target.label}. Queue time depends on the device.")
                later = f"qontext-probe --fetch {job_id} --out {args.out}"
                print(f"If you close this window, collect it later with: {later}")

        if args.ibm:
            print(f"Preparing the circuits for {target.label}.")
        pool = run(target, shots=args.shots, seed=args.seed, include_chsh=not args.no_chsh, on_submit=submitted)
        return _write(pool, args.out)
    except (RunnerError, PoolError, OSError, json.JSONDecodeError) as e:
        print(f"qontext-probe: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
