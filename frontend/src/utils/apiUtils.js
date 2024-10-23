const isLocalHost = (hostname) => {
  const localHostRegex = /^(localhost|0.0.0.0|127.0.0.1|192\.168\.0\.(122|128|134))$/;
  return localHostRegex.test(hostname);
};

export const getApiUrl = () => {
  const currentHost = window.location.hostname;
  const isLocal = isLocalHost(currentHost);
  const protocol = isLocal ? 'http' : 'https';
  const port = isLocal ? ':8080' : '';
  const apiUrl = `${protocol}://${currentHost}${port}/api`;

  return apiUrl;
};
