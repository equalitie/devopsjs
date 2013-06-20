var nom = require('./lib/nomination.js');
nom.resolve(['hetzner7.deflect.ca', 'chime1.deflect.ca'], ['edge.deflect.ca', 'staging.deflect.ca'], function(r) {
console.log(r);
console.log(nom.getConfig('hetzner7.deflect.ca'));
});

