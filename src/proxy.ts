const proxyListURL = 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt';

let proxyList: string[] = [];
let proxyFetchTime = 0;
const proxyFetchInterval = 1000 * 60 * 60 * 24; // 1 day

async function fetchProxyList() {
  const response = await fetch(proxyListURL);
  const text = await response.text();

  proxyList = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  proxyFetchTime = Date.now();
}

export async function getRandomProxy() {
  if (Date.now() - proxyFetchTime > proxyFetchInterval) {
    await fetchProxyList();
  }

  return proxyList[Math.floor(Math.random() * proxyList.length)];
}