// Modern UI sound effects using Web Audio API + Haptic Feedback
// Combines audio and vibration for a premium mobile experience

/**
 * Modern Haptic Engine for vibration patterns
 * Uses the Vibration API (supported on most mobile browsers)
 */
class HapticEngine {
    private isSupported: boolean;

    constructor() {
        this.isSupported = 'vibrate' in navigator;
    }

    /**
     * Check if haptics are supported and enabled
     */
    canVibrate(): boolean {
        return this.isSupported;
    }

    /**
     * Light tap - for subtle interactions like clicks
     */
    lightTap() {
        if (this.canVibrate()) {
            navigator.vibrate(10);
        }
    }

    /**
     * Medium tap - for confirmations and selections
     */
    mediumTap() {
        if (this.canVibrate()) {
            navigator.vibrate(25);
        }
    }

    /**
     * Success haptic - double pulse for positive actions
     */
    success() {
        if (this.canVibrate()) {
            navigator.vibrate([15, 50, 15]); // tap-pause-tap
        }
    }

    /**
     * Soft bump - for removal actions
     */
    softBump() {
        if (this.canVibrate()) {
            navigator.vibrate(20);
        }
    }

    /**
     * Notification haptic - attention-grabbing pattern
     */
    notification() {
        if (this.canVibrate()) {
            navigator.vibrate([10, 30, 10, 30, 20]); // ping-ping-longer
        }
    }

    /**
     * Error haptic - distinct error pattern
     */
    error() {
        if (this.canVibrate()) {
            navigator.vibrate([50, 30, 50]); // strong buzz pattern
        }
    }

    /**
     * Custom pattern - for special effects
     * @param pattern Array of vibration/pause durations in ms
     */
    custom(pattern: number[]) {
        if (this.canVibrate()) {
            navigator.vibrate(pattern);
        }
    }

    /**
     * Stop any ongoing vibration
     */
    stop() {
        if (this.canVibrate()) {
            navigator.vibrate(0);
        }
    }
}

// Export haptic engine singleton
export const hapticEngine = new HapticEngine();

class SoundPlayer {
    private audioContext: AudioContext | null = null;

