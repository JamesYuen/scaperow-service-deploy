angular.module('ionic.service.deploy', ['ionic.service.core'])

// Check after 5 seconds on initial load
.constant('INITIAL_DELAY', 1 * 5 * 1000)

// Watch every minute
.constant('WATCH_INTERVAL', 1 * 60 * 1000)

/**
 * @ngdoc service
 * @name $ionicDeploy
 * @module ionic.services.deploy
 * @description
 *
 * A simple way to push updates to your app.
 *
 * Initialize the service with your app id before calling other functions.
 * Then, use the check, download, extract and load functions to update and/or load
 * the updated version of your app.
 *
 * @usage
 * ```javascript
 * // Check for updates
 * $ionicDeploy.check().then(function(response) {
 *    // response will be true/false
 *    if (response) {
 *        // Download the updates
 *        $ionicDeploy.download().then(function() {
 *            // Extract the updates
 *            $ionicDeploy.extract().then(function() {
 *                // Load the updated version
 *                $ionicTrack.load();
 *            }, function(error) {
 *                // Error extracting
 *            }, function(progress) {
 *                // Do something with the zip extraction progress
 *                $scope.extraction_progress = progress;
 *            });
 *        }, function(error) {
 *            // Error downloading the updates
 *        }, function(progress) {
 *            // Do something with the download progress
 *            $scope.download_progress = progress;
 *        });
 *    }
 * } else {
 *    // No updates, load the most up to date version of the app
 *    $ionicDeploy.load();
 * }, function(error) {
 *    // Error checking for updates
 * })
 * ```
 */
.factory('$ionicDeploy', [
    '$q',
    '$timeout',
    '$rootScope',
    '$ionicApp',
    'WATCH_INTERVAL',
    'INITIAL_DELAY',
  function($q, $timeout, $rootScope, $ionicApp, WATCH_INTERVAL, INITIAL_DELAY) {
    return {
      
      /**
       * Watch constantly checks for updates, and triggers an 
       * event when one is ready.
       */
      watch: function(options) {
        var deferred = $q.defer();

        var opts = angular.extend({
          initialDelay: INITIAL_DELAY,
          interval: WATCH_INTERVAL
        }, options);

        function checkForUpdates() {
          this.check().then(function(hasUpdate) {
            if(hasUpdate) {
              $rootScope.$emit('$ionicDeploy:updateAvailable');
            }
            // Notify
            deferred.notify(hasUpdate);
          }, function(err) {
            console.warn('Unable to check for Ionic Deploy updates', err);
          });
          setTimeout(checkForUpdates, opts.interval);
        }

        // Check after an initial short deplay
        setTimeout(checkForUpdates.bind(this), opts.initialDelay);

        return deferred.promise;
      },

      check: function() {
        var deferred = $q.defer();

        if (typeof IonicDeploy != "undefined") {
          IonicDeploy.check($ionicApp.getApp().app_id, function(result) {
            deferred.resolve(result === 'true');
          }, function(error) {
            deferred.reject(error);
          });
        } else {
          deferred.reject("Plugin not loaded");
        }

        return deferred.promise;
      },

      download: function() {
        var deferred = $q.defer();

        if (typeof IonicDeploy != "undefined") {
          IonicDeploy.download($ionicApp.getApp().app_id, function(result) {
            if (result !== 'true' && result !== 'false') {
              deferred.notify(result);
            } else {
              deferred.resolve(result === 'true');
            }
          }, function(error) {
            deferred.reject(error);
          });
        } else {
          deferred.reject("Plugin not loaded");
        }

        return deferred.promise;
      },

      extract: function() {
        var deferred = $q.defer();

        if (typeof IonicDeploy != "undefined") {
          IonicDeploy.extract($ionicApp.getApp().app_id, function(result) {
            if (result !== 'done') {
              deferred.notify(result);
            } else {
              deferred.resolve(result);
            }
          }, function(error) {
            deferred.reject(error);
          });
        } else {
          deferred.reject("Plugin not loaded");
        }

        return deferred.promise;
      },

      load: function() {
        if (typeof IonicDeploy != "undefined") {
          IonicDeploy.redirect($ionicApp.getApp().app_id);
        }
      },

      initialize: function(app_id) {
        if (typeof IonicDeploy != "undefined") {
          IonicDeploy.initialize(app_id);
        }
      },

      update: function() {
        // This is an all-in-one function that's meant to do all of the update steps
        // in one shot.
        // NB: I think that the way to handle progress is to divide the provided progress result
        //     of each part by two (download and extract) and report that value.

        var deferred = $q.defer();

        if (typeof IonicDeploy != "undefined") {
          // Check for updates
          IonicDeploy.check($ionicApp.getApp().app_id, function(result) {
            if (result === 'true') {
              // There are updates, download them
              var progress = 0;
              IonicDeploy.download($ionicApp.getApp().app_id, function(result) {
                if (result !== 'true' && result !== 'false') {
                  // Download is only half of the reported progress
                  progress = progress + (result / 2);
                  deferred.notify(progress);
                } else {
                  // Download complete, now extract
                  IonicDeploy.extract($ionicApp.getApp().app_id, function(result) {
                    if (result !== 'done') {
                      // Extract is only half of the reported progress
                      progress = progress + (result / 2);
                      deferred.notify(progress);
                    } else {
                      // Extraction complete, now redirect
                      IonicDeploy.redirect($ionicApp.getApp().app_id);
                    }
                  }, function(error) {
                    // Error extracting updates
                    deferred.reject(error);
                  });
                }
              }, function(error) {
                // Error downloading updates
                deferred.reject(error);
              });
            } else {
              // There are no updates, redirect
              IonicDeploy.redirect($ionicApp.getApp().app_id);
            }
          }, function(error) {
            // Error checking for updates
            deferred.reject(error);
          });
        } else {
          deferred.reject("Plugin not loaded");
        }

        return deferred.promise;
      }
    }
}])
