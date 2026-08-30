/**
 * 为每篇 _posts 文章生成 1200x630 的 OG 分享图，输出到 assets/og/<文件名>.png。
 *
 * 使用：
 *   npm install          # 在 tools/ 目录下
 *   node generate-og.mjs
 *
 * 产物由 _includes/head.html 通过固定 URL 约定引用：
 *   /assets/og/<文章文件名去掉扩展名>.png
 */

import fs from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const POSTS_DIR = path.join(ROOT, "_posts");
const OUT_DIR = path.join(ROOT, "assets", "og");
const FONT_CACHE = path.join(ROOT, ".og-font-cache");

const SITE_TITLE = "Liu Yiyi's Blog";
const SITE_KICKER = "AI AGENT · LLM 工具链 · 开发效率";
const WIDTH = 1200;
const HEIGHT = 630;

// Noto Sans SC Bold (SubsetOTF)，satori 与 resvg 都接受 OTF。
const FONT_URL =
  "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/SubsetOTF/SC/NotoSansSC-Bold.otf";

async function loadFont() {
  await fs.mkdir(FONT_CACHE, { recursive: true });
  const cached = path.join(FONT_CACHE, "NotoSansSC-Bold.otf");
  try {
    return await fs.readFile(cached);
  } catch {
    console.log("下载字体 …");
    const response = await fetch(FONT_URL);
    if (!response.ok) throw new Error(`字体下载失败: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(cached, buffer);
    return buffer;
  }
}

function parseFrontMatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  const meta = { title: "无标题", tags: [], date: "" };
  if (!match) return meta;

  const title = match[1].match(/^title:\s*(.+)$/m);
  if (title) {
    meta.title = title[1].replace(/^["']|["']$/g, "").trim();
  }
  const date = match[1].match(/^updated:\s*(\d{4}-\d{2}-\d{2})/m);
  if (date) meta.date = date[1];

  const inlineTags = match[1].match(/^tags:\s*\[(.+)\]$/m);
  if (inlineTags) {
    meta.tags = inlineTags[1].split(",").map((t) => t.trim().replace(/^["']|["']$/g, ""));
  } else {
    const tags = match[1].match(/^tags:\n((?:\s*-\s*.+\n?)+)/m);
    if (tags) {
      meta.tags = tags[1]
        .split("\n")
        .map((line) => line.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean);
    }
  }
  return meta;
}

function cardFor(meta) {
  const titleSize = meta.title.length > 40 ? 46 : meta.title.length > 22 ? 58 : 68;
  const tags = meta.tags.slice(0, 4);
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        padding: "64px 72px",
        backgroundImage: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 78%, #2563eb 130%)",
        color: "#f8fafc",
        fontFamily: "Noto Sans SC"
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: "14px" },
            children: [
              {
                type: "div",
                props: {
                  style: { fontSize: "20px", letterSpacing: "4px", color: "#93c5fd", fontWeight: 700 },
                  children: SITE_KICKER
                }
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: `${titleSize}px`,
                    lineHeight: 1.3,
                    fontWeight: 700,
                    maxWidth: "1000px"
                  },
                  children: meta.title
                }
              }
            ]
          }
        },
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between" },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", gap: "12px" },
                  children: tags.map((tag) => ({
                    type: "div",
                    props: {
                      style: {
                        padding: "6px 18px",
                        border: "1px solid rgba(147, 197, 253, 0.5)",
                        borderRadius: "999px",
                        fontSize: "20px",
                        color: "#bfdbfe"
                      },
                      children: tag
                    }
                  }))
                }
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" },
                  children: [
                    {
                      type: "div",
                      props: { style: { fontSize: "24px", fontWeight: 700 }, children: SITE_TITLE }
                    },
                    {
                      type: "div",
                      props: { style: { fontSize: "18px", color: "#93c5fd" }, children: meta.date }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  };
}

async function main() {
  const font = await loadFont();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const files = (await fs.readdir(POSTS_DIR)).filter((name) => /\.(md|html)$/.test(name));
  let generated = 0;
  let skipped = 0;

  for (const file of files) {
    const source = await fs.readFile(path.join(POSTS_DIR, file), "utf8");
    const meta = parseFrontMatter(source);
    const outName = file.replace(/\.(md|html)$/, "") + ".png";
    const outPath = path.join(OUT_DIR, outName);

    if (process.argv.includes("--skip-existing")) {
      try {
        await fs.access(outPath);
        skipped++;
        continue;
      } catch {
        // 需要重新生成
      }
    }

    const svg = await satori(cardFor(meta), {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: "Noto Sans SC", data: font, weight: 700, style: "normal" }]
    });
    const png = new Resvg(svg, {
      fitTo: { mode: "width", value: WIDTH },
      font: { fontBuffers: [font] }
    })
      .render()
      .asPng();

    await fs.writeFile(outPath, png);
    generated++;
    console.log(`✓ ${outName}`);
  }

  console.log(`完成：生成 ${generated} 张，跳过 ${skipped} 张（--skip-existing）。`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
