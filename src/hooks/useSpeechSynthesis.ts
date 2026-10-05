import { useCallback, useEffect, useRef } from 'react';
import { useVisionStore } from '../stores/useVisionStore';

interface SpeechItem {
  text: string;
  isUrgent: boolean;
}

export function useSpeechSynthesis() {
  const isSpeaking = useVisionStore((s) => s.isSpeaking);
  const setIsSpeaking = useVisionStore((s) => s.setIsSpeaking);
  const speechRate = useVisionStore((s) => s.speechRate);
  const speechVolume = useVisionStore((s) => s.speechVolume);
  const preferredLanguage = useVisionStore((s) => s.preferredLanguage);
  const announceAria = useVisionStore((s) => s.announceAria);

  const queueRef = useRef<SpeechItem[]>([]);
  const isProcessingRef = useRef(false);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      queueRef.current = [];
      setIsSpeaking(false);
      isProcessingRef.current = false;
    }
  }, [setIsSpeaking]);

  const processQueue = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isProcessingRef.current || queueRef.current.length === 0) return;

    const nextItem = queueRef.current.shift();
    if (!nextItem) return;

    isProcessingRef.current = true;
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(nextItem.text);
    utterance.rate = speechRate;
    utterance.volume = speechVolume;
    utterance.lang = preferredLanguage;

    // Select suitable voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) => v.lang.startsWith(preferredLanguage.split('-')[0]));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      isProcessingRef.current = false;
      setIsSpeaking(false);
      if (queueRef.current.length > 0) {
        processQueue();
      }
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      isProcessingRef.current = false;
      setIsSpeaking(false);
      if (queueRef.current.length > 0) {
        processQueue();
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [preferredLanguage, setIsSpeaking, speechRate, speechVolume]);

  const speak = useCallback(
    (text: string, isUrgent = false) => {
      if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      // Update screen reader live region
      announceAria(text);

      if (isUrgent) {
        // Urgent obstacle alerts interrupt normal speech immediately
        window.speechSynthesis.cancel();
        queueRef.current = [{ text, isUrgent: true }];
        isProcessingRef.current = false;
        processQueue();
      } else {
        // Prevent queue pileup (max 2 queued messages)
        if (queueRef.current.length >= 2) {
          queueRef.current.shift();
        }
        queueRef.current.push({ text, isUrgent: false });
        if (!isProcessingRef.current) {
          processQueue();
        }
      }
    },
    [announceAria, processQueue]
  );

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, cancelSpeech, isSpeaking };
}
