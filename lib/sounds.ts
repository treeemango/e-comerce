// Modern UI sound effects using Web Audio API

class SoundPlayer {
    private audioContext: AudioContext | null = null;

    private getContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    /**
     * Play a pleasant "follow" sound - rising tone
     */
    playFollowSound() {
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            // Create oscillator for the main tone
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Rising frequency for positive action
            oscillator.frequency.setValueAtTime(600, now);
            oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.1);

            // Volume envelope - quick attack, smooth decay
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            oscillator.type = 'sine';
            oscillator.start(now);
            oscillator.stop(now + 0.15);
        } catch (error) {
            console.warn('Could not play follow sound:', error);
        }
    }

    /**
     * Play a pleasant "unfollow" sound - falling tone
     */
    playUnfollowSound() {
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            // Create oscillator for the main tone
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Falling frequency for removal action
            oscillator.frequency.setValueAtTime(700, now);
            oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);

            // Volume envelope
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.12, now + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

            oscillator.type = 'sine';
            oscillator.start(now);
            oscillator.stop(now + 0.12);
        } catch (error) {
            console.warn('Could not play unfollow sound:', error);
        }
    }

    /**
     * Play a subtle click sound for general UI interactions
     */
    playClickSound() {
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.setValueAtTime(800, now);

            gainNode.gain.setValueAtTime(0.08, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

            oscillator.type = 'sine';
            oscillator.start(now);
            oscillator.stop(now + 0.05);
        } catch (error) {
            console.warn('Could not play click sound:', error);
        }
    }
}

// Export a singleton instance
export const soundPlayer = new SoundPlayer();

// Convenience exports
export const playFollowSound = () => soundPlayer.playFollowSound();
export const playUnfollowSound = () => soundPlayer.playUnfollowSound();
export const playClickSound = () => soundPlayer.playClickSound();
