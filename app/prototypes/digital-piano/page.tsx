"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './styles.module.css';

// Piano key data with frequencies and keyboard mappings
// First octave: A-K keys, Second octave: Z-; keys
const pianoKeys = [
  // First octave (C4 to C5)
  { note: 'C', freq: 261.63, white: true, key: 'a' },
  { note: 'C#', freq: 277.18, white: false, key: 'w' },
  { note: 'D', freq: 293.66, white: true, key: 's' },
  { note: 'D#', freq: 311.13, white: false, key: 'e' },
  { note: 'E', freq: 329.63, white: true, key: 'd' },
  { note: 'F', freq: 349.23, white: true, key: 'f' },
  { note: 'F#', freq: 369.99, white: false, key: 't' },
  { note: 'G', freq: 392.00, white: true, key: 'g' },
  { note: 'G#', freq: 415.30, white: false, key: 'y' },
  { note: 'A', freq: 440.00, white: true, key: 'h' },
  { note: 'A#', freq: 466.16, white: false, key: 'u' },
  { note: 'B', freq: 493.88, white: true, key: 'j' },
  { note: 'C5', freq: 523.25, white: true, key: 'k' },
  // Second octave (C5 to C6)
  { note: 'C#5', freq: 554.37, white: false, key: 'o' },
  { note: 'D5', freq: 587.33, white: true, key: 'l' },
  { note: 'D#5', freq: 622.25, white: false, key: 'p' },
  { note: 'E5', freq: 659.25, white: true, key: ';' },
  { note: 'F5', freq: 698.46, white: true, key: 'z' },
  { note: 'F#5', freq: 739.99, white: false, key: 'x' },
  { note: 'G5', freq: 783.99, white: true, key: 'c' },
  { note: 'G#5', freq: 830.61, white: false, key: 'v' },
  { note: 'A5', freq: 880.00, white: true, key: 'b' },
  { note: 'A#5', freq: 932.33, white: false, key: 'n' },
  { note: 'B5', freq: 987.77, white: true, key: 'm' },
  { note: 'C6', freq: 1046.50, white: true, key: ',' },
];

