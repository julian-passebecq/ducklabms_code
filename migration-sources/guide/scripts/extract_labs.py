from pathlib import Path
import argparse
import html
import json
import os
import re
import sys
import yaml

APP_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCES_ROOT = APP_ROOT / 'sources'
DEFAULT_OUTPUT = APP_ROOT / 'src' / 'data' / 'labs.generated.json'

REPO_SPECS = [
    ('Microsoft Fabric interactive labs', 'mslearn-fabric-main', 'current', 'Fabric', ['Instructions/Labs']),
    ('DP-750 Azure Databricks labs', 'DP-750T00-Implement-Data-Engineering-Solutions-using-Azure-Databricks-main', 'current', 'Azure Databricks', ['Instructions/Labs']),
    ('PL-300 Power BI labs', 'PL-300-Microsoft-Power-BI-Data-Analyst-Main', 'current', 'Power BI', ['Instructions/Labs', 'Instructions/Demos']),
    ('Azure Databricks reference exercises', 'mslearn-databricks-main', 'reference', 'Azure Databricks', ['Instructions/Exercises']),
    ('DP-300 database administrator labs', 'dp-300-database-administrator-master', 'current', 'Azure SQL', ['Instructions']),
    ('DP-500 enterprise data analyst labs', 'DP-500-Azure-Data-Analyst-main', 'legacy', 'Legacy / Power BI + Synapse', ['Instructions/labs']),
]


def parse_args():
    parser = argparse.ArgumentParser(description='Rebuild the normalized Microsoft Data Guide lab catalog.')
    parser.add_argument(
        '--sources-root',
        type=Path,
        default=Path(os.environ.get('MDG_SOURCES_ROOT', DEFAULT_SOURCES_ROOT)),
        help='Directory containing extracted Microsoft training repositories (default: ./sources or MDG_SOURCES_ROOT).',
    )
    parser.add_argument(
        '--output',
        type=Path,
        default=DEFAULT_OUTPUT,
        help='Output JSON path (default: ./src/data/labs.generated.json).',
    )
    parser.add_argument(
        '--strict',
        action='store_true',
        help='Fail if any configured repository cannot be located under --sources-root.',
    )
    return parser.parse_args()


def resolve_repo(root: Path, folder: str, content_dirs: list[str]):
    candidates: list[Path] = [root / folder, root / folder / folder]
    if root.exists():
        for child in root.iterdir():
            if child.is_dir() and child.name.casefold() == folder.casefold():
                candidates.extend([child, child / child.name, child / folder])

    seen: set[Path] = set()
    for candidate in candidates:
        candidate = candidate.resolve()
        if candidate in seen or not candidate.exists():
            continue
        seen.add(candidate)
        if any((candidate / rel).exists() for rel in content_dirs):
            return candidate
    return None

def first_paragraph(body: str):
    # strip title / markdown-only lines until a useful paragraph
    blocks = re.split(r'\n\s*\n', body)
    for block in blocks:
        s = re.sub(r'^#+\s*', '', block.strip())
        if not s or s.startswith(('>', '![', '{%', '<')):
            continue
        if s.lower().startswith(('lab ', 'exercise ', 'demo ')) and len(s) < 100:
            continue
        s = re.sub(r'\[(.*?)\]\([^)]*\)', r'\1', s)
        s = re.sub(r'[*_`#]', '', s)
        s = re.sub(r'\s+', ' ', s).strip()
        if len(s) > 50:
            return s[:420]
    return ''


def infer_title(path, body, meta):
    for key in ('title', 'name'):
        if isinstance(meta, dict) and meta.get(key):
            return str(meta[key])
    m = re.search(r'^#\s+(.+)$', body, flags=re.M)
    if m: return re.sub(r'[*`]', '', m.group(1)).strip()
    return path.stem.replace('-', ' ').title()


