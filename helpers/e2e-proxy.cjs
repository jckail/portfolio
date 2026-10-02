// Forwards localhost:PORT (IPv4 and IPv6) inside the Playwright container to
// HOST:PORT, so a Docker Desktop container reaches a server running in the shell.
// Both the browser and Playwright's Node-side API client then see a plain
// `localhost`, exactly as in CI. Used by helpers/e2e-docker.sh.
const net = require('net');

const [port, host] = [Number(process.argv[2]), process.argv[3]];
if (!port || !host) {
  console.error('usage: node e2e-proxy.cjs <port> <host>');
  process.exit(2);
}

for (const bind of ['127.0.0.1', '::1']) {
  net
    .createServer((client) => {
      const upstream = net.connect(port, host);
      client.pipe(upstream);
      upstream.pipe(client);
      client.on('error', () => upstream.destroy());
      upstream.on('error', () => client.destroy());
    })
    .on('error', () => {}) // e.g. no IPv6 in this container: the IPv4 listener is enough
    .listen(port, bind);
}
