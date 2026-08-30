(function () {
  "use strict";

  var searchForm = document.getElementById("search-form");
  var searchInput = document.getElementById("search-input");
  var searchStatus = document.getElementById("search-status");
  var searchResults = document.getElementById("search-results");

  var docs = null;
  var indexPromise = null;

  function loadIndex() {
    if (indexPromise) return indexPromise;
    indexPromise = fetch("/search-index.json")
      .then(function (response) {
        if (!response.ok) throw new Error("index " + response.status);
        return response.json();
      })
      .then(function (data) {
        docs = data;
        searchStatus.textContent = "已索引 " + docs.length + " 篇文章";
        return docs;
      })
      .catch(function () {
        indexPromise = null;
        searchStatus.textContent = "搜索索引加载失败，请刷新重试。";
        throw new Error("failed to load search index");
      });
    return indexPromise;
  }

  // CJK 查询按双字切分，拉丁词按字母数字切分，兼顾中文短语与英文术语。
  function tokenize(query) {
    var terms = [];
    var latin = query.match(/[A-Za-z0-9_+#.-]{2,}/g) || [];
    latin.forEach(function (word) { terms.push(word.toLowerCase()); });
    var cjk = query.match(/[\u4e00-\u9fff]/g) || [];
    if (cjk.length === 1) {
      terms.push(cjk[0]);
    } else if (cjk.length >= 2) {
      for (var i = 0; i < cjk.length - 1; i++) terms.push(cjk[i] + cjk[i + 1]);
    }
    var seen = {};
    return terms.filter(function (term) {
      if (seen[term]) return false;
      seen[term] = true;
      return true;
    });
  }

  function countHits(haystack, term) {
    if (!haystack) return 0;
    var count = 0;
    var position = 0;
    haystack = haystack.toLowerCase();
    while ((position = haystack.indexOf(term, position)) !== -1) {
      count++;
      position += term.length;
    }
    return count;
  }

  function searchDocs(query) {
    var terms = tokenize(query);
    if (!terms.length) return [];
    var results = [];

    docs.forEach(function (doc) {
      var title = doc.title.toLowerCase();
      var tagText = (doc.tags || []).join(" ").toLowerCase() + " " + (doc.categories || []).join(" ").toLowerCase();
      var excerpt = (doc.excerpt || "").toLowerCase();
      var text = doc.text.toLowerCase();

      var score = 0;
      var matchedAll = true;
      var firstAt = -1;

      for (var i = 0; i < terms.length; i++) {
        var term = terms[i];
        var titleHits = countHits(title, term);
        var tagHits = countHits(tagText, term);
        var excerptHits = countHits(excerpt, term);
        var textHits = countHits(text, term);
        var total = titleHits + tagHits + excerptHits + textHits;
        if (!total) { matchedAll = false; break; }

        score += Math.min(titleHits, 3) * 50 + Math.min(tagHits, 3) * 20 +
          Math.min(excerptHits, 2) * 8 + Math.min(textHits, 12);
        if (firstAt === -1 && textHits) firstAt = text.indexOf(term);
      }

      if (!matchedAll) return;
      // 越新的文章略微加权，避免同分时旧文章一直排前面。
      score += Math.max(0, (new Date(doc.date).getTime() || 0) / 3.15e12);
      results.push({ doc: doc, score: score, firstAt: firstAt });
    });

    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, 12);
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function makeSnippet(doc, firstAt) {
    if (!doc.text) return "";
    var size = 90;
    var start = Math.max(0, (firstAt || 0) - 30);
    var snippet = doc.text.slice(start, start + size * 2);
    return (start > 0 ? "……" : "") + snippet + (start + size * 2 < doc.text.length ? "……" : "");
  }

  function highlight(text, terms) {
    var safe = escapeHtml(text);
    terms.forEach(function (term) {
      if (!term) return;
      var pattern = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      safe = safe.replace(new RegExp("(" + pattern + ")", "gi"), "<mark>$1</mark>");
    });
    return safe;
  }

  function renderResults(query, results, terms) {
    searchResults.innerHTML = "";
    if (!results.length) {
      searchResults.innerHTML = '<p class="search-empty">没有找到与“' + escapeHtml(query) +
        '”相关的文章。试试更短的关键词。</p>';
      return;
    }
    results.forEach(function (result) {
      var doc = result.doc;
      var card = document.createElement("article");
      card.className = "search-result";
      var meta = [doc.date].concat(doc.categories || [], doc.tags || []).filter(Boolean).slice(0, 5).join(" · ");
      card.innerHTML =
        '<h2><a href="' + doc.url + '">' + highlight(doc.title, terms) + "</a></h2>" +
        '<p class="search-result-meta">' + escapeHtml(meta) + "</p>" +
        '<p class="search-result-snippet">' + highlight(makeSnippet(doc, result.firstAt), terms) + "</p>";
      searchResults.appendChild(card);
    });
  }

  function runSearch(query) {
    searchStatus.textContent = "搜索中……";
    loadIndex().then(function () {
      var terms = tokenize(query);
      var results = searchDocs(query);
      searchStatus.textContent = "找到 " + results.length + " 篇相关文章";
      renderResults(query, results, terms);
    }).catch(function () {});
  }

  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var query = searchInput.value.trim();
    if (!query) return;
    runSearch(query);
  });

  searchInput.addEventListener("focus", loadIndex);

  // 支持 /search/?q=xxx 直达搜索。
  var initial = new URLSearchParams(window.location.search).get("q");
  if (initial) {
    searchInput.value = initial;
    runSearch(initial);
  }
})();
