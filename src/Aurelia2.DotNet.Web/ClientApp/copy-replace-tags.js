import { promises as fs } from 'fs';
import { join } from 'path';

const sourcePath = join(process.cwd(), 'public', 'index.html'); // Source file path
const destinationPath = join(process.cwd(), 'index.html'); // Destination file path
const devScriptTag = '<script type="module" src="/src/main.ts"></script>';
const prodLinkTag = '<link rel="stylesheet" href="/dist/main.css">';
const prodScriptTag = '<script src="/dist/main.js" defer></script>';

async function copyAndReplaceTags() {
    try {
        // Step 1: Copy the file
        console.log('Copying index.html from public to root...');
        await fs.copyFile(sourcePath, destinationPath);
        console.log('File copied successfully.');

        // Step 2: Replace tags in the copied file
        console.log('Starting tag replacement...');
        const data = await fs.readFile(destinationPath, 'utf8');
        const result = data.replace(prodLinkTag, '').replace(prodScriptTag, devScriptTag);
        await fs.writeFile(destinationPath, result, 'utf8');
        console.log('index.html updated successfully for development.');
    } catch (err) {
        console.error('Error during copy and replace process:', err);
    }
}

copyAndReplaceTags();