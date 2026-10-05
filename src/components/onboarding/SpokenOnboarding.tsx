import React, { useState, useEffect } from 'react';
import { Mic, Camera, MapPin, CheckCircle2, ChevronRight, Volume2 } from 'lucide-react';
import { useVisionStore } from '../../stores/useVisionStore';

interface SpokenOnboardingProps {
  onComplete: () => void;
  speak: (text: string, isUrgent?: boolean) => void;
  onStartMic: () => void;
  onStartCamera: () => void;
}

export const SpokenOnboarding: React.FC<SpokenOnboardingProps> = ({
  onComplete,
  speak,
  onStartMic,
  onStartCamera,
}) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to VISION_AI',
      speech:
        'Welcome to VISION AI, your voice-first assistive companion. I will guide you through granting microphone, camera, and location permissions so you can navigate safely.',
      description:
        'Voice-first assistive intelligence engineered for blind and low-vision independence.',
      icon: Volume2,
      actionText: 'Begin Guided Setup',
    },
    {
      title: 'Step 1: Always-On Microphone',
      speech:
        'First, we need microphone permission. Our always-on voice brain listens continuously for your spoken commands in English, Hindi, or Marathi.',
      description:
        'Continuous speech control with on-device Voice Activity Detection and Gemini reasoning.',
      icon: Mic,
      actionText: 'Grant Microphone Access',
    },
    {
      title: 'Step 2: Rear Camera for Obstacles',
      speech:
        'Next, we need camera access. The rear camera scans your walking path for obstacles, pedestrians, vehicles, and hazards with directional distance feedback.',
      description:
        'COCO-SSD offline neural vision scanning with distance estimation and proximity beeps.',
      icon: Camera,
      actionText: 'Grant Camera Access',
    },
    {
      title: 'Step 3: High-Accuracy GPS',
      speech:
        'Finally, we need location access to announce where you are and compute safe turn-by-turn walking routes to any destination.',
      description:
        'Real-time reverse geocoding and OpenStreetMap turn guidance.',
      icon: MapPin,
      actionText: 'Grant Location Access',
    },
    {
      title: 'Setup Complete!',
      speech:
        'Setup is complete. You can now use voice commands like "Start detection", "Where am I", or "Navigate to Central Station". Remember, VISION AI does not replace a white cane or guide dog.',
      description:
        'VISION_AI is now ready. The dashboard and voice brain are fully operational.',
      icon: CheckCircle2,
      actionText: 'Enter VISION_AI Dashboard',
    },
  ];

  const currentStepData = steps[step];

  useEffect(() => {
    // Speak guidance on each step
    if (currentStepData) {
      speak(currentStepData.speech);
    }
  }, [step, currentStepData, speak]);

  const handleNext = async () => {
    if (step === 1) {
      // Trigger mic permission
      try {
        await onStartMic();
      } catch {}
    } else if (step === 2) {
      // Trigger camera permission
      try {
        await onStartCamera();
      } catch {}
    } else if (step === 3) {
      // Trigger geolocation permission
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => {},
          () => {}
        );
      }
    }

    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      onComplete();
    }
  };

  const Icon = currentStepData.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-fade-in"
    >
      <div className="w-full max-w-lg bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100 text-center">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Icon Badge */}
        <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-6 shadow-md border border-blue-100">
          <Icon className="w-10 h-10" aria-hidden="true" />
        </div>

        {/* Title & Description */}
        <h2 id="onboarding-title" className="text-2xl font-extrabold text-slate-900 mb-2">
          {currentStepData.title}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 font-medium mb-8 leading-relaxed max-w-md mx-auto">
          {currentStepData.description}
        </p>

        {/* Big Accessible Action Button */}
        <button
          onClick={handleNext}
          aria-label={currentStepData.actionText}
          className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-base font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition min-h-[56px] focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          <span>{currentStepData.actionText}</span>
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>

        {step > 0 && (
          <button
            onClick={onComplete}
            className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-700 p-2"
          >
            Skip to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};
