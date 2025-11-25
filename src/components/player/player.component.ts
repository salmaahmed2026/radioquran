
import { Component, signal, ViewChild, ElementRef, AfterViewInit, ChangeDetectionStrategy, computed, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player',
  imports: [CommonModule],
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;

  isPlaying = signal(false);
  isMuted = signal(false);
  volume = signal(0.75);
  audioError = signal(false);
  linkCopied = signal(false);
  
  audioSrc = 'https://stream.radiojar.com/8s5u5tpdtwzuv';
  
  // For visualizer
  barHeights = signal<number[]>(Array(30).fill(5));
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;
  private isAudioContextInitialized = false;

  // Social sharing URLs
  readonly shareUrl = window.location.href;
  readonly shareText = 'استمع إلى إذاعة القرآن الكريم من القاهرة بث مباشر';
  readonly facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareUrl)}`;
  readonly twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(this.shareUrl)}&text=${encodeURIComponent(this.shareText)}`;
  readonly whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(this.shareText + ' ' + this.shareUrl)}`;

  constructor(private zone: NgZone) {}
  
  volumeIconClass = computed(() => {
    if (this.isMuted() || this.volume() === 0) {
      return 'fa-solid fa-volume-xmark';
    }
    if (this.volume() < 0.5) {
      return 'fa-solid fa-volume-low';
    }
    return 'fa-solid fa-volume-high';
  });

  private get audio(): HTMLAudioElement {
    return this.audioPlayerRef.nativeElement;
  }
  
  ngAfterViewInit() {
    this.audio.volume = this.volume();
    this.audio.addEventListener('error', () => {
        this.audioError.set(true);
        this.isPlaying.set(false);
        this.stopVisualizer();
    });
    this.audio.addEventListener('playing', () => {
        this.isPlaying.set(true);
        this.audioError.set(false);
        this.startVisualizer();
    });
    this.audio.addEventListener('pause', () => {
        this.isPlaying.set(false);
        this.stopVisualizer();
    });
  }

  ngOnDestroy() {
    this.stopVisualizer();
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.audioContext?.close().catch(e => console.error("Error closing AudioContext:", e));
  }

  private setupAudioContext(): void {
    if (this.isAudioContextInitialized) return;

    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.source = this.audioContext.createMediaElementSource(this.audio);
      
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.isAudioContextInitialized = true;
    } catch (e) {
      console.error("Web Audio API not supported or failed to initialize:", e);
    }
  }
  
  private startVisualizer(): void {
    if (!this.isAudioContextInitialized || !this.analyser || !this.dataArray || this.animationFrameId) return;
    
    const renderFrame = () => {
      if (this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const newHeights = Array.from(this.dataArray).slice(0, 30).map(value => {
            const height = (value / 255) * 100;
            return Math.max(5, height);
        });
        this.barHeights.set(newHeights);
      }
      this.animationFrameId = requestAnimationFrame(renderFrame);
    };

    this.zone.runOutsideAngular(() => {
        renderFrame();
    });
  }

  private stopVisualizer(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.barHeights.set(Array(30).fill(5));
  }

  togglePlayPause(): void {
    if (this.audio.paused) {
      this.setupAudioContext();
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.audio.play().catch(e => {
        console.error("Playback failed:", e);
        this.audioError.set(true);
      });
    } else {
      this.audio.pause();
    }
  }

  onVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newVolume = parseFloat(target.value);
    this.volume.set(newVolume);
    this.audio.volume = newVolume;
    if (newVolume > 0 && this.isMuted()) {
        this.toggleMute();
    }
  }

  toggleMute(): void {
    this.isMuted.update(muted => !muted);
    this.audio.muted = this.isMuted();
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.shareUrl).then(() => {
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2000);
    }).catch(err => console.error('Failed to copy: ', err));
  }
}
