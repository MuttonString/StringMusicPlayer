import type { ParseJpnTextResp, ShareDataResp } from '../types/request';
import { compress, decompress, getHash, getRandomKey } from '../utils/data';
import { fetchAlt } from '../utils/fetch';

const VALIDITY_PERIOD = 15 * 24 * 3600 * 1000;

/**
 * 发起带缓存的请求，若有缓存，不调用网络接口
 * @param url 请求URL
 * @param options 请求配置
 * @param key 缓存键，命中时不调用网络接口
 */
export async function fetchWithCache(
  url: string,
  options: RequestInit,
  key: string,
) {
  const cache = await caches.open('muttonstring.string-music');

  // 清理过期缓存
  const expList = await cache.match('expList');
  if (expList) {
    const listMap: Record<string, number> = await expList.json();
    const now = Date.now();
    Object.entries(listMap).forEach(([k, v]) => {
      if (v < now) {
        delete listMap[k];
        cache.delete(k);
      }
    });
    const newResp = new Response(JSON.stringify(listMap), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put('expList', newResp);
  }

  // 生成缓存键
  let cacheKey = url.split('?')[0];
  if (!cacheKey.endsWith('/')) cacheKey += '/';
  cacheKey = cacheKey.replace(/^\/?_?https?:\/\//, '') + key;
  cacheKey = await getHash(cacheKey);

  // 尝试获取缓存
  const cachedResp = await cache.match(cacheKey);
  if (
    cachedResp &&
    Number(cachedResp.headers.get('X-Expire-Time')) >= Date.now()
  ) {
    return cachedResp;
  }

  // 未命中缓存，调用网络接口
  const resp = await fetchAlt(url, options);

  // 响应成功则缓存接口数据
  if (resp.status >= 200 && resp.status <= 299)
    try {
      const headers = new Headers(resp.headers);
      const expTime = Date.now() + VALIDITY_PERIOD;
      headers.set('X-Expire-Time', String(expTime));
      const newResp = new Response(resp.clone().body, {
        status: resp.status,
        statusText: resp.statusText,
        headers,
      });
      await cache.put(cacheKey, newResp);

      // 维护缓存过期时间列表
      const expListResp = await cache.match('expList');
      let listMap: Record<string, number> = {
        [cacheKey]: expTime,
      };
      if (expListResp) {
        listMap = { ...(await expListResp.json()), ...listMap };
      }
      const newExpResp = new Response(JSON.stringify(listMap), {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put('expList', newExpResp);
    } catch (err) {
      console.error('Failed to cache: ' + err);
    }

  return resp;
}

/**
 * 将数据上传到 https://textdb.online/ 以供分享
 */
export async function shareData(data: any): Promise<ShareDataResp> {
  const key = 'StringMusic_' + getRandomKey();
  const value = compress(data);
  const resp = await fetchWithCache(
    'https://textdb.online/update/?v=1',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: String(new URLSearchParams({ key, value })),
    },
    value,
  );
  const obj = await resp.json();
  if (obj.error) throw obj.error;
  return obj.data;
}

/**
 * 根据数据的key，从 https://textdb.online/ 获取原始数据
 */
export async function getSharedData(key: string) {
  key = key.trim();
  if (!key.startsWith('StringMusic_') || key.length !== 32) {
    throw 'Invalid key.';
  }
  const resp = await fetchAlt('https://textdb.online/' + key);
  return decompress(await resp.text());
}

/**
 * 调用雅虎API给日文分词
 * https://developer.yahoo.co.jp/webapi/jlp/ma/v2/parse.html
 */
export async function parseJpnText(
  text: string,
  appID: string,
): Promise<ParseJpnTextResp> {
  const resp = await fetchWithCache(
    'https://jlp.yahooapis.jp/jsonrpc?appid=' + appID,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'StringMusic',
        jsonrpc: '2.0',
        method: 'jlp.maservice.parse',
        params: { q: text },
      }),
    },
    text,
  );
  const obj = await resp.json();
  if (obj.error) throw obj.error.message;
  return obj.result.tokens;
}
