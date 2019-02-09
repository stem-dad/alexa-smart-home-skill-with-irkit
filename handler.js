let exec = require('child_process').exec

/**
 * AlexaのDiscoveryリクエストにレスポンスする
 * https://developer.amazon.com/ja/docs/smarthome/steps-to-build-a-smart-home-skill.html のコードのコピペ
 * @param {*} request
 * @param {*} context
 */
function handleDiscovery (request, context) {
  let payload = {
    endpoints:
      [
        require(__dirname + '/endpoints/tv.json'),
        require(__dirname + '/endpoints/aircon.json'),
        require(__dirname + '/endpoints/light-bedroom.json'),
        require(__dirname + '/endpoints/light-living.json'),
        require(__dirname + '/endpoints/light-all.json'),
        require(__dirname + '/endpoints/roomba.json')
      ]
  }
  let header = request.directive.header
  header.name = 'Discover.Response'
  console.log('DEBUG', 'Discovery Response: ', JSON.stringify({header: header, payload: payload}))
  context.succeed({event: {header: header, payload: payload}})
}

/**
 * irkit APIに赤外線データをPOSTする
 * @param {String} commandFileName ir-signalsディレクトリ内にあるコマンドjsonのファイル名
 */
function sendJsonCommandToIrkit (commandFileName) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`commandFileName: ${commandFileName}`)

      // JSONをインポートして1行の文字列に変換
      let commandJson = require(__dirname + `/ir-signals/${commandFileName}.json`)
      let commandJsonString = JSON.stringify(commandJson)


      // irkitのAPIに赤外線コマンドjsonをPOSTして、我が家のirkitから指定の赤外線パターンを発信
      // http://getirkit.com/#toc_11 参照
      exec(
        `curl -i "https://api.getirkit.com/1/messages" ` +
        `-d 'clientkey=${process.env.IRKIT_CLIENT_KEY}' ` +
        `-d 'deviceid=${process.env.IRKIT_DEVICE_ID}' ` +
        `-d 'message=${commandJsonString}'`,
        (error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        }
      )
    } catch (err) {
      console.log('sendJsonCommandToIrkit error', err)
      reject()
    }
  })
}

/**
 * 指定のミリ秒待つ
 * @param {Number} ms ミリ秒
 */
