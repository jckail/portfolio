interface BrowserInfo {
  name: string;
  version: string;
  os: string;
}

export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';
  let os = 'Unknown';

  // Detect browser name
  if (userAgent.indexOf('Firefox') > -1) {
    name = 'Firefox';
  } else if (userAgent.indexOf('Chrome') > -1) {
    name = 'Chrome';
  } else if (userAgent.indexOf('Safari') > -1) {
    name = 'Safari';
  } else if (userAgent.indexOf('Edge') > -1) {
    name = 'Edge';
  } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident/') > -1) {
    name = 'Internet Explorer';
  }

  // Detect version
  const match = userAgent.match(new RegExp(`${name}\\/([0-9.]+)`));
  if (match) {
    version = match[1];
  }

  // Detect OS
  if (userAgent.indexOf('Windows') > -1) {
    os = 'Windows';
  } else if (userAgent.indexOf('Mac') > -1) {
    os = 'MacOS';
  } else if (userAgent.indexOf('Linux') > -1) {
    os = 'Linux';
  } else if (userAgent.indexOf('Android') > -1) {
    os = 'Android';
  } else if (userAgent.indexOf('iOS') > -1) {
    os = 'iOS';
  }

  return { name, version, os };
}
