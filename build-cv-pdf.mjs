#!/usr/bin/env node
/**
 * build-cv-pdf.mjs
 *
 * Reads cv.md (the canonical source of truth for Louis Ross's CV) and renders
 * it to Louis_Ross_CV.pdf via headless Chromium (Playwright).
 *
 * Usage: node build-cv-pdf.mjs
 *   Reads:  ./cv.md
 *   Writes: ./Louis_Ross_CV.pdf
 *
 * Deliberately a single self-contained file: the HTML/CSS template lives here
 * as a template string rather than a separate templates/ directory, and cv.md
 * is parsed with a small hand-rolled parser tailored to its fixed section
 * order (Name, Contact, Summary, Skills, Experience, Projects, Education,
 * Certifications) rather than a general-purpose Markdown library.
 *
 * Layout choice: single-column, reverse-chronological ("Jake's Resume" /
 * Harvard style). Multi-column layouts are the most common cause of ATS
 * parsing failures, and recruiters scan top-down for name/title/dates in a
 * predictable position (see the cv.md research this repo's history records).
 *
 * Font choice: a system sans-serif stack, not a bundled webfont. This mirrors
 * a hard lesson from a sibling CV-rendering project (career-ops): its bundled
 * variable woff2 fonts (Space Grotesk / DM Sans) rendered with glyph advances
 * that made PDF text extractors inject spurious spaces inside words (e.g.
 * "SUM M ARY"), corrupting ATS keyword parsing. Its production template
 * reverted to a system sans stack for exactly that reason. Since ATS-safe
 * parsing is this document's entire job, the same fix is applied here from
 * the start rather than discovered the same way twice.
 */

import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CV_MD_PATH = resolve(__dirname, 'cv.md');
const OUTPUT_PDF_PATH = resolve(__dirname, 'Louis_Ross_CV.pdf');

// ── ATS-safe text normalization ─────────────────────────────────────────────
// PDF text extractors (what ATS systems read) often mangle em/en dashes,
// smart quotes, ellipses, and zero-width/non-breaking spaces. Converting them
// to plain ASCII equivalents before rendering keeps the extracted text clean.
function normalizeForATS(text) {
  return text
    .replace(/—/g, '-')   // em dash
    .replace(/–/g, '-')   // en dash
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/…/g, '...')
    .replace(/[​‌‍⁠﻿]/g, '')
    .replace(/ /g, ' ');
}

