// GitHub git data API client. Builds atomic commits (one commit per save,
// regardless of how many files change).
//
// Required globals set by editor-bootstrap.js before this file loads:
//   window.__EDITOR_TOKEN  — OAuth access token
//   window.__EDITOR_REPO   — { owner, name, branch }

window.__editor = window.__editor || {};

window.__editor.github = (function () {
  const REPO = window.__EDITOR_REPO;
  const BASE = `https://api.github.com/repos/${REPO.owner}/${REPO.name}`;

  async function api(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        Authorization: `Bearer ${window.__EDITOR_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`GitHub ${method} ${path} → ${res.status}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }
    return res.json();
  }

  async function getHeadCommitSha() {
    const ref = await api('GET', `/git/refs/heads/${REPO.branch}`);
    return ref.object.sha;
  }

  async function getCommitTreeSha(commitSha) {
    const commit = await api('GET', `/git/commits/${commitSha}`);
    return commit.tree.sha;
  }

  function createBlob(content, encoding) {
    return api('POST', '/git/blobs', { content, encoding }).then((b) => b.sha);
  }

  function createTree(baseTreeSha, entries) {
    return api('POST', '/git/trees', {
      base_tree: baseTreeSha,
      tree: entries,
    }).then((t) => t.sha);
  }

  function createCommit(treeSha, parentSha, message) {
    return api('POST', '/git/commits', {
      message,
      tree: treeSha,
      parents: [parentSha],
    }).then((c) => c.sha);
  }

  function updateRef(commitSha, force) {
    return api('PATCH', `/git/refs/heads/${REPO.branch}`, {
      sha: commitSha,
      force: !!force,
    });
  }

  // Reads `path/in/repo` from the live deploy (faster than a GET via API).
  async function fetchPublicJson(repoPath) {
    const res = await fetch(repoPath + '?_=' + Date.now(), { cache: 'no-cache' });
    if (!res.ok) throw new Error(`fetch ${repoPath} → ${res.status}`);
    return res.json();
  }

  // file (File object) → base64 string without the data-URL prefix.
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const dataUrl = fr.result;
        const idx = dataUrl.indexOf(',');
        resolve(dataUrl.slice(idx + 1));
      };
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
  }

  // Atomically commit a content.json update + zero or more new image files.
  //   changes.contentJson : final JSON object to write to content/content.json
  //   changes.images      : [{ path: "assets/images/.../foo.png", file: File }]
  //   message             : commit message
  //   options.force       : on ref update conflict, force-push (default false)
  async function saveAtomic(changes, message, options) {
    options = options || {};

    const headSha = await getHeadCommitSha();
    const baseTreeSha = await getCommitTreeSha(headSha);

    // Build all blobs in parallel.
    const contentBlobPromise = createBlob(
      JSON.stringify(changes.contentJson, null, 2) + '\n',
      'utf-8'
    ).then((sha) => ({
      path: 'content/content.json',
      mode: '100644',
      type: 'blob',
      sha,
    }));

    const imageBlobPromises = (changes.images || []).map(async (img) => {
      const b64 = await fileToBase64(img.file);
      const sha = await createBlob(b64, 'base64');
      return { path: img.path, mode: '100644', type: 'blob', sha };
    });

    const entries = await Promise.all([contentBlobPromise, ...imageBlobPromises]);
    const newTreeSha = await createTree(baseTreeSha, entries);
    const newCommitSha = await createCommit(newTreeSha, headSha, message);

    try {
      await updateRef(newCommitSha, options.force);
    } catch (err) {
      // Fast-forward failure (someone else committed in between).
      if (err.status === 422 && !options.force) {
        err.canForce = true;
      }
      throw err;
    }
    return newCommitSha;
  }

  return { fetchPublicJson, saveAtomic, getHeadCommitSha };
})();
