// run on the VPS release dir: renders a real print file with Linux sharp + bundled fonts
process.chdir(process.argv[2]);
const { compose } = require(process.argv[2] + '/lib/compose.js');
compose('tee', 3319, 3761, { event: 'comunion', name: 'Sofía', date: '2027-05-08', role: 'familia', lang: 'es' }).then(b => console.log('linux compose ok, png bytes', b.length));
