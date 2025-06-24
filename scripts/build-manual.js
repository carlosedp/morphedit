#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Theme colors from the MUI theme (based on the theme.tsx file)
const themeColors = {
  primary: 'rgb(255, 208, 0)',
  primaryDark: '#1565c0',
  background: '#121212',
  paper: '#232323',
  text: 'rgb(255, 208, 0)',
  textDark: 'rgb(255, 180, 0)',
  textSecondary: '#b0b0b0',
  grey50: '#fafafa',
  grey300: '#e0e0e0',
  grey700: '#616161',
  grey900: '#212121',
};

// HTML template
const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MorphEdit User Manual</title>
    <style>
        /* Reset and base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Roboto Mono, monospace;
            font-weight: 400;
            font-size: 1rem;
            line-height: 1.235;
            color: ${themeColors.text};
            background-color: ${themeColors.background};
            padding: 20px;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            background-color: ${themeColors.paper};
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }

        /* Header with back button */
        .header {
            position: sticky;
            top: 0;
            background-color: ${themeColors.paper};
            padding: 20px 0;
            margin-bottom: 30px;
            border-bottom: 1px solid ${themeColors.grey300};
            z-index: 100;
        }

        .back-button {
            display: inline-flex;
            align-items: center;
            padding: 12px 24px;
            background-color: ${themeColors.grey700};
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
            transition: background-color 0.3s ease;
            border: none;
            cursor: pointer;
            font-size: 14px;
        }

        .back-button:hover {
            background-color: ${themeColors.primaryDark};
        }

        .back-button::before {
            content: "←";
            margin-right: 8px;
            font-size: 16px;
        }

        /* Typography */
        h1 {
            text-align: center;
            color: ${themeColors.primary};
            border-bottom: 2px solid ${themeColors.primary};
            padding-bottom: 8px;
            margin-bottom: 24px;
            font-size: 3rem;
        }

        h2 {
            text-align: center;
            color: ${themeColors.primary};
            margin-top: 32px;
            margin-bottom: 16px;
            font-size: 1.5rem;
        }

        h3 {
            color: ${themeColors.text};
            margin-top: 24px;
            margin-bottom: 12px;
            font-size: 1.25rem;
        }

        h4 {
            color: ${themeColors.text};
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 1.1rem;
        }

        p {
            margin-bottom: 16px;
            text-align: left;
        }

        /* Links */
        a {
            color: ${themeColors.textDark};
            text-decoration: underline;
        }

        a:hover {
            text-decoration: underline;
        }

        /* Strong text */
        strong {
            color: ${themeColors.primary};
            font-weight: bold;
            font-size: 1.1em;
        }

        /* Code */
        code {
            background-color: ${themeColors.grey900};
            color: ${themeColors.text};
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 0.875em;
            font-family: "Roboto Mono", monospace;
        }

        pre {
            background-color: ${themeColors.grey900};
            padding: 16px;
            border-radius: 4px;
            overflow: auto;
            margin: 16px 0;
        }

        pre code {
            background-color: transparent;
            padding: 0;
        }

        /* Blockquotes */
        blockquote {
            border-left: 4px solid ${themeColors.primary};
            padding-left: 16px;
            margin: 16px 0;
            font-style: italic;
            background-color: rgba(25, 118, 210, 0.1);
            padding: 16px;
            border-radius: 4px;
        }

        /* Images */
        img {
            max-width: 100%;
            height: auto;
            border-radius: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            margin: 16px 0;
            display: block;
        }

        .logo {
            max-width: 300px;
            height: auto;
            margin: 0 auto 16px;
            display: block;
        }

        /* Lists */
        ul, ol {
            padding-left: 24px;
            text-align: left;
            margin-bottom: 16px;
        }

        li {
            margin-bottom: 4px;
            text-align: left;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
        }

        th, td {
            border: 1px solid ${themeColors.grey300};
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: ${themeColors.grey900};
            font-weight: bold;
        }

        /* Responsive design */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }

            .container {
                padding: 20px;
            }

            h1 {
                font-size: 1.5rem;
            }

            h2 {
                font-size: 1.25rem;
            }

            h3 {
                font-size: 1.1rem;
            }
        }

        /* Table of contents styling */
        .toc {
            background-color: rgba(25, 118, 210, 0.1);
            padding: 20px;
            border-radius: 4px;
            margin: 20px 0;
        }

        .toc h2 {
            margin-top: 0;
            text-align: left;
        }

        .toc ul {
            list-style-type: none;
            padding-left: 0;
        }

        .toc li {
            margin-bottom: 8px;
        }

        .toc a {
            text-decoration: none;
            padding: 4px 0;
            display: block;
        }

        .toc a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="header">
        <button class="back-button" onclick="window.close(); if(window.opener) window.opener.focus(); else window.history.back();">
            Back to Editor
        </button>
    </div>

    <div class="container">
        {{CONTENT}}
    </div>
</body>
</html>`;

async function buildManual() {
  try {
    console.log('Building manual...');

    // Read the markdown file
    const manualPath = path.join(rootDir, 'public', 'USER_MANUAL.md');
    const markdownContent = fs.readFileSync(manualPath, 'utf8');

    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    // Convert markdown to HTML
    const htmlContent = await marked(markdownContent);

    // Replace the content placeholder in the template
    const finalHtml = htmlTemplate.replace('{{CONTENT}}', htmlContent);

    // When image has alt=Logo, add the .logo class
    const finalHtmlWithLogoClass = finalHtml.replace(
      /<img\s+([^>]*?)alt="Logo"([^>]*)>/g,
      '<img class="logo" $1$2>'
    );

    // Ensure dist directory exists
    const distDir = path.join(rootDir, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Write the final HTML file to dist directory
    const outputPath = path.join(distDir, 'manual.html');
    fs.writeFileSync(outputPath, finalHtmlWithLogoClass);

    // Also write to public directory for development server
    const publicOutputPath = path.join(rootDir, 'public', 'manual.html');
    fs.writeFileSync(publicOutputPath, finalHtmlWithLogoClass);

    // Copy images to dist directory
    const publicImgDir = path.join(rootDir, 'public', 'img');
    const distImgDir = path.join(distDir, 'img');

    if (fs.existsSync(publicImgDir)) {
      // Ensure dist/img directory exists
      if (!fs.existsSync(distImgDir)) {
        fs.mkdirSync(distImgDir, { recursive: true });
      }

      // Copy all images
      const images = fs.readdirSync(publicImgDir);
      images.forEach((image) => {
        const srcPath = path.join(publicImgDir, image);
        const destPath = path.join(distImgDir, image);
        fs.copyFileSync(srcPath, destPath);
      });

      console.log(`Copied ${images.length} images to dist/img/`);
    }

    // Copy logo images
    const logoFiles = ['MorphEdit-Logo-Small.png', 'MorphEdit-Logo.png'];
    logoFiles.forEach((logoFile) => {
      const srcPath = path.join(rootDir, 'public', logoFile);
      const destPath = path.join(distDir, logoFile);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    });

    console.log(`Manual generated successfully at: ${outputPath}`);
    console.log('Manual assets copied to dist directory');
  } catch (error) {
    console.error('Error building manual:', error);
    process.exit(1);
  }
}

buildManual();
