/**
 * LOGD Admin Panel — login, navigation and full dynamic content editor.
 * Works together with content-store.js (load/save/export/import) and
 * data/site-content.json (the single source of truth for the public site).
 */
(function () {
  'use strict';

  var store = window.LOGDContentStore;
  var AUTH_KEY = 'logd_admin_session';
  var CREDENTIALS = { username: 'logdadmin', password: 'logdadmin35*' };

  var content = null;
  var currentPanel = 'home';

  var PANEL_TITLES = {
    home: 'Ana Sayfa',
    about: 'Hakkımızda',
    events: 'Etkinlikler',
    news: 'Haberler',
    gallery: 'Galeri',
    showcase: 'Showcase',
    contact: 'İletişim',
    footer: 'Footer & Sosyal',
    settings: 'Ayarlar'
  };

  /* ---------------------------------------------------------------- */
  /* Utilities                                                          */
  /* ---------------------------------------------------------------- */

  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;');
  }

  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) {
      return (o === undefined || o === null) ? undefined : o[k];
    }, obj);
  }

  function setPath(obj, path, value) {
    var keys = path.split('.');
    var last = keys.pop();
    var target = keys.reduce(function (o, k) {
      if (o[k] === undefined || o[k] === null) {
        o[k] = /^\d+$/.test(k) ? [] : {};
      }
      return o[k];
    }, obj);
    target[last] = value;
  }

  function toast(msg, isError) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast visible' + (isError ? ' error' : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.className = 'toast';
    }, 2600);
  }

  /* ---------------------------------------------------------------- */
  /* Field builders                                                     */
  /* ---------------------------------------------------------------- */

  function field(label, path, value, type) {
    return '<div class="form-group"><label>' + esc(label) + '</label>' +
      '<input type="' + (type || 'text') + '" data-path="' + path + '" value="' + escAttr(value) + '"></div>';
  }

  function checkboxField(label, path, checked) {
    var id = 'cb-' + path.replace(/\./g, '-');
    return '<div class="checkbox-row"><input type="checkbox" id="' + id + '" data-path="' + path + '" ' +
      (checked ? 'checked' : '') + '><label for="' + id + '">' + esc(label) + '</label></div>';
  }

  function textareaField(label, path, value) {
    return '<div class="form-group"><label>' + esc(label) + '</label>' +
      '<textarea data-path="' + path + '">' + esc(value) + '</textarea></div>';
  }

  function linesField(label, path, arr) {
    return '<div class="form-group"><label>' + esc(label) + ' <small style="opacity:.7">(her satır bir öğe)</small></label>' +
      '<textarea data-path="' + path + '" data-arraytype="lines">' + esc((arr || []).join('\n')) + '</textarea></div>';
  }

  function bilingual(labelBase, path, valTr, valEn, textarea) {
    var mk = function (lang, val) {
      var p = path + '.' + lang;
      if (textarea) {
        return '<div class="form-group"><label>' + esc(labelBase) + ' (' + lang.toUpperCase() + ')</label>' +
          '<textarea data-path="' + p + '">' + esc(val) + '</textarea></div>';
      }
      return '<div class="form-group"><label>' + esc(labelBase) + ' (' + lang.toUpperCase() + ')</label>' +
        '<input type="text" data-path="' + p + '" value="' + escAttr(val) + '"></div>';
    };
    return '<div class="form-row">' + mk('tr', valTr) + mk('en', valEn) + '</div>';
  }

  function bilingualLines(labelBase, path, arrTr, arrEn) {
    return '<div class="form-row">' +
      linesField(labelBase + ' (TR)', path + '.tr', arrTr) +
      linesField(labelBase + ' (EN)', path + '.en', arrEn) +
      '</div>';
  }

  function card(title, innerHtml) {
    return '<div class="admin-card"><h3>' + esc(title) + '</h3>' + innerHtml + '</div>';
  }

  function listCard(listPath, title, itemsHtml, addLabel) {
    return '<div class="admin-card"><h3>' + esc(title) + '</h3>' +
      '<div class="item-list">' + itemsHtml + '</div>' +
      '<div class="add-btn-row"><button type="button" class="btn btn-secondary btn-sm" data-action="add-item" data-list="' + listPath + '">' +
      (addLabel || '+ Ekle') + '</button></div></div>';
  }

  function listItem(listPath, idx, count, headerLabel, innerHtml) {
    return '<div class="list-item">' +
      '<div class="list-item-header"><h4>' + esc(headerLabel) + '</h4>' +
      '<div class="item-actions">' +
      (idx > 0 ? '<button type="button" class="btn btn-secondary btn-sm" data-action="move-item" data-dir="-1" data-list="' + listPath + '" data-index="' + idx + '">↑</button>' : '') +
      (idx < count - 1 ? '<button type="button" class="btn btn-secondary btn-sm" data-action="move-item" data-dir="1" data-list="' + listPath + '" data-index="' + idx + '">↓</button>' : '') +
      '<button type="button" class="btn btn-danger btn-sm" data-action="remove-item" data-list="' + listPath + '" data-index="' + idx + '">🗑 Sil</button>' +
      '</div></div>' + innerHtml + '</div>';
  }

  /* ---------------------------------------------------------------- */
  /* New item templates (used when "+ Ekle" is clicked)                 */
  /* ---------------------------------------------------------------- */

  function newItemTemplate(listPath) {
    if (listPath === 'home.galleryMarquee.images') return { src: 'images/', alt: '' };
    if (listPath === 'home.communities.items') return { name: '', logo: 'images/', url: '' };
    if (listPath === 'home.sponsors.items') return { name: '', logos: [], stacked: false };
    if (listPath === 'events.items') {
      return { id: '', title: { tr: '', en: '' }, description: { tr: '', en: '' }, image: 'images/', emoji: '🎮' };
    }
    if (listPath === 'news.items') {
      return {
        id: '', tag: { tr: '', en: '' }, title: { tr: '', en: '' },
        date: new Date().toISOString().slice(0, 10), author: { tr: '', en: '' },
        paragraphs: { tr: [], en: [] }, featuresTitle: { tr: 'Özellikler:', en: 'Features:' },
        features: { tr: [], en: [] }, buttonText: { tr: '', en: '' }, buttonLink: '', featured: false
      };
    }
    if (listPath === 'gallery.categories') return { id: '', title: { tr: '', en: '' }, images: [] };
    if (/^gallery\.categories\.\d+\.images$/.test(listPath)) return { src: 'images/', alt: '', large: false };
    if (listPath === 'showcase.games') {
      return { title: { tr: '', en: '' }, description: { tr: '', en: '' }, image: '', link: '', buttonText: { tr: 'Oyna', en: 'Play' } };
    }
    return {};
  }

  /* ---------------------------------------------------------------- */
  /* Panel renderers                                                    */
  /* ---------------------------------------------------------------- */

  function renderHome() {
    var h = content.home;
    var html = '';

    html += card('Hero Alanı', '' +
      bilingual('Başlık', 'home.hero.title', h.hero.title.tr, h.hero.title.en, true) +
      bilingual('Alt Başlık', 'home.hero.subtitle', h.hero.subtitle.tr, h.hero.subtitle.en, true) +
      bilingual('Birincil Buton', 'home.hero.ctaPrimary', h.hero.ctaPrimary.tr, h.hero.ctaPrimary.en) +
      bilingual('İkincil Buton', 'home.hero.ctaSecondary', h.hero.ctaSecondary.tr, h.hero.ctaSecondary.en));

    html += card('LOGD Nedir Bölümü', '' +
      bilingual('Başlık', 'home.about.title', h.about.title.tr, h.about.title.en) +
      bilingual('Metin', 'home.about.text', h.about.text.tr, h.about.text.en, true));

    html += card('Galeri Marquee', '' +
      bilingual('Başlık', 'home.galleryMarquee.title', h.galleryMarquee.title.tr, h.galleryMarquee.title.en) +
      bilingual('Buton Metni', 'home.galleryMarquee.buttonText', h.galleryMarquee.buttonText.tr, h.galleryMarquee.buttonText.en));

    var imgItems = (h.galleryMarquee.images || []).map(function (img, i) {
      var base = 'home.galleryMarquee.images.' + i;
      return listItem(base.replace(/\.\d+$/, '').replace('home.galleryMarquee.images', 'home.galleryMarquee.images'), i, h.galleryMarquee.images.length, img.alt || ('Görsel ' + (i + 1)),
        field('Görsel Yolu', base + '.src', img.src) + field('Alt Metin', base + '.alt', img.alt));
    }).join('');
    html += listCard('home.galleryMarquee.images', 'Marquee Görselleri', imgItems, '+ Görsel Ekle');

    html += card('Topluluklar Bölümü Başlığı', '' +
      bilingual('Başlık', 'home.communities.title', h.communities.title.tr, h.communities.title.en) +
      bilingual('Açıklama', 'home.communities.description', h.communities.description.tr, h.communities.description.en, true));

    var commItems = (h.communities.items || []).map(function (c, i) {
      var base = 'home.communities.items.' + i;
      return listItem('home.communities.items', i, h.communities.items.length, c.name || ('Topluluk ' + (i + 1)),
        field('Ad', base + '.name', c.name) +
        field('Logo Yolu', base + '.logo', c.logo) +
        field('URL', base + '.url', c.url));
    }).join('');
    html += listCard('home.communities.items', 'Öğrenci Toplulukları', commItems, '+ Topluluk Ekle');

    html += card('Sponsorlar Bölümü Başlığı', bilingual('Başlık', 'home.sponsors.title', h.sponsors.title.tr, h.sponsors.title.en));

    var sponsorItems = (h.sponsors.items || []).map(function (s, i) {
      var base = 'home.sponsors.items.' + i;
      return listItem('home.sponsors.items', i, h.sponsors.items.length, s.name || ('Sponsor ' + (i + 1)),
        field('Ad', base + '.name', s.name) +
        linesField('Logo Yolları', base + '.logos', s.logos) +
        checkboxField('Logoları alt alta göster (stacked)', base + '.stacked', s.stacked));
    }).join('');
    html += listCard('home.sponsors.items', 'Sponsorlar', sponsorItems, '+ Sponsor Ekle');

    return html;
  }

  function renderAbout() {
    var a = content.about;
    var html = '';
    html += card('Sayfa Başlığı', '' +
      bilingual('Başlık', 'about.pageTitle', a.pageTitle.tr, a.pageTitle.en) +
      bilingual('Alt Başlık', 'about.pageSubtitle', a.pageSubtitle.tr, a.pageSubtitle.en, true));
    html += card('Hikâye', '' +
      bilingual('Başlık', 'about.story.title', a.story.title.tr, a.story.title.en) +
      bilingual('Metin', 'about.story.text', a.story.text.tr, a.story.text.en, true));
    html += card('Vizyon', '' +
      bilingual('Etiket', 'about.vision.label', a.vision.label.tr, a.vision.label.en) +
      bilingual('Metin', 'about.vision.text', a.vision.text.tr, a.vision.text.en, true));
    html += card('Misyon', '' +
      bilingual('Etiket', 'about.mission.label', a.mission.label.tr, a.mission.label.en) +
      bilingual('Metin', 'about.mission.text', a.mission.text.tr, a.mission.text.en, true));
    html += card('Sponsorluk & İş Birlikleri', '' +
      bilingual('Başlık', 'about.sponsorship.title', a.sponsorship.title.tr, a.sponsorship.title.en) +
      bilingual('Metin', 'about.sponsorship.text', a.sponsorship.text.tr, a.sponsorship.text.en, true));
    html += card('Akademik & Resmi Yapılar', '' +
      bilingual('Başlık', 'about.academic.title', a.academic.title.tr, a.academic.title.en) +
      bilingual('Metin', 'about.academic.text', a.academic.text.tr, a.academic.text.en, true));
    return html;
  }

  function renderEvents() {
    var e = content.events;
    var html = '';
    html += card('Sayfa Başlığı', '' +
      bilingual('Başlık', 'events.pageTitle', e.pageTitle.tr, e.pageTitle.en) +
      bilingual('Alt Başlık', 'events.pageSubtitle', e.pageSubtitle.tr, e.pageSubtitle.en, true));

    var items = (e.items || []).map(function (ev, i) {
      var base = 'events.items.' + i;
      return listItem('events.items', i, e.items.length, ev.title.tr || ('Etkinlik ' + (i + 1)), '' +
        field('ID (benzersiz)', base + '.id', ev.id) +
        bilingual('Başlık', base + '.title', ev.title.tr, ev.title.en) +
        bilingual('Açıklama', base + '.description', ev.description.tr, ev.description.en, true) +
        field('Görsel Yolu', base + '.image', ev.image) +
        field('Emoji (görsel yüklenemezse)', base + '.emoji', ev.emoji));
    }).join('');
    html += listCard('events.items', 'Etkinlikler', items, '+ Etkinlik Ekle');
    return html;
  }

  function renderNews() {
    var n = content.news;
    var html = '';
    html += card('Sayfa Başlığı', '' +
      bilingual('Başlık', 'news.pageTitle', n.pageTitle.tr, n.pageTitle.en) +
      bilingual('Alt Başlık', 'news.pageSubtitle', n.pageSubtitle.tr, n.pageSubtitle.en, true));

    var items = (n.items || []).map(function (item, i) {
      var base = 'news.items.' + i;
      return listItem('news.items', i, n.items.length, item.title.tr || ('Haber ' + (i + 1)), '' +
        field('ID (benzersiz)', base + '.id', item.id) +
        bilingual('Etiket', base + '.tag', item.tag.tr, item.tag.en) +
        bilingual('Başlık', base + '.title', item.title.tr, item.title.en) +
        field('Tarih', base + '.date', item.date, 'date') +
        bilingual('Yazar', base + '.author', item.author.tr, item.author.en) +
        bilingualLines('Paragraflar', base + '.paragraphs', item.paragraphs.tr, item.paragraphs.en) +
        bilingual('Özellikler Başlığı', base + '.featuresTitle', item.featuresTitle.tr, item.featuresTitle.en) +
        bilingualLines('Özellikler', base + '.features', item.features.tr, item.features.en) +
        bilingual('Buton Metni', base + '.buttonText', item.buttonText.tr, item.buttonText.en) +
        field('Buton Linki', base + '.buttonLink', item.buttonLink) +
        checkboxField('Öne çıkan haber', base + '.featured', item.featured));
    }).join('');
    html += listCard('news.items', 'Haberler', items, '+ Haber Ekle');
    return html;
  }

  function renderGallery() {
    var g = content.gallery;
    var html = '';
    html += card('Sayfa Başlığı', '' +
      bilingual('Başlık', 'gallery.pageTitle', g.pageTitle.tr, g.pageTitle.en) +
      bilingual('Alt Başlık', 'gallery.pageSubtitle', g.pageSubtitle.tr, g.pageSubtitle.en, true));

    var cats = (g.categories || []).map(function (cat, ci) {
      var base = 'gallery.categories.' + ci;
      var imgs = (cat.images || []).map(function (img, ii) {
        var ibase = base + '.images.' + ii;
        return listItem(base + '.images', ii, cat.images.length, img.alt || ('Görsel ' + (ii + 1)), '' +
          field('Görsel Yolu', ibase + '.src', img.src) +
          field('Alt Metin', ibase + '.alt', img.alt) +
          checkboxField('Büyük göster (large)', ibase + '.large', img.large));
      }).join('');
      var inner = '' +
        field('ID (benzersiz)', base + '.id', cat.id) +
        bilingual('Kategori Başlığı', base + '.title', cat.title.tr, cat.title.en) +
        listCard(base + '.images', 'Görseller', imgs, '+ Görsel Ekle');
      return listItem('gallery.categories', ci, g.categories.length, cat.title.tr || ('Kategori ' + (ci + 1)), inner);
    }).join('');
    html += listCard('gallery.categories', 'Galeri Kategorileri', cats, '+ Kategori Ekle');
    return html;
  }

  function renderShowcase() {
    var s = content.showcase;
    var html = '';
    html += card('Sayfa Başlığı', '' +
      bilingual('Başlık', 'showcase.pageTitle', s.pageTitle.tr, s.pageTitle.en) +
      bilingual('Alt Başlık', 'showcase.pageSubtitle', s.pageSubtitle.tr, s.pageSubtitle.en, true));

    var games = (s.games || []).map(function (game, i) {
      var base = 'showcase.games.' + i;
      return listItem('showcase.games', i, s.games.length, game.title.tr || ('Oyun ' + (i + 1)), '' +
        bilingual('Başlık', base + '.title', game.title.tr, game.title.en) +
        bilingual('Açıklama', base + '.description', game.description.tr, game.description.en, true) +
        field('Görsel Yolu', base + '.image', game.image) +
        field('Oyun Linki', base + '.link', game.link) +
        bilingual('Buton Metni', base + '.buttonText', game.buttonText.tr, game.buttonText.en));
    }).join('');
    html += listCard('showcase.games', 'Oyunlar', games, '+ Oyun Ekle');

    html += card('"Yakında" Kartı', '' +
      bilingual('Başlık', 'showcase.comingSoon.title', s.comingSoon.title.tr, s.comingSoon.title.en) +
      bilingual('Metin', 'showcase.comingSoon.text', s.comingSoon.text.tr, s.comingSoon.text.en, true) +
      bilingual('Buton Metni', 'showcase.comingSoon.buttonText', s.comingSoon.buttonText.tr, s.comingSoon.buttonText.en));

    html += card('"Başvur" Kartı', '' +
      bilingual('Başlık', 'showcase.apply.title', s.apply.title.tr, s.apply.title.en) +
      bilingual('Metin', 'showcase.apply.text', s.apply.text.tr, s.apply.text.en, true) +
      bilingual('Buton Metni', 'showcase.apply.buttonText', s.apply.buttonText.tr, s.apply.buttonText.en));
    return html;
  }

  function renderContact() {
    var c = content.contact;
    return card('İletişim Sayfası', '' +
      bilingual('Sayfa Başlığı', 'contact.pageTitle', c.pageTitle.tr, c.pageTitle.en) +
      bilingual('Alt Başlık', 'contact.pageSubtitle', c.pageSubtitle.tr, c.pageSubtitle.en, true) +
      bilingual('Genel İletişim Başlığı', 'contact.generalTitle', c.generalTitle.tr, c.generalTitle.en) +
      bilingual('Genel İletişim Metni', 'contact.generalText', c.generalText.tr, c.generalText.en, true) +
      bilingual('İş Birliği Başlığı', 'contact.partnershipTitle', c.partnershipTitle.tr, c.partnershipTitle.en) +
      bilingual('İş Birliği Metni', 'contact.partnershipText', c.partnershipText.tr, c.partnershipText.en, true) +
      field('E-posta', 'contact.email', c.email, 'email') +
      bilingual('Form Başlığı', 'contact.formTitle', c.formTitle.tr, c.formTitle.en));
  }

  function renderFooter() {
    var f = content.footer;
    return card('Footer & Sosyal Medya', '' +
      bilingual('Hakkında Başlığı', 'footer.aboutTitle', f.aboutTitle.tr, f.aboutTitle.en) +
      bilingual('Hakkında Metni', 'footer.text', f.text.tr, f.text.en, true) +
      bilingual('Telif Hakkı Metni', 'footer.copyright', f.copyright.tr, f.copyright.en) +
      field('Instagram URL', 'footer.instagram', f.instagram) +
      field('LinkedIn URL', 'footer.linkedin', f.linkedin));
  }

  function renderSettings() {
    var s = content.settings;
    var html = '';
    html += card('Genel Ayarlar', '' +
      bilingual('Geri Sayım Başlığı', 'settings.countdownTitle', s.countdownTitle.tr, s.countdownTitle.en) +
      field('Geri Sayım Tarihi (ISO, ör: 2026-02-13T00:00:00)', 'settings.countdownDate', s.countdownDate));
    html += renderPublishSettingsCard();
    return html;
  }

  function renderPublishSettingsCard() {
    var cfg = store.getPublishConfig() || { owner: '', repo: '', branch: 'main', path: '', token: '' };
    return '<div class="admin-card"><h3>🚀 Yayınlama Ayarları (GitHub)</h3>' +
      '<div class="publish-notice">' +
      '<strong>ℹ️ Nasıl çalışır:</strong> "Kaydet" butonuna bastığınızda, içerik doğrudan GitHub deponuzdaki ' +
      '<code>data/site-content.json</code> dosyasına yazılır. Depo zaten her push\'ta otomatik yayına alacak ' +
      'şekilde ayarlı (GitHub Actions), bu yüzden birkaç dakika içinde site güncellenir. ' +
      'Bunun çalışması için aşağıya, <strong>Contents: Read and write</strong> izni olan bir GitHub ' +
      '<a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener">Personal Access Token</a>\'ı girmeniz gerekir.' +
      '<br><br><strong>⚠️ Güvenlik uyarısı:</strong> Bu token yalnızca bu tarayıcıda saklanır ve yalnızca GitHub\'a gönderilir. ' +
      'Yine de admin paneline erişimi olan herkes bu ayarları görüp deponuza yazabilir — token\'ı yalnızca güvendiğiniz ' +
      'cihazlarda girin ve gerekirse GitHub üzerinden istediğiniz zaman iptal edin.' +
      '</div>' +
      '<div class="form-row">' +
      '<div class="form-group"><label>GitHub Kullanıcı Adı / Organizasyon</label>' +
      '<input type="text" id="gh-owner" value="' + escAttr(cfg.owner) + '" placeholder="ör: logd-dernegi"></div>' +
      '<div class="form-group"><label>Depo Adı (repo)</label>' +
      '<input type="text" id="gh-repo" value="' + escAttr(cfg.repo) + '" placeholder="ör: LOGDWEB"></div>' +
      '</div>' +
      '<div class="form-row">' +
      '<div class="form-group"><label>Branch</label>' +
      '<input type="text" id="gh-branch" value="' + escAttr(cfg.branch || 'main') + '" placeholder="main"></div>' +
      '<div class="form-group"><label>Personal Access Token</label>' +
      '<input type="password" id="gh-token" value="' + escAttr(cfg.token) + '" placeholder="ghp_... veya github_pat_..."></div>' +
      '</div>' +
      '<div id="gh-config-status" style="margin-bottom:1rem;font-size:0.875rem;"></div>' +
      '<div class="item-actions">' +
      '<button type="button" class="btn btn-secondary btn-sm" data-action="gh-test">🔌 Bağlantıyı Test Et</button>' +
      '<button type="button" class="btn btn-success btn-sm" data-action="gh-save-config">💾 Yayın Ayarlarını Kaydet</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-action="gh-clear-config">🗑 Ayarları Temizle</button>' +
      '</div></div>';
  }

  var RENDERERS = {
    home: renderHome, about: renderAbout, events: renderEvents, news: renderNews,
    gallery: renderGallery, showcase: renderShowcase, contact: renderContact,
    footer: renderFooter, settings: renderSettings
  };

  function renderPanel(name) {
    currentPanel = name;
    var container = document.getElementById('panels-container');
    var fn = RENDERERS[name];
    container.innerHTML = fn ? '<div class="panel active">' + fn() + '</div>' : '<div class="panel active"><p>Bulunamadı.</p></div>';
    var titleEl = document.getElementById('panel-title');
    if (titleEl) titleEl.textContent = PANEL_TITLES[name] || name;
    document.querySelectorAll('.nav-item').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.panel === name);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Form collection (writes DOM values back into `content`)            */
  /* ---------------------------------------------------------------- */

  function collectCurrentPanel() {
    var container = document.getElementById('panels-container');
    if (!container || !content) return;
    var els = container.querySelectorAll('[data-path]');
    els.forEach(function (el) {
      var path = el.dataset.path;
      var value;
      if (el.type === 'checkbox') {
        value = el.checked;
      } else if (el.dataset.arraytype === 'lines') {
        value = el.value.split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
      } else {
        value = el.value;
      }
      setPath(content, path, value);
    });
  }

  /* ---------------------------------------------------------------- */
  /* List mutation actions                                               */
  /* ---------------------------------------------------------------- */

  function handlePanelClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;

    if (action === 'add-item') {
      collectCurrentPanel();
      var listPath = btn.dataset.list;
      var arr = getPath(content, listPath);
      if (!Array.isArray(arr)) { arr = []; setPath(content, listPath, arr); }
      arr.push(newItemTemplate(listPath));
      renderPanel(currentPanel);
      toast('Öğe eklendi. Kaydetmeyi unutmayın.');
    } else if (action === 'remove-item') {
      collectCurrentPanel();
      var listPath2 = btn.dataset.list;
      var idx2 = parseInt(btn.dataset.index, 10);
      var arr2 = getPath(content, listPath2);
      if (Array.isArray(arr2)) {
        if (!confirm('Bu öğeyi silmek istediğinizden emin misiniz?')) return;
        arr2.splice(idx2, 1);
      }
      renderPanel(currentPanel);
      toast('Öğe silindi. Kaydetmeyi unutmayın.');
    } else if (action === 'move-item') {
      collectCurrentPanel();
      var listPath3 = btn.dataset.list;
      var idx3 = parseInt(btn.dataset.index, 10);
      var dir = parseInt(btn.dataset.dir, 10);
      var arr3 = getPath(content, listPath3);
      var newIdx = idx3 + dir;
      if (Array.isArray(arr3) && newIdx >= 0 && newIdx < arr3.length) {
        var tmp = arr3[idx3];
        arr3[idx3] = arr3[newIdx];
        arr3[newIdx] = tmp;
      }
      renderPanel(currentPanel);
    } else if (action === 'gh-test') {
      var statusEl = document.getElementById('gh-config-status');
      var cfgTest = readGhFormConfig();
      statusEl.textContent = 'Bağlantı test ediliyor…';
      statusEl.style.color = '';
      store.testGitHubConnection(cfgTest).then(function (result) {
        statusEl.textContent = result.message;
        statusEl.style.color = result.ok ? '#22c55e' : '#ef4444';
      });
    } else if (action === 'gh-save-config') {
      var cfgSave = readGhFormConfig();
      if (!cfgSave.owner || !cfgSave.repo || !cfgSave.token) {
        toast('Kullanıcı adı, depo adı ve token zorunludur.', true);
        return;
      }
      store.savePublishConfig(cfgSave);
      toast('Yayın ayarları kaydedildi.');
    } else if (action === 'gh-clear-config') {
      if (!confirm('Yayın ayarlarını (token dahil) bu tarayıcıdan silmek istediğinizden emin misiniz?')) return;
      store.clearPublishConfig();
      renderPanel('settings');
      toast('Yayın ayarları temizlendi.');
    }
  }

  function readGhFormConfig() {
    return {
      owner: (document.getElementById('gh-owner') || {}).value || '',
      repo: (document.getElementById('gh-repo') || {}).value || '',
      branch: (document.getElementById('gh-branch') || {}).value || 'main',
      token: (document.getElementById('gh-token') || {}).value || ''
    };
  }

  /* ---------------------------------------------------------------- */
  /* Auth                                                                */
  /* ---------------------------------------------------------------- */

  function isLoggedIn() {
    return sessionStorage.getItem(AUTH_KEY) === '1';
  }

  function attemptLogin(username, password) {
    return username === CREDENTIALS.username && password === CREDENTIALS.password;
  }

  async function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    if (!content) {
      content = await store.loadContent();
    }
    if (!content) {
      toast('İçerik yüklenemedi. Lütfen sayfayı yenileyin.', true);
      return;
    }
    renderPanel('home');
  }

  function showLogin() {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
  }

  /* ---------------------------------------------------------------- */
  /* Init                                                                */
  /* ---------------------------------------------------------------- */

  function init() {
    var loginForm = document.getElementById('login-form');
    var loginError = document.getElementById('login-error');

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var u = document.getElementById('username').value.trim();
      var p = document.getElementById('password').value;
      if (attemptLogin(u, p)) {
        sessionStorage.setItem(AUTH_KEY, '1');
        loginError.classList.remove('visible');
        loginForm.reset();
        showDashboard();
      } else {
        loginError.classList.add('visible');
      }
    });

    document.getElementById('logout-btn').addEventListener('click', function () {
      sessionStorage.removeItem(AUTH_KEY);
      showLogin();
    });

    document.querySelectorAll('.nav-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        collectCurrentPanel();
        renderPanel(btn.dataset.panel);
        var sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
      });
    });

    var sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('open');
      });
    }

    document.getElementById('save-btn').addEventListener('click', async function () {
      collectCurrentPanel();
      content = store.saveContent(content);

      var saveBtn = document.getElementById('save-btn');
      var cfg = store.getPublishConfig();

      if (!cfg || !cfg.owner || !cfg.repo || !cfg.token) {
        toast('Yerel olarak kaydedildi. Canlı siteye yayınlamak için Ayarlar > Yayınlama Ayarları\'nı yapılandırın.', true);
        return;
      }

      var originalLabel = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '⏳ Yayınlanıyor…';
      try {
        await store.publishToGitHub(content);
        toast('✅ Yayınlandı! Site birkaç dakika içinde güncellenecek.');
      } catch (err) {
        toast('Yerel olarak kaydedildi ama yayınlama başarısız oldu: ' + err.message, true);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalLabel;
      }
    });

    document.getElementById('export-btn').addEventListener('click', function () {
      collectCurrentPanel();
      store.exportContent(content);
      toast('site-content.json indirildi. Bunu data/site-content.json konumuna koyup yeniden yayınlayın.');
    });

    document.getElementById('import-btn').addEventListener('click', function () {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      store.importContent(file).then(function (data) {
        content = data;
        renderPanel(currentPanel);
        toast('İçerik içe aktarıldı.');
      }).catch(function () {
        toast('Dosya okunamadı. Geçerli bir JSON dosyası seçin.', true);
      });
      e.target.value = '';
    });

    document.getElementById('preview-btn').addEventListener('click', function () {
      window.open('../index.html', '_blank');
    });

    document.getElementById('panels-container').addEventListener('click', handlePanelClick);

    if (isLoggedIn()) {
      showDashboard();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
