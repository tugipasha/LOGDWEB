/**
 * LOGD Content Store — loads and persists site content.
 * Published content is stored in data/site-content.json.
 * Admin edits are saved to localStorage until exported/deployed.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'logd_site_content';
  var DATA_PATH = '../data/site-content.json';

  function resolveDataPath() {
    var path = window.location.pathname;
    if (path.indexOf('/admin') !== -1) {
      return '../data/site-content.json';
    }
    return 'data/site-content.json';
  }

  function getLang() {
    return localStorage.getItem('language') || 'tr';
  }

  function t(field) {
    if (!field) return '';
    if (typeof field === 'string') return field;
    var lang = getLang();
    return field[lang] || field.tr || field.en || '';
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  async function loadContent() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Invalid stored content, falling back to JSON file.');
      }
    }

    try {
      var response = await fetch(resolveDataPath() + '?v=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch content');
      return await response.json();
    } catch (e) {
      console.error('Could not load site content:', e);
      return null;
    }
  }

  function saveContent(content) {
    content.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    return content;
  }

  function clearStoredContent() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function exportContent(content) {
    var blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'site-content.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importContent(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var data = JSON.parse(e.target.result);
          saveContent(data);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /* ---------------------------------------------------------------- */
  /* GitHub publishing — commits data/site-content.json directly to    */
  /* the repo so the existing Pages workflow redeploys automatically.  */
  /* The token lives only in this browser's localStorage and is only   */
  /* ever sent straight to api.github.com.                             */
  /* ---------------------------------------------------------------- */

  var PUBLISH_CONFIG_KEY = 'logd_publish_config';
  var DEFAULT_FILE_PATH = 'data/site-content.json';

  function getPublishConfig() {
    try {
      var raw = localStorage.getItem(PUBLISH_CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function savePublishConfig(cfg) {
    localStorage.setItem(PUBLISH_CONFIG_KEY, JSON.stringify({
      owner: (cfg.owner || '').trim(),
      repo: (cfg.repo || '').trim(),
      branch: (cfg.branch || 'main').trim(),
      path: (cfg.path || DEFAULT_FILE_PATH).trim(),
      token: (cfg.token || '').trim()
    }));
  }

  function clearPublishConfig() {
    localStorage.removeItem(PUBLISH_CONFIG_KEY);
  }

  function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
  }

  function ghHeaders(token) {
    return {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    };
  }

  async function testGitHubConnection(cfg) {
    if (!cfg || !cfg.owner || !cfg.repo || !cfg.token) {
      return { ok: false, message: 'Lütfen owner, repo ve token alanlarını doldurun.' };
    }
    try {
      var res = await fetch('https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo, {
        headers: ghHeaders(cfg.token)
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        return { ok: false, message: (data && data.message) || ('Bağlantı başarısız (' + res.status + ')') };
      }
      var perms = data.permissions || {};
      if (!perms.push) {
        return { ok: false, message: 'Bu token ile depoya (repo) yazma izniniz yok. Token izinlerini kontrol edin.' };
      }
      return { ok: true, message: '"' + data.full_name + '" deposuna bağlantı başarılı. Yazma izni doğrulandı.' };
    } catch (e) {
      return { ok: false, message: 'Bağlantı hatası: ' + e.message };
    }
  }

  async function publishToGitHub(content) {
    var cfg = getPublishConfig();
    if (!cfg || !cfg.owner || !cfg.repo || !cfg.token) {
      var err = new Error('missing config');
      err.code = 'MISSING_CONFIG';
      throw err;
    }

    var path = cfg.path || DEFAULT_FILE_PATH;
    var branch = cfg.branch || 'main';
    var api = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + path;

    // 1. Get current file sha (needed to update an existing file)
    var sha;
    var getRes = await fetch(api + '?ref=' + encodeURIComponent(branch), { headers: ghHeaders(cfg.token) });
    if (getRes.ok) {
      var getData = await getRes.json();
      sha = getData.sha;
    } else if (getRes.status !== 404) {
      var getErr = await getRes.json().catch(function () { return {}; });
      throw new Error((getErr && getErr.message) || 'Dosya bilgisi alınamadı (' + getRes.status + ')');
    }

    // 2. Commit the updated content
    content.updatedAt = new Date().toISOString();
    var jsonStr = JSON.stringify(content, null, 2);
    var body = {
      message: 'Admin panel: içerik güncellendi (' + content.updatedAt + ')',
      content: b64EncodeUnicode(jsonStr),
      branch: branch
    };
    if (sha) body.sha = sha;

    var putRes = await fetch(api, {
      method: 'PUT',
      headers: ghHeaders(cfg.token),
      body: JSON.stringify(body)
    });
    var putData = await putRes.json().catch(function () { return {}; });
    if (!putRes.ok) {
      throw new Error((putData && putData.message) || ('Yayınlama başarısız (' + putRes.status + ')'));
    }
    return putData;
  }

  global.LOGDContentStore = {
    STORAGE_KEY: STORAGE_KEY,
    loadContent: loadContent,
    saveContent: saveContent,
    clearStoredContent: clearStoredContent,
    exportContent: exportContent,
    importContent: importContent,
    t: t,
    getLang: getLang,
    deepClone: deepClone,
    getPublishConfig: getPublishConfig,
    savePublishConfig: savePublishConfig,
    clearPublishConfig: clearPublishConfig,
    testGitHubConnection: testGitHubConnection,
    publishToGitHub: publishToGitHub
  };
})(window);
