const fs = require('fs');
const path = require('path');

// Function to update HTML to use minified assets
function updateHtmlToUseMinified(filePath) {
  try {
    console.log(`Updating ${filePath} to use minified assets...`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace style.css with style.min.css
    content = content.replace(/href="css\/style\.css"/g, 'href="css/style.min.css"');
    
    // Replace script.js with script.min.js
    content = content.replace(/src="js\/script\.js"/g, 'src="js/script.min.js"');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated ${filePath}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

// Process all HTML files in root directory
const files = fs.readdirSync(__dirname);
for (const file of files) {
  if (file.endsWith('.html')) {
    updateHtmlToUseMinified(path.join(__dirname, file));
  }
}