function delayMs (ms) {
  if (!ms) {
    ms = 1000
  }

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

/**
 * ON/OFF系のコントロール
 * @param {*} request
 * @param {*} context
 * @param {Function} callback
 */
function handlePowerControl (request, context, callback) {
  let requestMethod = request.directive.header.name
  let endpointId = request.directive.endpoint.endpointId
  let powerResult = 'ON'

  console.log('########### requestMethod: ', requestMethod, ', endpointId: ', endpointId)

  if (requestMethod === 'TurnOn') {
    powerResult = 'ON'
  } else if (requestMethod === 'TurnOff') {
    powerResult = 'OFF'
  }

  switch (endpointId) {
    case 'tv':
      sendJsonCommandToIrkit('tv-onoff')
        .then(() => {
          sendResponse()
        })
      break

    case 'aircon':
      if (requestMethod === 'TurnOn') {
        sendJsonCommandToIrkit('aircon-on')
          .then(() => {
            sendResponse()
          })
      } else {
        sendJsonCommandToIrkit('aircon-off')
          .then(() => {
            sendResponse()
          })
      }
      break

    case 'light-living':
      if (requestMethod === 'TurnOn') {
        sendJsonCommandToIrkit('light-living-onoff')
          .then(() => {
            sendResponse()
          })
      } else {
        // OFFは2回ボタンを押さないといけない
        sendJsonCommandToIrkit('light-living-onoff')
          .then(() => {
            return delayMs(800)
          })
          .then(() => {
            return sendJsonCommandToIrkit('light-living-onoff')
          })
          .then(() => {
            sendResponse()
          })
      }
      break

    case 'light-bedroom':
      if (requestMethod === 'TurnOn') {
        sendJsonCommandToIrkit('light-bedroom-onoff')
          .then(() => {
            sendResponse()
          })
      } else {
        // OFFは2回ボタンを押さないといけない
        sendJsonCommandToIrkit('light-bedroom-onoff')
          .then(() => {
            return delayMs(800)
          })
          .then(() => {
            return sendJsonCommandToIrkit('light-bedroom-onoff')
          })
          .then(() => {
            sendResponse()
          })
      }
      break

    case 'light-all':
      if (requestMethod === 'TurnOn') {
        sendJsonCommandToIrkit('light-bedroom-onoff')
          .then(() => {
            return sendJsonCommandToIrkit('light-living-onoff')
          })
          .then(() => {
            sendResponse()
          })
      } else {
        // OFFは2回ボタンを押さないといけない
        sendJsonCommandToIrkit('light-bedroom-onoff')
          .then(() => {
            return sendJsonCommandToIrkit('light-living-onoff')
          })
          .then(() => {
            return delayMs(800)
          })
          .then(() => {
            return sendJsonCommandToIrkit('light-bedroom-onoff')
          })
          .then(() => {
            return delayMs(800)
          })
          .then(() => {
            return sendJsonCommandToIrkit('light-living-onoff')
          })
          .then(() => {
            sendResponse()
          })
      }
      break

    case 'roomba':
      if (requestMethod === 'TurnOn') {
        sendJsonCommandToIrkit('roomba-on')
          .then(() => {
            sendResponse()
          })
      } else {
        // OFFはないので、なにもしない
        sendResponse()
      }
      break

    default:
      sendResponse()
  }

  function sendResponse () {
    let contextResult = {
      properties: [{
        namespace:                 'Alexa.PowerController',
        name:                      'powerState',
        value:                     powerResult,
        timeOfSample:              '2017-09-03T16:20:50.52Z', //retrieve from result.
        uncertaintyInMilliseconds: 50
      }]
    }
    let responseHeader = request.directive.header
    responseHeader.namespace = 'Alexa'
    responseHeader.name = 'Response'
    responseHeader.messageId = responseHeader.messageId + '-R'
    let endpoint = {
      scope:      {
        type:  'BearerToken',
        token: 'Alexa-access-token'
      },
      endpointId: endpointId
    }
    let response = {
      context:  contextResult,
      event:    {
        header: responseHeader
      },
      endpoint: endpoint,
      payload:  {}
    }

    // console.log('DEBUG', 'Alexa.PowerController ', JSON.stringify(response))
    context.succeed(response)
  }
}

/**
 * TVのチャンネル系のコントロール
 * @param {*} request
 * @param {*} context
 * @param {Function} callback
 */
function handleChannelControl (request, context, callback) {
  let endpointId = request.directive.endpoint.endpointId
  let powerResult = 'ON'
  let payload = request.directive.payload
  let channel = null

  if (payload.channel.number) {
    channel = parseInt(payload.channel.number)
  }
  else if (payload.channelMetadata.name) {
    // 千葉県のチャンネル配置です。1〜9チャン。
    let channelMap = ['none', 'nhk', 'e テレ', 'none', '日テレ', 'テレ朝', 'tbs', 'テレビ東京', 'フジテレビ', '東京MX']
    channel = channelMap.indexOf(payload.channelMetadata.name)
  }

  console.log('[handleChannelControl] channel: ', channel, ',payload: ', payload)

  if (channel) {
    // 1〜9の赤外線を送信する
    sendJsonCommandToIrkit('tv-ch' + channel)
      .then(() => {
        sendResponse()
      })
  } else {
    // 該当ないけど、とりあえず「はい」と言わせる
    sendResponse()
  }

  function sendResponse () {
    let contextResult = {
      properties: [{
        namespace:                 'Alexa.ChannelController',
        name:                      'channel',
        value:                     {
          number:            '1234',
          callSign:          'callsign1',
          affiliateCallSign: 'callsign2'
        },
        timeOfSample:              '2017-09-03T16:20:50.52Z', //retrieve from result.
        uncertaintyInMilliseconds: 0
      }]

    }
    let responseHeader = request.directive.header
    responseHeader.namespace = 'Alexa'
    responseHeader.name = 'Response'
    responseHeader.messageId = responseHeader.messageId + '-R'
    let endpoint = {
      scope:      {
        type:  'BearerToken',
        token: 'Alexa-access-token'
      },
      endpointId: endpointId
    }
    let response = {
      context:  contextResult,
      event:    {
        header: responseHeader
      },
      endpoint: endpoint,
      payload:  {}
    }

    // console.log('DEBUG', 'Alexa.PowerController ', JSON.stringify(response))
    context.succeed(response)
  }
}

/**
 * Alexaからコールされるところ
 * @param {*} request
 * @param {*} context
 * @param {Function} callback
 */
module.exports.alexa = (request, context, callback) => {
  console.log(request.directive)
  if (request.directive.header.namespace === 'Alexa.Discovery' && request.directive.header.name === 'Discover') {
    console.log('DEGUG:', 'Discover request', JSON.stringify(request))
    handleDiscovery(request, context, '')
  } else if (request.directive.header.namespace === 'Alexa.PowerController') {
    if (request.directive.header.name === 'TurnOn' || request.directive.header.name === 'TurnOff') {
      // console.log('DEBUG:', 'TurnOn or TurnOff Request', JSON.stringify(request))
      handlePowerControl(request, context, callback)
    }
  } else if (request.directive.header.namespace === 'Alexa.ChannelController') {
    console.log('Alexa.ChannelController!!!!')
    handleChannelControl(request, context, callback)
  } else if (request.directive.header.namespace === 'Alexa.InputController') {
    console.log('Alexa.InputController!!!!')
  }
}
