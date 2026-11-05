declare module 'react-native-view-shot' {
  export interface CaptureOptions {
    width?: number;
    height?: number;
    format?: 'png' | 'jpg' | 'webm' | 'raw';
    quality?: number;
    result?: 'tmpfile' | 'base64' | 'data-uri' | 'zip-base64';
    snapshotContentContainer?: boolean;
    handleGLSurfaceViewOnAndroid?: boolean;
  }

  export function captureRef<T>(viewRef: T, options?: CaptureOptions): Promise<string>;
  export function captureScreen(options?: CaptureOptions): Promise<string>;
  export function releaseCapture(uri: string): void;

  export default class ViewShot {
    capture?: () => Promise<string>;
  }
}
