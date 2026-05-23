/**
 * Firebase Connection Fix
 * Handles network interruptions and connection recovery
 */

(function() {
  if (!window.FirebaseService) return;

  // Enable offline persistence
  if (window.firebase && window.firebase.firestore) {
    try {
      window.firebase.firestore().enablePersistence()
        .catch((err) => {
          if (err.code !== 'failed-precondition') {
            console.warn('Firestore offline persistence failed:', err);
          }
        });
    } catch (e) {
      console.warn('Could not enable Firestore persistence:', e);
    }
  }

  // Enhanced retry logic with exponential backoff
  const retryConfig = {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  };

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function retryWithBackoff(fn, retries = 0) {
    try {
      return await fn();
    } catch (error) {
      if (retries < retryConfig.maxRetries) {
        const delayMs = Math.min(
          retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, retries),
          retryConfig.maxDelay
        );
        console.log(`Retry attempt ${retries + 1}/${retryConfig.maxRetries} in ${delayMs}ms`);
        await delay(delayMs);
        return retryWithBackoff(fn, retries + 1);
      }
      throw error;
    }
  }

  // Network connectivity monitoring
  let isOnline = navigator.onLine;

  window.addEventListener('online', () => {
    isOnline = true;
    console.log('Connection restored. Syncing data...');
    document.dispatchEvent(new CustomEvent('firestore:online'));
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    console.log('Connection lost. Using cached data.');
    document.dispatchEvent(new CustomEvent('firestore:offline'));
  });

  // Override critical Firestore operations with retry logic
  const originalListenReports = window.FirebaseService.listenReports;
  window.FirebaseService.listenReports = function(callback) {
    const wrappedCallback = (reports) => {
      try {
        callback(reports);
      } catch (error) {
        console.error('Error in listenReports callback:', error);
      }
    };

    const setupListener = () => {
      try {
        return originalListenReports.call(window.FirebaseService, wrappedCallback);
      } catch (error) {
        console.error('Failed to setup Firestore listener:', error);
        if (isOnline) {
          setTimeout(setupListener, 5000);
        }
      }
    };

    return setupListener();
  };

  // Override saveReport with retry logic
  const originalSaveReport = window.FirebaseService.saveReport;
  window.FirebaseService.saveReport = async function(report, user, existingId) {
    return retryWithBackoff(() => 
      originalSaveReport.call(window.FirebaseService, report, user, existingId)
    );
  };

  // Override deleteReport with retry logic
  const originalDeleteReport = window.FirebaseService.deleteReport;
  window.FirebaseService.deleteReport = async function(id, user) {
    return retryWithBackoff(() => 
      originalDeleteReport.call(window.FirebaseService, id, user)
    );
  };

  console.log('Firestore connection fixes applied');
})();
