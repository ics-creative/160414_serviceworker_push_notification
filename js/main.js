// GoogleCouldMessagingで取得したAPIキーを設定
const API_KEY = 'AIzaSyDpx5LWS0vpR_PfHJ4tMdWBwV9JR-N4QiE';

// GCMのエンドポイントのBaseURL
const GCM_ENDPOINT = 'https://android.googleapis.com/gcm/send';

const elementTextarea = document.querySelector('#curlCommand');
const elementPushButton = document.querySelector('#pushEnableButton');

window.addEventListener('DOMContentLoaded', async () => {

  // ServiceWorkerをサポートしているかチェック
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.register('./service-worker.js');
    initServiceWorker();
  } else {
    showUnsupported('お使いのブラウザはServiceWorkerに対応していません。');
  }

  initUi();
});

/**
 * プッシュ通知の初期化を行います。
 * @returns {Promise<void>}
 */
async function initServiceWorker() {
  // プッシュ通知に対応しているかの判定
  if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
    showUnsupported('Notifications aren\'t supported.');
    return;
  }
  // プッシュ通知が拒否設定になっていないかを確認
  if (Notification.permission === 'denied') {
    showUnsupported('The user has blocked notifications.');
    return;
  }
  // プッシュ通知に対応しているかの判定
  if (!('PushManager' in window)) {
    showUnsupported('Push messaging isn\'t supported.');
    return;
  }

  const serviceWorkerRegistration = await navigator.serviceWorker.ready;

  // 登録されている Subscription を取得します
  // 前回、有効にした状態であれば、Subscription に値が得られる
  const subscription = await serviceWorkerRegistration.pushManager.getSubscription();

  // 登録されていなければ処理を中断
  if (subscription === null) {
    return;
  }

  // 登録した Subscription をサーバーに送ります
  sendSubscriptionToServer(subscription);

  // UIを更新（既に登録済みであることを示す）
  elementPushButton.checked = true;
}

/**
 * subscriptionを登録し結果を取得します。
 */
async function subscribe() {

  const serviceWorkerRegistration = await navigator.serviceWorker.ready;

  try {
    const subscription = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true
    });

    sendSubscriptionToServer(subscription);
  } catch (e) {
    if (Notification.permission === 'denied') {
      console.warn('Permission for Notifications was denied');
    } else {
      console.warn('Unable to subscribe to push.', e);
    }
    // 有効にできなかったため、チェックボックスを外す
    elementPushButton.checked = false;
  }
}

/**
 * 登録されているsubscription通知を解除します。
 */
async function unsubscribe() {
  const serviceWorkerRegistration = await navigator.serviceWorker.ready;

  try {
    // 登録されている Subscription を取得します
    const pushSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
    // Push通知の Subscription があれば
    if (pushSubscription) {
      // 解除する
      await pushSubscription.unsubscribe();
    }

  } catch (e) {
    console.error('Error thrown while unsubscribing from push messaging.', e);
  }

  // UIを更新
  elementPushButton.checked = false;
  elementTextarea.textContent = '';
}

/**
 * 登録したsubscriptionをサーバーに送ります。
 */
function sendSubscriptionToServer(subscription) {
  const mergedEndpoint = endpointWorkaround(subscription);
  showCurlCommand(mergedEndpoint);
}

/**
 * 非サポートメッセージを表示します。
 */
function showUnsupported(message) {
  document.querySelector('.supported').style.display = 'none';
  document.querySelector('.unsupported').style.display = 'block';
  document.querySelector('.unsupported').innerHTML = message;
}

/**
 * 引数に指定されてEndpointの情報を元にcURLコマンドを作成し表示します。
 */
function showCurlCommand(mergedEndpoint) {
  if (mergedEndpoint.indexOf(GCM_ENDPOINT) !== 0) {
    console.log('This browser isn\'t currently supported for this demo');
    return;
  }

  const endpointSections = mergedEndpoint.split('/');
  const subscriptionId = endpointSections[endpointSections.length - 1];
  const curlCommand =
          `curl --header "Authorization: key=${API_KEY}" `
          + `--header Content-Type:"application/json" ${GCM_ENDPOINT} `
          + `-d "{\\"registration_ids\\":[\\"${subscriptionId}\\"]}"`;

  elementTextarea.textContent = curlCommand;

  // コマンドを選択状態にする
  selectCurlText();
}

function endpointWorkaround(pushSubscription) {
  if (pushSubscription.endpoint.indexOf('https://android.googleapis.com/gcm/send') !== 0) {
    return pushSubscription.endpoint;
  }

  let mergedEndpoint = pushSubscription.endpoint;
  if (pushSubscription.subscriptionId &&
    pushSubscription.endpoint.indexOf(pushSubscription.subscriptionId) === -1) {
    mergedEndpoint = pushSubscription.endpoint + '/' +
      pushSubscription.subscriptionId;
  }
  return mergedEndpoint;
}

function initUi() {

  elementPushButton.addEventListener('click', () => {
    if (elementPushButton.checked === false) {
      unsubscribe();
    } else {
      subscribe();
    }
  });

  // cURLコマンドの領域をクリックしたらコマンドを全選択する
  elementTextarea.addEventListener('click', () => {
    selectCurlText();
  });
}

/**
 * cURLコマンドの領域をクリックしたらコマンドを全選択します。
 */
function selectCurlText() {
  const range = document.createRange();
  range.selectNodeContents(elementTextarea);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
}