// Normalizes for ATS-safety, then HTML-escapes. Every string that reaches the
// rendered document goes through this, so normalization happens once, at the
// point of output — never on the raw markdown before parsing, since the
// parser itself splits on em dashes ("### Role — Company", "**Degree** —
// Institution") that normalizeForATS() would otherwise collapse to plain
// hyphens before those splits ever run.
function escapeHtml(text) {
  return normalizeForATS(String(text))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Render a very small subset of inline Markdown: **bold** only. Everything
// else in cv.md is plain text, escaped for HTML.
function renderInline(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/**
 * Parse cv.md into a structured object.
 *
 * cv.md's shape is fixed by convention (not general Markdown):
 *   # Name
 *   <tagline line>
 *   <contact line, "|"-separated>
 *   ## Summary
 *   <paragraph>
 *   ## Skills / Core Competencies
 *   - **Category** — items
 *   ## Experience
 *   ### Role — Company
 *   *dates*
 *   - bullet
 *   ## Projects
 *   ### Project name
 *   *tech line*
 *   <description paragraph>
 *   GitHub: url
 *   ## Education
 *   **Degree** — Institution (dates)
 *   ## Certifications
 *   <line(s)>
 */
function parseCvMarkdown(markdown) {
  // Parsed on the raw markdown, not ATS-normalized text: the parser itself
  // splits on em dashes ("### Role — Company"), which normalizeForATS() would
  // otherwise have already collapsed to plain hyphens. ATS normalization is
  // applied later, per field, in escapeHtml().
  const lines = markdown.split(/\r?\n/);

  let i = 0;
  const skipBlank = () => { while (i < lines.length && lines[i].trim() === '') i++; };

  // Header: # Name, tagline, contact line
  if (!lines[i]?.startsWith('# ')) throw new Error('cv.md must start with "# Name"');
  const name = lines[i].slice(2).trim();
  i++;
  skipBlank();
  const tagline = lines[i]?.trim() || '';
  i++;
  skipBlank();
  const contactLine = lines[i]?.trim() || '';
  i++;

  // Split remaining lines into ## sections.
  const sections = {};
  let currentSection = null;
  let buffer = [];
  const flush = () => {
    if (currentSection) sections[currentSection] = buffer;
    buffer = [];
  };
  for (; i < lines.length; i++) {
    const line = lines[i];
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      flush();
      currentSection = heading[1].trim().toLowerCase();
      continue;
    }
    buffer.push(line);
  }
  flush();

  const summary = (sections['summary'] || []).join('\n').trim();

  const skills = (sections['skills / core competencies'] || [])
    .filter(l => l.trim().startsWith('- '))
    .map(l => l.trim().slice(2).trim());

  const experience = parseSubentries(sections['experience'] || [], (headingLine, bodyLines) => {
    const m = headingLine.match(/^###\s+(.+?)\s+—\s+(.+)$/);
    const role = m ? m[1].trim() : headingLine.replace(/^###\s+/, '').trim();
    const company = m ? m[2].trim() : '';
    const datesLine = bodyLines.find(l => l.trim().startsWith('*') && l.trim().endsWith('*'));
    const dates = datesLine ? datesLine.trim().replace(/^\*|\*$/g, '') : '';
    const bullets = bodyLines
      .filter(l => l.trim().startsWith('- '))
      .map(l => l.trim().slice(2).trim());
    return { role, company, dates, bullets };
  });

  const projects = parseSubentries(sections['projects'] || [], (headingLine, bodyLines) => {
    const projectName = headingLine.replace(/^###\s+/, '').trim();
    const techLine = bodyLines.find(l => l.trim().startsWith('*') && l.trim().endsWith('*'));
    const tech = techLine ? techLine.trim().replace(/^\*|\*$/g, '') : '';
    const githubLine = bodyLines.find(l => l.trim().startsWith('GitHub:'));
    const github = githubLine ? githubLine.trim().replace(/^GitHub:\s*/, '') : '';
    const description = bodyLines
      .filter(l => l.trim() && l.trim() !== techLine?.trim() && l.trim() !== githubLine?.trim())
      .join(' ')
      .trim();
    return { name: projectName, tech, description, github };
  });

  const educationLines = (sections['education'] || []).filter(l => l.trim());
  const education = educationLines.map(line => {
    const m = line.match(/^\*\*(.+?)\*\*\s+—\s+(.+)$/);
    return m ? { degree: m[1].trim(), institution: m[2].trim() } : { degree: line.trim(), institution: '' };
  });

  const certifications = (sections['certifications'] || [])
    .map(l => l.trim())
    .filter(Boolean);

  return { name, tagline, contactLine, summary, skills, experience, projects, education, certifications };
}

// Split a section's lines into ### sub-entries and hand each (heading, body)
// pair to `build`.
function parseSubentries(lines, build) {
  const entries = [];
  let headingLine = null;
  let body = [];
  const flush = () => {
    if (headingLine !== null) entries.push(build(headingLine, body));
    body = [];
  };
  for (const line of lines) {
    if (line.match(/^###\s+/)) {
      flush();
      headingLine = line;
    } else {
      body.push(line);
    }
  }
  flush();
  return entries;
}

function renderContactRow(contactLine) {
  return contactLine
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const emailMatch = part.match(/^[\w.+-]+@[\w-]+\.[\w.-]+$/);
      const urlMatch = part.match(/^(linkedin\.com|github\.com)\/.+$/i);
      if (emailMatch) return `<a href="mailto:${escapeHtml(part)}">${escapeHtml(part)}</a>`;
      if (urlMatch) return `<a href="https://${escapeHtml(part)}">${escapeHtml(part)}</a>`;
      return escapeHtml(part);
    })
    .join('\n      <span class="sep">|</span>\n      ');
}

function renderSkills(skills) {
  return skills.map(item => `<div class="skill-item">${renderInline(item)}</div>`).join('\n      ');
}

function renderExperience(entries) {
  return entries.map(e => `
  <div class="job">
    <div class="job-header">
      <span class="job-role">${escapeHtml(e.role)}</span>
      <span class="job-dates">${escapeHtml(e.dates)}</span>
    </div>
    <div class="job-company">${escapeHtml(e.company)}</div>
    <ul>
      ${e.bullets.map(b => `<li>${renderInline(b)}</li>`).join('\n      ')}
    </ul>
  </div>`).join('\n');
}

function renderProjects(entries) {
  return entries.map(p => `
  <div class="project">
    <div class="project-header">
      <span class="project-name">${escapeHtml(p.name)}</span>
      ${p.tech ? `<span class="project-tech">${escapeHtml(p.tech)}</span>` : ''}
    </div>
    ${p.description ? `<div class="project-desc">${renderInline(p.description)}</div>` : ''}
    ${p.github ? `<div class="project-link">${escapeHtml(p.github)}</div>` : ''}
  </div>`).join('\n');
}

function renderEducation(entries) {
  return entries.map(e => `
  <div class="edu-item">
    <strong>${escapeHtml(e.degree)}</strong>${e.institution ? ` - ${escapeHtml(e.institution)}` : ''}
  </div>`).join('\n');
}

function renderCertifications(lines) {
  return lines.map(l => `<div class="cert-item">${renderInline(l)}</div>`).join('\n      ');
}

// ── HTML + CSS template (inlined; no separate templates/ directory) ────────
function buildHtml(cv) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(cv.name)} - CV</title>
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    /* Disable fi/fl/ffi ligatures: Chromium substitutes these letter pairs
       with single Unicode glyphs at PDF layout time, which PDF text
       extractors then decode back oddly (e.g. "verification" -> "veriﬁcation"),
       breaking a literal ATS keyword search. */
    font-variant-ligatures: none;
    font-feature-settings: "liga" 0, "clig" 0, "dlig" 0;
  }
  @page { size: A4; margin: 0.65in; }
  body {
    font-family: "Liberation Sans", "Helvetica Neue", Arial, "DejaVu Sans", sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
    color: #1a1a2e;
    background: #fff;
  }
  h1 {
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin-bottom: 4px;
  }
  .tagline {
    font-size: 11pt;
    color: #333;
    margin-bottom: 8px;
  }
  .contact-row {
    font-size: 9.5pt;
    color: #555;
  }
  .contact-row a { color: #555; text-decoration: none; }
  .contact-row .sep { color: #ccc; }
  .header { margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #1a1a2e; }
  .section { margin-bottom: 14px; break-inside: avoid-page; }
  .section-title {
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #ccc;
    padding-bottom: 3px;
    margin-bottom: 8px;
    color: #1a1a2e;
  }
  .summary-text { font-size: 10.5pt; }
  .skills-grid { display: flex; flex-direction: column; gap: 3px; }
  .skill-item { font-size: 10pt; }
  .job, .project, .edu-item { margin-bottom: 10px; break-inside: avoid; }
  .job-header, .project-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .job-role, .project-name { font-weight: 600; font-size: 10.5pt; }
  .job-dates { font-size: 9.5pt; color: #666; white-space: nowrap; }
  .job-company { font-size: 10pt; color: #444; font-style: italic; margin-bottom: 3px; }
  .job ul { padding-left: 16px; margin-top: 4px; }
  .job li { font-size: 9.8pt; margin-bottom: 2px; }
  .project-tech { font-size: 9.5pt; color: #666; white-space: nowrap; }
  .project-desc { font-size: 9.8pt; color: #333; margin-top: 2px; }
  .project-link { font-size: 9.3pt; color: #555; margin-top: 2px; }
  .edu-item { font-size: 10.5pt; }
  .cert-item { font-size: 10.5pt; }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(cv.name)}</h1>
    <div class="tagline">${escapeHtml(cv.tagline)}</div>
    <div class="contact-row">
      ${renderContactRow(cv.contactLine)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Summary</div>
    <div class="summary-text">${renderInline(cv.summary)}</div>
  </div>

  <div class="section">
    <div class="section-title">Skills / Core Competencies</div>
    <div class="skills-grid">
      ${renderSkills(cv.skills)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Experience</div>
    ${renderExperience(cv.experience)}
  </div>

  <div class="section">
    <div class="section-title">Projects</div>
    ${renderProjects(cv.projects)}
  </div>

  <div class="section">
    <div class="section-title">Education</div>
    ${renderEducation(cv.education)}
  </div>

  <div class="section">
    <div class="section-title">Certifications</div>
    <div class="skills-grid">
      ${renderCertifications(cv.certifications)}
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  if (!existsSync(CV_MD_PATH)) {
    console.error(`cv.md not found at ${CV_MD_PATH}`);
    process.exit(1);
  }

  const markdown = await readFile(CV_MD_PATH, 'utf-8');
  const cv = parseCvMarkdown(markdown);
  const html = buildHtml(cv);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({
      path: OUTPUT_PDF_PATH,
      format: 'A4',
      printBackground: true,
      margin: { top: '0.65in', bottom: '0.65in', left: '0.65in', right: '0.65in' },
    });
  } finally {
    await browser.close();
  }

  console.log(`Wrote ${OUTPUT_PDF_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
