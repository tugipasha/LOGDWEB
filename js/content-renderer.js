/**
 * LOGD Content Renderer — injects dynamic content into public pages.
 */
(function () {
  'use strict';

  var store = window.LOGDContentStore;
  if (!store) return;

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el && value) el.textContent = value;
  }

  function setHtml(id, value) {
    var el = document.getElementById(id);
    if (el && value) el.innerHTML = value;
  }

  function formatDate(dateStr, lang) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var options = { year: 'numeric', month: 'long', day: 'numeric' };
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'tr-TR', options);
  }

  function renderSponsors(container, sponsors, t) {
    if (!container || !sponsors) return;
    container.innerHTML = sponsors.items.map(function (s) {
      var cls = s.stacked ? 'sponsor-item pubg-stacked' : 'sponsor-item';
      var imgs = s.logos.map(function (logo) {
        return '<img src="' + logo + '" alt="' + s.name + '" loading="lazy" decoding="async">';
      }).join('');
      return '<div class="' + cls + '">' + imgs + '</div>';
    }).join('');
    var titleEl = document.getElementById('sponsors-title');
    if (titleEl) titleEl.textContent = t(sponsors.title);
  }

  function renderCommunities(container, data, t) {
    if (!container || !data) return;
    setText('communities-title', t(data.title));
    setText('communities-description', t(data.description));
    container.innerHTML = data.items.map(function (c) {
      return '<a href="' + c.url + '" target="_blank" rel="noopener" class="community-item">' +
        '<div class="community-logo-container"><img src="' + c.logo + '" alt="' + c.name + '" class="community-logo" loading="lazy" decoding="async"></div>' +
        '<span class="community-name">' + c.name + '</span></a>';
    }).join('');
  }

  function renderMarquee(track, data) {
    if (!track || !data || !data.images) return;
    setText('gallery-marquee-title', store.t(data.title));
    var imgs = data.images.map(function (img) {
      return '<img src="' + img.src + '" alt="' + img.alt + '" loading="lazy" decoding="async">';
    }).join('');
    track.innerHTML = imgs + imgs;
    setText('view-all-gallery', store.t(data.buttonText));
  }

  function renderEventsGrid(grid, items, t) {
    if (!grid || !items) return;
    grid.innerHTML = items.map(function (ev, i) {
      return '<div class="event-card">' +
        '<div class="event-image-container">' +
        '<img src="' + ev.image + '" alt="' + t(ev.title) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';" loading="lazy" decoding="async">' +
        '<div class="event-image-placeholder" style="display:none;">' + (ev.emoji || '🎮') + '</div></div>' +
        '<div class="event-content"><h3>' + t(ev.title) + '</h3><p>' + t(ev.description) + '</p></div></div>';
    }).join('');
  }

  function renderNews(container, items, t, lang) {
    if (!container || !items || !items.length) return;
    var featured = items.find(function (n) { return n.featured; }) || items[0];
    container.innerHTML = items.map(function (article) {
      var features = (article.features[lang] || article.features.tr || []).map(function (f) {
        return '<li style="margin-bottom:0.5rem;">' + f + '</li>';
      }).join('');
      var paragraphs = (article.paragraphs[lang] || article.paragraphs.tr || []).map(function (p) {
        return '<p>' + p + '</p>';
      }).join('');
      var dateStr = formatDate(article.date, lang);
      var author = t(article.author);
      return '<div class="event-detail-content' + (article.featured ? ' news-featured' : '') + '" style="margin-bottom:3rem;">' +
        '<span class="news-badge">' + t(article.tag) + '</span>' +
        '<h2 class="news-featured-title">' + t(article.title) + '</h2>' +
        '<div class="news-meta">📅 ' + dateStr + ' • ✍️ ' + author + '</div>' +
        '<div class="news-text">' + paragraphs +
        '<h4 style="margin:1.5rem 0 1rem;">' + t(article.featuresTitle) + '</h4>' +
        '<ul style="list-style:none;padding:0;">' + features + '</ul></div>' +
        (article.buttonLink ? '<div style="margin-top:2rem;"><a href="' + article.buttonLink + '" class="btn-primary">' + t(article.buttonText) + '</a></div>' : '') +
        '</div>';
    }).join('');
  }

  function renderGallery(container, categories, t) {
    if (!container || !categories) return;
    container.innerHTML = categories.map(function (cat) {
      var imgs = cat.images.map(function (img) {
        var cls = img.large ? 'gallery-item large' : 'gallery-item';
        return '<div class="' + cls + '"><img src="' + img.src + '" alt="' + img.alt + '" loading="lazy" decoding="async"></div>';
      }).join('');
      return '<div class="gallery-category-section"><h2 class="gallery-category-title">' + t(cat.title) + '</h2><div class="gallery-grid">' + imgs + '</div></div>';
    }).join('');
  }

  function renderShowcase(container, data, t) {
    if (!container || !data) return;
    var html = '';
    if (data.games && data.games.length) {
      html += data.games.map(function (game) {
        return '<div class="showcase-card"><div class="card-visual">' +
          (game.image ? '<img src="' + game.image + '" alt="' + t(game.title) + '">' : '<span class="emoji">🎮</span>') +
          '</div><div class="card-content"><h2>' + t(game.title) + '</h2><p>' + t(game.description) + '</p>' +
          (game.link ? '<a href="' + game.link + '" target="_blank" rel="noopener" class="btn-outline">' + t(game.buttonText || { tr: 'Oyna', en: 'Play' }) + '</a>' : '') +
          '</div></div>';
      }).join('');
    }
    html += '<div class="showcase-card"><div class="card-visual"><span class="emoji">🎮</span></div>' +
      '<div class="card-content"><h2 id="showcase-coming-soon-title">' + t(data.comingSoon.title) + '</h2>' +
      '<p id="showcase-coming-soon-text">' + t(data.comingSoon.text) + '</p>' +
      '<a href="iletisim.html" class="btn-outline" id="showcase-add-game-btn">' + t(data.comingSoon.buttonText) + '</a></div></div>';
    html += '<div class="showcase-card"><div class="card-visual"><span class="emoji">🚀</span></div>' +
      '<div class="card-content"><h2 id="showcase-your-project-title">' + t(data.apply.title) + '</h2>' +
      '<p id="showcase-your-project-text">' + t(data.apply.text) + '</p>' +
      '<a href="iletisim.html" class="btn-outline" id="showcase-apply-btn">' + t(data.apply.buttonText) + '</a></div></div>';
    container.innerHTML = html;
  }

  function renderFooter(data, t) {
    if (!data) return;
    setText('footer-about-title', t(data.aboutTitle));
    setText('footer-text', t(data.text));
    setText('footer-copyright', t(data.copyright));
    var ig = document.getElementById('social-instagram');
    var li = document.getElementById('social-linkedin');
    if (ig && data.instagram) ig.href = data.instagram;
    if (li && data.linkedin) li.href = data.linkedin;
  }

  function renderContact(data, t) {
    if (!data) return;
    setText('contact-title', t(data.pageTitle));
    setText('contact-subtitle', t(data.pageSubtitle));
    setText('general-contact', t(data.generalTitle));
    setText('general-contact-text', t(data.generalText));
    setText('partnership-contact', t(data.partnershipTitle));
    setText('partnership-contact-text', t(data.partnershipText));
    setText('contact-form-title', t(data.formTitle));
    var emailEl = document.getElementById('contact-email');
    var partnerEmail = document.getElementById('partnership-email');
    if (emailEl) { emailEl.href = 'mailto:' + data.email; emailEl.textContent = data.email; }
    if (partnerEmail) { partnerEmail.href = 'mailto:' + data.email; partnerEmail.textContent = data.email; }
    var form = document.getElementById('contact-form');
    if (form) form.action = 'https://formsubmit.co/' + data.email;
  }

  function detectPage() {
    var path = window.location.pathname;
    if (path.endsWith('index.html') || path.endsWith('/') || path.match(/\/[^/]+$/)) {
      if (path.includes('index') || path.endsWith('/') || !path.includes('.html')) {
        if (!path.includes('galeri') && !path.includes('hakkimizda') && !path.includes('etkinlikler') &&
            !path.includes('showcase') && !path.includes('haberler') && !path.includes('iletisim') &&
            !path.includes('admin')) return 'home';
      }
    }
    if (path.includes('galeri')) return 'gallery';
    if (path.includes('hakkimizda')) return 'about';
    if (path.includes('etkinlikler')) return 'events';
    if (path.includes('showcase')) return 'showcase';
    if (path.includes('haberler')) return 'news';
    if (path.includes('iletisim')) return 'contact';
    return 'home';
  }

  async function render() {
    var content = await store.loadContent();
    if (!content) return;

    var lang = store.getLang();
    var t = store.t;
    var page = detectPage();

    renderFooter(content.footer, t);

    if (page === 'home' && content.home) {
      var h = content.home;
      setText('main-title', t(h.hero.title));
      setText('subtitle', t(h.hero.subtitle));
      setText('cta-primary', t(h.hero.ctaPrimary));
      setText('cta-secondary', t(h.hero.ctaSecondary));
      setText('about-title', t(h.about.title));
      var aboutText = document.querySelector('.about-text');
      if (aboutText) aboutText.textContent = t(h.about.text);
      renderMarquee(document.querySelector('.gallery-marquee-track'), h.galleryMarquee);
      renderCommunities(document.querySelector('.communities-grid'), h.communities, t);
      renderSponsors(document.querySelector('.sponsors-grid'), h.sponsors, t);
    }

    if (page === 'about' && content.about) {
      var a = content.about;
      setText('about-page-title', t(a.pageTitle));
      setText('about-page-subtitle', t(a.pageSubtitle));
      setText('story-title', t(a.story.title));
      setText('story-text', t(a.story.text));
      setText('vision-label', t(a.vision.label));
      setText('vision-text', t(a.vision.text));
      setText('mission-label', t(a.mission.label));
      setText('mission-text', t(a.mission.text));
      setText('sponsorship-title', t(a.sponsorship.title));
      setText('sponsorship-text', t(a.sponsorship.text));
      setText('academic-structures-title', t(a.academic.title));
      setText('academic-structures-text', t(a.academic.text));
      renderSponsors(document.querySelector('.sponsors-grid'), content.home.sponsors, t);
    }

    if (page === 'events' && content.events) {
      setText('events-title', t(content.events.pageTitle));
      setText('events-subtitle', t(content.events.pageSubtitle));
      renderEventsGrid(document.querySelector('.events-grid'), content.events.items, t);
    }

    if (page === 'news' && content.news) {
      setText('news-title', t(content.news.pageTitle));
      setText('news-subtitle', t(content.news.pageSubtitle));
      var newsSection = document.querySelector('#news .content-section');
      if (newsSection) renderNews(newsSection, content.news.items, t, lang);
    }

    if (page === 'gallery' && content.gallery) {
      setText('gallery-page-title', t(content.gallery.pageTitle));
      setText('gallery-page-subtitle', t(content.gallery.pageSubtitle));
      renderGallery(document.querySelector('.gallery-container'), content.gallery.categories, t);
    }

    if (page === 'showcase' && content.showcase) {
      setText('showcase-title', t(content.showcase.pageTitle));
      setText('showcase-subtitle', t(content.showcase.pageSubtitle));
      renderShowcase(document.querySelector('.showcase-container'), content.showcase, t);
    }

    if (page === 'contact' && content.contact) {
      renderContact(content.contact, t);
    }
  }

  document.addEventListener('DOMContentLoaded', render);

  window.addEventListener('storage', function (e) {
    if (e.key === store.STORAGE_KEY) render();
  });
})();
