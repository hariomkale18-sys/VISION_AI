import { useCallback, useEffect, useRef } from 'react';
import { useVisionStore } from '../stores/useVisionStore';
import { encodeWAV } from '../utils/audioEncoder';
import { processVoiceUtterance } from '../services/gemini';
import { VoiceIntentResult } from '../types';

export function useContinuousMic(
  speak: (text: string, isUrgent?: boolean) => void,
  cancelSpeech: () => void,
  executeIntent: (result: VoiceIntentResult) => void
) {
  const isListening = useVisionStore((s) => s.isListening);
  const setListening = useVisionStore((s) => s.setListening);
  const setProcessingVoice = useVisionStore((s) => s.setProcessingVoice);
  const setMicLevel = useVisionStore((s) => s.setMicLevel);
  const setMicStatusText = useVisionStore((s) => s.setMicStatusText);
  const isSpeaking = useVisionStore((s) => s.isSpeaking);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);

  // VAD & Buffers
  const isSpeakingSpeechRef = useRef(false);
  const speechFramesRef = useRef<Float32Array[]>([]);
  const preRollBufferRef = useRef<Float32Array[]>([]);
  const silenceStartRef = useRef<number>(0);
  const speechStartRef = useRef<number>(0);
  const isProcessingUtteranceRef = useRef(false);

  // Auto-recovery state
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<any>(null);
  const shouldBeListeningRef = useRef(false);

  // Sync ref
  useEffect(() => {
    isSpeakingSpeechRef.current = isSpeaking;
  }, [isSpeaking]);

  const stopMic = useCallback((userInitiated = true) => {
    if (userInitiated) {
      shouldBeListeningRef.current = false;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (scriptNodeRef.current) {
      scriptNodeRef.current.disconnect();
      scriptNodeRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setMicLevel(0);
    if (userInitiated) {
      setListening(false);
      setMicStatusText('Microphone Off');
    }
  }, [setListening, setMicLevel, setMicStatusText]);

  const processUtterance = useCallback(
    async (samples: Float32Array, sampleRate: number) => {
      if (isProcessingUtteranceRef.current) return;
      isProcessingUtteranceRef.current = true;
      setProcessingVoice(true);
      setMicStatusText('Understanding voice command...');

      try {
        const base64Wav = encodeWAV(samples, sampleRate);
        const result = await processVoiceUtterance(base64Wav);

        if (result.error && typeof navigator !== 'undefined' && !navigator.onLine) {
          speak('Device is offline. Keeping vision detection active.');
        } else if (result.confidence < 0.4 || result.intent === 'UNKNOWN') {
          speak('Sorry, I did not understand, please say it again.');
          executeIntent(result);
        } else {
          executeIntent(result);
        }
      } catch (err) {
        console.error('Utterance processing error:', err);
        speak('Voice processing error. Please try again.');
      } finally {
        isProcessingUtteranceRef.current = false;
        setProcessingVoice(false);
        setMicStatusText(shouldBeListeningRef.current ? 'Listening...' : 'Microphone Standby');
      }
    },
    [executeIntent, setMicStatusText, setProcessingVoice, speak]
  );

  const startMic = useCallback(async () => {
    shouldBeListeningRef.current = true;

    try {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      setMicStatusText('Connecting microphone...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Handle stream disconnection / track end
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          console.warn('Microphone track ended unexpectedly');
          if (shouldBeListeningRef.current) {
            handleAutoRecovery();
          }
        };
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      // If AudioContext suspended, resume
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      audioCtx.onstatechange = () => {
        if (audioCtx.state === 'suspended' && shouldBeListeningRef.current) {
          audioCtx.resume().catch(() => {});
        }
      };

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      // ScriptProcessor for VAD buffering (bufferSize: 4096 = ~92ms at 44.1kHz)
      const scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptNodeRef.current = scriptNode;

      source.connect(analyser);
      analyser.connect(scriptNode);
      scriptNode.connect(audioCtx.destination);

      // Pre-roll buffer holds ~300ms (approx 3 chunks of 4096 samples at 44.1kHz)
      const maxPreRollChunks = 4;
      preRollBufferRef.current = [];
      speechFramesRef.current = [];
      let inSpeech = false;

      scriptNode.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Calculate RMS Energy
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const level = Math.min(100, Math.round(rms * 450));
        setMicLevel(level);

        // Echo prevention: If app is currently speaking, discard input unless user speaks loudly (interruption)
        if (isSpeakingSpeechRef.current) {
          if (rms > 0.12) {
            // Loud voice detected: cancel current speech output
            cancelSpeech();
          } else {
            // Echo discard
            return;
          }
        }

        const now = performance.now();
        // VAD Speech Threshold
        const SPEECH_THRESHOLD = 0.025;
        const isVoiceActive = rms > SPEECH_THRESHOLD;

        const copyBuffer = new Float32Array(inputData);

        if (!inSpeech) {
          // Keep pre-roll buffer fresh
          preRollBufferRef.current.push(copyBuffer);
          if (preRollBufferRef.current.length > maxPreRollChunks) {
            preRollBufferRef.current.shift();
          }

          if (isVoiceActive) {
            inSpeech = true;
            speechStartRef.current = now;
            silenceStartRef.current = 0;
            // Include pre-roll buffer in speech frames
            speechFramesRef.current = [...preRollBufferRef.current, copyBuffer];
            preRollBufferRef.current = [];
          }
        } else {
          // Inside an active utterance
          speechFramesRef.current.push(copyBuffer);
          const utteranceDuration = now - speechStartRef.current;

          if (isVoiceActive) {
            silenceStartRef.current = 0;
          } else {
            if (silenceStartRef.current === 0) {
              silenceStartRef.current = now;
            }
          }

          const silenceDuration = silenceStartRef.current > 0 ? now - silenceStartRef.current : 0;

          // Close utterance conditions:
          // 1. 700-900ms silence detected AND minimum 400ms utterance duration
          // 2. Maximum utterance 15 seconds
          const hasSufficientSilence = silenceDuration >= 800 && utteranceDuration >= 400;
          const hitMaxDuration = utteranceDuration >= 15000;

          if (hasSufficientSilence || hitMaxDuration) {
            inSpeech = false;

            // Flatten all captured frames
            const totalLength = speechFramesRef.current.reduce((acc, f) => acc + f.length, 0);
            const merged = new Float32Array(totalLength);
            let offset = 0;
            for (const f of speechFramesRef.current) {
              merged.set(f, offset);
              offset += f.length;
            }
            speechFramesRef.current = [];

            // Minimum length check
            if (totalLength > audioCtx.sampleRate * 0.4) {
              processUtterance(merged, audioCtx.sampleRate);
            }
          }
        }
      };

      setListening(true);
      setMicStatusText('Listening...');
      retryCountRef.current = 0;
    } catch (err) {
      console.warn('Microphone start error:', err);
      handleAutoRecovery();
    }
  }, [cancelSpeech, processUtterance, setListening, setMicLevel, setMicStatusText]);

  // Auto-recovery with exponential backoff
  const handleAutoRecovery = useCallback(() => {
    if (!shouldBeListeningRef.current) return;

    stopMic(false);
    retryCountRef.current++;
    const delay = Math.min(8000, 1000 * Math.pow(1.5, retryCountRef.current));

    setMicStatusText('Reconnecting microphone...');

    retryTimeoutRef.current = setTimeout(async () => {
      if (shouldBeListeningRef.current) {
        await startMic();
        speak('Microphone reconnected');
      }
    }, delay);
  }, [speak, startMic, stopMic]);

  useEffect(() => {
    return () => {
      stopMic(true);
    };
  }, [stopMic]);

  return {
    startMic,
    stopMic,
    isListening,
  };
}
