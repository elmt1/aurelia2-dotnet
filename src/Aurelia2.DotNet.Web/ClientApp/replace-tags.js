// Convert the production ready index.html to development version by replacing the production script 
// and link tags with the development script tag.
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const filePath = join(process.cwd(), 'index.html'); // Adjusted to target the correct location
const devScriptTag = '<script type="module" src="/src/main.ts"></script>';
const prodLinkTag = '<link rel="stylesheet" href="/dist/main.css">';
const prodScriptTag = '<script src="/dist/main.js" defer></script>';

console.log('Starting replace-tags-dev.js script...');
console.log('File path:', filePath);

try {
    const data = await readFile(filePath, 'utf8');
    console.log('Original index.html content:', data);

    let result = data.replace(prodLinkTag, '').replace(prodScriptTag, devScriptTag);
    console.log('Updated index.html content:', result);

    await writeFile(filePath, result, 'utf8');
    console.log('index.html updated successfully for development.');
} catch (err) {
    console.error('Error processing index.html:', err);
}