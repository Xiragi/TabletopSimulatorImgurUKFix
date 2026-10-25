export interface GameItem {
  id: string;
  saveName: string;
  hasImgur: boolean;
  imgurCount: number;
  nonImgurCount: number;
  imagePath: string | null;
  isConverted: boolean;
  convertState: string;
  progress?: string;
  completedCount: number;
  isResumable?: boolean;
  savedCompleted?: number;
  savedTotal?: number;
  hasUpdate?: boolean;
  temporaryFix?: boolean;
  originalId?: string;
}

export interface ServiceStatus {
  id: string;
  name: string;
  state: 'available' | 'reachable' | 'paused' | 'unavailable';
  detail: string;
  checkedAt: string;
}
