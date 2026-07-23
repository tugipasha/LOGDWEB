const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const { minify } = require('terser');

// Minify CSS
async function minifyCSS(inputPath, outputPath) {
  try {
    console.log(`Minifying CSS: ${inputPath} → ${outputPath}`);
    const css = fs.readFileSync(inputPath, 'utf8');
    const minified = new CleanCSS({ level: 2 }).minify(css);
    if (minified.errors.length > 0) {
      console.error('CSS minification errors:', minified.errors);
    }
    fs.writeFileSync(outputPath, minified.styles);
    console.log(`CSS minified successfully!`);
  } catch (error) {
    console.error(`Error minifying CSS:`, error);
  }
}

// Minify JS
async function minifyJS(inputPath, outputPath) {
  try {
    console.log(`Minifying JS: ${inputPath} → ${outputPath}`);
    const js = fs.readFileSync(inputPath, 'utf8');
    const result = await minify(js, { compress: true, mangle: true });
    if (result.error) {
      console.error('JS minification error:', result.error);
    }
    fs.writeFileSync(outputPath, result.code);
    console.log(`JS minified successfully!`);
  } catch (error) {
    console.error(`Error minifying JS:`, error);
  }
}

// Run the minifications
async function main() {
  await minifyCSS(path.join(__dirname, 'css/style.css'), path.join(__dirname, 'css/style.min.css'));
  await minifyJS(path.join(__dirname, 'js/script.js'), path.join(__dirname, 'js/script.min.js'));
}

main();
