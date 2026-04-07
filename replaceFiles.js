const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('verifyToken(') && !content.includes('await verifyToken(') && !fullPath.includes('verify-token.ts')) {
        content = content.replace(/verifyToken\(/g, 'await verifyToken(');
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + fullPath);
      }
    }
  }
}
processDir('c:/Users/juant/OneDrive/Documentos/JuanF/Proyectos/proyecto-gestion-atenciones-main/app/api');
