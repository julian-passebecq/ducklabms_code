"""Explicit live qualification; sends only built-in teaching fixtures."""
import argparse
import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from apps.api.datapass.guided_spark import GuidedSpark, STARTER


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    report = dict(endpoint=args.url, observed_at=datetime.now(timezone.utc).isoformat(), status='FAIL', exchanges=[], checks=[])

    class ObservedService(GuidedSpark):
        def request(self, method, path, deadline, body=None):
            response = super().request(method, path, deadline, body)
            report['exchanges'].append(dict(method=method, path=path, request=body, response=response))
            return response

    client = ObservedService(args.url)
    try:
        report['capabilities'] = client.qualify(True)
        assert report['capabilities']['available']
        report['checks'].append('Live identity/version/runtime, compiler agreement, full/truncated/empty-result probes')
        request = dict(exercise_id='guided-retail-filter', exercise_version='1', language='sparklab', remote_consent=True,
                       notebook_id='live-qualification', cell_id='answer', mode='submit', code=STARTER)
        report['submission'] = client.grade(request)
        assert report['submission']['status'] == 'passed'
        assert len(report['submission']['checks']) == 4
        assert all('actual' not in c and 'expected' not in c for c in report['submission']['checks'] if c['visibility'] != 'visible')
        report['checks'].append('Visible, hidden, duplicate-sensitive and empty-result grading; hidden results redacted')
        report['incorrect_submission'] = client.grade({**request, 'code': STARTER + '\ndf = df.limit(1)'})
        assert report['incorrect_submission']['status'] == 'failed'
        report['ordered_submission'] = client.grade({**request, 'code': STARTER + '\ndf = df.orderBy("order_id")'})
        assert report['ordered_submission']['status'] == 'passed'
        report['checks'].append('LIMIT-induced wrong answer fails; orderBy preserves correct semantics')
        report['status'] = 'PASS'
    except Exception as error:
        report.update(error=str(error), traceback=traceback.format_exc())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({k:report[k] for k in ('endpoint','observed_at','status','checks')}, indent=2))
    return 0 if report['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
