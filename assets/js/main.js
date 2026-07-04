// Fix DOM matches function
if (!Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.matchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    Element.prototype.oMatchesSelector ||
    Element.prototype.webkitMatchesSelector ||
    function(s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s),
        i = matches.length;
      while (--i >= 0 && matches.item(i) !== this) {}
      return i > -1;
    };
}

// Get Scroll position
function getScrollPos() {
  var supportPageOffset = window.pageXOffset !== undefined;
  var isCSS1Compat = ((document.compatMode || "") === "CSS1Compat");

  var x = supportPageOffset ? window.pageXOffset : isCSS1Compat ? document.documentElement.scrollLeft : document.body.scrollLeft;
  var y = supportPageOffset ? window.pageYOffset : isCSS1Compat ? document.documentElement.scrollTop : document.body.scrollTop;

  return { x: x, y: y };
}

var _scrollTimer = [];

// Smooth scroll
function smoothScrollTo(y, time) {
  time = time == undefined ? 500 : time;

  var scrollPos = getScrollPos();
  var count = 60;
  var length = (y - scrollPos.y);

  function easeInOut(k) {
    return .5 * (Math.sin((k - .5) * Math.PI) + 1);
  }

  for (var i = _scrollTimer.length - 1; i >= 0; i--) {
    clearTimeout(_scrollTimer[i]);
  }

  for (var i = 0; i <= count; i++) {
    (function() {
      var cur = i;
      _scrollTimer[cur] = setTimeout(function() {
        window.scrollTo(
          scrollPos.x,
          scrollPos.y + length * easeInOut(cur/count)
        );
      }, (time / count) * cur);
    })();
  }
}

// Add an accessible copy action to fenced code blocks.
document.addEventListener("DOMContentLoaded", function() {
  var blocks = document.querySelectorAll(".post-content pre");

  blocks.forEach(function(block) {
    if (block.querySelector(".code-copy-button")) return;

    var button = document.createElement("button");
    button.className = "code-copy-button";
    button.type = "button";
    button.textContent = "复制";
    button.setAttribute("aria-label", "复制代码");

    var code = block.querySelector("code");
    if (code) {
      var languageClass = Array.prototype.find.call(code.classList, function(name) {
        return name.indexOf("language-") === 0;
      });

      if (languageClass) {
        var label = document.createElement("span");
        label.className = "code-language";
        label.textContent = languageClass.replace("language-", "").toUpperCase();
        block.appendChild(label);
      }
    }

    button.addEventListener("click", function() {
      var value = code ? code.innerText : block.innerText;

      navigator.clipboard.writeText(value).then(function() {
        button.textContent = "已复制";
        window.setTimeout(function() { button.textContent = "复制"; }, 1600);
      });
    });

    block.appendChild(button);
  });
});
