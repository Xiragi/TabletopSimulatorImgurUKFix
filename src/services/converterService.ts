import fs from 'fs';
import path from 'path';
import {defaultBackendId, getBackendProviders, isTemporaryFixUrl} from './backends/registry';
import {BackendSession} from './backendService';
import {addGoldBorderToImage} from './imageService';
import {getProgressFile, saveProgressIncrementally, cleanupProgress} from './progressService';

export let currentCancelToken = 0;
export function incrementCancelToken() {
  currentCancelToken++;
}

export async function convertGame(dirPath: string, fileId: string, sender: any, startToken: number, forceRestart: boolean = false, backendId: string = defaultBackendId): Promise<any> {
  const backend = new BackendSession(getBackendProviders(backendId), {
    log: (message, type) => sender.send('backend:log', `[${fileId}] ${message}`, type),
    onServiceStatus: status => sender.send('backend:serviceStatus', status),
    onProvider: provider => sender.send('convert:backend', fileId, { id: provider.id, name: provider.name, temporary: provider.temporary }),
    isCancelled: () => startToken !== currentCancelToken
  });
  const fullPath = path.join(dirPath, `${fileId}.json`);
  const convertedPath = path.join(dirPath, `${fileId}_converted.json`);
  const pngPath = path.join(dirPath, `${fileId}.png`);
  const convertedPngPath = path.join(dirPath, `${fileId}_converted.png`);
  
  let content = fs.readFileSync(fullPath, 'utf-8');

  const imgurRegex = /https?:\/\/(?:i\.)?imgur\.com\/[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)?/g;
  const matches = content.match(imgurRegex) || [];
  const uniqueLinks = [...new Set(matches)];
  const totalCount = uniqueLinks.length;
  if (totalCount === 0) return { success: true, noChanges: true, convertedCount: 0, remainingImgurCount: 0, temporaryFix: false };

  if (fs.existsSync(pngPath)) {
    try {
      await addGoldBorderToImage(pngPath, convertedPngPath);
    } catch (e: any) {
      sender.send('backend:log', `Failed to draw gold border on ${fileId}.png: ${e.message}. Falling back to original image.`, 'error');
      fs.copyFileSync(pngPath, convertedPngPath);
    }
  }
  
  const { progressPath, progressData } = getProgressFile(dirPath, sender);
  
  if (forceRestart && progressData[fileId]) {
    delete progressData[fileId];
    fs.writeFileSync(progressPath, JSON.stringify(progressData, null, 2), 'utf-8');
  }
  
  const linkMap: Record<string, string> = progressData[fileId]?.linkMap || {};
  let completedCount = Object.keys(linkMap).length;
  
  sender.send('convert:progress', fileId, completedCount, totalCount);
  
  if (Object.values(linkMap).some(isTemporaryFixUrl)) {
    sender.send('convert:temporaryFix', fileId);
  }

  const linksToUpload = uniqueLinks.filter(link => !linkMap[link]);
  
  for (const link of linksToUpload) {
    try {
      const newUrl = await backend.resolve(link);
      linkMap[link] = newUrl;
      if (isTemporaryFixUrl(newUrl)) {
        sender.send('convert:temporaryFix', fileId);
      }
      saveProgressIncrementally(progressPath, fileId, linkMap, completedCount + 1, totalCount, sender);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'Cancelled by user') {
        sender.send('backend:log', `[${fileId}] Conversion cancelled by user. Wiping partial progress.`, 'warning');
        cleanupProgress(progressPath, fileId, sender);
      } else {
        sender.send('backend:log', `[${fileId}] ${message}. Saved progress is available to resume.`, 'error');
      }
      return { success: false, error: message, convertedCount: Object.keys(linkMap).length };
    }

    completedCount++;
    sender.send('convert:progress', fileId, completedCount, totalCount);
    const delay = backend.delayBetweenLinksMs;
    if (delay > 0 || completedCount % 100 === 0) {
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  if (startToken !== currentCancelToken) {
    cleanupProgress(progressPath, fileId, sender);
    return { success: false, error: 'Cancelled by user' };
  }

  for (const [original, newUrl] of Object.entries(linkMap)) {
    content = content.split(original).join(newUrl);
  }
  
  let originalName = 'Unknown';
  content = content.replace(/"SaveName"\s*:\s*"(.*?)"/, (match, p1) => {
    originalName = p1;
    return `"SaveName": "[C] ${p1}"`;
  });
  content = content.replace(/"GameMode"\s*:\s*"(.*?)"/, (match, p1) => {
    return `"GameMode": "[C] ${p1}"`;
  });
  
  fs.writeFileSync(convertedPath, content, 'utf-8');
  cleanupProgress(progressPath, fileId, sender);
  
  const infosPath = path.join(dirPath, 'WorkshopFileInfos.json');
  if (fs.existsSync(infosPath)) {
    try {
      const infosContent = fs.readFileSync(infosPath, 'utf-8');
      const infos = JSON.parse(infosContent);
      infos.push({
        Directory: convertedPath.replace(/\//g, '\\'),
        Name: `[C] ${originalName}`,
        UpdateTime: Math.floor(Date.now() / 1000)
      });
      fs.writeFileSync(infosPath, JSON.stringify(infos, null, 2), 'utf-8');
    } catch (e: any) {
      sender.send('backend:log', `Failed to update WorkshopFileInfos.json: ${e.message}`, 'error');
    }
  }
  
  const temporaryFix = Object.values(linkMap).some(isTemporaryFixUrl);
  return { success: true, newPath: convertedPath, convertedCount: Object.keys(linkMap).length, remainingImgurCount: new Set(content.match(imgurRegex) || []).size, temporaryFix };
}
