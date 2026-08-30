(function () {
  "use strict";

  var TYPE_LABELS = {
    thinking: { label: "思考", icon: "fa-lightbulb-o" },
    tool: { label: "工具", icon: "fa-wrench" },
    final: { label: "回复", icon: "fa-check-circle-o" }
  };

  function initTrace(root) {
    var dataNode = root.querySelector(".agent-trace-data");
    var stepsNode = root.querySelector("[data-trace-steps]");
    var progressNode = root.querySelector("[data-trace-progress]");
    if (!dataNode || !stepsNode) return;

    var trace;
    try {
      trace = JSON.parse(dataNode.textContent);
    } catch (error) {
      console.error("agent-trace: invalid JSON", error);
      return;
    }

    var steps = trace.steps || [];
    var visible = 0;
    var timer = null;

    function stopTimer() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function metaFor(step) {
      var meta = TYPE_LABELS[step.type] || TYPE_LABELS.tool;
      var name = meta.label;
      if (step.type === "tool" && step.tool) name = step.tool;
      return { label: name, icon: meta.icon };
    }

    function formatInput(step) {
      return typeof step.input === "string" ? step.input : JSON.stringify(step.input, null, 2);
    }

    function buildStep(step, index) {
      var item = document.createElement("li");
      item.className = "trace-step trace-step-" + step.type;
      item.setAttribute("data-trace-index", index);

      var meta = metaFor(step);
      var header = document.createElement("div");
      header.className = "trace-step-header";
      header.innerHTML =
        '<span class="trace-step-badge"><i class="fa ' + meta.icon + '" aria-hidden="true"></i> ' +
        meta.label + "</span>" +
        '<span class="trace-step-title"></span>' +
        (step.duration ? '<span class="trace-step-duration">' + step.duration + "</span>" : "");
      header.querySelector(".trace-step-title").textContent = step.title || "";
      item.appendChild(header);

      var inputText = formatInput(step);
      if (inputText) {
        var inputBox = document.createElement("pre");
        inputBox.className = "trace-step-io trace-step-input";
        inputBox.textContent = inputText;
        item.appendChild(inputBox);
      }

      if (step.type !== "thinking" && typeof step.output === "string" && step.output.length) {
        var outputBox = document.createElement("pre");
        outputBox.className = "trace-step-io trace-step-output";
        outputBox.textContent = step.output;
        item.appendChild(outputBox);
      }

      if (step.text) {
        var textNode = document.createElement("p");
        textNode.className = "trace-step-text";
        textNode.textContent = step.text;
        item.appendChild(textNode);
      }

      return item;
    }

    function updateProgress() {
      if (!progressNode) return;
      var ratio = steps.length ? visible / steps.length : 0;
      progressNode.style.width = (ratio * 100).toFixed(1) + "%";
    }

    function render() {
      var current = visible;
      stepsNode.innerHTML = "";
      for (var i = 0; i < current; i++) {
        var item = buildStep(steps[i], i);
        if (i === current - 1 && current < steps.length) item.classList.add("is-current");
        if (i === current - 1 && current === steps.length) item.classList.add("is-last");
        stepsNode.appendChild(item);
      }
      updateProgress();

      var playButton = root.querySelector('[data-trace-action="play"]');
      if (playButton) playButton.disabled = current >= steps.length;
      var stepButton = root.querySelector('[data-trace-action="step"]');
      if (stepButton) stepButton.disabled = current >= steps.length;

      if (current > 0 && current < steps.length) {
        var lastItem = stepsNode.lastElementChild;
        if (lastItem) lastItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    function advance() {
      if (visible >= steps.length) {
        stopTimer();
        return;
      }
      visible++;
      render();
    }

    function play() {
      if (timer) return;
      if (visible >= steps.length) visible = 0;
      render();
      timer = window.setInterval(function () {
        if (visible >= steps.length) {
          stopTimer();
          return;
        }
        advance();
        if (visible >= steps.length) stopTimer();
      }, 650);
    }

    function reset() {
      stopTimer();
      visible = 0;
      render();
    }

    root.querySelectorAll("[data-trace-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        var action = button.getAttribute("data-trace-action");
        if (action === "play") play();
        if (action === "step") { stopTimer(); advance(); }
        if (action === "reset") reset();
      });
    });

    // 键盘可用性：聚焦组件时可以用空格播放、方向键单步。
    root.setAttribute("tabindex", "0");
    root.addEventListener("keydown", function (event) {
      if (event.target !== root) return;
      if (event.key === " ") {
        event.preventDefault();
        play();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        stopTimer();
        advance();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        stopTimer();
        visible = Math.max(0, visible - 1);
        render();
      }
    });

    render();
    // 初始就展示第一步，避免组件刚加载时看起来是空的。
    if (steps.length) advance();
  }

  function initAll() {
    document.querySelectorAll("[data-agent-trace]").forEach(initTrace);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