export default function DigitalPiano() {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState(0.6);
  const [oscillatorType, setOscillatorType] = useState<OscillatorType>('sine');
  const [visualBars, setVisualBars] = useState<number[]>(new Array(12).fill(0));
  const [idleAnimation, setIdleAnimation] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const activeOscillatorsRef = useRef<Map<string, { oscillator: OscillatorNode, gainNode: GainNode }>>(new Map());
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const idleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    return () => {
      activeOscillatorsRef.current.forEach(({ oscillator, gainNode }) => {
        try {
          oscillator.stop();
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {}
      });
      activeOscillatorsRef.current.clear();
      audioContextRef.current?.close();
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
      autoplayTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  useEffect(() => {
    if (idleAnimation) {
      idleIntervalRef.current = setInterval(() => {
        setVisualBars(prev => {
          return prev.map(() => 20 + Math.random() * 30);
        });
      }, 800);
    } else {
      if (idleIntervalRef.current) {
        clearInterval(idleIntervalRef.current);
        idleIntervalRef.current = null;
      }
    }

    return () => {
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
    };
  }, [idleAnimation]);

  const changeVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    
    if (audioContextRef.current) {
      activeOscillatorsRef.current.forEach(({ gainNode }) => {
        gainNode.gain.cancelScheduledValues(audioContextRef.current!.currentTime);
        gainNode.gain.setValueAtTime(
          clampedVolume * 0.5,
          audioContextRef.current!.currentTime
        );
      });
    }
  }, []);

  const startNote = useCallback((freq: number, note: string) => {
    if (!audioContextRef.current) return;
    if (activeOscillatorsRef.current.has(note)) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = freq;
    oscillator.type = oscillatorType;

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.5, ctx.currentTime + 0.01);

    oscillator.start(ctx.currentTime);
    
    activeOscillatorsRef.current.set(note, { oscillator, gainNode });
    setActiveKeys(prev => new Set(prev).add(note));
    
    setIdleAnimation(false);
    const barIndex = Math.floor(Math.random() * 12);
    const height = 50 + Math.random() * 70;
    setVisualBars(prev => {
      const newBars = [...prev];
      newBars[barIndex] = height;
      return newBars;
    });
    
    setTimeout(() => {
      setVisualBars(prev => {
        const newBars = [...prev];
        newBars[barIndex] = 20 + Math.random() * 30;
        return newBars;
      });
    }, 300);
    
    setTimeout(() => {
      if (activeOscillatorsRef.current.size === 0) {
        setIdleAnimation(true);
      }
    }, 2000);
  }, [volume, oscillatorType]);

  const stopNote = useCallback((note: string) => {
    const nodes = activeOscillatorsRef.current.get(note);
    if (!nodes || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const { oscillator, gainNode } = nodes;

    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);

    setTimeout(() => {
      try {
        oscillator.stop();
        oscillator.disconnect();
        gainNode.disconnect();
      } catch (e) {}
      activeOscillatorsRef.current.delete(note);
    }, 60);

    setActiveKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(note);
      return newSet;
    });
  }, []);

  const playFurElise = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    autoplayTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    autoplayTimeoutsRef.current = [];

    const melody = [
      { note: 'E5', duration: 300 },
      { note: 'D#5', duration: 300 },
      { note: 'E5', duration: 300 },
      { note: 'D#5', duration: 300 },
      { note: 'E5', duration: 300 },
      { note: 'B', duration: 300 },
      { note: 'D5', duration: 300 },
      { note: 'C5', duration: 300 },
      { note: 'A', duration: 600 },
      { note: 'rest', duration: 300 },
      { note: 'C', duration: 300 },
      { note: 'E', duration: 300 },
      { note: 'A', duration: 300 },
      { note: 'B', duration: 600 },
      { note: 'rest', duration: 300 },
      { note: 'E', duration: 300 },
      { note: 'G#', duration: 300 },
      { note: 'B', duration: 300 },
      { note: 'C5', duration: 600 },
    ];

    let currentTime = 0;
    
    melody.forEach(({ note, duration }) => {
      if (note === 'rest') {
        currentTime += duration;
        return;
      }

      const pianoKey = pianoKeys.find(k => k.note === note);
      if (!pianoKey) return;

      const timeout1 = setTimeout(() => {
        startNote(pianoKey.freq, pianoKey.note);
      }, currentTime);
      
      const timeout2 = setTimeout(() => {
        stopNote(pianoKey.note);
      }, currentTime + duration - 50);

      autoplayTimeoutsRef.current.push(timeout1, timeout2);
      currentTime += duration;
    });

    const finishTimeout = setTimeout(() => {
      setIsPlaying(false);
    }, currentTime);
    autoplayTimeoutsRef.current.push(finishTimeout);
  }, [isPlaying, startNote, stopNote]);

  const stopAutoplay = useCallback(() => {
    autoplayTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    autoplayTimeoutsRef.current = [];
    
    activeOscillatorsRef.current.forEach((_, note) => {
      stopNote(note);
    });
    
    setIsPlaying(false);
  }, [stopNote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
        e.preventDefault();
        changeVolume(volume + 0.1);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === '-' || e.key === '_') {
        e.preventDefault();
        changeVolume(volume - 0.1);
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        changeVolume(volume > 0 ? 0 : 0.6);
        return;
      }

      if (pressedKeysRef.current.has(e.key.toLowerCase())) return;
      
      const pianoKey = pianoKeys.find(k => k.key === e.key.toLowerCase());
      if (pianoKey) {
        e.preventDefault();
        pressedKeysRef.current.add(e.key.toLowerCase());
        startNote(pianoKey.freq, pianoKey.note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const pianoKey = pianoKeys.find(k => k.key === e.key.toLowerCase());
      if (pianoKey) {
        pressedKeysRef.current.delete(e.key.toLowerCase());
        stopNote(pianoKey.note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [volume, changeVolume, startNote, stopNote]);

  const handleMouseDown = (freq: number, note: string) => {
    startNote(freq, note);
  };

  const handleMouseUp = (note: string) => {
    stopNote(note);
  };

  const handleMouseLeave = (note: string) => {
    if (activeKeys.has(note)) {
      stopNote(note);
    }
  };

  const updateVolumeFromPosition = (clientX: number) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    changeVolume(percentage);
  };

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    updateVolumeFromPosition(e.clientX);
  };

  const handleSliderMouseMove = (e: MouseEvent) => {
    if (isDraggingRef.current) {
      updateVolumeFromPosition(e.clientX);
    }
  };

  const handleSliderMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleSliderTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    updateVolumeFromPosition(e.touches[0].clientX);
  };

  const handleSliderTouchMove = (e: TouchEvent) => {
    if (isDraggingRef.current && e.touches.length > 0) {
      updateVolumeFromPosition(e.touches[0].clientX);
    }
  };

  const handleSliderTouchEnd = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleSliderMouseMove);
    window.addEventListener('mouseup', handleSliderMouseUp);
    window.addEventListener('touchmove', handleSliderTouchMove);
    window.addEventListener('touchend', handleSliderTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleSliderMouseMove);
      window.removeEventListener('mouseup', handleSliderMouseUp);
      window.removeEventListener('touchmove', handleSliderTouchMove);
      window.removeEventListener('touchend', handleSliderTouchEnd);
    };
  }, []);

  return (
    <div className={styles.desktop}>
      <div className={styles.contentWrapper}>
        <div className={styles.window}>
          <div className={styles.titleBar}>
            <div className={styles.stripes}></div>
            <div className={styles.titleText}>Digital Piano</div>
            <div className={styles.closeBox}></div>
          </div>

          <div className={styles.windowContent}>
            <div className={styles.infoPanel}>
              <div className={styles.infoText}>
                <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>🎹 Digital Piano</p>
                <p style={{ fontSize: '12px' }}>
                  2 octaves: A-K (low) + Z-comma (high) • ↑↓/+/- volume • M mute
                </p>
              </div>
            </div>

            <div className={styles.pianoContainer}>
              <div className={styles.piano}>
                {pianoKeys.map((key) => (
                  <button
                    key={key.note}
                    className={`${styles.key} ${key.white ? styles.whiteKey : styles.blackKey} ${
                      activeKeys.has(key.note) ? styles.active : ''
                    }`}
                    onMouseDown={() => handleMouseDown(key.freq, key.note)}
                    onMouseUp={() => handleMouseUp(key.note)}
                    onMouseLeave={() => handleMouseLeave(key.note)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleMouseDown(key.freq, key.note);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleMouseUp(key.note);
                    }}
                    aria-label={`Play ${key.note} (${key.key.toUpperCase()} key)`}
                  >
                    <span className={styles.keyLabel}>
                      {key.note}
                      <span className={styles.keyboardShortcut}>{key.key.toUpperCase()}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.controlPanel}>
              <div className={styles.control}>
                <span className={styles.controlLabel}>Volume:</span>
                <button 
                  className={styles.volumeButton}
                  onClick={() => changeVolume(volume - 0.1)}
                  aria-label="Decrease volume"
                >
                  −
                </button>
                <div 
                  ref={sliderRef}
                  className={styles.slider}
                  onMouseDown={handleSliderMouseDown}
                  onTouchStart={handleSliderTouchStart}
                >
                  <div className={styles.sliderTrack}></div>
                  <div 
                    className={styles.sliderThumb}
                    style={{ left: `${volume * 100}%` }}
                  ></div>
                </div>
                <button 
                  className={styles.volumeButton}
                  onClick={() => changeVolume(volume + 0.1)}
                  aria-label="Increase volume"
                >
                  +
                </button>
                <span className={styles.volumeDisplay}>{Math.round(volume * 100)}%</span>
              </div>
              
              <div className={styles.autoplayControl}>
                {!isPlaying ? (
                  <button 
                    className={styles.autoplayButton}
                    onClick={playFurElise}
                    aria-label="Play Für Elise"
                  >
                    ▶ Play Für Elise
                  </button>
                ) : (
                  <button 
                    className={styles.autoplayButton}
                    onClick={stopAutoplay}
                    aria-label="Stop playing"
                  >
                    ⏹ Stop
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.visualizationWindow}>
            <div className={styles.titleBar}>
              <div className={styles.stripes}></div>
              <div className={styles.titleText}>Visualization</div>
              <div className={styles.closeBox}></div>
            </div>
            <div className={styles.visualizationContent}>
              <div className={styles.visualization}>
                {visualBars.map((height, index) => (
                  <div
                    key={index}
                    className={`${styles.visualBar} ${!idleAnimation && height > 50 ? styles.active : ''}`}
                    style={{ height: `${height}px` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.settingsWindow}>
            <div className={styles.titleBar}>
              <div className={styles.stripes}></div>
              <div className={styles.titleText}>Sound Settings</div>
              <div className={styles.closeBox}></div>
            </div>

            <div className={styles.windowContent}>
              <div className={styles.settingsPanel}>
                <p className={styles.settingsLabel}>Waveform:</p>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="oscillator"
                      value="sine"
                      checked={oscillatorType === 'sine'}
                      onChange={(e) => setOscillatorType(e.target.value as OscillatorType)}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioText}>Sine</span>
                    <span className={styles.radioDescription}>Pure, smooth tone</span>
                  </label>
                  
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="oscillator"
                      value="triangle"
                      checked={oscillatorType === 'triangle'}
                      onChange={(e) => setOscillatorType(e.target.value as OscillatorType)}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioText}>Triangle</span>
                    <span className={styles.radioDescription}>Mellow, soft</span>
                  </label>
                  
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="oscillator"
                      value="square"
                      checked={oscillatorType === 'square'}
                      onChange={(e) => setOscillatorType(e.target.value as OscillatorType)}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioText}>Square</span>
                    <span className={styles.radioDescription}>Hollow, clarinet-like</span>
                  </label>
                  
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="oscillator"
                      value="sawtooth"
                      checked={oscillatorType === 'sawtooth'}
                      onChange={(e) => setOscillatorType(e.target.value as OscillatorType)}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioText}>Sawtooth</span>
                    <span className={styles.radioDescription}>Bright, brassy</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Link href="/" className={styles.desktopIcon}>
        <div className={styles.iconImage}>🏠</div>
        <div className={styles.iconLabel}>Home</div>
      </Link>
    </div>
  );
}
