import fs from 'fs';
import path from 'path';

const osDir = path.join(process.cwd(), 'components', 'os');

function addUseClient(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            addUseClient(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf-8');

            // Don't add if it already has it, or if it's explicitly a server action/route
            if (!content.includes('"use client"') && !content.includes("'use client'") && !content.includes('"use server"') && !content.includes("'use server'")) {
                fs.writeFileSync(fullPath, `"use client";\n${content}`);
            }
        }
    }
}

addUseClient(osDir);
console.log('Added "use client" to all OS components.');