    private getContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    /**
     * Play a pleasant "follow" sound - rising tone with haptic feedback
     */
    playFollowSound() {
        try {
            // Trigger haptic feedback for mobile devices
            hapticEngine.success();

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
     * Play a pleasant "unfollow" sound - falling tone with haptic feedback
     */
    playUnfollowSound() {
        try {
            // Trigger haptic feedback for mobile devices
            hapticEngine.softBump();

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
     * Play a subtle click sound for general UI interactions with light haptic
     */
    playClickSound() {
        try {
            // Trigger light haptic feedback for mobile devices
            hapticEngine.lightTap();

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

    /**
     * Play a modern wishlist add sound - upward chirp with harmony + haptic
     */
    playWishlistAddSound() {
        try {
            // Trigger success haptic for positive action
            hapticEngine.success();

            const ctx = this.getContext();

            // Resume audio context if suspended
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const now = ctx.currentTime;

            // Create oscillator for the main tone
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            // Add a subtle filter for warmth
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 2000;

            // Connect nodes: oscillator -> filter -> gain -> destination
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Configure the sound
            oscillator.type = 'sine';

            // Rising pitch: starts at 600Hz, rises to 1000Hz
            oscillator.frequency.setValueAtTime(600, now);
            oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.1);

            // Volume envelope: quick attack, gentle decay
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            // Play the sound
            oscillator.start(now);
            oscillator.stop(now + 0.15);

            // Add a second harmonic for richness
            const harmonic = ctx.createOscillator();
            const harmonicGain = ctx.createGain();

            harmonic.connect(harmonicGain);
            harmonicGain.connect(ctx.destination);

            harmonic.type = 'sine';
            harmonic.frequency.setValueAtTime(1200, now);
            harmonic.frequency.exponentialRampToValueAtTime(1600, now + 0.1);

            harmonicGain.gain.setValueAtTime(0, now);
            harmonicGain.gain.linearRampToValueAtTime(0.08, now + 0.02);
            harmonicGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

            harmonic.start(now);
            harmonic.stop(now + 0.12);
        } catch (error) {
            console.warn('Could not play wishlist add sound:', error);
        }
    }

    /**
     * Play a modern wishlist remove sound - downward chirp with haptic
     */
    playWishlistRemoveSound() {
        try {
            // Trigger soft bump haptic for removal action
            hapticEngine.softBump();

            const ctx = this.getContext();

            // Resume audio context if suspended
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const now = ctx.currentTime;

            // Create oscillator for the main tone
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Configure the sound
            oscillator.type = 'sine';

            // Falling pitch: starts at 800Hz, falls to 400Hz
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);

            // Volume envelope
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.12, now + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

            // Play the sound
            oscillator.start(now);
            oscillator.stop(now + 0.12);
        } catch (error) {
            console.warn('Could not play wishlist remove sound:', error);
        }
    }

    /**
     * Play a modern notification sound - soft double-ping with haptic
     */
    playNotificationSound() {
        try {
            // Trigger notification haptic pattern
            hapticEngine.notification();

            const ctx = this.getContext();
            if (ctx.state === 'suspended') ctx.resume();

            const now = ctx.currentTime;

            // First ping (lower)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, now); // A5
            osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.05); // C6

            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(0.1, now + 0.01);
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            osc1.start(now);
            osc1.stop(now + 0.1);

            // Second ping (higher, slight delay)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);

            const delay = 0.05;
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1318.51, now + delay); // E6
            osc2.frequency.exponentialRampToValueAtTime(1567.98, now + delay + 0.05); // G6

            gain2.gain.setValueAtTime(0, now + delay);
            gain2.gain.linearRampToValueAtTime(0.08, now + delay + 0.01);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.12);

            osc2.start(now + delay);
            osc2.stop(now + delay + 0.12);
        } catch (error) {
            console.warn('Could not play notification sound:', error);
        }
    }
    /**
     * Play a pleasant "add to cart" sound - snappy positive chirp with haptic
     */
    playCartAddSound() {
        try {
            // Trigger medium tap haptic for cart action
            hapticEngine.mediumTap();

            const ctx = this.getContext();
            if (ctx.state === 'suspended') ctx.resume();

            const now = ctx.currentTime;

            // Main snappy ping
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.start(now);
            osc.stop(now + 0.15);
        } catch (error) {
            console.warn('Could not play cart add sound:', error);
        }
    }
}

// Export a singleton instance
export const soundPlayer = new SoundPlayer();

// Convenience exports - Combined Sound + Haptic (default)
export const playFollowSound = () => soundPlayer.playFollowSound();
export const playUnfollowSound = () => soundPlayer.playUnfollowSound();
export const playClickSound = () => soundPlayer.playClickSound();
export const playWishlistAddSound = () => soundPlayer.playWishlistAddSound();
export const playWishlistRemoveSound = () => soundPlayer.playWishlistRemoveSound();
export const playNotificationSound = () => soundPlayer.playNotificationSound();
export const playCartAddSound = () => soundPlayer.playCartAddSound();

// Haptic-only exports (for subtle feedback or when sound is disabled)
export const triggerLightTap = () => hapticEngine.lightTap();
export const triggerMediumTap = () => hapticEngine.mediumTap();
export const triggerSuccessHaptic = () => hapticEngine.success();
export const triggerSoftBump = () => hapticEngine.softBump();
export const triggerNotificationHaptic = () => hapticEngine.notification();
export const triggerErrorHaptic = () => hapticEngine.error();
export const triggerCustomHaptic = (pattern: number[]) => hapticEngine.custom(pattern);

// Utility to check if haptics are supported
export const isHapticsSupported = () => hapticEngine.canVibrate();
