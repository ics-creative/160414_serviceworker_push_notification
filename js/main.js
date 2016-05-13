'use strict';

// GoogleCouldMessagingで取得したAPIキーを設定
var API_KEY = 'AIzaSyDpx5LWS0vpR_PfHJ4tMdWBwV9JR-N4QiE';

// GCMのエンドポイントのBaseURL
var GCM_ENDPOINT = 'https://android.googleapis.com/gcm/send';

var curlCommandArea = document.querySelector('#curlCommand');
var pushButton = document.querySelector('#pushEnableButton');

/**
 * 初期化処理を行います。
 */
function initialize() {
  // プッシュ通知に対応しているかの判定
  if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
    console.log('Notifications aren\'t supported.');
    showUnsupported();
    return;
  }
  // プッシュ通知が拒否設定になっていないかを確認
  if (Notification.permission === 'denied') {
    console.log('The user has blocked notifications.');
    showUnsupported();
    return;
  }
  // プッシュ通知に対応しているかの判定
  if (!('PushManager' in window)) {
    console.log('Push messaging isn\'t supported.');
    showUnsupported();
    return;
  }

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    // 登録されているsubscriptionを取得します。
    serviceWorkerRegistration.pushManager.getSubscription()
        .then(function(subscription) {

          pushButton.disabled = false;

          if (!subscription) {
            return;
          }

          sendSubscriptionToServer(subscription);

          pushButton.checked = true;
        })
        .catch(function(err) {
          console.log('Error during getSubscription()', err);
        });
  });
  
  // cURLコマンドの領域をクリックしたらコマンドを全選択する
  curlCommandArea.addEventListener('click', function() {
    selectCurlText();
  });
}


/**
 * 登録されているsubscription通知を解除します。
 */
function unsubscribe() {
  pushButton.disabled = true;
  curlCommandArea.textContent = '';

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    // 登録されているsubscriptionを取得します。
    serviceWorkerRegistration.pushManager.getSubscription().then(
      function(pushSubscription) {
        if (!pushSubscription) {
          pushButton.disabled = false;
          return;
        }

        pushSubscription.unsubscribe().then(function() {
          pushButton.disabled = false;
        }).catch(function(e) {
          console.log('Unsubscription error: ', e);
          pushButton.disabled = false;
        });
      }).catch(function(e) {
        console.log('Error thrown while unsubscribing from push messaging.', e);
      });
  });
}

/**
 * subscriptionを登録し結果を取得します。
 */
function subscribe() {
  pushButton.disabled = true;

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true})
      .then(function(subscription) {
        pushButton.disabled = false;

        return sendSubscriptionToServer(subscription);
      })
      .catch(function(e) {
        if (Notification.permission === 'denied') {
          console.log('Permission for Notifications was denied');
          pushButton.disabled = true;
        } else {
          console.log('Unable to subscribe to push.', e);
          pushButton.disabled = false;
        }
      });
  });
}

/**
 * 登録したsubscriptionをサーバーに送ります。
 */
function sendSubscriptionToServer(subscription) {
  var mergedEndpoint = endpointWorkaround(subscription);
  showCurlCommand(mergedEndpoint);
}

/**
 * 非サポートメッセージを表示します。
 */
function showUnsupported() {
  document.querySelector('.supported').style.display = 'none';
  document.querySelector('.unsupported').style.display = 'block';
}

/**
 * 引数に指定されてEndpointの情報を元にcURLコマンドを作成し表示します。
 */
function showCurlCommand(mergedEndpoint) {
  if (mergedEndpoint.indexOf(GCM_ENDPOINT) !== 0) {
    console.log('This browser isn\'t currently supported for this demo');
    return;
  }

  var endpointSections = mergedEndpoint.split('/');
  var subscriptionId = endpointSections[endpointSections.length - 1];
  var curlCommand = 'curl --header "Authorization: key=' + API_KEY +
      '" --header Content-Type:"application/json" ' + GCM_ENDPOINT +
      ' -d "{\\"registration_ids\\":[\\"' + subscriptionId + '\\"]}"';

  curlCommandArea.textContent = curlCommand;
  
  // コマンドを選択状態にする
  selectCurlText();
}

function endpointWorkaround(pushSubscription) {
  if (pushSubscription.endpoint.indexOf('https://android.googleapis.com/gcm/send') !== 0) {
    return pushSubscription.endpoint;
  }

  var mergedEndpoint = pushSubscription.endpoint;
  if (pushSubscription.subscriptionId &&
      pushSubscription.endpoint.indexOf(pushSubscription.subscriptionId) === -1) {
    mergedEndpoint = pushSubscription.endpoint + '/' +
        pushSubscription.subscriptionId;
  }
  return mergedEndpoint;
}

window.addEventListener('load', function() {
  pushButton.addEventListener('click', function() {
    if (!pushButton.checked) {
      unsubscribe();
    } else {
      subscribe();
    }
  });

  // ServiceWokerをサポートしているかチェック
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
    .then(initialize);
  } else {
    showUnsupported();
  }
});


/**
 * cURLコマンドの領域をクリックしたらコマンドを全選択します。
 */
function selectCurlText() {
  var range = document.createRange();
  range.selectNodeContents(curlCommandArea);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
}
