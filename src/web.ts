import { WebPlugin } from '@capacitor/core';

import type {
  CameraOpacityOptions,
  CameraPreviewFlashMode,
  CameraPreviewOptions,
  CameraPreviewPictureOptions,
  CameraPreviewPlugin,
  CameraSampleOptions,
} from './definitions';

export class CameraPreviewWeb extends WebPlugin implements CameraPreviewPlugin {
  /**
   *  track which camera is used based on start options
   *  used in capture
   */
  private isBackCamera: boolean;

  constructor() {
    super();
  }

  async start(options: CameraPreviewOptions): Promise<{}> {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    // Stop any existing stream so we can request media with different constraints based on user input
    stream.getTracks().forEach((track) => track.stop());

    const video = document.getElementById('video');
    const parent = document.getElementById(options.parent);

    if (video) {
      throw new Error('camera already started');
    }

    const videoElement = document.createElement('video');
    videoElement.id = 'video';
    videoElement.setAttribute('class', options.className || '');

    // Don't flip video feed if camera is rear facing
    if (options.position !== 'rear') {
      videoElement.setAttribute('style', '-webkit-transform: scaleX(-1); transform: scaleX(-1);');
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');

    // Safari on iOS needs to have the autoplay, muted and playsinline attributes set for video.play() to be successful
    // Without these attributes videoElement.play() will throw a NotAllowedError
    // https://developer.apple.com/documentation/webkit/delivering_video_content_for_safari
    if (isSafari) {
      videoElement.setAttribute('autoplay', 'true');
      videoElement.setAttribute('muted', 'true');
      videoElement.setAttribute('playsinline', 'true');
    }

    parent.appendChild(videoElement);

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('No media devices available');
    }

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: options.width },
        height: { ideal: options.height },
      },
    };

    if (options.position === 'rear') {
      (constraints.video as MediaTrackConstraints).facingMode = 'environment';
      this.isBackCamera = true;
    } else {
      this.isBackCamera = false;
    }

    videoElement.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.play();

    return {};
  }

  async stop(): Promise<any> {
    const video = <HTMLVideoElement>document.getElementById('video');
    if (video) {
      video.pause();

      const st: any = video.srcObject;
      const tracks = st.getTracks();

      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        track.stop();
      }
      video.remove();
    }
  }

  async capture(options: CameraPreviewPictureOptions): Promise<any> {
    return new Promise((resolve, _) => {
      const video = <HTMLVideoElement>document.getElementById('video');
      const canvas = document.createElement('canvas');

      // video.width = video.offsetWidth;

      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // flip horizontally back camera isn't used
      if (!this.isBackCamera) {
        context.translate(video.videoWidth, 0);
        context.scale(-1, 1);
      }
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      let base64EncodedImage;

      if (options.quality != undefined) {
        base64EncodedImage = canvas
          .toDataURL('image/jpeg', options.quality / 100.0)
          .replace('data:image/jpeg;base64,', '');
      } else {
        base64EncodedImage = canvas.toDataURL('image/png').replace('data:image/png;base64,', '');
      }

      resolve({
        value: base64EncodedImage,
      });
    });
  }

  async captureSample(_options: CameraSampleOptions): Promise<any> {
    return this.capture(_options);
  }

  async getSupportedFlashModes(): Promise<{
    result: CameraPreviewFlashMode[];
  }> {
    throw new Error('getSupportedFlashModes not supported under the web platform');
  }

  async setFlashMode(_options: { flashMode: CameraPreviewFlashMode | string }): Promise<void> {
    throw new Error('setFlashMode not supported under the web platform');
  }

  async flip(): Promise<void> {
    throw new Error('flip not supported under the web platform');
  }

  async setOpacity(_options: CameraOpacityOptions): Promise<any> {
    const video = <HTMLVideoElement>document.getElementById('video');
    if (!!video && !!_options['opacity']) {
      video.style.setProperty('opacity', _options['opacity'].toString());
    }
  }

  async checkPermissions(): Promise<PermissionState> {
    throw new Error('checkPermissions not supported under the web platform');
  }

  async requestPermissions(): Promise<PermissionState> {
    throw new Error('requestPermissions not supported under the web platform');
  }
}
