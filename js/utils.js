// DrumHelper Utilities Module

/**
 * Utility functions for DrumHelper application
 */
class Utils {
    /**
     * Debounce function to limit the rate of function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Execute immediately on first call
     * @returns {Function} Debounced function
     */
    static debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    /**
     * Sanitize string input to prevent XSS
     * @param {string} input - Input string to sanitize
     * @returns {string} Sanitized string
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input
            .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
            .trim()
            .substring(0, 100); // Limit length
    }

    /**
     * Validate tempo value
     * @param {number} tempo - Tempo to validate
     * @returns {number} Valid tempo between 60-200 BPM
     */
    static validateTempo(tempo) {
        const num = parseInt(tempo);
        if (isNaN(num)) return 120;
        return Math.min(Math.max(num, 60), 200);
    }

    /**
     * Validate measures value
     * @param {number} measures - Measures to validate
     * @returns {number} Valid measures between 1-32
     */
    static validateMeasures(measures) {
        const num = parseInt(measures);
        if (isNaN(num)) return 4;
        return Math.min(Math.max(num, 1), 32);
    }

    /**
     * Generate unique ID
     * @returns {string} Unique identifier
     */
    static generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    static formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString('en-US');
        } catch (e) {
            return 'Unknown date';
        }
    }

    /**
     * Check if browser supports required features
     * @returns {Object} Support status for various features
     */
    static checkBrowserSupport() {
        return {
            webAudio: !!(window.AudioContext || window.webkitAudioContext),
            speechSynthesis: 'speechSynthesis' in window,
            localStorage: typeof Storage !== 'undefined' && window.localStorage,
            serviceWorker: 'serviceWorker' in navigator,
            webApp: window.matchMedia('(display-mode: standalone)').matches
        };
    }

    /**
     * Create and display a notification element
     * @param {string} message - Notification message
     * @param {'error'|'success'} type - Notification type
     * @param {number} duration - Duration in milliseconds
     * @returns {HTMLElement} Notification element
     */
    static createNotification(message, type = 'error', duration = 5000) {
        const notification = document.createElement('div');
        const backgroundColor = type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${backgroundColor};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            max-width: 90vw;
            text-align: center;
            backdrop-filter: blur(10px);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        this.removeNotificationAfterDelay(notification, duration);
        return notification;
    }

    /**
     * Remove notification element after delay
     * @param {HTMLElement} notification - Notification element to remove
     * @param {number} duration - Duration in milliseconds
     */
    static removeNotificationAfterDelay(notification, duration) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(-50%) translateY(-20px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);
    }

    /**
     * Create error notification element
     * @param {string} message - Error message
     * @param {number} duration - Duration in milliseconds
     * @returns {HTMLElement} Error notification element
     */
    static createErrorNotification(message, duration = 5000) {
        return this.createNotification(message, 'error', duration);
    }

    /**
     * Create success notification element
     * @param {string} message - Success message
     * @param {number} duration - Duration in milliseconds
     * @returns {HTMLElement} Success notification element
     */
    static createSuccessNotification(message, duration = 3000) {
        return this.createNotification(message, 'success', duration);
    }

    /**
     * Prevent sleep on mobile devices
     * @param {Event} e - Touch event
     */
    static preventSleep(e) {
        // Prevent sleep on mobile by handling touch events
        e.preventDefault();
    }
}

// Export for use in other modules
window.Utils = Utils;