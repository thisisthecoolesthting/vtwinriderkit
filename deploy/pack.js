// Builds the deploy artifact on the local machine (never on the VPS): dist/vtwinriderkit.tgz with linux-x64 production deps.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..'), DIST = path.join(ROOT, 'dist', 'app');
fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true }); fs.mkdirSync(DIST, { recursive: true });
const copy = (rel) => fs.cpSync(path.join(ROOT, rel), path.join(DIST, rel), { recursive: true });
for (const r of ['server.js', 'lib', 'public', 'fonts', 'package.json', 'package-lock.json']) copy(r);
fs.mkdirSync(path.join(DIST, 'data'), { recursive: true }); for (const f of ['products.json', 'shipping.json']) copy('data/' + f);
fs.mkdirSync(path.join(DIST, 'art', 'ready'), { recursive: true }); for (const f of fs.readdirSync(path.join(ROOT, 'art', 'ready'))) copy('art/ready/' + f);
const pj = JSON.parse(fs.readFileSync(path.join(DIST, 'package.json'), 'utf8')); delete pj.devDependencies; pj.scripts = { start: 'node server.js' }; fs.writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(pj, null, 1));
cp.execSync('npm install --omit=dev --os=linux --cpu=x64 --libc=glibc --no-audit --no-fund', { cwd: DIST, stdio: 'inherit' });
cp.execSync('tar -czf ../vtwinriderkit.tgz .', { cwd: DIST, stdio: 'inherit' });
console.log('packed', (fs.statSync(path.join(ROOT, 'dist', 'vtwinriderkit.tgz')).size / 1e6).toFixed(1) + ' MB');
