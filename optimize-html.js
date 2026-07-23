const fs = require('fs');
const path = require('path');

// Function to process an HTML file
function processHtmlFile(filePath) {
  try {
    console.log(`Processing ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Replace image extensions
    // Replace .jpeg, .jpg, .png with .webp in img src
    content = content.replace(/src="([^"]+)\.(jpeg|jpg|png)"/g, 'src="$1.webp"');
    
    // 2. Add loading="lazy" and decoding="async" to img tags that don't have them
    // This regex matches img tags, adds loading="lazy" and decoding="async" if missing
    content = content.replace(/<img([^>]*?)>/g, (match, attrs) => {
      let newAttrs = attrs;
      // Add loading="lazy" if not present
      if (!/loading\s*=/.test(newAttrs)) {
        newAttrs += ' loading="lazy"';
      }
      // Add decoding="async" if not present
      if (!/decoding\s*=/.test(newAttrs)) {
        newAttrs += ' decoding="async"';
      }
      return `<img${newAttrs}>`;
    });
    
    // 3. Add defer to script tags that don't have async or defer
    content = content.replace(/<script([^>]*?)src="([^"]+)"([^>]*?)>/g, (match, before, src, after) => {
      if (!/defer|async/.test(before + after)) {
        return `<script${before}src="${src}" defer${after}>`;
      }
      return match;
    });
    
    // 4. Preconnect to fonts and gtm in head if not present
    if (!content.includes('rel="preconnect" href="https://fonts.googleapis.com"')) {
      // Insert preconnect tags right after <head>
      content = content.replace(
        /<head>/i,
        '<head>\n  <!-- Preconnect to external origins -->\n  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link rel="preconnect" href="https://www.googletagmanager.com">\n'
      );
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully processed ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Process all HTML files in the root directory
const files = fs.readdirSync(__dirname);
for (const file of files) {
  if (file.endsWith('.html')) {
    processHtmlFile(path.join(__dirname, file));
  }
}
