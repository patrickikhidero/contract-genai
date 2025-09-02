'use client';

import { useEffect, useState } from 'react';

interface TypingAnimationProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export default function TypingAnimation({ 
  text, 
  speed = 20, 
  className = '', 
  onComplete 
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, text, speed, isComplete, onComplete]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  return (
    <div className={`p-6 prose max-w-none contract-content ${className}`}>
      <div dangerouslySetInnerHTML={{ __html: displayedText }} />
      {!isComplete && (
        <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse" />
      )}
    </div>
  );
}
