import { useCallback, useEffect, useRef } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { useVisionStore } from '../stores/useVisionStore';
import { useStatsStore } from '../store/statsStore';
import { calculateDirection } from '../utils/direction';
import { calculateDistance, getClassColor, getDangerLevel } from '../utils/distanceEstimation';
import { playObstacleFeedback } from '../utils/audioBeep';
import { describeSceneImage } from '../services/gemini';
import { DetectedObstacle } from '../types';

let currentModelBase: 'mobilenet_v2' | 'lite_mobilenet_v2' | null = null;
let loadedModel: cocoSsd.ObjectDetection | null = null;
let modelLoadingPromise: Promise<cocoSsd.ObjectDetection> | null = null;

export function useObjectDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  speak: (text: string, isUrgent?: boolean) => void
) {
  const isDetecting = useVisionStore((s) => s.isDetecting);
  const setDetecting = useVisionStore((s) => s.setDetecting);
  const isModelLoading = useVisionStore((s) => s.isModelLoading);
  const setModelLoading = useVisionStore((s) => s.setModelLoading);
  const isModelLoaded = useVisionStore((s) => s.isModelLoaded);
  const setModelLoaded = useVisionStore((s) => s.setModelLoaded);
  const setDetectedObjects = useVisionStore((s) => s.setDetectedObjects);
  const setCurrentFps = useVisionStore((s) => s.setCurrentFps);
  const setVideoResolution = useVisionStore((s) => s.setVideoResolution);
  const detectionSettings = useVisionStore((s) => s.detectionSettings);
  const setIsDescribingScene = useVisionStore((s) => s.setIsDescribingScene);
  const setLastSceneDescription = useVisionStore((s) => s.setLastSceneDescription);
  const addRecentActivity = useVisionStore((s) => s.addRecentActivity);

  const animFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);

  // Debounce tracking per object class + direction: map of "className-direction" -> lastSpokenTimestamp
  const spokenAlertTimestampsRef = useRef<Map<string, number>>(new Map());

  // Rate limiter for scene description (max 1 call per 3 seconds)
  const lastSceneDescribeTimeRef = useRef<number>(0);

  // Load COCO-SSD Model with selected base (default 'mobilenet_v2')
  const loadModel = useCallback(
    async (baseModel: 'mobilenet_v2' | 'lite_mobilenet_v2' = 'mobilenet_v2') => {
      if (loadedModel && currentModelBase === baseModel) {
        return loadedModel;
      }
      if (modelLoadingPromise && currentModelBase === baseModel) {
        return modelLoadingPromise;
      }

      try {
        setModelLoading(true);
        speak('Loading vision model');

        await tf.ready();
        currentModelBase = baseModel;
        modelLoadingPromise = cocoSsd.load({ base: baseModel });
        loadedModel = await modelLoadingPromise;

        setModelLoaded(true);
        setModelLoading(false);
        speak(`Vision model ready (${baseModel === 'mobilenet_v2' ? 'Accurate' : 'Fast'} mode)`);
        return loadedModel;
      } catch (err: any) {
        console.error('Failed to load COCO-SSD:', err);
        setModelLoading(false);
        speak('Failed to load vision model');
        throw err;
      } finally {
        modelLoadingPromise = null;
      }
    },
    [setModelLoaded, setModelLoading, speak]
  );

  // Reload model when base changes in settings
  useEffect(() => {
    if (currentModelBase && currentModelBase !== detectionSettings.modelBase) {
      loadModel(detectionSettings.modelBase).catch(() => {});
    }
  }, [detectionSettings.modelBase, loadModel]);

  // Main Detection Loop
  const runDetection = useCallback(async () => {
    if (!isDetecting || !loadedModel) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Check video readiness: readyState === 4 and videoWidth/Height > 0
    if (!video || !canvas || video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
      animFrameIdRef.current = requestAnimationFrame(runDetection);
      return;
    }

    const now = performance.now();
    // Throttle to 8-10 FPS (interval ~110ms)
    const elapsed = now - lastFrameTimeRef.current;
    if (elapsed < 110) {
      animFrameIdRef.current = requestAnimationFrame(runDetection);
      return;
    }
    lastFrameTimeRef.current = now;

    // FPS calculation
    frameCountRef.current++;
    if (now - fpsTimerRef.current >= 1000) {
      setCurrentFps(Math.round((frameCountRef.current * 1000) / (now - fpsTimerRef.current)));
      frameCountRef.current = 0;
      fpsTimerRef.current = now;
    }

    // Update video resolution
    setVideoResolution({ width: video.videoWidth, height: video.videoHeight });

    try {
      // Detect up to 20 objects with configured confidence threshold (default 0.4)
      const predictions = await loadedModel.detect(
        video,
        20,
        detectionSettings.confidenceThreshold
      );

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Sync canvas internal dimensions to exact video dimensions
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        // Clear canvas every frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const currentObstacles: DetectedObstacle[] = [];
        const frameDetectionsForStats: Array<{ className: string; cx: number; cy: number }> = [];

        let highestUrgencyDistance: 'very close' | 'close' | 'far' | null = null;

        // Draw EVERY detected object (all 80 classes)
        for (const pred of predictions) {
          const [x, y, w, h] = pred.bbox;
          const direction = calculateDirection(x, w, canvas.width);
          const { distance, estimatedMeters } = calculateDistance(w, h, canvas.width, canvas.height);
          const dangerLevel = getDangerLevel(pred.class, distance);
          const color = getClassColor(pred.class);

          const obstacle: DetectedObstacle = {
            id: `${pred.class}-${Math.round(x)}-${Math.round(y)}`,
            class: pred.class,
            confidence: Math.round(pred.score * 100),
            bbox: [x, y, w, h],
            direction,
            distance,
            estimatedMeters,
            dangerLevel,
            timestamp: Date.now(),
            color,
          };

          currentObstacles.push(obstacle);

          // Normalized center for unique object stats tracker
          frameDetectionsForStats.push({
            className: pred.class,
            cx: (x + w / 2) / canvas.width,
            cy: (y + h / 2) / canvas.height,
          });

          // 1. Draw Bounding Box with glow
          ctx.strokeStyle = color;
          ctx.lineWidth = distance === 'very close' ? 5 : distance === 'close' ? 3.5 : 2.5;
          ctx.shadowColor = color;
          ctx.shadowBlur = distance === 'very close' ? 14 : 6;
          ctx.strokeRect(x, y, w, h);

          // 2. Draw Filled Label Tag Above Box
          ctx.shadowBlur = 0;
          const labelText = `${pred.class} ${Math.round(pred.score * 100)}% • ${distance}`;
          ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
          const textMetrics = ctx.measureText(labelText);
          const tagWidth = textMetrics.width + 16;
          const tagHeight = 26;
          const tagY = Math.max(0, y - tagHeight - 4);

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(x, tagY, tagWidth, tagHeight, 6);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.fillText(labelText, x + 8, tagY + 18);

          // Proximity tracking
          if (distance === 'very close') {
            highestUrgencyDistance = 'very close';
          } else if (distance === 'close' && highestUrgencyDistance !== 'very close') {
            highestUrgencyDistance = 'close';
          } else if (distance === 'far' && !highestUrgencyDistance) {
            highestUrgencyDistance = 'far';
          }
        }

        // Update Zustand live detections
        setDetectedObjects(currentObstacles);

        // Update real unique objects tracker in statsStore
        if (frameDetectionsForStats.length > 0) {
          const newConfirmed = useStatsStore
            .getState()
            .recordObjectFrameDetections(frameDetectionsForStats);

          if (newConfirmed > 0) {
            // Real event logging to recent activities
            const sampleClass = frameDetectionsForStats[0].className;
            addRecentActivity({
              action: `Object Confirmed (${newConfirmed})`,
              details: `${sampleClass} and surroundings confirmed in path`,
              status: 'Completed',
              iconType: 'camera',
            });
          }
        }

        // Haptic & Audio Feedback for Proximity
        if (highestUrgencyDistance) {
          playObstacleFeedback(highestUrgencyDistance);
        }

        // Speech Alerts in Priority Order:
        // 1. Group objects by urgency
        const veryCloseList = currentObstacles.filter((o) => o.distance === 'very close');
        const closeList = currentObstacles.filter((o) => o.distance === 'close');
        const farList = currentObstacles.filter((o) => o.distance === 'far');

        const currentTime = Date.now();
        const candidateSpeechItems: Array<{ text: string; key: string; isVeryClose: boolean }> = [];

        // Check very close
        for (const item of veryCloseList) {
          const alertKey = `${item.class}-${item.direction}`;
          const lastSpoken = spokenAlertTimestampsRef.current.get(alertKey) || 0;
          if (currentTime - lastSpoken > 4000) {
            candidateSpeechItems.push({
              text: `${item.class} ${item.direction}, very close`,
              key: alertKey,
              isVeryClose: true,
            });
          }
        }

        // Check close
        for (const item of closeList) {
          const alertKey = `${item.class}-${item.direction}`;
          const lastSpoken = spokenAlertTimestampsRef.current.get(alertKey) || 0;
          if (currentTime - lastSpoken > 4000) {
            candidateSpeechItems.push({
              text: `${item.class} ${item.direction}`,
              key: alertKey,
              isVeryClose: false,
            });
          }
        }

        // Check far (only if speakFarObjects is enabled OR if nothing closer exists in the frame)
        if (detectionSettings.speakFarObjects || (veryCloseList.length === 0 && closeList.length === 0)) {
          for (const item of farList) {
            const alertKey = `${item.class}-${item.direction}`;
            const lastSpoken = spokenAlertTimestampsRef.current.get(alertKey) || 0;
            if (currentTime - lastSpoken > 4000) {
              candidateSpeechItems.push({
                text: `${item.class} ${item.direction}, far`,
                key: alertKey,
                isVeryClose: false,
              });
            }
          }
        }

        // Form combined sentence (e.g., "Person ahead and chair on your left")
        if (candidateSpeechItems.length > 0) {
          // Limit to max 3 items in one sentence to avoid speech lag
          const selected = candidateSpeechItems.slice(0, 3);
          for (const s of selected) {
            spokenAlertTimestampsRef.current.set(s.key, currentTime);
          }

          let combinedSentence = '';
          const phrases = selected.map((s) => s.text);
          if (phrases.length === 1) {
            combinedSentence = phrases[0];
          } else if (phrases.length === 2) {
            combinedSentence = `${phrases[0]} and ${phrases[1]}`;
          } else {
            combinedSentence = `${phrases[0]}, ${phrases[1]}, and ${phrases[2]}`;
          }

          const hasVeryClose = selected.some((s) => s.isVeryClose);
          const finalSpoken = hasVeryClose ? `Warning: ${combinedSentence}` : combinedSentence;

          speak(finalSpoken, hasVeryClose);
        }
      }
    } catch (err) {
      console.warn('Detection frame error:', err);
    }

    animFrameIdRef.current = requestAnimationFrame(runDetection);
  }, [
    addRecentActivity,
    canvasRef,
    detectionSettings.confidenceThreshold,
    detectionSettings.speakFarObjects,
    isDetecting,
    setCurrentFps,
    setDetectedObjects,
    setVideoResolution,
    speak,
    videoRef,
  ]);

  // Start Detection
  const startDetection = useCallback(async () => {
    try {
      if (!loadedModel || currentModelBase !== detectionSettings.modelBase) {
        await loadModel(detectionSettings.modelBase);
      }
      setDetecting(true);
      speak('Starting object detection');
      addRecentActivity({
        action: 'Object Detection Started',
        details: `Scanning path with ${detectionSettings.modelBase === 'mobilenet_v2' ? 'Accurate' : 'Fast'} model`,
        status: 'Active',
        iconType: 'camera',
      });
    } catch (e) {
      speak('Could not start detection');
    }
  }, [addRecentActivity, detectionSettings.modelBase, loadModel, setDetecting, speak]);

  // Stop Detection
  const stopDetection = useCallback(() => {
    setDetecting(false);
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setDetectedObjects([]);
    setCurrentFps(0);
    speak('Object detection stopped');
  }, [canvasRef, setCurrentFps, setDetectedObjects, setDetecting, speak]);

  // Gemini Vision Fallback (Scene Description for stairs, walls, poles, ground hazards)
  const describeScene = useCallback(async () => {
    const now = Date.now();
    // Rate limit: max 1 request every 3 seconds
    if (now - lastSceneDescribeTimeRef.current < 3000) {
      speak('Please wait a moment before describing the scene again.');
      return;
    }

    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      speak('Camera is not active. Please start camera first.');
      return;
    }

    lastSceneDescribeTimeRef.current = now;
    setIsDescribingScene(true);
    speak('Analyzing scene with Gemini vision...');

    try {
      // Capture frame to offscreen canvas (max 1024px wide)
      const offscreenCanvas = document.createElement('canvas');
      const maxDim = 1024;
      let targetW = video.videoWidth;
      let targetH = video.videoHeight;
      if (targetW > maxDim) {
        targetH = Math.round((maxDim / targetW) * targetH);
        targetW = maxDim;
      }
      offscreenCanvas.width = targetW;
      offscreenCanvas.height = targetH;
      const offCtx = offscreenCanvas.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(video, 0, 0, targetW, targetH);
        const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.85);
        const base64Jpeg = dataUrl.split(',')[1];

        const description = await describeSceneImage(base64Jpeg);
        setLastSceneDescription(description);
        speak(description, false);

        addRecentActivity({
          action: 'Scene Described',
          details: description,
          status: 'Completed',
          iconType: 'camera',
        });
      }
    } catch (err: any) {
      console.warn('Scene description error:', err);
      speak('Could not complete scene analysis.');
    } finally {
      setIsDescribingScene(false);
    }
  }, [addRecentActivity, setIsDescribingScene, setLastSceneDescription, speak, videoRef]);

  useEffect(() => {
    if (isDetecting) {
      animFrameIdRef.current = requestAnimationFrame(runDetection);
    } else {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    }

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isDetecting, runDetection]);

  return {
    isDetecting,
    isModelLoading,
    isModelLoaded,
    loadModel,
    startDetection,
    stopDetection,
    describeScene,
  };
}