def clean_markdown_text(text: str, limit=360):
    text = re.sub(r'```[\s\S]*?```', ' ', text)
    text = re.sub(r'!\[[^]]*\]\([^)]*\)', ' ', text)
    text = re.sub(r'\[(.*?)\]\([^)]*\)', r'\1', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.M)
    text = re.sub(r'^\s*\d+[.)]\s+', '', text, flags=re.M)
    text = re.sub(r'[*_`>#]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    text = html.unescape(text)
    return text[:limit]


def extract_sections(body: str):
    matches = list(re.finditer(r'^##\s+(.+)$', body, flags=re.M))
    sections = []
    for i, match in enumerate(matches[:12]):
        title = re.sub(r'[*_`]', '', match.group(1)).strip()
        start = match.end()
        end = matches[i+1].start() if i + 1 < len(matches) else len(body)
        chunk = body[start:end]
        code_match = re.search(r'```(?:[A-Za-z0-9_+.#-]+)?\s*\n([\s\S]*?)```', chunk)
        code = code_match.group(1).strip()[:1400] if code_match else ''
        summary = clean_markdown_text(chunk, 420)
        if title:
            sections.append({'title': title, 'summary': summary, 'code': code})
    return sections


def flatten_meta(front):
    if not isinstance(front, dict): return {}
    if isinstance(front.get('lab'), dict): return front['lab']
    if isinstance(front.get('demo'), dict): return front['demo']
    if isinstance(front.get('exercise'), dict): return front['exercise']
    return front

def build_catalog(sources_root: Path, strict: bool):
    out = []
    missing: list[str] = []

    for repo_name, folder, status, platform, dirs in REPO_SPECS:
        repo = resolve_repo(sources_root, folder, dirs)
        if repo is None:
            missing.append(folder)
            continue
        for rel_dir in dirs:
            base = repo / rel_dir
            if not base.exists():
                continue
            for path in sorted(base.rglob('*.md')):
                text = path.read_text(encoding='utf-8', errors='ignore')
                front = {}
                body = text
                if text.startswith('---'):
                    parts = text.split('---', 2)
                    if len(parts) >= 3:
                        try:
                            front = yaml.safe_load(parts[1]) or {}
                        except Exception:
                            front = {}
                        body = parts[2]
                meta = flatten_meta(front)
                title = infer_title(path, body, meta)
                desc = (meta.get('description') if isinstance(meta, dict) else None) or first_paragraph(body)
                categories = meta.get('categories', []) if isinstance(meta, dict) else []
                courses = meta.get('courses', []) if isinstance(meta, dict) else []
                if categories is None:
                    categories = []
                if courses is None:
                    courses = []
                if isinstance(categories, str):
                    categories = [categories]
                if isinstance(courses, str):
                    courses = [courses]
                if not isinstance(categories, list):
                    categories = [str(categories)]
                if not isinstance(courses, list):
                    courses = [str(courses)]
                duration = meta.get('duration', '') if isinstance(meta, dict) else ''
                module = meta.get('module', '') if isinstance(meta, dict) else ''
                idx = meta.get('index', '') if isinstance(meta, dict) else ''

                headings = []
                for level, heading in re.findall(r'^(#{2,3})\s+(.+)$', body, flags=re.M):
                    clean = re.sub(r'[*_`]', '', heading).strip()
                    if clean and clean not in headings:
                        headings.append(clean)
                    if len(headings) >= 8:
                        break

                relative_path = str(path.relative_to(repo)).replace('\\', '/')
                platform_slug = platform.lower().replace(' ', '-').replace('/', '-')
                path_slug = relative_path.rsplit('.', 1)[0].replace('/', ':').replace(' ', '-').lower()
                out.append({
                    'id': f"{platform_slug}:{path_slug}",
                    'title': title,
                    'description': str(desc or ''),
                    'duration': str(duration or ''),
                    'module': str(module or ''),
                    'index': idx,
                    'categories': categories,
                    'courses': courses,
                    'platform': platform,
                    'source': repo_name,
                    'status': status,
                    'relativePath': relative_path,
                    'outline': headings,
                    'sections': extract_sections(body),
                })

    if missing:
        message = 'Missing source repositories: ' + ', '.join(missing)
        if strict:
            raise FileNotFoundError(message)
        print(f'Warning: {message}', file=sys.stderr)

    if not out:
        raise RuntimeError(f'No lab records found under {sources_root}')
    return out


def main():
    args = parse_args()
    sources_root = args.sources_root.expanduser().resolve()
    output = args.output.expanduser().resolve()
    out = build_catalog(sources_root, args.strict)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'Wrote {len(out)} lab/exercise records to {output}')
    from collections import Counter
    print(Counter((x['platform'], x['status']) for x in out))


if __name__ == '__main__':
    main()
