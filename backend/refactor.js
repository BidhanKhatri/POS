const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.js')) results.push(file);
        }
    });
    return results;
}

const files = walk('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // 1. dotenv specific fix
    content = content.replace(/require\(['"]dotenv['"]\)\.config\(\);?/g, "import dotenv from 'dotenv';\ndotenv.config();");

    // 2. Requires to imports
    content = content.replace(/const\s+\{\s*(.*?)\s*\}\s*=\s*require\(['"](.*?)['"]\);?/g, (match, vars, reqPath) => {
        let newPath = reqPath;
        if (newPath.startsWith('.')) {
            const absPath = path.join(path.dirname(file), newPath);
            if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
                newPath = newPath + '/index.js';
            } else if (!newPath.endsWith('.js')) {
                newPath = newPath + '.js';
            }
        }
        return `import { ${vars} } from '${newPath}';`;
    });

    content = content.replace(/const\s+([^=\s]+)\s*=\s*require\(['"](.*?)['"]\);?/g, (match, varName, reqPath) => {
        let newPath = reqPath;
        if (newPath.startsWith('.')) {
            const absPath = path.join(path.dirname(file), newPath);
            if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
                newPath = newPath + '/index.js';
            } else if (!newPath.endsWith('.js')) {
                newPath = newPath + '.js';
            }
        }
        return `import ${varName} from '${newPath}';`;
    });

    // 3. module.exports = { x, y } -> export { x, y }
    content = content.replace(/module\.exports\s*=\s*\{\s*(.*?)\s*\};?/s, "export { $1 };");

    // 4. module.exports = X -> export default X
    content = content.replace(/module\.exports\s*=\s*([^;]+);?/g, "export default $1;");

    fs.writeFileSync(file, content, 'utf8');
});

// Update package.json
const pkgPath = './package.json';
let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.type = "module";
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
