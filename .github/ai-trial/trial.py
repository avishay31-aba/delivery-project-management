"""Infrastructure-only synthetic trial. Never executes candidate code."""
import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
BUG = "def clamp(value, low, high):\n    return min(low, max(high, value))\n"
GOOD = "def clamp(value, low, high):\n    return max(low, min(high, value))\n"
CASES = [(-5, 0, 10, 0), (5, 0, 10, 5), (15, 0, 10, 10), (0, 0, 10, 0), (10, 0, 10, 10), (-4, -8, -2, -4)]
REQUIREMENT = "Implement clamp(value, low, high), for low <= high. Return low below the range, high above it, and value inside it. Pure function, no imports or side effects."

def head():
    actual = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    expected = os.environ.get("EXPECTED_HEAD", actual)
    if actual != expected:
        raise RuntimeError("HEAD mismatch: " + actual + " != " + expected)
    if subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip():
        raise RuntimeError("Repository is not clean")
    return actual

def evaluate(source, values):
    # Whitelisted AST interpreter: candidate code is data, never exec/import.
    tree = ast.parse(source)
    assert len(tree.body) == 1
    fn = tree.body[0]
    assert isinstance(fn, ast.FunctionDef) and fn.name == "clamp"
    assert not fn.decorator_list and fn.returns is None
    assert [a.arg for a in fn.args.args] == ["value", "low", "high"]
    assert not fn.args.defaults and not fn.args.kwonlyargs and not fn.args.posonlyargs
    assert fn.args.vararg is None and fn.args.kwarg is None
    assert len(fn.body) == 1 and isinstance(fn.body[0], ast.Return)
    def visit(node):
        if isinstance(node, ast.Name) and node.id in values:
            return values[node.id]
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in ("min", "max"):
            assert len(node.args) == 2 and not node.keywords
            return {"min": min, "max": max}[node.func.id](*(visit(x) for x in node.args))
        raise ValueError("Unsupported expression")
    return visit(fn.body[0].value)

def verify(source):
    try:
        failures = []
        for value, low, high, expected in CASES:
            actual = evaluate(source, dict(value=value, low=low, high=high))
            if actual != expected:
                failures.append(dict(value=value, low=low, high=high, expected=expected, actual=actual))
        return dict(passed=not failures, failures=failures)
    except Exception as error:
        return dict(passed=False, error=str(error))

def agent(work, evidence, role, prompt, sandbox):
    sha = head()
    output = evidence / (role + ".txt")
    command = ["codex", "exec", "--ephemeral", "--skip-git-repo-check",
               "--sandbox", sandbox, "-C", str(work), "-o", str(output), prompt]
    result = subprocess.run(command, text=True, capture_output=True, timeout=180)
    (evidence / (role + "-execution.json")).write_text(json.dumps(
        dict(head=sha, returncode=result.returncode, stdout=result.stdout, stderr=result.stderr), indent=2))
    if result.returncode:
        raise RuntimeError(role + " failed; inspect evidence")
    return output.read_text()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        assert not verify(BUG)["passed"]
        assert verify(GOOD)["passed"]
        assert not verify("import os")["passed"]
        print("Harness PASS: defect detected, corrected fixture accepted, unsafe syntax rejected")
        return
    sha = head()
    evidence = Path(os.environ.get("RUNNER_TEMP", tempfile.gettempdir())) / "dpm-ai-trial-evidence"
    evidence.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="dpm-synthetic-") as directory:
        work = Path(directory)
        candidate = work / "candidate.py"
        candidate.write_text(BUG)
        initial = verify(BUG)
        (evidence / "initial-tests.json").write_text(json.dumps(initial, indent=2))
        assert not initial["passed"]
        feedback = json.dumps(initial)
        for cycle in range(1, 4):
            before = candidate.read_text()
            digest = hashlib.sha256(before.encode()).hexdigest()
            review = agent(work, evidence, f"qa-{cycle}",
                "Independent QA only. " + REQUIREMENT +
                " Read candidate.py and assess it independently. Return only JSON with keys passed (boolean), findings (array of strings). Do not change any file.",
                "read-only")
            assert candidate.read_text() == before, "QA changed candidate"
            verdict = json.loads(review)
            assert type(verdict["passed"]) is bool and isinstance(verdict["findings"], list)
            tests = verify(before)
            (evidence / f"cycle-{cycle}.json").write_text(json.dumps(
                dict(head=sha, candidate_sha256=digest, tests=tests, qa=verdict), indent=2))
            if tests["passed"] and verdict["passed"]:
                (evidence / "result.json").write_text(json.dumps(
                    dict(status="PASS", head=sha, cycles=cycle, candidate_sha256=digest), indent=2))
                head()
                print("Independent QA and deterministic tests PASS")
                return
            if cycle == 3:
                break
            feedback = json.dumps(dict(tests=tests, independent_qa=verdict))
            agent(work, evidence, f"implement-{cycle}",
                REQUIREMENT + " Fix only candidate.py using one return expression composed of min/max and argument names. No other files. Feedback: " + feedback,
                "workspace-write")
            assert sorted(p.name for p in work.iterdir()) == ["candidate.py"]
            (evidence / f"candidate-{cycle}.py").write_text(candidate.read_text())
        raise RuntimeError("Trial did not pass within three QA cycles")

if __name__ == "__main__":
    main()
