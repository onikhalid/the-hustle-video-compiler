// hooks/useIVSBroadcast.ts
import { useRef } from "react";
import {
  create,
  BASIC_LANDSCAPE,
  type VideoComposition,
} from "amazon-ivs-web-broadcast";

const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 720;

const FULLSCREEN_COMPOSITION: VideoComposition = {
  index: 0,
  width: PREVIEW_WIDTH,
  height: PREVIEW_HEIGHT,
  x: 0,
  y: 0,
};

export const useIVSBroadcast = () => {
  const clientRef = useRef<any>(null);

  const startBroadcast = async (
    ingestServer: string,
    streamKey: string,
    previewCanvas?: HTMLCanvasElement
  ) => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    const client = create({
      streamConfig: BASIC_LANDSCAPE,
      ingestEndpoint: `rtmps://${ingestServer}:443/app`,
    });

    const videoTrack = mediaStream.getVideoTracks()[0];
    await client.addVideoInputDevice(
      new MediaStream([videoTrack]),
      "camera",
      FULLSCREEN_COMPOSITION
    );

    // 4️⃣ Add audio
    const audioTrack = mediaStream.getAudioTracks()[0];
    await client.addAudioInputDevice(
      new MediaStream([audioTrack]),
      "mic"
    );

    if (previewCanvas) {
      previewCanvas.width = PREVIEW_WIDTH;
      previewCanvas.height = PREVIEW_HEIGHT;
      previewCanvas.style.width = "100%";
      previewCanvas.style.height = "100%";
      previewCanvas.style.display = "block";
      client.attachPreview(previewCanvas);
    }

    clientRef.current = client;

    await client.startBroadcast(streamKey);
  };

  const stopBroadcast = async () => {
    await clientRef.current?.stopBroadcast();
    clientRef.current = null;
  };

  return { startBroadcast, stopBroadcast };
};
