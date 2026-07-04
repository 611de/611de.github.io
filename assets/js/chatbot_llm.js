(function() {
  "use strict";

  function initArticleAssistant() {
    var toggle = document.getElementById("article-assistant-toggle");
    var panel = document.getElementById("article-assistant");
    var closeButton = document.getElementById("article-assistant-close");
    var messages = document.getElementById("article-assistant-messages");
    var form = document.getElementById("article-assistant-form");
    var input = document.getElementById("article-assistant-input");
    var content = document.querySelector(".post-content");
    var apiKeyMeta = document.querySelector('meta[name="unsecurity"]');
    var apiKey = apiKeyMeta ? apiKeyMeta.content : "";
    var model = "qwen-turbo";
    var conversation = [];
    var dragState = null;
    var suppressClick = false;

    if (!toggle || !panel || !content) return;

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function setTogglePosition(left, top) {
      var maxLeft = Math.max(8, window.innerWidth - toggle.offsetWidth - 8);
      var maxTop = Math.max(8, window.innerHeight - toggle.offsetHeight - 8);
      toggle.style.left = clamp(left, 8, maxLeft) + "px";
      toggle.style.top = clamp(top, 8, maxTop) + "px";
      toggle.style.right = "auto";
      toggle.style.bottom = "auto";
    }

    function positionPanel() {
      if (panel.hidden) return;

      var buttonRect = toggle.getBoundingClientRect();
      var panelRect = panel.getBoundingClientRect();
      var gap = 12;
      var left = buttonRect.left - panelRect.width - gap;

      if (left < 12) left = buttonRect.right + gap;
      left = clamp(left, 12, window.innerWidth - panelRect.width - 12);

      var top = buttonRect.top + buttonRect.height / 2 - panelRect.height / 2;
      top = clamp(top, 12, window.innerHeight - panelRect.height - 12);

      panel.style.left = left + "px";
      panel.style.top = top + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.style.transform = "none";
    }

    try {
      var savedPosition = JSON.parse(localStorage.getItem("articleAssistantPosition"));
      if (savedPosition) setTogglePosition(savedPosition.left, savedPosition.top);
    } catch (_) {
      // Ignore invalid or unavailable local storage.
    }

    function openAssistant() {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      window.setTimeout(function() {
        positionPanel();
        input.focus();
      }, 0);
    }

    function closeAssistant() {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }

    function addTextMessage(text, type) {
      var message = document.createElement("div");
      message.className = "assistant-message assistant-message-" + (type || "system");
      message.textContent = text;
      messages.appendChild(message);
      messages.scrollTop = messages.scrollHeight;
      return message;
    }

    function addLinkList(title, items) {
      var box = document.createElement("div");
      var heading = document.createElement("strong");
      var list = document.createElement("ol");

      box.className = "assistant-message assistant-message-system assistant-result";
      heading.textContent = title;
      box.appendChild(heading);
      list.className = "assistant-result-list";

      items.forEach(function(item) {
        var listItem = document.createElement("li");
        var link = document.createElement("a");
        link.href = item.href;
        link.textContent = item.label;
        link.addEventListener("click", closeAssistant);
        listItem.appendChild(link);

        if (item.description) {
          var description = document.createElement("span");
          description.textContent = item.description;
          listItem.appendChild(description);
        }

        list.appendChild(listItem);
      });

      box.appendChild(list);
      messages.appendChild(box);
      messages.scrollTop = messages.scrollHeight;
    }

    function ensureAnchor(element, index) {
      if (!element.id) element.id = "article-section-" + index;
      return "#" + element.id;
    }

    function showSummary() {
      var title = document.querySelector(".post-title");
      var paragraphs = Array.prototype.slice.call(content.querySelectorAll("p"))
        .map(function(node) { return node.textContent.trim(); })
        .filter(function(text) { return text.length >= 30; })
        .slice(0, 3);
      var summary = paragraphs.join(" ").slice(0, 360);

      addTextMessage("内容概览", "user");
      addTextMessage(
        (title ? "《" + title.textContent.trim() + "》：" : "") +
        (summary || "这篇文章暂时没有可提取的正文概览。") +
        (summary.length >= 360 ? "……" : "")
      );
    }

    function showOutline() {
      var headings = Array.prototype.slice.call(content.querySelectorAll("h2, h3"));
      addTextMessage("本文目录", "user");

      if (!headings.length) {
        addTextMessage("这篇文章暂时没有分节标题。");
        return;
      }

      addLinkList("跳转到章节", headings.map(function(heading, index) {
        return {
          href: ensureAnchor(heading, index),
          label: heading.textContent.trim()
        };
      }));
    }

    function showRelated() {
      var links = Array.prototype.slice.call(document.querySelectorAll(".post-related .post-link")).slice(0, 4);
      addTextMessage("相关文章", "user");

      if (!links.length) {
        addTextMessage("暂时没有找到相关文章。");
        return;
      }

      addLinkList("继续阅读", links.map(function(link) {
        return { href: link.href, label: link.textContent.trim() };
      }));
    }

    function searchArticle(query, showQuery) {
      var normalized = query.toLocaleLowerCase();
      var candidates = Array.prototype.slice.call(content.querySelectorAll("h2, h3, p, li"));
      var matches = [];

      candidates.forEach(function(node, index) {
        var text = node.textContent.replace(/\s+/g, " ").trim();
        if (text.length < 8 || text.toLocaleLowerCase().indexOf(normalized) === -1) return;

        var section = node.matches("h2, h3") ? node : node.previousElementSibling;
        while (section && !section.matches("h2, h3")) section = section.previousElementSibling;
        var anchor = section || node;

        if (matches.some(function(match) { return match.label === text; })) return;
        matches.push({
          href: ensureAnchor(anchor, index),
          label: text.slice(0, 72) + (text.length > 72 ? "……" : ""),
          description: section && section !== node ? "位于「" + section.textContent.trim() + "」" : ""
        });
      });

      if (showQuery !== false) addTextMessage(query, "user");
      if (!matches.length) {
        addTextMessage("正文中没有找到“" + query + "”。可以换一个更短或更具体的关键词。");
        return;
      }

      addLinkList("找到 " + Math.min(matches.length, 5) + " 处相关内容", matches.slice(0, 5));
    }

    async function askAI(question) {
      var articleTitle = document.querySelector(".post-title");
      var articleContent = content.textContent.replace(/\s+/g, " ").trim().slice(0, 12000);
      var loading = addTextMessage("正在结合文章内容思考……");

      conversation.push({ role: "user", content: question });
      conversation = conversation.slice(-6);

      try {
        var response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + apiKey
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 800,
            messages: [{
              role: "system",
              content: "你是博客文章阅读助手。请优先根据以下文章回答，内容不足时明确说明，不要编造。回答保持简洁。\n\n文章标题：" +
                (articleTitle ? articleTitle.textContent.trim() : "") + "\n\n文章内容：\n" + articleContent
            }].concat(conversation)
          })
        });

        if (!response.ok) throw new Error("API request failed: " + response.status);

        var data = await response.json();
        var answer = data.choices && data.choices[0] && data.choices[0].message
          ? data.choices[0].message.content
          : "没有收到有效回答。";

        loading.remove();
        addTextMessage(answer);
        conversation.push({ role: "assistant", content: answer });
        conversation = conversation.slice(-6);
      } catch (error) {
        loading.remove();
        console.error("文章助手请求失败:", error);
        addTextMessage("AI 服务暂时不可用，已改为搜索正文中的相关内容。");
        searchArticle(question, false);
      }
    }

    toggle.addEventListener("pointerdown", function(event) {
      if (event.button !== undefined && event.button !== 0) return;
      var rect = toggle.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        moved: false
      };
      toggle.setPointerCapture(event.pointerId);
      toggle.classList.add("is-dragging");
    });

    toggle.addEventListener("pointermove", function(event) {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      var deltaX = event.clientX - dragState.startX;
      var deltaY = event.clientY - dragState.startY;

      if (Math.abs(deltaX) + Math.abs(deltaY) > 5) dragState.moved = true;
      if (!dragState.moved) return;

      event.preventDefault();
      setTogglePosition(dragState.left + deltaX, dragState.top + deltaY);
      positionPanel();
    });

    toggle.addEventListener("pointerup", function(event) {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      suppressClick = dragState.moved;
      toggle.classList.remove("is-dragging");

      if (dragState.moved) {
        var rect = toggle.getBoundingClientRect();
        try {
          localStorage.setItem("articleAssistantPosition", JSON.stringify({ left: rect.left, top: rect.top }));
        } catch (_) {
          // Position persistence is optional.
        }
      }

      dragState = null;
    });

    toggle.addEventListener("click", function() {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      if (panel.hidden) openAssistant();
      else closeAssistant();
    });
    closeButton.addEventListener("click", closeAssistant);

    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape" && !panel.hidden) closeAssistant();
    });

    document.querySelectorAll("[data-assistant-action]").forEach(function(button) {
      button.addEventListener("click", function() {
        var action = button.getAttribute("data-assistant-action");
        if (action === "summary") showSummary();
        if (action === "outline") showOutline();
        if (action === "related") showRelated();
      });
    });

    form.addEventListener("submit", async function(event) {
      event.preventDefault();
      var query = input.value.trim();
      if (!query) return;
      input.value = "";
      addTextMessage(query, "user");

      if (apiKey && apiKey !== "YOUR_API_KEY") {
        await askAI(query);
      } else {
        addTextMessage("尚未配置 AI 服务，已搜索正文中的相关内容。");
        searchArticle(query, false);
      }
    });

    window.addEventListener("resize", function() {
      var rect = toggle.getBoundingClientRect();
      setTogglePosition(rect.left, rect.top);
      positionPanel();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initArticleAssistant);
  } else {
    initArticleAssistant();
  }
})();
