"""Views: frontend host page, frontend asset serving, and a small API."""

import json
from pathlib import Path

from django.conf import settings
from django.http import (
    FileResponse,
    Http404,
    HttpResponseNotAllowed,
    JsonResponse,
)
from django.views.decorators.csrf import csrf_exempt


def _safe_frontend_path(relative: str) -> Path:
    """Resolve `relative` under FRONTEND_DIR, blocking path traversal."""
    root = settings.FRONTEND_DIR.resolve()
    target = (root / relative).resolve()
    if root != target and root not in target.parents:
        raise Http404("Not found")
    return target


def index(request):
    """Serve the SPA's index.html."""
    index_path = settings.FRONTEND_DIR / 'index.html'
    if not index_path.is_file():
        raise Http404("index.html missing")
    return FileResponse(index_path.open('rb'), content_type='text/html')


def frontend_file(request, path: str):
    """Serve a static file (asset, font, css, jsx) directly from the frontend dir."""
    target = _safe_frontend_path(path)
    if not target.is_file():
        raise Http404("Not found")
    return FileResponse(target.open('rb'))


def health(request):
    return JsonResponse({'status': 'ok'})


@csrf_exempt
def contact(request):
    """Accept a JSON contact payload. Logs to stdout; replace with email/db as needed."""
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])
    try:
        data = json.loads(request.body or b'{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid json'}, status=400)

    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    message = (data.get('message') or '').strip()
    if not (name and email and message):
        return JsonResponse({'error': 'name, email, message are required'}, status=400)

    print(f"[contact] from={name} <{email}>: {message}")
    return JsonResponse({'ok': True})
