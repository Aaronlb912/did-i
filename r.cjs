const fs=require('fs');
for (const f of process.argv.slice(2)) {
  let s=fs.readFileSync(f,'utf8');
  s=s.replace(/^<<<<<<< [^\n]*\r?\n([\s\S]*?)^=======\r?\n([\s\S]*?)^>>>>>>> [^\n]*\r?\n/gm,(m,a,b)=>a+b);
  fs.writeFileSync(f,s);
}
